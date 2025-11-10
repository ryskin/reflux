/**
 * Test database operations
 */

import {
  FlowRepository,
  RunRepository,
  NodeRepository,
  closeDatabase,
} from './database';
import { WorkflowSpec } from './types';

const testFlowSpec: WorkflowSpec = {
  name: 'test_flow',
  version: '1.0.0',
  description: 'Test workflow for database',
  steps: [
    {
      id: 'step1',
      node: 'http.request',
      with: {
        url: 'https://api.example.com',
        method: 'GET',
      },
    },
  ],
};

async function main() {
  console.log('🧪 Testing database operations...\n');

  try {
    // Test Flow Repository
    console.log('📝 Testing FlowRepository...');
    const flow = await FlowRepository.create({
      name: testFlowSpec.name,
      version: testFlowSpec.version,
      description: testFlowSpec.description || null,
      spec: testFlowSpec,
      tags: ['test', 'example'],
    });
    console.log(`✅ Created flow: ${flow.id} (${flow.name}@${flow.version})`);

    const retrievedFlow = await FlowRepository.getById(flow.id);
    console.log(`✅ Retrieved flow: ${retrievedFlow?.name}`);

    const activeFlows = await FlowRepository.listActive();
    console.log(`✅ Found ${activeFlows.length} active flow(s)`);

    // Test Run Repository
    console.log('\n📊 Testing RunRepository...');
    const run = await RunRepository.create({
      flow_id: flow.id,
      flow_version: flow.version,
      status: 'running',
      inputs: { test: 'data' },
      temporal_workflow_id: `wf-${Date.now()}`,
      temporal_run_id: `run-${Date.now()}`,
    });
    console.log(`✅ Created run: ${run.id} (status: ${run.status})`);

    await RunRepository.markCompleted(run.id, { result: 'success' });
    const completedRun = await RunRepository.getById(run.id);
    console.log(`✅ Marked run as completed (status: ${completedRun?.status})`);

    const flowStats = await RunRepository.getFlowStats(flow.id);
    console.log(
      `✅ Flow stats: ${flowStats.total} total, ${flowStats.completed} completed`
    );

    // Test Node Repository
    console.log('\n🔧 Testing NodeRepository...');
    const node = await NodeRepository.register({
      name: 'test.node',
      version: '1.0.0',
      manifest: {
        name: 'test.node',
        version: '1.0.0',
        displayName: 'Test Node',
        description: 'A test node',
        category: 'test',
        inputs: { input: 'string' },
        outputs: { output: 'string' },
        policies: {
          timeoutSec: 30,
          retries: [1, 3, 5],
          idempotency: 'sha1(inputs)',
        },
        metrics: [],
        tags: ['test'],
      },
    });
    console.log(`✅ Registered node: ${node.name}@${node.version}`);

    const activeNodes = await NodeRepository.listActive();
    console.log(`✅ Found ${activeNodes.length} active node(s)`);

    // Test version creation
    console.log('\n📌 Testing version tracking...');
    const version = await FlowRepository.createVersion({
      flow_id: flow.id,
      version: '1.0.1',
      spec: testFlowSpec,
      changelog: 'Test version update',
    });
    console.log(`✅ Created version: ${version.version}`);

    const versions = await FlowRepository.getVersions(flow.id);
    console.log(`✅ Flow has ${versions.length} version(s)`);

    console.log('\n✅ All database tests passed!');
  } catch (error) {
    console.error('\n❌ Database test failed:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

main();
