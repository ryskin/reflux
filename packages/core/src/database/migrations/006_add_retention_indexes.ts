/**
 * Migration: Add indexes for retention cleanup performance
 *
 * Adds indexes on timestamp/date columns used by retention cleanup queries
 * to prevent full table scans on large datasets.
 */

import { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Index on runs.completed_at for retention cleanup queries
  // Used to find old successful/failed/cancelled runs
  await db.schema
    .createIndex('runs_completed_at_idx')
    .on('runs')
    .column('completed_at')
    .execute();

  // Index on run_logs.timestamp for retention cleanup queries
  // Used to find old debug/info/warn/error logs
  await db.schema
    .createIndex('run_logs_timestamp_idx')
    .on('run_logs')
    .column('timestamp')
    .execute();

  // Index on artifacts.created_at for retention cleanup queries
  // Used to find old artifacts to delete
  await db.schema
    .createIndex('artifacts_created_at_idx')
    .on('artifacts')
    .column('created_at')
    .execute();

  // Index on flow_versions.created_at for retention cleanup queries
  // Used to find old flow versions to delete
  await db.schema
    .createIndex('flow_versions_created_at_idx')
    .on('flow_versions')
    .column('created_at')
    .execute();

  // Index on metrics.timestamp for retention cleanup queries
  // Used to find old raw metrics to delete
  await db.schema
    .createIndex('metrics_timestamp_idx')
    .on('metrics')
    .column('timestamp')
    .execute();

  // Composite index on runs(status, completed_at) for more efficient cleanup
  // Allows database to filter by status first, then find old records
  await db.schema
    .createIndex('runs_status_completed_at_idx')
    .on('runs')
    .columns(['status', 'completed_at'])
    .execute();

  // Composite index on run_logs(level, timestamp) for more efficient cleanup
  // Allows database to filter by level first, then find old logs
  await db.schema
    .createIndex('run_logs_level_timestamp_idx')
    .on('run_logs')
    .columns(['level', 'timestamp'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop composite indexes first
  await db.schema.dropIndex('run_logs_level_timestamp_idx').execute();
  await db.schema.dropIndex('runs_status_completed_at_idx').execute();

  // Drop single-column indexes
  await db.schema.dropIndex('metrics_timestamp_idx').execute();
  await db.schema.dropIndex('flow_versions_created_at_idx').execute();
  await db.schema.dropIndex('artifacts_created_at_idx').execute();
  await db.schema.dropIndex('run_logs_timestamp_idx').execute();
  await db.schema.dropIndex('runs_completed_at_idx').execute();
}
