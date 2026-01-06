/**
 * Temporal worker for REFLUX
 */

import { Worker, NativeConnection } from '@temporalio/worker';
import * as activities from './activities';
import { resolve } from 'path';
import { initTracing } from './tracing';

async function main() {
  // Initialize OpenTelemetry tracing
  initTracing({
    enabled: process.env.OTEL_ENABLED !== 'false',
    serviceName: 'reflux-worker',
    serviceVersion: '0.1.0',
    otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    environment: process.env.NODE_ENV || 'development',
  });

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
