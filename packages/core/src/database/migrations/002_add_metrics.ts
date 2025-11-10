/**
 * Add metrics table for execution monitoring
 */

import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Create metrics table
  await db.schema
    .createTable('metrics')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`)
    )
    .addColumn('timestamp', 'timestamp', (col) =>
      col.defaultTo(sql`now()`).notNull()
    )
    .addColumn('metric_type', 'varchar(50)', (col) => col.notNull())

    // References
    .addColumn('flow_id', 'uuid', (col) =>
      col.references('flows.id').onDelete('cascade')
    )
    .addColumn('run_id', 'uuid', (col) =>
      col.references('runs.id').onDelete('cascade')
    )
    .addColumn('node_id', 'varchar(255)')

    // Execution metrics
    .addColumn('duration_ms', 'integer')
    .addColumn('status', 'varchar(20)')
    .addColumn('error_type', 'varchar(100)')

    // Resource metrics
    .addColumn('memory_used_mb', sql`numeric(10,2)`)
    .addColumn('cpu_percent', sql`numeric(5,2)`)

    // Custom dimensions
    .addColumn('tags', sql`text[]`, (col) => col.defaultTo(sql`ARRAY[]::text[]`))
    .addColumn('metadata', 'jsonb')
    .execute();

  // Indexes for common queries
  await db.schema
    .createIndex('metrics_timestamp_idx')
    .on('metrics')
    .column('timestamp')
    .execute();

  await db.schema
    .createIndex('metrics_flow_id_idx')
    .on('metrics')
    .column('flow_id')
    .execute();

  await db.schema
    .createIndex('metrics_run_id_idx')
    .on('metrics')
    .column('run_id')
    .execute();

  await db.schema
    .createIndex('metrics_metric_type_idx')
    .on('metrics')
    .column('metric_type')
    .execute();

  await db.schema
    .createIndex('metrics_status_idx')
    .on('metrics')
    .column('status')
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('metrics').execute();
}
