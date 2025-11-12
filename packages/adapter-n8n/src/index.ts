/**
 * @reflux/adapter-n8n - n8n node compatibility adapter
 *
 * ⚠️ This package uses n8n's Sustainable Use License
 * See LICENSE.md for commercial use restrictions
 */

export * from './adapter';
export * from './cache';
export * from './migration';

// Re-export n8n types for convenience
export type {
  INodeExecutionData,
  INodeTypeDescription,
  INodeType,
  IExecuteFunctions,
} from './adapter';
