/**
 * Temporal activity for data cleanup operations
 */

import { RetentionService } from '../retention/service';
import { getRetentionPolicy, CleanupResult } from '../retention/config';
import { CleanupAuditRepository } from '../database';
import { cleanupTotal, cleanupDuration, cleanupRecordsDeleted, cleanupSpaceReclaimed } from '../metrics';

export interface CleanupActivityArgs {
  dryRun?: boolean;
  triggeredBy?: string;
}

/**
 * Execute data cleanup based on retention policy
 */
export async function cleanupData(args: CleanupActivityArgs = {}): Promise<CleanupResult> {
  const policy = getRetentionPolicy();
  const service = new RetentionService(policy, args.dryRun || false);

  // Create audit record
  const audit = await CleanupAuditRepository.create({
    success: false,
    dry_run: args.dryRun || false,
    retention_policy: policy,
    preview: {}, // Will be filled after preview
    triggered_by: args.triggeredBy || 'scheduled',
    errors: [],
  });

  const startTime = Date.now();

  try {
    // Execute cleanup
    const result = await service.cleanup();

    // Update audit record with results (wrapped in try-catch to handle audit failures)
    try {
      await CleanupAuditRepository.update(audit.id, {
        success: result.success,
        completed_at: new Date(),
        duration_ms: result.durationMs,
        preview: result.preview,
        deleted: result.deleted,
        errors: result.errors,
      });
    } catch (auditError: any) {
      // Log audit failure but don't fail the cleanup
      console.error('⚠️  Failed to update cleanup audit record:', auditError.message);
      console.error('   Cleanup completed successfully but audit record may be incomplete');
    }

    // Record Prometheus metrics
    cleanupTotal.inc({
      status: result.success ? 'success' : 'failure',
      dry_run: args.dryRun ? 'true' : 'false',
    });

    cleanupDuration.observe(
      { status: result.success ? 'success' : 'failure' },
      result.durationMs / 1000
    );

    if (!args.dryRun && result.success) {
      cleanupRecordsDeleted.observe(result.deleted.totalRecords);
      cleanupSpaceReclaimed.observe(result.deleted.estimatedSpaceBytes);
    }

    console.log(
      `✅ Cleanup ${args.dryRun ? '(DRY RUN)' : 'completed'}: ${result.deleted.totalRecords} records deleted, ${(result.deleted.estimatedSpaceBytes / 1024 / 1024).toFixed(2)} MB reclaimed`
    );

    return result;
  } catch (error: any) {
    // Update audit record with failure (wrapped in try-catch)
    try {
      await CleanupAuditRepository.update(audit.id, {
        success: false,
        completed_at: new Date(),
        duration_ms: Date.now() - startTime,
        errors: [error.message],
      });
    } catch (auditError: any) {
      console.error('⚠️  Failed to update cleanup audit record with failure:', auditError.message);
    }

    console.error('❌ Cleanup failed:', error.message);
    throw error;
  }
}

/**
 * Preview cleanup without executing
 */
export async function previewCleanup(): Promise<CleanupResult> {
  const policy = getRetentionPolicy();
  const service = new RetentionService(policy, true);

  const result = await service.cleanup();

  console.log(
    `📋 Cleanup preview: ${result.preview.totalRecords} records would be deleted, ${(result.preview.estimatedSpaceBytes / 1024 / 1024).toFixed(2)} MB would be reclaimed`
  );

  return result;
}
