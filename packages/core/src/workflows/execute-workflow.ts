/**
 * Main Temporal workflow for executing REFLUX workflows
 */

import { proxyActivities } from '@temporalio/workflow';
import type { ExecuteNodeArgs } from '../activities/execute-node';
import type { RecordMetricArgs } from '../activities/record-metric';

// Proxy activities
const { executeNode, recordMetric } = proxyActivities<{
  executeNode(args: ExecuteNodeArgs): Promise<unknown>;
  recordMetric(args: RecordMetricArgs): Promise<void>;
}>({
  startToCloseTimeout: '5 minutes',
});

export interface FlowNode {
  id: string;
  type: string;
  params: Record<string, unknown>;
}

export interface FlowEdge {
  from: string;
  to: string;
}

export interface FlowSpec {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface ExecuteWorkflowInput {
  flowId: string;
  flowName: string;
  spec: FlowSpec;
  inputs: Record<string, unknown>;
  runId: string;
}

export interface ExecuteWorkflowResult {
  outputs: Record<string, unknown>;
  nodes: Record<string, { output: unknown }>;
}

interface ExecutionContext {
  inputs: Record<string, unknown>;
  nodes: Record<string, {
    output: unknown;
    startedAt?: Date;
    finishedAt?: Date;
    error?: string;
    errorType?: string;
    duration?: number;
  }>;
}

/**
 * Main workflow execution
 * Executes nodes in topological order based on edges
 */
export async function executeWorkflow(
  input: ExecuteWorkflowInput
): Promise<ExecuteWorkflowResult> {
  const { flowId, flowName, spec, inputs, runId } = input;

  console.log(`🚀 Starting workflow: ${flowName} (run: ${runId})`);

  const workflowStartTime = new Date();

  // Initialize execution context
  const context: ExecutionContext = {
    inputs,
    nodes: {},
  };

  try {
    // Build execution levels - group nodes by dependency depth for parallel execution
    const executionLevels = buildExecutionLevels(spec.nodes, spec.edges);

    console.log(`📊 Execution levels (parallel batches): ${executionLevels.map((level, i) =>
      `L${i}[${level.map(n => n.id).join(',')}]`
    ).join(' → ')}`);

    // Execute nodes level by level (parallel within each level)
    for (let levelIndex = 0; levelIndex < executionLevels.length; levelIndex++) {
    const level = executionLevels[levelIndex];

    console.log(`🔄 Level ${levelIndex}: Executing ${level.length} node(s) in parallel`);

    // Execute all nodes in this level in parallel
    const nodePromises = level.map(async (node) => {
      console.log(`📝 Node ${node.id}: ${node.type}`);

      const startTime = new Date();

      try {
        // Resolve templates in parameters
        const params = resolveTemplates(node.params, context);

        // Execute node with timeout protection
        const result = await executeNode({
          node: node.type,
          version: '1.0.0', // For now, always use 1.0.0
          params: params as Record<string, unknown>,
          runId,
          stepId: node.id,
          context: context as any, // Pass full context for Transform nodes to access inputs and previous outputs
        });

        const finishTime = new Date();

        // Store result in context
        const nodeResult = {
          output: result,
          startedAt: startTime,
          finishedAt: finishTime,
        };

        const durationMs = finishTime.getTime() - startTime.getTime();
        console.log(`✅ Node ${node.id} completed in ${durationMs}ms`);

        // Record node execution metric (async, non-blocking)
        recordMetric({
          metric: {
            metric_type: 'node_execution',
            flow_id: flowId,
            run_id: runId,
            node_id: node.id,
            duration_ms: durationMs,
            status: 'success',
            error_type: null,
            memory_used_mb: null,
            cpu_percent: null,
            tags: [node.type],
            metadata: null,
          },
        }).catch(err => console.warn(`Failed to record node metric: ${err.message}`));

        return { nodeId: node.id, result: nodeResult, error: null };
      } catch (error: any) {
        const finishTime = new Date();
        const duration = finishTime.getTime() - startTime.getTime();

        console.error(`❌ Node ${node.id} failed after ${duration}ms:`, error.message);

        // Determine error type for better handling
        let errorType = 'execution_error';
        let errorMessage = error?.message || String(error);

        if (error.message?.includes('timeout')) {
          errorType = 'timeout';
        } else if (error.message?.includes('not found')) {
          errorType = 'not_found';
        } else if (error.message?.includes('validation')) {
          errorType = 'validation_error';
        }

        // Store error with metadata
        const nodeResult = {
          output: null,
          error: errorMessage,
          errorType,
          startedAt: startTime,
          finishedAt: finishTime,
          duration,
        };

        // Record node failure metric (async, non-blocking)
        recordMetric({
          metric: {
            metric_type: 'node_execution',
            flow_id: flowId,
            run_id: runId,
            node_id: node.id,
            duration_ms: duration,
            status: 'failure',
            error_type: errorType,
            memory_used_mb: null,
            cpu_percent: null,
            tags: [node.type],
            metadata: { error: errorMessage },
          },
        }).catch(err => console.warn(`Failed to record node error metric: ${err.message}`));

        return { nodeId: node.id, result: nodeResult, error: error };
      }
    });

    // Wait for all nodes in this level to complete
    const results = await Promise.all(nodePromises);

    // Update context with all results
    const failedNodes: string[] = [];

    for (const { nodeId, result, error } of results) {
      context.nodes[nodeId] = result;

      if (error) {
        failedNodes.push(nodeId);
      }
    }

    // If any nodes failed, fail the workflow with detailed error
    if (failedNodes.length > 0) {
      const errorDetails = failedNodes.map(nodeId => {
        const nodeError = context.nodes[nodeId];
        return `${nodeId}: ${nodeError.error} (${nodeError.errorType})`;
      }).join('; ');

      throw new Error(
        `Workflow failed at level ${levelIndex}. Failed nodes: ${errorDetails}`
      );
    }

      console.log(`✅ Level ${levelIndex} completed successfully`);
    }

    console.log(`🎉 Workflow completed: ${flowName}`);

    // Record workflow execution metric
    const workflowDuration = new Date().getTime() - workflowStartTime.getTime();
    recordMetric({
      metric: {
        metric_type: 'workflow_execution',
        flow_id: flowId,
        run_id: runId,
        node_id: null,
        duration_ms: workflowDuration,
        status: 'success',
        error_type: null,
        memory_used_mb: null,
        cpu_percent: null,
        tags: [flowName],
        metadata: { total_nodes: spec.nodes.length },
      },
    }).catch(err => console.warn(`Failed to record workflow metric: ${err.message}`));

    return {
      outputs: context.nodes,
      nodes: context.nodes,
    };
  } catch (error: any) {
    // Record workflow failure metric
    const workflowDuration = new Date().getTime() - workflowStartTime.getTime();

    let errorType = 'execution_error';
    if (error.message?.includes('timeout')) errorType = 'timeout';
    else if (error.message?.includes('cycle')) errorType = 'validation_error';

    recordMetric({
      metric: {
        metric_type: 'workflow_execution',
        flow_id: flowId,
        run_id: runId,
        node_id: null,
        duration_ms: workflowDuration,
        status: 'failure',
        error_type: errorType,
        memory_used_mb: null,
        cpu_percent: null,
        tags: [flowName],
        metadata: { total_nodes: spec.nodes.length, error: error.message },
      },
    }).catch(err => console.warn(`Failed to record workflow failure metric: ${err.message}`));

    // Re-throw to fail the workflow
    throw error;
  }
}

/**
 * Build execution levels - groups nodes by dependency depth
 * All nodes in the same level can execute in parallel
 *
 * Example:
 *   A → B → D
 *   A → C → D
 *
 * Returns: [[A], [B, C], [D]]
 * Level 0: A (no dependencies)
 * Level 1: B, C (depend only on A) - can run in parallel
 * Level 2: D (depends on B and C)
 */
function buildExecutionLevels(nodes: FlowNode[], edges: FlowEdge[]): FlowNode[][] {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const inDegree = new Map(nodes.map(n => [n.id, 0]));
  const adjacencyList = new Map<string, string[]>(nodes.map(n => [n.id, []]));

  // Build graph
  for (const edge of edges) {
    adjacencyList.get(edge.from)?.push(edge.to);
    inDegree.set(edge.to, (inDegree.get(edge.to) || 0) + 1);
  }

  const levels: FlowNode[][] = [];
  const processedNodes = new Set<string>();

  // Process nodes level by level
  while (processedNodes.size < nodes.length) {
    // Find all nodes that can execute in this level (in-degree = 0)
    const currentLevel: FlowNode[] = [];

    for (const [nodeId, degree] of inDegree.entries()) {
      if (degree === 0 && !processedNodes.has(nodeId)) {
        const node = nodeMap.get(nodeId);
        if (node) {
          currentLevel.push(node);
        }
      }
    }

    // No nodes can execute - we have a cycle
    if (currentLevel.length === 0) {
      throw new Error('Workflow contains a cycle - cannot execute');
    }

    levels.push(currentLevel);

    // Mark these nodes as processed and decrease in-degree of their neighbors
    for (const node of currentLevel) {
      processedNodes.add(node.id);

      const neighbors = adjacencyList.get(node.id) || [];
      for (const neighbor of neighbors) {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);
      }
    }
  }

  return levels;
}

/**
 * Simple template resolver (workflow-safe version)
 * Note: This is a simplified version. The full resolver uses JSONPath
 * but we keep it simple here to avoid importing Node.js modules in workflow code.
 */
function resolveTemplates(
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

function resolveString(str: string, context: ExecutionContext): unknown {
  // Match {{expression}}
  const fullMatch = str.match(/^{{(.+)}}$/);
  if (fullMatch) {
    return evaluateExpression(fullMatch[1].trim(), context);
  }

  // Replace inline templates
  return str.replace(/{{(.+?)}}/g, (_, expr) => {
    const value = evaluateExpression(expr.trim(), context);
    return String(value ?? '');
  });
}

function evaluateExpression(expr: string, context: ExecutionContext): unknown {
  try {
    // Handle "inputs.x" or "input.x"
    if (expr.startsWith('inputs.') || expr.startsWith('input.')) {
      const path = expr.startsWith('inputs.') ? expr.substring(7) : expr.substring(6);
      return getNestedValue(context.inputs, path);
    }

    // Handle "nodes.nodeId.output.x" or older "steps.stepId.output.x"
    if (expr.startsWith('nodes.') || expr.startsWith('steps.')) {
      const path = expr.startsWith('nodes.') ? expr.substring(6) : expr.substring(6);
      return getNestedValue(context.nodes, path);
    }

    return expr;
  } catch (error) {
    console.warn(`Failed to evaluate: ${expr}`);
    return undefined;
  }
}

function getNestedValue(obj: any, path: string): unknown {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current === undefined || current === null) {
      return undefined;
    }
    current = current[part];
  }

  return current;
}

function evaluateCondition(
  condition: string,
  context: ExecutionContext
): boolean {
  const resolved = resolveTemplates(condition, context);
  return Boolean(resolved);
}
