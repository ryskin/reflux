/**
 * Inspect n8n node structure
 */
import { loadN8nNode } from '../packages/core/src/adapters/n8n-node-adapter';

async function inspect() {
  console.log('🔍 Inspecting n8n HttpRequest node\n');

  const node = await loadN8nNode('n8n-nodes-base', 'HttpRequest');

  console.log('Node structure:');
  console.log('- displayName:', node.description.displayName);
  console.log('- name:', node.description.name);
  console.log('- version:', node.description.version);
  console.log('- inputs:', node.description.inputs);
  console.log('- outputs:', node.description.outputs);
  console.log('\nMethods:');
  console.log('- execute:', typeof node.execute);
  console.log('- webhook:', typeof (node as any).webhook);
  console.log('- webhookMethods:', typeof (node as any).webhookMethods);
  console.log('\nOther properties:');
  const keys = Object.keys(node).filter(k => k !== 'description');
  console.log('Keys:', keys);

  console.log('\nDescription properties type:', typeof node.description.properties);
  console.log('Description properties:', node.description.properties);

  console.log('\nFull description keys:', Object.keys(node.description));
}

inspect().catch(console.error);
