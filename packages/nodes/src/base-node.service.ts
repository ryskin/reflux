/**
 * Base service template for REFLUX nodes
 */

import { Service, ServiceSchema, Context } from 'moleculer';
import { NodeManifest, TraceEvent } from '@reflux/core';

export interface BaseNodeServiceOptions {
  manifest: NodeManifest;
}

/**
 * Create a node service from manifest
 */
export function createNodeService(
  manifest: NodeManifest,
  runMethod: (params: any) => Promise<any>
): ServiceSchema {
  return {
    name: manifest.name,
    version: manifest.version,

    metadata: {
      manifest,
    },

    actions: {
      /**
       * Main execution action
       */
      execute: {
        // Validation schema from manifest
        params: convertManifestToValidation(manifest.inputs),

        async handler(ctx: Context<any>): Promise<any> {
          const start = Date.now();

          try {
            // Execute node logic
            const result = await runMethod.call(this, ctx.params);

            // Emit metrics
            this.emitMetrics(ctx, {
              node: manifest.name,
              version: manifest.version,
              latency_ms: Date.now() - start,
              status: 'ok',
            });

            return result;
          } catch (error: any) {
            // Emit error metrics
            this.emitMetrics(ctx, {
              node: manifest.name,
              version: manifest.version,
              latency_ms: Date.now() - start,
              status: 'error',
              error_class: error?.constructor?.name || 'Error',
            });

            throw error;
          }
        },
      },

      /**
       * Get node manifest
       */
      getManifest: {
        handler(): NodeManifest {
          return manifest;
        },
      },
    },

    methods: {
      /**
       * Emit trace metrics
       */
      emitMetrics(ctx: Context, data: Partial<TraceEvent>) {
        this.broker.emit('trace.event', {
          ...data,
          run_id: (ctx.meta as any).runId,
          step_id: (ctx.meta as any).stepId,
        });
      },
    },
  };
}

/**
 * Convert manifest input schema to Moleculer validation schema
 */
function convertManifestToValidation(inputs: Record<string, string>): any {
  const schema: any = {};

  for (const [key, type] of Object.entries(inputs)) {
    const optional = key.endsWith('?');
    const fieldName = optional ? key.slice(0, -1) : key;

    schema[fieldName] = {
      type: mapTypeToMoleculer(type),
      optional,
    };
  }

  return schema;
}

/**
 * Map REFLUX types to Moleculer types
 */
function mapTypeToMoleculer(type: string): string {
  switch (type) {
    case 'string':
    case 'file_url':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'json':
    case 'object':
      return 'object';
    case 'array':
      return 'array';
    default:
      return 'any';
  }
}
