/**
 * Initial database schema migration
 */

import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Create flows table
  await db.schema
    .createTable('flows')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('version', 'varchar(50)', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('spec', 'jsonb', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .addColumn('updated_at', 'timestamp', (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .addColumn('created_by', 'varchar(255)')
    .addColumn('tags', sql`text[]`, (col) => col.defaultTo(sql`ARRAY[]::text[]`))
    .addColumn('is_active', 'boolean', (col) => col.defaultTo(true).notNull())
    .execute();

  // Add unique constraint on name+version
  await db.schema
    .createIndex('flows_name_version_idx')
    .on('flows')
    .columns(['name', 'version'])
    .unique()
    .execute();

  // Create flow_versions table
  await db.schema
    .createTable('flow_versions')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('flow_id', 'uuid', (col) =>
      col.references('flows.id').onDelete('cascade').notNull()
    )
    .addColumn('version', 'varchar(50)', (col) => col.notNull())
    .addColumn('spec', 'jsonb', (col) => col.notNull())
    .addColumn('created_at', 'timestamp', (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .addColumn('created_by', 'varchar(255)')
    .addColumn('changelog', 'text')
    .execute();

  // Create runs table
  await db.schema
    .createTable('runs')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('flow_id', 'uuid', (col) =>
      col.references('flows.id').onDelete('cascade').notNull()
    )
    .addColumn('flow_version', 'varchar(50)', (col) => col.notNull())
    .addColumn('status', 'varchar(20)', (col) => col.notNull())
    .addColumn('inputs', 'jsonb', (col) => col.notNull())
    .addColumn('outputs', 'jsonb')
    .addColumn('started_at', 'timestamp', (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .addColumn('completed_at', 'timestamp')
    .addColumn('error', 'text')
    .addColumn('temporal_workflow_id', 'varchar(255)', (col) => col.notNull())
    .addColumn('temporal_run_id', 'varchar(255)', (col) => col.notNull())
    .addColumn('created_by', 'varchar(255)')
    .addColumn('metadata', 'jsonb')
    .execute();

  // Add index on temporal IDs for lookups
  await db.schema
    .createIndex('runs_temporal_workflow_id_idx')
    .on('runs')
    .column('temporal_workflow_id')
    .execute();

  // Add index on status for filtering
  await db.schema
    .createIndex('runs_status_idx')
    .on('runs')
    .column('status')
    .execute();

  // Create nodes table
  await db.schema
    .createTable('nodes')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('name', 'varchar(255)', (col) => col.notNull())
    .addColumn('version', 'varchar(50)', (col) => col.notNull())
    .addColumn('manifest', 'jsonb', (col) => col.notNull())
    .addColumn('is_active', 'boolean', (col) => col.defaultTo(true).notNull())
    .addColumn('registered_at', 'timestamp', (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .addColumn('last_seen_at', 'timestamp', (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .execute();

  // Add unique constraint on name+version
  await db.schema
    .createIndex('nodes_name_version_idx')
    .on('nodes')
    .columns(['name', 'version'])
    .unique()
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('nodes').execute();
  await db.schema.dropTable('runs').execute();
  await db.schema.dropTable('flow_versions').execute();
  await db.schema.dropTable('flows').execute();
}
