/**
 * Moleculer client for calling nodes from Temporal activities
 */

import { ServiceBroker } from 'moleculer';

let clientBroker: ServiceBroker | null = null;

/**
 * Get or create Moleculer client broker
 */
export function getMoleculerClient(): ServiceBroker {
  if (!clientBroker) {
    clientBroker = new ServiceBroker({
      nodeID: 'reflux-core-client',
      transporter: process.env.TRANSPORTER || 'redis://localhost:6379',
      requestTimeout: 30 * 1000,
      logger: false, // Disable logging for client
    });

    // Start the client broker
    clientBroker.start().then(() => {
      console.log('✅ Moleculer client connected');
    });
  }

  return clientBroker;
}

/**
 * Call a node via Moleculer
 */
export async function callNode(
  nodeName: string,
  version: string,
  params: Record<string, unknown>,
  meta?: Record<string, unknown>
): Promise<unknown> {
  const broker = getMoleculerClient();

  // Handle "latest" version by using "1.0.0" (TODO: implement proper version resolution)
  const resolvedVersion = version === 'latest' ? '1.0.0' : version;

  // Call format: "version.nodeName.execute"
  // Service is registered as "1.0.0.http.request" with action "execute"
  const action = `${resolvedVersion}.${nodeName}.execute`;

  try {
    const result = await broker.call(action, params, { meta });
    return result;
  } catch (error: any) {
    console.error(`❌ Failed to call ${nodeName}:`, error.message);
    throw error;
  }
}

/**
 * Get schema for a specific node action
 * Returns parameter definitions for auto-generating forms
 */
export async function getNodeSchema(nodeName: string, version: string = '1.0.0'): Promise<NodeSchema | null> {
  const broker = getMoleculerClient();

  // Ensure broker is started
  await broker.start();

  // Get all actions from the registry
  const actions = broker.registry.getActionList({});

  // Find the matching action
  const actionName = `${version}.${nodeName}.execute`;
  const actionInfo = actions.find((a: any) => a.name === actionName);

  if (!actionInfo) {
    return null;
  }

  // Extract params schema
  const params = actionInfo.action?.params || {};

  // Convert Moleculer params to form schema
  const fields: NodeSchemaField[] = Object.entries(params).map(([key, value]: [string, any]) => {
    // Handle shorthand syntax (e.g., 'string' instead of { type: 'string' })
    const paramDef = typeof value === 'string' ? { type: value } : value;

    return {
      key,
      type: mapMoleculerTypeToFormType(paramDef.type),
      label: formatLabel(key),
      required: !paramDef.optional,
      default: paramDef.default,
      placeholder: paramDef.default?.toString() || '',
      description: paramDef.description || '',
      min: paramDef.min,
      max: paramDef.max,
      options: paramDef.enum?.map((v: string) => ({ label: v, value: v })),
    };
  });

  return {
    nodeName,
    version,
    fields,
  };
}

/**
 * List all available node schemas
 */
export async function listNodeSchemas(): Promise<NodeSchema[]> {
  const broker = getMoleculerClient();

  // Ensure broker is started
  await broker.start();

  // Get all actions
  const actions = broker.registry.getActionList({});

  // Filter to node execute actions (pattern: X.X.X.nodes.*.execute)
  const nodeActions = actions.filter((a: any) =>
    a.name.match(/^\d+\.\d+\.\d+\.nodes\..+\.execute$/)
  );

  const schemas: NodeSchema[] = [];

  for (const action of nodeActions) {
    // Parse action name: "1.0.0.nodes.http.request.execute" -> { version: "1.0.0", nodeName: "nodes.http.request" }
    const parts = action.name.split('.');
    const version = parts.slice(0, 3).join('.');
    const nodeName = parts.slice(3, -1).join('.'); // Remove "execute" suffix

    const params = action.action?.params || {};

    const fields: NodeSchemaField[] = Object.entries(params).map(([key, value]: [string, any]) => {
      const paramDef = typeof value === 'string' ? { type: value } : value;

      return {
        key,
        type: mapMoleculerTypeToFormType(paramDef.type),
        label: formatLabel(key),
        required: !paramDef.optional,
        default: paramDef.default,
        placeholder: paramDef.default?.toString() || '',
        description: paramDef.description || '',
        min: paramDef.min,
        max: paramDef.max,
        options: paramDef.enum?.map((v: string) => ({ label: v, value: v })),
      };
    });

    schemas.push({
      nodeName,
      version,
      fields,
    });
  }

  return schemas;
}

// Types for node schema
export interface NodeSchemaField {
  key: string;
  type: 'text' | 'number' | 'boolean' | 'textarea' | 'select' | 'json';
  label: string;
  required: boolean;
  default?: any;
  placeholder?: string;
  description?: string;
  min?: number;
  max?: number;
  options?: Array<{ label: string; value: string }>;
}

export interface NodeSchema {
  nodeName: string;
  version: string;
  fields: NodeSchemaField[];
}

// Helper: Map Moleculer types to form field types
function mapMoleculerTypeToFormType(moleculerType: string): NodeSchemaField['type'] {
  switch (moleculerType) {
    case 'string':
      return 'text';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'object':
    case 'any':
      return 'json';
    case 'array':
      return 'json';
    default:
      return 'text';
  }
}

// Helper: Format key to readable label
function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1') // Add space before capitals
    .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
    .trim();
}

/**
 * Cleanup on shutdown
 */
export async function closeMoleculerClient(): Promise<void> {
  if (clientBroker) {
    await clientBroker.stop();
    clientBroker = null;
  }
}
