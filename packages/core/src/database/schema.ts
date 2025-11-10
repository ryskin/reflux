/**
 * Database schema types for Kysely
 */

import { Generated, Insertable, Selectable, Updateable } from 'kysely';

/**
 * Flows table - stores workflow definitions
 */
export interface FlowsTable {
  id: Generated<string>;
  name: string;
  version: string;
  description: string | null;
  spec: unknown; // JSON WorkflowSpec
  created_at: Generated<Date>;
  updated_at: Generated<Date>;
  created_by: string | null;
  tags: string[];
  is_active: Generated<boolean>;
}

/**
 * Flow versions table - tracks all versions of a flow
 */
export interface FlowVersionsTable {
  id: Generated<string>;
  flow_id: string;
  version: string;
  spec: unknown; // JSON WorkflowSpec
  created_at: Generated<Date>;
  created_by: string | null;
  changelog: string | null;
}

/**
 * Runs table - stores workflow execution instances
 */
export interface RunsTable {
  id: Generated<string>;
  flow_id: string;
  flow_version: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  inputs: unknown; // JSON
  outputs: unknown | null; // JSON
  started_at: Generated<Date>;
  completed_at: Date | null;
  error: string | null;
  temporal_workflow_id: string;
  temporal_run_id: string;
  created_by: string | null;
  metadata: unknown | null; // JSON
}

/**
 * Nodes table - catalog of available nodes
 */
export interface NodesTable {
  id: Generated<string>;
  name: string;
  version: string;
  manifest: unknown; // JSON NodeManifest
  is_active: Generated<boolean>;
  registered_at: Generated<Date>;
  last_seen_at: Generated<Date>;
}

/**
 * Metrics table - stores workflow and node execution metrics
 */
export interface MetricsTable {
  id: Generated<string>;
  timestamp: Generated<Date>;
  metric_type: 'workflow_execution' | 'node_execution' | 'api_request';

  // References
  flow_id: string | null;
  run_id: string | null;
  node_id: string | null;

  // Execution metrics
  duration_ms: number | null; // Execution duration in milliseconds
  status: 'success' | 'failure' | 'timeout' | 'cancelled' | null;
  error_type: string | null; // Error category if failed

  // Resource metrics
  memory_used_mb: number | null;
  cpu_percent: number | null;

  // Custom dimensions
  tags: string[] | null;
  metadata: unknown | null; // JSON - additional context
}

/**
 * Database schema interface
 */
export interface Database {
  flows: FlowsTable;
  flow_versions: FlowVersionsTable;
  runs: RunsTable;
  nodes: NodesTable;
  metrics: MetricsTable;
}

/**
 * Type helpers for inserts, selects, and updates
 */
export type Flow = Selectable<FlowsTable>;
export type NewFlow = Insertable<FlowsTable>;
export type FlowUpdate = Updateable<FlowsTable>;

export type FlowVersion = Selectable<FlowVersionsTable>;
export type NewFlowVersion = Insertable<FlowVersionsTable>;

export type Run = Selectable<RunsTable>;
export type NewRun = Insertable<RunsTable>;
export type RunUpdate = Updateable<RunsTable>;

export type Node = Selectable<NodesTable>;
export type NewNode = Insertable<NodesTable>;
export type NodeUpdate = Updateable<NodesTable>;

export type Metric = Selectable<MetricsTable>;
export type NewMetric = Insertable<MetricsTable>;
export type MetricUpdate = Updateable<MetricsTable>;
