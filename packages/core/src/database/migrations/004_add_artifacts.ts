/**
 * Migration: Add artifacts table
 *
 * Stores metadata for large workflow outputs stored in object storage.
 */

import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Create artifacts table
  await db.schema
    .createTable('artifacts')
    .addColumn('id', 'uuid', (col) => col.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn('run_id', 'uuid', (col) => col.references('runs.id').onDelete('cascade').notNull())
    .addColumn('step_id', 'varchar(255)', (col) => col.notNull())
    .addColumn('key', 'text', (col) => col.notNull().unique())
    .addColumn('size_bytes', 'bigint', (col) => col.notNull())
    .addColumn('content_type', 'varchar(255)')
    .addColumn('storage_backend', 'varchar(50)', (col) => col.notNull())
    .addColumn('etag', 'varchar(255)')
    .addColumn('created_at', 'timestamp', (col) => col.defaultTo(sql`now()`).notNull())
    .addColumn('expires_at', 'timestamp')
    .execute();

  // Create indexes for common queries
  await db.schema
    .createIndex('artifacts_run_id_idx')
    .on('artifacts')
    .column('run_id')
    .execute();

  await db.schema
    .createIndex('artifacts_step_id_idx')
    .on('artifacts')
    .column('step_id')
    .execute();

  await db.schema
    .createIndex('artifacts_created_at_idx')
    .on('artifacts')
    .column('created_at')
    .execute();

  // Index for cleanup queries (find expired artifacts)
  await db.schema
    .createIndex('artifacts_expires_at_idx')
    .on('artifacts')
    .column('expires_at')
    .where('expires_at', 'is not', null)
    .execute();

  console.log('✅ Created artifacts table with indexes');
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('artifacts').execute();
  console.log('✅ Dropped artifacts table');
}
