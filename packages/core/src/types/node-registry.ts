/**
 * Node registry with schema definitions for all node types
 */

import { NodeSchema } from './node-schema';

export const NODE_REGISTRY: Record<string, NodeSchema> = {
  // TRIGGERS
  'nodes.webhook.trigger': {
    type: 'nodes.webhook.trigger',
    label: 'Webhook Trigger',
    description: 'Receives HTTP requests and triggers workflow execution',
    category: 'trigger',
    icon: 'webhook',
    color: '#10b981',
    inputs: [],
    outputs: [
      {
        name: 'payload',
        type: 'webhook.payload',
        description: 'Full webhook request data (method, path, headers, query, body)',
        required: true,
      },
      {
        name: 'body',
        type: 'json',
        description: 'Request body as JSON',
      },
      {
        name: 'headers',
        type: 'object',
        description: 'Request headers',
      },
      {
        name: 'query',
        type: 'object',
        description: 'Query parameters',
      },
    ],
  },

  // ACTIONS
  'nodes.openai.chat': {
    type: 'nodes.openai.chat',
    label: 'OpenAI Chat',
    description: 'Send messages to OpenAI GPT models',
    category: 'action',
    icon: 'brain',
    color: '#8b5cf6',
    inputs: [
      {
        name: 'prompt',
        type: 'string',
        required: true,
        description: 'The prompt/message to send to OpenAI',
      },
      {
        name: 'model',
        type: 'string',
        description: 'Model to use (default: gpt-4)',
      },
      {
        name: 'temperature',
        type: 'number',
        description: 'Creativity level 0-1 (default: 0.7)',
      },
      {
        name: 'systemPrompt',
        type: 'string',
        description: 'System instructions for the AI',
      },
    ],
    outputs: [
      {
        name: 'response',
        type: 'openai.message',
        required: true,
        description: 'AI response message',
      },
      {
        name: 'content',
        type: 'string',
        required: true,
        description: 'Response text content',
      },
      {
        name: 'usage',
        type: 'object',
        description: 'Token usage statistics',
      },
    ],
  },

  'nodes.http.request': {
    type: 'nodes.http.request',
    label: 'HTTP Request',
    description: 'Make HTTP requests to external APIs',
    category: 'action',
    icon: 'globe',
    color: '#3b82f6',
    inputs: [
      {
        name: 'url',
        type: 'string',
        required: true,
        description: 'Request URL',
      },
      {
        name: 'method',
        type: 'string',
        description: 'HTTP method (GET, POST, PUT, DELETE)',
      },
      {
        name: 'headers',
        type: 'object',
        description: 'Request headers',
      },
      {
        name: 'body',
        type: 'json',
        description: 'Request body',
      },
      {
        name: 'query',
        type: 'object',
        description: 'Query parameters',
      },
    ],
    outputs: [
      {
        name: 'response',
        type: 'http.response',
        required: true,
        description: 'Full HTTP response',
      },
      {
        name: 'body',
        type: 'json',
        description: 'Response body',
      },
      {
        name: 'status',
        type: 'number',
        description: 'HTTP status code',
      },
      {
        name: 'headers',
        type: 'object',
        description: 'Response headers',
      },
    ],
  },

  'nodes.database.query': {
    type: 'nodes.database.query',
    label: 'Database Query',
    description: 'Execute SQL queries on the database',
    category: 'action',
    icon: 'database',
    color: '#f59e0b',
    inputs: [
      {
        name: 'query',
        type: 'string',
        required: true,
        description: 'SQL query to execute',
      },
      {
        name: 'params',
        type: 'array',
        description: 'Query parameters',
      },
    ],
    outputs: [
      {
        name: 'rows',
        type: 'array',
        required: true,
        description: 'Query result rows',
      },
      {
        name: 'count',
        type: 'number',
        description: 'Number of rows returned',
      },
    ],
  },

  'nodes.email.send': {
    type: 'nodes.email.send',
    label: 'Send Email',
    description: 'Send emails via SMTP',
    category: 'action',
    icon: 'mail',
    color: '#ef4444',
    inputs: [
      {
        name: 'to',
        type: 'string',
        required: true,
        description: 'Recipient email address',
      },
      {
        name: 'subject',
        type: 'string',
        required: true,
        description: 'Email subject',
      },
      {
        name: 'body',
        type: 'string',
        required: true,
        description: 'Email body (HTML or text)',
      },
      {
        name: 'from',
        type: 'string',
        description: 'Sender email address',
      },
    ],
    outputs: [
      {
        name: 'messageId',
        type: 'string',
        required: true,
        description: 'Email message ID',
      },
      {
        name: 'success',
        type: 'boolean',
        required: true,
        description: 'Whether email was sent successfully',
      },
    ],
  },

  // LOGIC & TRANSFORM
  'nodes.condition.execute': {
    type: 'nodes.condition.execute',
    label: 'Condition',
    description: 'Branch workflow based on conditions',
    category: 'logic',
    icon: 'git-branch',
    color: '#06b6d4',
    inputs: [
      {
        name: 'value',
        type: 'any',
        required: true,
        description: 'Value to evaluate',
      },
      {
        name: 'condition',
        type: 'string',
        required: true,
        description: 'Condition expression',
      },
    ],
    outputs: [
      {
        name: 'true',
        type: 'any',
        description: 'Output if condition is true',
      },
      {
        name: 'false',
        type: 'any',
        description: 'Output if condition is false',
      },
      {
        name: 'result',
        type: 'boolean',
        required: true,
        description: 'Condition result',
      },
    ],
  },

  'nodes.transform.execute': {
    type: 'nodes.transform.execute',
    label: 'Transform',
    description: 'Transform data using JavaScript code',
    category: 'transform',
    icon: 'code',
    color: '#a855f7',
    inputs: [
      {
        name: 'input',
        type: 'any',
        required: true,
        description: 'Input data to transform',
      },
      {
        name: 'code',
        type: 'string',
        required: true,
        description: 'JavaScript transformation code',
      },
    ],
    outputs: [
      {
        name: 'output',
        type: 'any',
        required: true,
        description: 'Transformed output data',
      },
    ],
  },
};

/**
 * Get node schema by type
 */
export function getNodeSchema(nodeType: string): NodeSchema | undefined {
  return NODE_REGISTRY[nodeType];
}

/**
 * Get all node schemas by category
 */
export function getNodesByCategory(category: NodeSchema['category']): NodeSchema[] {
  return Object.values(NODE_REGISTRY).filter(node => node.category === category);
}

/**
 * Get all node types
 */
export function getAllNodeTypes(): string[] {
  return Object.keys(NODE_REGISTRY);
}
