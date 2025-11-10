/**
 * n8n workflow types for migration
 * Based on n8n export format
 */

export interface N8nWorkflow {
  name: string;
  nodes: N8nNode[];
  connections: N8nConnections;
  active: boolean;
  settings?: N8nWorkflowSettings;
  staticData?: unknown;
  tags?: string[];
  pinData?: Record<string, unknown>;
  versionId?: string;
}

export interface N8nNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, unknown>;
  credentials?: Record<string, { id: string; name: string }>;
  webhookId?: string;
  disabled?: boolean;
  notesInFlow?: boolean;
  notes?: string;
}

export interface N8nConnections {
  [sourceNodeName: string]: {
    main?: N8nConnection[][];
  };
}

export interface N8nConnection {
  node: string;
  type: 'main' | 'ai_tool' | 'ai_chain';
  index: number;
}

export interface N8nWorkflowSettings {
  executionOrder?: 'v0' | 'v1';
  saveDataErrorExecution?: 'all' | 'none';
  saveDataSuccessExecution?: 'all' | 'none';
  saveManualExecutions?: boolean;
  callerPolicy?: 'any' | 'workflowsFromSameOwner' | 'workflowsFromAList';
  timezone?: string;
  errorWorkflow?: string;
}

// Node type mappings
export const N8N_TO_REFLUX_NODE_MAP: Record<string, string> = {
  // Core nodes
  'n8n-nodes-base.httpRequest': 'nodes.http.request',
  'n8n-nodes-base.webhook': 'nodes.webhook.trigger',
  'n8n-nodes-base.code': 'nodes.transform.execute',
  'n8n-nodes-base.function': 'nodes.transform.execute',
  'n8n-nodes-base.functionItem': 'nodes.transform.execute',
  'n8n-nodes-base.set': 'nodes.transform.execute',
  'n8n-nodes-base.if': 'nodes.condition.execute',
  'n8n-nodes-base.switch': 'nodes.condition.execute',

  // Database nodes
  'n8n-nodes-base.postgres': 'nodes.database.query',
  'n8n-nodes-base.mysql': 'nodes.database.query',
  'n8n-nodes-base.mongodb': 'nodes.database.query',

  // Communication
  'n8n-nodes-base.emailSend': 'nodes.email.send',
  'n8n-nodes-base.slack': 'nodes.slack.send',
  'n8n-nodes-base.telegram': 'nodes.telegram.send',

  // AI nodes
  'n8n-nodes-base.openAi': 'nodes.openai.chat',
  '@n8n/n8n-nodes-langchain.openAi': 'nodes.openai.chat',

  // Utilities
  'n8n-nodes-base.wait': 'nodes.util.delay',
  'n8n-nodes-base.merge': 'nodes.util.merge',
  'n8n-nodes-base.split': 'nodes.util.split',
  'n8n-nodes-base.loop': 'nodes.util.loop',
};
