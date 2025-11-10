/**
 * Node services broker - Starts all node implementation services
 */
import { ServiceBroker } from 'moleculer';
import HttpRequestNode from './http-request.service';
import TransformNode from './transform.service';
import WebhookTriggerNode from './webhook.service';
import ConditionNode from './condition.service';
import DatabaseNode from './database.service';
import EmailNode from './email.service';
import OpenAINode from './openai.service';
import OpenAIChatNode from './openai-chat.service';

async function main() {
  console.log('🚀 Starting node services broker...');

  const broker = new ServiceBroker({
    nodeID: `reflux-nodes-${Date.now()}`, // Unique nodeID to avoid conflicts
    transporter: process.env.TRANSPORTER || 'redis://localhost:6379',
    logger: true,
  });

  // Create services
  broker.createService(HttpRequestNode);
  broker.createService(TransformNode);
  broker.createService(WebhookTriggerNode);
  broker.createService(ConditionNode);
  broker.createService(DatabaseNode);
  broker.createService(EmailNode);
  broker.createService(OpenAINode);
  broker.createService(OpenAIChatNode);

  await broker.start();

  console.log('✅ Node services started:');
  console.log('  - 1.0.0.nodes.http.request');
  console.log('  - 1.0.0.nodes.transform.execute');
  console.log('  - 1.0.0.nodes.webhook.trigger');
  console.log('  - 1.0.0.nodes.condition.execute');
  console.log('  - 1.0.0.nodes.database.query');
  console.log('  - 1.0.0.nodes.email.send');
  console.log('  - 1.0.0.nodes.openai.chat (templated)');
  console.log('  - 1.0.0.nodes.openai.chat-v2 (n8n converted)');
}

main().catch(err => {
  console.error('❌ Failed to start node services:', err);
  process.exit(1);
});
