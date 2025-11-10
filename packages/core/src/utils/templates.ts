/**
 * Template resolver for {{input.x}} and {{steps.y.output.z}} syntax
 */

import { JSONPath } from 'jsonpath-plus';
import { ExecutionContext } from '../types';

/**
 * Resolve templates in a value
 * Supports: {{input.field}}, {{steps.stepId.output.field}}
 */
export function resolveTemplates(
  value: unknown,
  context: ExecutionContext
): unknown {
  if (typeof value === 'string') {
    return resolveString(value, context);
  }

  if (Array.isArray(value)) {
    return value.map(item => resolveTemplates(item, context));
  }

  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = resolveTemplates(val, context);
    }
    return result;
  }

  return value;
}

/**
 * Resolve template string
 */
function resolveString(str: string, context: ExecutionContext): unknown {
  // Check if entire string is a template (returns original type)
  const fullMatch = str.match(/^{{(.+)}}$/);
  if (fullMatch) {
    return evaluateExpression(fullMatch[1].trim(), context);
  }

  // Replace inline templates (returns string)
  return str.replace(/{{(.+?)}}/g, (_, expr) => {
    const value = evaluateExpression(expr.trim(), context);
    return String(value ?? '');
  });
}

/**
 * Evaluate an expression like "input.field" or "steps.stepId.output.field"
 */
function evaluateExpression(expr: string, context: ExecutionContext): unknown {
  try {
    // Handle "input.x" -> context.inputs.x
    if (expr.startsWith('input.')) {
      const path = expr.substring(6); // Remove "input."
      return getNestedValue(context.inputs, path);
    }

    // Handle "steps.stepId.output.x" -> context.steps.stepId.output.x
    if (expr.startsWith('steps.')) {
      const path = expr.substring(6); // Remove "steps."
      return getNestedValue(context.steps, path);
    }

    // Direct value (no prefix)
    return expr;
  } catch (error) {
    console.warn(`Failed to evaluate expression: ${expr}`, error);
    return undefined;
  }
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== 'object') {
    return undefined;
  }

  const parts = path.split('.');
  let current: any = obj;

  for (const part of parts) {
    // Handle array indexing: items[0]
    const arrayMatch = part.match(/^(.+?)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, key, index] = arrayMatch;
      current = current[key];
      if (Array.isArray(current)) {
        current = current[parseInt(index, 10)];
      } else {
        return undefined;
      }
    } else {
      current = current[part];
    }

    if (current === undefined) {
      return undefined;
    }
  }

  return current;
}

/**
 * Evaluate conditional expression
 * Supports: {{steps.validate.output.ok}}, {{input.enabled}}
 */
export function evaluateCondition(
  condition: string,
  context: ExecutionContext
): boolean {
  const resolved = resolveTemplates(condition, context);

  // Truthy check
  if (typeof resolved === 'boolean') {
    return resolved;
  }

  if (typeof resolved === 'string') {
    return resolved.toLowerCase() === 'true';
  }

  return Boolean(resolved);
}
