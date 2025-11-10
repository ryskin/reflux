/**
 * Input/Output validation utilities
 */

import { z } from 'zod';
import { NodeManifest } from '../types';

/**
 * Validate inputs against node manifest schema
 */
export function validateInputs(
  inputs: Record<string, unknown>,
  schema: Record<string, string>
): void {
  const errors: string[] = [];

  for (const [key, type] of Object.entries(schema)) {
    const optional = key.endsWith('?');
    const fieldName = optional ? key.slice(0, -1) : key;
    const value = inputs[fieldName];

    // Check required fields
    if (!optional && value === undefined) {
      errors.push(`Missing required field: ${fieldName}`);
      continue;
    }

    // Skip type check for optional undefined values
    if (optional && value === undefined) {
      continue;
    }

    // Validate type
    const valid = validateType(value, type);
    if (!valid) {
      errors.push(
        `Invalid type for field "${fieldName}": expected ${type}, got ${typeof value}`
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(`Validation failed:\n${errors.join('\n')}`);
  }
}

/**
 * Check if value matches expected type
 */
function validateType(value: unknown, expectedType: string): boolean {
  switch (expectedType) {
    case 'string':
      return typeof value === 'string';

    case 'number':
      return typeof value === 'number';

    case 'boolean':
      return typeof value === 'boolean';

    case 'json':
    case 'object':
      return typeof value === 'object' && value !== null;

    case 'array':
      return Array.isArray(value);

    case 'file_url':
      return typeof value === 'string' && isValidUrl(value);

    default:
      // Unknown type - assume valid
      return true;
  }
}

/**
 * Simple URL validation
 */
function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 's3:';
  } catch {
    return false;
  }
}

/**
 * Generate input hash for idempotency
 */
export function generateInputHash(inputs: Record<string, unknown>): string {
  const crypto = require('crypto');
  const normalized = JSON.stringify(inputs, Object.keys(inputs).sort());
  return crypto.createHash('sha1').update(normalized).digest('hex');
}
