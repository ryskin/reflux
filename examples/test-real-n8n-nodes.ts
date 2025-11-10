/**
 * Test real n8n nodes with adapter
 */
import { ServiceBroker } from 'moleculer';
import { createN8nNodeService, loadN8nNode } from '../packages/core/src/adapters/n8n-node-adapter';

async function testHttpRequest() {
  console.log('\n=== Test 1: HTTP Request Node ===\n');

  const broker = new ServiceBroker({
    nodeID: 'test-http',
    logger: {
      type: 'Console',
      options: { level: 'info' },
    },
  });

  try {
    // Load HTTP Request node from n8n
    console.log('Loading HttpRequest node from n8n-nodes-base...');
    const HttpRequestNode = await loadN8nNode('n8n-nodes-base', 'HttpRequest');

    console.log('✅ Loaded:', HttpRequestNode.description.displayName);
    console.log('   Version:', HttpRequestNode.description.version);

    // Create service
    const HttpService = createN8nNodeService(HttpRequestNode);
    broker.createService(HttpService);

    await broker.start();

    console.log('\n✅ Service registered: 1.0.0.nodes.n8n.httpRequest');

    // Make API call
    console.log('\nCalling GitHub API...');
    const result: any = await broker.call('1.0.0.nodes.n8n.httpRequest.execute', {
      url: 'https://api.github.com/repos/n8n-io/n8n',
      method: 'GET',
      options: {
        response: {
          response: {
            fullResponse: false,
            responseFormat: 'json',
          },
        },
      },
    });

    console.log('\n✅ Result:');
    console.log('   Repo:', result.items[0]?.json?.name);
    console.log('   Stars:', result.items[0]?.json?.stargazers_count);
    console.log('   Description:', result.items[0]?.json?.description?.substring(0, 80) + '...');

    await broker.stop();
    return true;
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    await broker.stop();
    return false;
  }
}

async function testSetNode() {
  console.log('\n=== Test 2: Set Node (Data Transform) ===\n');

  const broker = new ServiceBroker({
    nodeID: 'test-set',
    logger: {
      type: 'Console',
      options: { level: 'info' },
    },
  });

  try {
    console.log('Loading Set node from n8n-nodes-base...');
    const SetNode = await loadN8nNode('n8n-nodes-base', 'Set');

    console.log('✅ Loaded:', SetNode.description.displayName);

    const SetService = createN8nNodeService(SetNode);
    broker.createService(SetService);

    await broker.start();

    console.log('\n✅ Service registered: 1.0.0.nodes.n8n.set');

    // Transform data
    const result: any = await broker.call('1.0.0.nodes.n8n.set.execute', {
      mode: 'manual',
      duplicateItem: false,
      assignments: {
        assignments: [
          {
            id: '1',
            name: 'name',
            value: 'John Doe',
            type: 'string',
          },
          {
            id: '2',
            name: 'age',
            value: 30,
            type: 'number',
          },
        ],
      },
    }, {
      meta: {
        items: [{ json: {} }],
      },
    });

    console.log('\n✅ Result:');
    console.log('   Transformed data:', result.items[0]?.json);

    await broker.stop();
    return true;
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    await broker.stop();
    return false;
  }
}

async function testIfNode() {
  console.log('\n=== Test 3: IF Node (Conditions) ===\n');

  const broker = new ServiceBroker({
    nodeID: 'test-if',
    logger: {
      type: 'Console',
      options: { level: 'info' },
    },
  });

  try {
    console.log('Loading If node from n8n-nodes-base...');
    const IfNode = await loadN8nNode('n8n-nodes-base', 'If');

    console.log('✅ Loaded:', IfNode.description.displayName);

    const IfService = createN8nNodeService(IfNode);
    broker.createService(IfService);

    await broker.start();

    console.log('\n✅ Service registered: 1.0.0.nodes.n8n.if');

    // Test condition
    const result: any = await broker.call('1.0.0.nodes.n8n.if.execute', {
      conditions: {
        number: [
          {
            value1: 100,
            operation: 'larger',
            value2: 50,
          },
        ],
      },
    }, {
      meta: {
        items: [{ json: { value: 100 } }],
      },
    });

    console.log('\n✅ Result:');
    console.log('   Condition passed:', result.items?.length > 0);

    await broker.stop();
    return true;
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    await broker.stop();
    return false;
  }
}

async function discoverNodes() {
  console.log('\n=== Available n8n Nodes ===\n');

  const commonNodes = [
    'HttpRequest',
    'Set',
    'If',
    'Code',
    'Switch',
    'Merge',
    'Split',
    'DateTime',
    'Crypto',
  ];

  console.log('Checking which nodes are available...\n');

  for (const nodeName of commonNodes) {
    try {
      const node = await loadN8nNode('n8n-nodes-base', nodeName);
      console.log(`✅ ${nodeName.padEnd(20)} - ${node.description.displayName}`);
    } catch (error) {
      console.log(`❌ ${nodeName.padEnd(20)} - Not found`);
    }
  }
}

async function main() {
  console.log('🧪 Testing Real n8n Nodes with Adapter\n');
  console.log('='.repeat(50));

  const results = {
    httpRequest: false,
    setNode: false,
    ifNode: false,
  };

  // Test 1: HTTP Request
  results.httpRequest = await testHttpRequest();
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 2: Set Node
  results.setNode = await testSetNode();
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 3: IF Node
  results.ifNode = await testIfNode();
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Discover available nodes
  await discoverNodes();

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('\n📊 Test Summary\n');
  console.log(`HTTP Request: ${results.httpRequest ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Set Node:     ${results.setNode ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`IF Node:      ${results.ifNode ? '✅ PASSED' : '❌ FAILED'}`);

  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.values(results).length;

  console.log(`\n${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('\n🎉 All tests passed! n8n adapter is working!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
