/**
 * Admin routes for system management
 */

import { Router } from 'express';
import { CleanupAuditRepository, getDatabase } from '@reflux/core';
import { getRetentionPolicy } from '@reflux/core/src/retention/config';
import { sql } from 'kysely';

const router = Router();

/**
 * Distributed lock for cleanup operations using PostgreSQL advisory locks.
 * Advisory locks are process-safe and work across multiple API instances.
 * Lock ID 123456789 is arbitrary but consistent for cleanup operations.
 */
const CLEANUP_LOCK_ID = 123456789;

async function tryAcquireCleanupLock(): Promise<boolean> {
  const db = getDatabase();
  const result = await db
    .selectFrom(sql`pg_try_advisory_lock(${CLEANUP_LOCK_ID})`.as('lock'))
    .select(sql<boolean>`pg_try_advisory_lock(${CLEANUP_LOCK_ID})`.as('acquired'))
    .executeTakeFirst();
  return result?.acquired ?? false;
}

async function releaseCleanupLock(): Promise<void> {
  const db = getDatabase();
  await db
    .selectFrom(sql`pg_advisory_unlock(${CLEANUP_LOCK_ID})`.as('unlock'))
    .select(sql<boolean>`pg_advisory_unlock(${CLEANUP_LOCK_ID})`.as('released'))
    .executeTakeFirst();
}

/**
 * GET /api/admin/retention/policy - Get current retention policy
 */
router.get('/retention/policy', (req, res) => {
  try {
    const policy = getRetentionPolicy();
    res.json(policy);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/retention/preview - Preview cleanup
 */
router.get('/retention/preview', async (req, res) => {
  try {
    // For now, return a simple preview calculation
    // In production, this should call the RetentionService directly
    const { RetentionService } = await import('@reflux/core/src/retention/service');

    const policy = getRetentionPolicy();
    const service = new RetentionService(policy, true);
    const preview = await service.preview();

    res.json({
      success: true,
      preview,
      deleted: {
        runs: { successful: 0, failed: 0, cancelled: 0 },
        logs: { debug: 0, info: 0, warn: 0, error: 0 },
        artifacts: 0,
        flowVersions: 0,
        metrics: 0,
        totalRecords: 0,
        estimatedSpaceBytes: 0,
      },
      durationMs: 0,
      errors: [],
    });
  } catch (error: any) {
    console.error('❌ Preview cleanup failed:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/admin/retention/cleanup - Execute cleanup manually
 */
router.post('/retention/cleanup', async (req, res) => {
  try {
    const { dryRun = false } = req.body;

    // Distributed concurrency control using PostgreSQL advisory locks
    const lockAcquired = await tryAcquireCleanupLock();
    if (!lockAcquired) {
      return res.status(409).json({
        error: 'Cleanup already in progress',
        message: 'Please wait for the current cleanup operation to complete before starting another',
      });
    }

    // Execute cleanup directly (not via Temporal workflow for now)
    const { RetentionService } = await import('@reflux/core/src/retention/service');
    const { CleanupAuditRepository } = await import('@reflux/core');

    const policy = getRetentionPolicy();
    const service = new RetentionService(policy, dryRun);

    // Run cleanup in background
    service.cleanup().then(
      async (result: any) => {
        console.log('✅ Manual cleanup completed:', result);

        try {
          // Save audit record
          await CleanupAuditRepository.create({
            success: result.success,
            dry_run: dryRun,
            retention_policy: policy,
            preview: result.preview,
            deleted: result.deleted,
            triggered_by: 'manual',
            errors: result.errors,
            completed_at: new Date(),
            duration_ms: result.durationMs,
          });
        } catch (auditError: any) {
          console.error('⚠️  Failed to save cleanup audit:', auditError.message);
        } finally {
          await releaseCleanupLock();
        }
      },
      async (error: any) => {
        console.error('❌ Manual cleanup failed:', error);
        await releaseCleanupLock();
      }
    );

    // Return immediately
    res.json({
      message: dryRun
        ? 'Cleanup preview started in background'
        : 'Cleanup started in background',
    });
  } catch (error: any) {
    console.error('❌ Execute cleanup failed:', error);
    await releaseCleanupLock();
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/retention/history - Get cleanup history
 */
router.get('/retention/history', async (req, res) => {
  try {
    const { limit = 100, success, dryRun } = req.query;

    const audits = await CleanupAuditRepository.list({
      success: success !== undefined ? success === 'true' : undefined,
      dryRun: dryRun !== undefined ? dryRun === 'true' : undefined,
      limit: parseInt(limit as string, 10),
    });

    res.json(audits);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/retention/stats - Get cleanup statistics
 */
router.get('/retention/stats', async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const since = new Date();
    since.setDate(since.getDate() - parseInt(days as string, 10));

    const stats = await CleanupAuditRepository.getStats(since);

    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/admin/retention/latest - Get latest successful cleanup
 */
router.get('/retention/latest', async (req, res) => {
  try {
    const latest = await CleanupAuditRepository.getLatestSuccessful();

    if (!latest) {
      return res.status(404).json({ error: 'No successful cleanup found' });
    }

    res.json(latest);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
