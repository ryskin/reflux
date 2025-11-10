/**
 * Database connection and migration utilities
 */

import { Kysely, PostgresDialect, Migrator, FileMigrationProvider } from 'kysely';
import { Pool } from 'pg';
import { Database } from './schema';
import { promises as fs } from 'fs';
import * as path from 'path';

let db: Kysely<Database> | null = null;

/**
 * Get or create database connection
 */
export function getDatabase(): Kysely<Database> {
  if (!db) {
    const connectionString =
      process.env.DATABASE_URL || 'postgres://reflux:reflux@localhost:5432/reflux';

    db = new Kysely<Database>({
      dialect: new PostgresDialect({
        pool: new Pool({
          connectionString,
          max: 10,
        }),
      }),
    });
  }

  return db;
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.destroy();
    db = null;
  }
}

/**
 * Run database migrations
 */
export async function migrateToLatest(): Promise<void> {
  const database = getDatabase();

  const migrator = new Migrator({
    db: database,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname, 'migrations'),
    }),
  });

  const { error, results } = await migrator.migrateToLatest();

  results?.forEach((it) => {
    if (it.status === 'Success') {
      console.log(`✅ Migration "${it.migrationName}" executed successfully`);
    } else if (it.status === 'Error') {
      console.error(`❌ Migration "${it.migrationName}" failed`);
    }
  });

  if (error) {
    console.error('❌ Failed to migrate database');
    console.error(error);
    throw error;
  }

  console.log('✅ All migrations completed');
}

/**
 * Rollback all migrations (for testing)
 */
export async function migrateDown(): Promise<void> {
  const database = getDatabase();

  const migrator = new Migrator({
    db: database,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname, 'migrations'),
    }),
  });

  const { error, results } = await migrator.migrateDown();

  results?.forEach((it) => {
    if (it.status === 'Success') {
      console.log(`✅ Rollback "${it.migrationName}" executed successfully`);
    } else if (it.status === 'Error') {
      console.error(`❌ Rollback "${it.migrationName}" failed`);
    }
  });

  if (error) {
    console.error('❌ Failed to rollback migrations');
    console.error(error);
    throw error;
  }
}
