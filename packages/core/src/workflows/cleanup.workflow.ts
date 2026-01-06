/**
 * Scheduled workflow for automated data cleanup
 *
 * Runs daily to clean up old data based on retention policies.
 */

import { proxyActivities, sleep } from '@temporalio/workflow';
import type * as activities from '../activities/cleanup';

const { cleanupData } = proxyActivities<typeof activities>({
  startToCloseTimeout: '30 minutes',
  retry: {
    initialInterval: '1 minute',
    backoffCoefficient: 2,
    maximumInterval: '10 minutes',
    maximumAttempts: 3,
  },
});

/**
 * Scheduled cleanup workflow - runs daily at 2 AM
 *
 * This workflow runs indefinitely, executing cleanup every 24 hours.
 * It should be started once and will continue running until explicitly terminated.
 */
export async function ScheduledCleanupWorkflow(): Promise<void> {
  console.log('🗑️  Scheduled cleanup workflow started');

  while (true) {
    try {
      // Execute cleanup
      const result = await cleanupData({ triggeredBy: 'scheduled' });

      if (result.success) {
        console.log(
          `✅ Scheduled cleanup completed: ${result.deleted.totalRecords} records deleted`
        );
      } else {
        console.error(`❌ Scheduled cleanup failed: ${result.errors.join(', ')}`);
      }
    } catch (error: any) {
      console.error(`❌ Scheduled cleanup error: ${error.message}`);
      // Continue running even if cleanup fails
    }

    // Sleep for 24 hours
    console.log('⏰ Next cleanup in 24 hours');
    await sleep('24 hours');
  }
}

/**
 * One-time cleanup workflow
 *
 * Executes cleanup once and completes.
 */
export async function ManualCleanupWorkflow(dryRun: boolean = false): Promise<void> {
  console.log(`🗑️  Manual cleanup workflow started (dry run: ${dryRun})`);

  const result = await cleanupData({ dryRun, triggeredBy: 'manual' });

  if (result.success) {
    console.log(
      `✅ Manual cleanup completed: ${result.deleted.totalRecords} records deleted`
    );
  } else {
    console.error(`❌ Manual cleanup failed: ${result.errors.join(', ')}`);
    throw new Error(`Cleanup failed: ${result.errors.join(', ')}`);
  }
}
