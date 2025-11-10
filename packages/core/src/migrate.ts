/**
 * Database migration script
 */

import { migrateToLatest, closeDatabase } from './database/db';

async function main() {
  console.log('🔄 Running database migrations...\n');

  try {
    await migrateToLatest();
    console.log('\n✅ Database ready!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

main();
