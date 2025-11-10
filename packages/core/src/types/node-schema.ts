/**
 * Node schema definitions for validation
 */

export type DataType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'any'
  | 'json'
  | 'http.request'
  | 'http.response'
  | 'openai.message'
  | 'webhook.payload';

export interface NodePort {
  name: string;
  type: DataType;
  required?: boolean;
  description?: string;
}

export interface NodeSchema {
  type: string; // e.g., 'nodes.webhook.trigger'
  label: string;
  description: string;
  inputs: NodePort[];
  outputs: NodePort[];
  category: 'trigger' | 'action' | 'logic' | 'transform';
  icon?: string;
  color?: string;
}

/**
 * Check if two data types are compatible for connection
 */
export function areTypesCompatible(sourceType: DataType, targetType: DataType): boolean {
  // 'any' is compatible with everything
  if (sourceType === 'any' || targetType === 'any') {
    return true;
  }

  // Exact match
  if (sourceType === targetType) {
    return true;
  }

  // JSON can be converted to object or array
  if (sourceType === 'json' && (targetType === 'object' || targetType === 'array')) {
    return true;
  }

  // Object/array can be converted to JSON
  if ((sourceType === 'object' || sourceType === 'array') && targetType === 'json') {
    return true;
  }

  // HTTP response can be used as generic object
  if (sourceType === 'http.response' && targetType === 'object') {
    return true;
  }

  // Webhook payload can be used as generic object
  if (sourceType === 'webhook.payload' && targetType === 'object') {
    return true;
  }

  // OpenAI message can be used as string
  if (sourceType === 'openai.message' && targetType === 'string') {
    return true;
  }

  // Object types can flow into string fields (for variable templating like {{body.field}})
  if ((sourceType === 'object' || sourceType === 'json' || sourceType === 'webhook.payload') && targetType === 'string') {
    return true;
  }

  // Object types can flow into number fields (for variable templating)
  if ((sourceType === 'object' || sourceType === 'json' || sourceType === 'webhook.payload') && targetType === 'number') {
    return true;
  }

  return false;
}

/**
 * Validate connection between two nodes
 */
export function validateConnection(
  sourceNode: NodeSchema,
  sourcePort: string,
  targetNode: NodeSchema,
  targetPort: string
): { valid: boolean; error?: string } {
  // Find output port on source node
  const sourceOutput = sourceNode.outputs.find(p => p.name === sourcePort);
  if (!sourceOutput) {
    return {
      valid: false,
      error: `Source node "${sourceNode.label}" does not have output port "${sourcePort}"`
    };
  }

  // Find input port on target node
  const targetInput = targetNode.inputs.find(p => p.name === targetPort);
  if (!targetInput) {
    return {
      valid: false,
      error: `Target node "${targetNode.label}" does not have input port "${targetPort}"`
    };
  }

  // Check type compatibility
  if (!areTypesCompatible(sourceOutput.type, targetInput.type)) {
    return {
      valid: false,
      error: `Type mismatch: Cannot connect ${sourceOutput.type} to ${targetInput.type}`
    };
  }

  return { valid: true };
}
