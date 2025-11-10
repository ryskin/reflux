/**
 * Example: Using n8n Nodes in REFLUX with Adapter
 *
 * This demonstrates how to load original n8n nodes and run them in REFLUX
 */
import { ServiceBroker } from 'moleculer';
import { createN8nNodeService, loadN8nNode } from '../packages/core/src/adapters/n8n-node-adapter';

async function example1_UseBuiltInN8nNode() {
  console.log('\n=== Example 1: Use n8n HTTP Request Node ===\n');

  const broker = new ServiceBroker({
    nodeID: 'n8n-adapter-demo',
    transporter: 'redis://localhost:6379',
    logger: true,
  });

  // Load original n8n HTTP Request node
  const HttpRequestNode = await loadN8nNode('n8n-nodes-base', 'HttpRequest');

  // Create REFLUX service from n8n node
  const HttpRequestService = createN8nNodeService(HttpRequestNode);

  // Register service
  broker.createService(HttpRequestService);

  await broker.start();

  // Call the node
  const result = await broker.call('1.0.0.nodes.n8n.httpRequest.execute', {
    url: 'https://api.github.com/repos/n8n-io/n8n',
    method: 'GET',
    json: true,
  });

  console.log('Result:', result.items[0].json);

  await broker.stop();
}

async function example2_UseN8nOpenAI() {
  console.log('\n=== Example 2: Use n8n OpenAI Node ===\n');

  const broker = new ServiceBroker({
    nodeID: 'n8n-openai-demo',
    transporter: 'redis://localhost:6379',
    logger: true,
  });

  // Load n8n OpenAI node
  const OpenAINode = await loadN8nNode('n8n-nodes-base', 'OpenAi');

  // Create service
  const OpenAIService = createN8nNodeService(OpenAINode);
  broker.createService(OpenAIService);

  await broker.start();

  // Set credentials
  process.env.N8N_CREDENTIALS_OPENAIAPI = JSON.stringify({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // Call the node (chat completion)
  const result = await broker.call('1.0.0.nodes.n8n.openAi.execute', {
    resource: 'chat',
    operation: 'complete',
    model: 'gpt-3.5-turbo',
    prompt: {
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'What is REFLUX?' },
      ],
    },
  });

  console.log('AI Response:', result.items[0].json);

  await broker.stop();
}

async function example3_UseN8nSlackNode() {
  console.log('\n=== Example 3: Use n8n Slack Node ===\n');

  const broker = new ServiceBroker({
    nodeID: 'n8n-slack-demo',
    logger: true,
  });

  // Load n8n Slack node
  const SlackNode = await loadN8nNode('n8n-nodes-base', 'Slack');

  // Create service
  const SlackService = createN8nNodeService(SlackNode);
  broker.createService(SlackService);

  await broker.start();

  // Set Slack credentials
  process.env.N8N_CREDENTIALS_SLACKAPI = JSON.stringify({
    token: process.env.SLACK_TOKEN,
  });

  // Send message to Slack
  const result = await broker.call('1.0.0.nodes.n8n.slack.execute', {
    resource: 'message',
    operation: 'post',
    channel: '#general',
    text: 'Hello from REFLUX with n8n adapter!',
  });

  console.log('Slack Result:', result.items[0].json);

  await broker.stop();
}

async function example4_WorkflowWithN8nNodes() {
  console.log('\n=== Example 4: Workflow with Multiple n8n Nodes ===\n');

  const broker = new ServiceBroker({
    nodeID: 'n8n-workflow-demo',
    transporter: 'redis://localhost:6379',
    logger: true,
  });

  // Load multiple n8n nodes
  const HttpNode = await loadN8nNode('n8n-nodes-base', 'HttpRequest');
  const SetNode = await loadN8nNode('n8n-nodes-base', 'Set');
  const IfNode = await loadN8nNode('n8n-nodes-base', 'If');

  // Register all as services
  broker.createService(createN8nNodeService(HttpNode));
  broker.createService(createN8nNodeService(SetNode));
  broker.createService(createN8nNodeService(IfNode));

  await broker.start();

  console.log('✅ Registered n8n nodes:');
  console.log('  - 1.0.0.nodes.n8n.httpRequest');
  console.log('  - 1.0.0.nodes.n8n.set');
  console.log('  - 1.0.0.nodes.n8n.if');

  // Now these can be used in REFLUX workflows!

  // Example workflow:
  const workflow = {
    name: 'Fetch and Filter GitHub Repos',
    steps: [
      {
        id: 'fetch-repos',
        node: '1.0.0.nodes.n8n.httpRequest',
        params: {
          url: 'https://api.github.com/users/n8n-io/repos',
          method: 'GET',
          json: true,
        },
      },
      {
        id: 'filter-stars',
        node: '1.0.0.nodes.n8n.set',
        params: {
          mode: 'manual',
          values: {
            name: '={{ $json.name }}',
            stars: '={{ $json.stargazers_count }}',
          },
        },
      },
      {
        id: 'check-popular',
        node: '1.0.0.nodes.n8n.if',
        params: {
          conditions: {
            number: [
              {
                value1: '={{ $json.stars }}',
                operation: 'largerEqual',
                value2: 100,
              },
            ],
          },
        },
      },
    ],
  };

  console.log('\nWorkflow ready to execute:', workflow.name);

  await broker.stop();
}

async function example5_LoadCommunityNode() {
  console.log('\n=== Example 5: Load Community n8n Node ===\n');

  const broker = new ServiceBroker({
    nodeID: 'n8n-community-demo',
    logger: true,
  });

  // Load community node (if installed)
  try {
    const NotionNode = await loadN8nNode('n8n-nodes-notion', 'Notion');
    const NotionService = createN8nNodeService(NotionNode);

    broker.createService(NotionService);
    await broker.start();

    console.log('✅ Loaded community node: Notion');
    console.log('   Service: 1.0.0.nodes.n8n.notion');

    await broker.stop();
  } catch (error: any) {
    console.log('❌ Community node not installed:', error.message);
    console.log('   Install with: npm install n8n-nodes-notion');
  }
}

// Run examples
async function main() {
  const examples = [
    example1_UseBuiltInN8nNode,
    example2_UseN8nOpenAI,
    example3_UseN8nSlackNode,
    example4_WorkflowWithN8nNodes,
    example5_LoadCommunityNode,
  ];

  for (const example of examples) {
    try {
      await example();
    } catch (error: any) {
      console.error(`Error in ${example.name}:`, error.message);
    }
  }
}

if (require.main === module) {
  main().catch(console.error);
}
