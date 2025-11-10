/**
 * Test script to verify Temporal connection
 */

import { Connection, Client } from '@temporalio/client';

async function main() {
  console.log('🔌 Connecting to Temporal...');

  try {
    // Connect to Temporal
    const connection = await Connection.connect({
      address: 'localhost:7233',
    });

    console.log('✅ Connected to Temporal server');

    // Create client
    const client = new Client({ connection });

    // List namespaces (basic health check)
    const systemClient = client.workflowService;
    const namespaces = await systemClient.listNamespaces({});

    console.log('✅ Temporal is healthy');
    console.log(`📋 Found ${namespaces.namespaces?.length || 0} namespace(s):`);

    namespaces.namespaces?.forEach(ns => {
      console.log(`   - ${ns.namespaceInfo?.name}`);
    });

    connection.close();
    console.log('\n🎉 Temporal connection test successful!');

  } catch (error) {
    console.error('❌ Connection failed:', error);
    process.exit(1);
  }
}

main();
