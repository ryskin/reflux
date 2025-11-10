/**
 * Core types for REFLUX workflow system
 */

// Workflow Specification
export interface WorkflowSpec {
  name: string;
  version: string;
  description?: string;
  steps: StepSpec[];
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  policies?: WorkflowPolicies;
  meta?: WorkflowMeta;
}

export interface StepSpec {
  id: string;
  node: string;
  version?: string;
  with: Record<string, unknown>;
  when?: string;  // Conditional expression
  retry?: RetryPolicy;
  timeout?: number;
  cache?: boolean;
}

export interface WorkflowPolicies {
  maxDurationSec?: number;
  onError?: 'fail' | 'continue' | 'retry' | 'fallback';
  fallbackWorkflow?: string;
}

export interface WorkflowMeta {
  cost_budget?: number;
  quality_threshold?: number;
  tags?: string[];
}

// Node Manifest
export interface NodeManifest {
  name: string;
  version: string;
  displayName?: string;
  description?: string;
  category: NodeCategory;
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  policies: NodePolicies;
  metrics?: string[];
  tags?: string[];
}

export type NodeCategory =
  | 'tabular'
  | 'http'
  | 'transform'
  | 'meta'
  | 'ai'
  | 'storage'
  | 'notification'
  | 'webhook';

export interface NodePolicies {
  timeoutSec: number;
  retries?: number[];
  idempotency?: 'none' | 'sha1(inputs)' | 'custom';
  cacheKey?: string;
  cacheTTL?: number;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoff?: number[];
}

// Execution Context
export interface ExecutionContext {
  inputs: Record<string, unknown>;
  steps: Record<string, StepResult>;
}

export interface StepResult {
  output: unknown;
  startedAt?: Date;
  finishedAt?: Date;
  error?: string;
}

// Trace Event
export interface TraceEvent {
  run_id: string;
  step_id?: string;
  node: string;
  version: string;
  start: Date;
  end?: Date;
  status: 'ok' | 'error' | 'timeout' | 'cancelled';
  inputs_hash?: string;
  latency_ms?: number;
  metrics?: Record<string, number>;
  error?: TraceError;
  retry_count?: number;
  cache_hit?: boolean;
  cost?: TraceCost;
  context?: Record<string, string>;
}

export interface TraceError {
  class: string;
  message: string;
  stack?: string;
  retryable?: boolean;
}

export interface TraceCost {
  tokens?: number;
  compute_ms?: number;
  storage_bytes?: number;
}

// Database types
export interface Flow {
  id: string;
  name: string;
  description?: string;
  spec: WorkflowSpec;
  active_version: number;
  created_at: Date;
  updated_at: Date;
}

export interface Run {
  id: string;
  flow_id: string;
  flow_version: number;
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  started_at: Date;
  finished_at?: Date;
  duration_ms?: number;
  cost?: number;
  error?: string;
  meta?: Record<string, unknown>;
}

export interface Node {
  id: string;
  name: string;
  latest_version: string;
  category: NodeCategory;
  created_at: Date;
  updated_at: Date;
}

export interface NodeVersion {
  id: string;
  node_id: string;
  version: string;
  manifest: NodeManifest;
  code_url?: string;
  status: 'draft' | 'staging' | 'production' | 'deprecated';
  created_at: Date;
}

// Export node schema types
export * from './types/node-schema';
export * from './types/node-registry';
