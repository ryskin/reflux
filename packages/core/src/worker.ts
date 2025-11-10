/**
 * Temporal worker for REFLUX
 */

import { Worker, NativeConnection } from '@temporalio/worker';
import * as activities from './activities';
import { resolve } from 'path';

async function main() {
  console.log('🔌 Connecting to Temporal...');

  const connection = await NativeConnection.connect({
    address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
  });

  console.log('✅ Connected to Temporal');

  const worker = await Worker.create({
    connection,
    namespace: 'default',
    taskQueue: 'reflux',
    workflowsPath: resolve(__dirname, './workflows'),
    activities,
  });

  console.log('🚀 Worker started on task queue: reflux');
  console.log('📋 Workflows path:', resolve(__dirname, './workflows'));
  console.log('⏳ Polling for work...\n');

  await worker.run();
}

main().catch(err => {
  console.error('❌ Worker failed:', err);
  process.exit(1);
});
