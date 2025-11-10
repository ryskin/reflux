/**
 * Run database migrations
 */
import { migrateToLatest } from '../database/db';

async function main() {
  console.log('🔄 Running database migrations...\n');

  try {
    await migrateToLatest();
    console.log('\n✅ Database migrations completed successfully');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
