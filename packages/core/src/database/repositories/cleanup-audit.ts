/**
 * Repository for managing cleanup audit records
 */

import { getDatabase } from '../db';
import { CleanupAudit, NewCleanupAudit, CleanupAuditUpdate } from '../schema';

export class CleanupAuditRepository {
  /**
   * Create a new cleanup audit record
   */
  static async create(audit: NewCleanupAudit): Promise<CleanupAudit> {
    const db = getDatabase();

    const result = await db
      .insertInto('cleanup_audit')
      .values(audit)
      .returningAll()
      .executeTakeFirstOrThrow();

    return result;
  }

  /**
   * Get cleanup audit by ID
   */
  static async getById(id: string): Promise<CleanupAudit | undefined> {
    const db = getDatabase();

    return await db
      .selectFrom('cleanup_audit')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  }

  /**
   * List all cleanup audits (most recent first)
   */
  static async listAll(limit: number = 100): Promise<CleanupAudit[]> {
    const db = getDatabase();

    return await db
      .selectFrom('cleanup_audit')
      .selectAll()
      .orderBy('started_at', 'desc')
      .limit(limit)
      .execute();
  }

  /**
   * List cleanup audits with optional filters
   */
  static async list(options: {
    success?: boolean;
    dryRun?: boolean;
    limit?: number;
    since?: Date;
  }): Promise<CleanupAudit[]> {
    const db = getDatabase();

    let query = db.selectFrom('cleanup_audit').selectAll();

    if (options.success !== undefined) {
      query = query.where('success', '=', options.success);
    }

    if (options.dryRun !== undefined) {
      query = query.where('dry_run', '=', options.dryRun);
    }

    if (options.since) {
      query = query.where('started_at', '>=', options.since);
    }

    return await query
      .orderBy('started_at', 'desc')
      .limit(options.limit || 100)
      .execute();
  }

  /**
   * Update cleanup audit record
   */
  static async update(id: string, update: CleanupAuditUpdate): Promise<CleanupAudit> {
    const db = getDatabase();

    const result = await db
      .updateTable('cleanup_audit')
      .set(update)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return result;
  }

  /**
   * Get latest successful cleanup
   */
  static async getLatestSuccessful(): Promise<CleanupAudit | undefined> {
    const db = getDatabase();

    return await db
      .selectFrom('cleanup_audit')
      .selectAll()
      .where('success', '=', true)
      .where('dry_run', '=', false)
      .orderBy('started_at', 'desc')
      .executeTakeFirst();
  }

  /**
   * Get cleanup statistics
   */
  static async getStats(since: Date): Promise<{
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    totalRecordsDeleted: number;
    totalSpaceReclaimed: number;
  }> {
    const db = getDatabase();

    const audits = await db
      .selectFrom('cleanup_audit')
      .selectAll()
      .where('started_at', '>=', since)
      .where('dry_run', '=', false)
      .execute();

    const stats = {
      totalRuns: audits.length,
      successfulRuns: audits.filter((a) => a.success).length,
      failedRuns: audits.filter((a) => !a.success).length,
      totalRecordsDeleted: 0,
      totalSpaceReclaimed: 0,
    };

    for (const audit of audits) {
      if (audit.deleted && typeof audit.deleted === 'object') {
        const deleted = audit.deleted as any;
        stats.totalRecordsDeleted += deleted.totalRecords || 0;
        stats.totalSpaceReclaimed += deleted.estimatedSpaceBytes || 0;
      }
    }

    return stats;
  }
}
