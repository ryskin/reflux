/**
 * Migration: Add cleanup audit log table
 *
 * Tracks all cleanup operations for compliance and debugging
 */

import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Create cleanup_audit table
  await db.schema
    .createTable('cleanup_audit')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('started_at', 'timestamp', (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .addColumn('completed_at', 'timestamp')
    .addColumn('duration_ms', 'integer')
    .addColumn('success', 'boolean', (col) => col.notNull())
    .addColumn('dry_run', 'boolean', (col) => col.notNull().defaultTo(false))

    // Retention policy snapshot
    .addColumn('retention_policy', 'jsonb', (col) => col.notNull())

    // Cleanup results
    .addColumn('preview', 'jsonb', (col) => col.notNull())
    .addColumn('deleted', 'jsonb')

    // Errors
    .addColumn('errors', sql`text[]`, (col) => col.defaultTo(sql`ARRAY[]::text[]`))

    // Metadata
    .addColumn('triggered_by', 'varchar(255)') // 'scheduled' | 'manual' | user ID
    .addColumn('metadata', 'jsonb')
    .execute();

  // Add index on started_at for time-based queries
  await db.schema
    .createIndex('cleanup_audit_started_at_idx')
    .on('cleanup_audit')
    .column('started_at')
    .execute();

  // Add index on success for filtering
  await db.schema
    .createIndex('cleanup_audit_success_idx')
    .on('cleanup_audit')
    .column('success')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('cleanup_audit').execute();
}
