/**
 * Temporal activity for executing nodes
 */

import { Context } from '@temporalio/activity';
import { TraceEvent } from '../types';
import { callNode } from './moleculer-client';

export interface ExecuteNodeArgs {
  node: string;
  version: string;
  params: Record<string, unknown>;
  runId: string;
  stepId: string;
  context?: Record<string, unknown>; // Full workflow context (inputs + previous node outputs)
}

/**
 * Execute a node and return its output
 * Calls node via Moleculer service bus
 */
export async function executeNode(args: ExecuteNodeArgs): Promise<unknown> {
  const start = Date.now();

  console.log(`[${args.stepId}] Executing ${args.node}@${args.version}...`);

  try {
    // Call node via Moleculer
    const result = await callNode(
      args.node,
      args.version,
      args.params,
      {
        runId: args.runId,
        stepId: args.stepId,
        ...args.context, // Spread workflow context into meta
      }
    );

    const latency = Date.now() - start;

    // Emit trace event
    await emitTrace({
      run_id: args.runId,
      step_id: args.stepId,
      node: args.node,
      version: args.version,
      start: new Date(start),
      end: new Date(),
      status: 'ok',
      latency_ms: latency,
    });

    console.log(`[${args.stepId}] ✅ Completed in ${latency}ms`);

    return result;
  } catch (error: any) {
    const latency = Date.now() - start;

    await emitTrace({
      run_id: args.runId,
      step_id: args.stepId,
      node: args.node,
      version: args.version,
      start: new Date(start),
      end: new Date(),
      status: 'error',
      latency_ms: latency,
      error: {
        class: error?.constructor?.name || 'Error',
        message: error?.message || String(error),
        stack: error?.stack,
        retryable: true,
      },
    });

    console.error(`[${args.stepId}] ❌ Failed:`, error?.message || error);
    throw error;
  }
}

/**
 * Emit trace event (will be replaced with ClickHouse insert in Sprint 2)
 */
async function emitTrace(event: TraceEvent): Promise<void> {
  // For now, just log to console
  // In full implementation, this will insert to ClickHouse
  console.log('[TRACE]', {
    run: event.run_id,
    step: event.step_id,
    node: event.node,
    status: event.status,
    latency: event.latency_ms,
  });
}
