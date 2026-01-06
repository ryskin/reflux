/**
 * Data retention and cleanup service
 *
 * Manages automated cleanup of old runs, logs, artifacts, and other data
 * based on configurable retention policies.
 */

import { getDatabase } from '../database/db';
import { sql } from 'kysely';
import { RetentionPolicy, CleanupPreview, CleanupResult } from './config';
import { createStorage, StorageConfig } from '../storage';

export class RetentionService {
  private policy: RetentionPolicy;
  private dryRun: boolean;
  private readonly BATCH_SIZE = 1000; // Delete in batches to avoid locking

  constructor(policy: RetentionPolicy, dryRun: boolean = false) {
    this.policy = policy;
    this.dryRun = dryRun;
  }

  /**
   * Preview cleanup without executing
   */
  async preview(): Promise<CleanupPreview> {
    const db = getDatabase();

    // Count runs to be deleted
    const runsSuccessful = await db
      .selectFrom('runs')
      .select(sql<number>`count(*)`.as('count'))
      .where('status', '=', 'completed')
      .where('completed_at', '<', this.getRetentionDate(this.policy.runs.successful))
      .executeTakeFirst();

    const runsFailed = await db
      .selectFrom('runs')
      .select(sql<number>`count(*)`.as('count'))
      .where('status', '=', 'failed')
      .where('completed_at', '<', this.getRetentionDate(this.policy.runs.failed))
      .executeTakeFirst();

    const runsCancelled = await db
      .selectFrom('runs')
      .select(sql<number>`count(*)`.as('count'))
      .where('status', '=', 'cancelled')
      .where('completed_at', '<', this.getRetentionDate(this.policy.runs.cancelled))
      .executeTakeFirst();

    // Count logs to be deleted by level
    const logsDebug = await db
      .selectFrom('run_logs')
      .select(sql<number>`count(*)`.as('count'))
      .where('level', '=', 'debug')
      .where('timestamp', '<', this.getRetentionDate(this.policy.logs.debug))
      .executeTakeFirst();

    const logsInfo = await db
      .selectFrom('run_logs')
      .select(sql<number>`count(*)`.as('count'))
      .where('level', '=', 'info')
      .where('timestamp', '<', this.getRetentionDate(this.policy.logs.info))
      .executeTakeFirst();

    const logsWarn = await db
      .selectFrom('run_logs')
      .select(sql<number>`count(*)`.as('count'))
      .where('level', '=', 'warn')
      .where('timestamp', '<', this.getRetentionDate(this.policy.logs.warn))
      .executeTakeFirst();

    const logsError = await db
      .selectFrom('run_logs')
      .select(sql<number>`count(*)`.as('count'))
      .where('level', '=', 'error')
      .where('timestamp', '<', this.getRetentionDate(this.policy.logs.error))
      .executeTakeFirst();

    // Count artifacts to be deleted
    const artifactsResult = await db
      .selectFrom('artifacts')
      .select([
        sql<number>`count(*)`.as('count'),
        sql<number>`sum(size_bytes)`.as('total_size'),
      ])
      .where('created_at', '<', this.getRetentionDate(this.policy.artifacts.default))
      .executeTakeFirst();

    // Count flow versions to be deleted (keep N most recent per flow)
    const flowVersionsResult = await db
      .selectFrom('flow_versions')
      .select(sql<number>`count(*)`.as('count'))
      .where('created_at', '<', this.getRetentionDate(this.policy.flowVersions.minAge))
      .where(
        'id',
        'not in',
        // Subquery to get IDs of recent versions to keep
        db
          .selectFrom('flow_versions as fv')
          .select('fv.id')
          .distinctOn('fv.flow_id')
          .orderBy('fv.flow_id')
          .orderBy('fv.created_at', 'desc')
          .limit(this.policy.flowVersions.keepRecent)
      )
      .executeTakeFirst();

    // Count metrics to be deleted
    const metricsResult = await db
      .selectFrom('metrics')
      .select(sql<number>`count(*)`.as('count'))
      .where('timestamp', '<', this.getRetentionDate(this.policy.metrics.raw))
      .executeTakeFirst();

    const preview: CleanupPreview = {
      runs: {
        successful: Number(runsSuccessful?.count || 0),
        failed: Number(runsFailed?.count || 0),
        cancelled: Number(runsCancelled?.count || 0),
      },
      logs: {
        debug: Number(logsDebug?.count || 0),
        info: Number(logsInfo?.count || 0),
        warn: Number(logsWarn?.count || 0),
        error: Number(logsError?.count || 0),
      },
      artifacts: Number(artifactsResult?.count || 0),
      flowVersions: Number(flowVersionsResult?.count || 0),
      metrics: Number(metricsResult?.count || 0),
      totalRecords: 0,
      estimatedSpaceBytes: Number(artifactsResult?.total_size || 0),
    };

    // Calculate total records
    preview.totalRecords =
      preview.runs.successful +
      preview.runs.failed +
      preview.runs.cancelled +
      preview.logs.debug +
      preview.logs.info +
      preview.logs.warn +
      preview.logs.error +
      preview.artifacts +
      preview.flowVersions +
      preview.metrics;

    return preview;
  }

  /**
   * Execute cleanup based on retention policy
   */
  async cleanup(): Promise<CleanupResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    // Get preview first
    const preview = await this.preview();

    if (this.dryRun) {
      return {
        success: true,
        preview,
        deleted: this.emptyPreview(),
        durationMs: Date.now() - startTime,
        errors: [],
      };
    }

    const deleted: CleanupPreview = this.emptyPreview();

    try {
      // Clean up runs
      deleted.runs = await this.cleanupRuns();

      // Clean up logs (will cascade from runs)
      deleted.logs = await this.cleanupLogs();

      // Clean up artifacts (includes storage files)
      deleted.artifacts = await this.cleanupArtifacts();

      // Clean up flow versions
      deleted.flowVersions = await this.cleanupFlowVersions();

      // Clean up metrics
      deleted.metrics = await this.cleanupMetrics();

      // Calculate totals
      deleted.totalRecords =
        deleted.runs.successful +
        deleted.runs.failed +
        deleted.runs.cancelled +
        deleted.logs.debug +
        deleted.logs.info +
        deleted.logs.warn +
        deleted.logs.error +
        deleted.artifacts +
        deleted.flowVersions +
        deleted.metrics;

      return {
        success: errors.length === 0,
        preview,
        deleted,
        durationMs: Date.now() - startTime,
        errors,
      };
    } catch (error: any) {
      errors.push(`Cleanup failed: ${error.message}`);
      return {
        success: false,
        preview,
        deleted,
        durationMs: Date.now() - startTime,
        errors,
      };
    }
  }

  /**
   * Clean up old runs (batched to avoid database locks)
   */
  private async cleanupRuns(): Promise<CleanupPreview['runs']> {
    const db = getDatabase();

    const successful = await this.batchDelete(
      'runs',
      'id',
      db
        .selectFrom('runs')
        .select('id')
        .where('status', '=', 'completed')
        .where('completed_at', '<', this.getRetentionDate(this.policy.runs.successful))
    );

    const failed = await this.batchDelete(
      'runs',
      'id',
      db
        .selectFrom('runs')
        .select('id')
        .where('status', '=', 'failed')
        .where('completed_at', '<', this.getRetentionDate(this.policy.runs.failed))
    );

    const cancelled = await this.batchDelete(
      'runs',
      'id',
      db
        .selectFrom('runs')
        .select('id')
        .where('status', '=', 'cancelled')
        .where('completed_at', '<', this.getRetentionDate(this.policy.runs.cancelled))
    );

    return {
      successful,
      failed,
      cancelled,
    };
  }

  /**
   * Clean up old logs (batched to avoid database locks)
   */
  private async cleanupLogs(): Promise<CleanupPreview['logs']> {
    const db = getDatabase();

    const debug = await this.batchDelete(
      'run_logs',
      'id',
      db
        .selectFrom('run_logs')
        .select('id')
        .where('level', '=', 'debug')
        .where('timestamp', '<', this.getRetentionDate(this.policy.logs.debug))
    );

    const info = await this.batchDelete(
      'run_logs',
      'id',
      db
        .selectFrom('run_logs')
        .select('id')
        .where('level', '=', 'info')
        .where('timestamp', '<', this.getRetentionDate(this.policy.logs.info))
    );

    const warn = await this.batchDelete(
      'run_logs',
      'id',
      db
        .selectFrom('run_logs')
        .select('id')
        .where('level', '=', 'warn')
        .where('timestamp', '<', this.getRetentionDate(this.policy.logs.warn))
    );

    const error = await this.batchDelete(
      'run_logs',
      'id',
      db
        .selectFrom('run_logs')
        .select('id')
        .where('level', '=', 'error')
        .where('timestamp', '<', this.getRetentionDate(this.policy.logs.error))
    );

    return {
      debug,
      info,
      warn,
      error,
    };
  }

  /**
   * Clean up old artifacts (database records and storage files)
   * Batched to avoid database locks, with tracked storage deletion errors
   */
  private async cleanupArtifacts(): Promise<number> {
    const db = getDatabase();
    const storageErrors: string[] = [];

    // Get artifacts to delete in batches
    let offset = 0;
    let totalDeleted = 0;
    let batch: any[];

    do {
      // Fetch batch of artifacts
      batch = await db
        .selectFrom('artifacts')
        .selectAll()
        .where('created_at', '<', this.getRetentionDate(this.policy.artifacts.default))
        .limit(this.BATCH_SIZE)
        .offset(offset)
        .execute();

      if (batch.length === 0) break;

      // Delete storage files for this batch
      for (const artifact of batch) {
        try {
          const config: StorageConfig = {
            backend: artifact.storage_backend as 'local' | 's3',
            localPath: process.env.ARTIFACT_LOCAL_PATH || './storage/artifacts',
            s3Endpoint: process.env.ARTIFACT_S3_ENDPOINT,
            s3Bucket: process.env.ARTIFACT_S3_BUCKET,
            s3AccessKeyId: process.env.ARTIFACT_S3_ACCESS_KEY_ID,
            s3SecretAccessKey: process.env.ARTIFACT_S3_SECRET_ACCESS_KEY,
            s3Region: process.env.ARTIFACT_S3_REGION,
            s3ForcePathStyle: process.env.ARTIFACT_S3_FORCE_PATH_STYLE === 'true',
          };

          const storage = await createStorage(config);
          await storage.delete(artifact.key);
        } catch (error: any) {
          const errorMsg = `Failed to delete artifact file ${artifact.key}: ${error.message}`;
          console.error(`⚠️  ${errorMsg}`);
          storageErrors.push(errorMsg);
          // Continue even if storage deletion fails
        }
      }

      // Delete database records for this batch
      const ids = batch.map((a) => a.id);
      const result = await db
        .deleteFrom('artifacts')
        .where('id', 'in', ids)
        .executeTakeFirst();

      totalDeleted += Number(result.numDeletedRows || 0);
      offset += this.BATCH_SIZE;

      // Log progress for large batches
      if (totalDeleted % 5000 === 0 && totalDeleted > 0) {
        console.log(`🗑️  Deleted ${totalDeleted} artifacts so far...`);
      }
    } while (batch.length === this.BATCH_SIZE);

    // Log storage errors summary
    if (storageErrors.length > 0) {
      console.error(`⚠️  ${storageErrors.length} storage deletion errors occurred (orphaned files may exist)`);
    }

    return totalDeleted;
  }

  /**
   * Clean up old flow versions (keep N most recent per flow)
   * Batched to avoid database locks
   */
  private async cleanupFlowVersions(): Promise<number> {
    const db = getDatabase();
    const keepRecent = this.policy.flowVersions.keepRecent;
    const retentionDate = this.getRetentionDate(this.policy.flowVersions.minAge);

    // Use batch delete for versions
    // We need to keep N most recent versions PER FLOW, so we use a window function
    // to rank versions within each flow, then exclude top N from deletion
    const deletedCount = await this.batchDelete(
      'flow_versions',
      'id',
      db
        .selectFrom(
          // Subquery: rank all versions by recency within each flow
          db
            .selectFrom('flow_versions')
            .select([
              'id',
              'created_at',
              sql<number>`ROW_NUMBER() OVER (PARTITION BY flow_id ORDER BY created_at DESC)`.as('rn'),
            ])
            .as('ranked')
        )
        .select('id')
        .where('created_at', '<', retentionDate)
        .where('rn', '>', keepRecent) // Only delete versions beyond the top N per flow
    );

    return deletedCount;
  }

  /**
   * Clean up old metrics (batched to avoid database locks)
   */
  private async cleanupMetrics(): Promise<number> {
    const db = getDatabase();

    const deletedCount = await this.batchDelete(
      'metrics',
      'id',
      db
        .selectFrom('metrics')
        .select('id')
        .where('timestamp', '<', this.getRetentionDate(this.policy.metrics.raw))
    );

    return deletedCount;
  }

  /**
   * Get retention cutoff date (now - days)
   */
  private getRetentionDate(days: number): Date {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date;
  }

  /**
   * Create empty preview
   */
  private emptyPreview(): CleanupPreview {
    return {
      runs: { successful: 0, failed: 0, cancelled: 0 },
      logs: { debug: 0, info: 0, warn: 0, error: 0 },
      artifacts: 0,
      flowVersions: 0,
      metrics: 0,
      totalRecords: 0,
      estimatedSpaceBytes: 0,
    };
  }

  /**
   * Batch delete helper to avoid database locks
   * Deletes records in batches of BATCH_SIZE
   */
  private async batchDelete(
    table: string,
    idColumn: string,
    selectQuery: any
  ): Promise<number> {
    const db = getDatabase();
    let totalDeleted = 0;
    let batch: any[];
    let offset = 0;

    do {
      // Fetch batch of IDs to delete
      batch = await selectQuery
        .limit(this.BATCH_SIZE)
        .offset(offset)
        .execute();

      if (batch.length === 0) break;

      // Extract IDs
      const ids = batch.map((row: any) => row[idColumn]);

      // Delete batch
      const result = await db
        .deleteFrom(table as any)
        .where(idColumn as any, 'in', ids)
        .executeTakeFirst();

      const deleted = Number(result.numDeletedRows || 0);
      totalDeleted += deleted;

      // Log progress for large deletions
      if (totalDeleted % 10000 === 0 && totalDeleted > 0) {
        console.log(`🗑️  Deleted ${totalDeleted} records from ${table} so far...`);
      }

      offset += this.BATCH_SIZE;
    } while (batch.length === this.BATCH_SIZE);

    if (totalDeleted > 0) {
      console.log(`✅ Deleted ${totalDeleted} records from ${table}`);
    }

    return totalDeleted;
  }
}
