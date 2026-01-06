/**
 * Add run logs and duration tracking
 */

import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Add duration_ms column to runs table
  await db.schema
    .alterTable('runs')
    .addColumn('duration_ms', 'integer')
    .execute();

  // Create run_logs table
  await db.schema
    .createTable('run_logs')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('run_id', 'uuid', (col) =>
      col.references('runs.id').onDelete('cascade').notNull()
    )
    .addColumn('step_id', 'varchar(255)', (col) => col.notNull())
    .addColumn('timestamp', 'timestamp', (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .addColumn('level', 'varchar(20)', (col) => col.notNull())
    .addColumn('message', 'text', (col) => col.notNull())
    .addColumn('data', 'jsonb')
    .execute();

  // Add dedicated index on run_id for high-cardinality queries
  await db.schema
    .createIndex('run_logs_run_id_idx')
    .on('run_logs')
    .column('run_id')
    .execute();

  // Add index on run_id and timestamp for efficient log retrieval with time filtering
  await db.schema
    .createIndex('run_logs_run_id_timestamp_idx')
    .on('run_logs')
    .columns(['run_id', 'timestamp'])
    .execute();

  // Add index on run_id and level for filtering by level
  await db.schema
    .createIndex('run_logs_run_id_level_idx')
    .on('run_logs')
    .columns(['run_id', 'level'])
    .execute();

  // Add index on step_id for step-specific log queries
  await db.schema
    .createIndex('run_logs_step_id_idx')
    .on('run_logs')
    .column('step_id')
    .execute();

  // Add composite index on runs table for status-based queries
  await db.schema
    .createIndex('runs_status_started_at_idx')
    .on('runs')
    .columns(['status', 'started_at'])
    .execute();

  // Add partial index for active runs (pending/running) - most queried subset
  await sql`
    CREATE INDEX runs_active_idx
    ON runs(started_at DESC)
    WHERE status IN ('pending', 'running')
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  // Drop indexes (in reverse order)
  await sql`DROP INDEX IF EXISTS runs_active_idx`.execute(db);
  await db.schema.dropIndex('runs_status_started_at_idx').execute();
  await db.schema.dropIndex('run_logs_step_id_idx').execute();
  await db.schema.dropIndex('run_logs_run_id_level_idx').execute();
  await db.schema.dropIndex('run_logs_run_id_timestamp_idx').execute();
  await db.schema.dropIndex('run_logs_run_id_idx').execute();

  // Drop run_logs table
  await db.schema.dropTable('run_logs').execute();

  // Remove duration_ms column from runs
  await db.schema
    .alterTable('runs')
    .dropColumn('duration_ms')
    .execute();
}
