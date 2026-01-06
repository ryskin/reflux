/**
 * Prometheus metrics collection
 *
 * Provides counters, gauges, histograms for monitoring REFLUX system health.
 */

import * as promClient from 'prom-client';

// Initialize default metrics (CPU, memory, etc.)
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

/**
 * Workflow execution metrics
 */

// Total workflow runs
export const runsTotal = new promClient.Counter({
  name: 'reflux_runs_total',
  help: 'Total number of workflow runs',
  labelNames: ['flow_id', 'flow_name', 'status'],
  registers: [register],
});

// Workflow run duration
export const runsDuration = new promClient.Histogram({
  name: 'reflux_runs_duration_seconds',
  help: 'Workflow run duration in seconds',
  labelNames: ['flow_id', 'flow_name', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300], // 100ms to 5min
  registers: [register],
});

// Active workflow runs
export const runsActive = new promClient.Gauge({
  name: 'reflux_runs_active',
  help: 'Number of currently running workflows',
  labelNames: ['flow_id'],
  registers: [register],
});

/**
 * Node/Step execution metrics
 */

// Total node executions
export const nodesTotal = new promClient.Counter({
  name: 'reflux_nodes_total',
  help: 'Total number of node executions',
  labelNames: ['node_type', 'status'],
  registers: [register],
});

// Node execution duration
export const nodesDuration = new promClient.Histogram({
  name: 'reflux_nodes_duration_seconds',
  help: 'Node execution duration in seconds',
  labelNames: ['node_type', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30], // 10ms to 30s
  registers: [register],
});

/**
 * API metrics
 */

// HTTP request total
export const httpRequestsTotal = new promClient.Counter({
  name: 'reflux_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// HTTP request duration
export const httpRequestDuration = new promClient.Histogram({
  name: 'reflux_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5], // 1ms to 5s
  registers: [register],
});

/**
 * Storage/Database metrics
 */

// Artifact storage operations
export const artifactsTotal = new promClient.Counter({
  name: 'reflux_artifacts_total',
  help: 'Total artifact storage operations',
  labelNames: ['operation', 'backend', 'status'],
  registers: [register],
});

// Artifact size
export const artifactsSize = new promClient.Histogram({
  name: 'reflux_artifacts_size_bytes',
  help: 'Artifact size in bytes',
  labelNames: ['backend'],
  buckets: [1024, 10240, 102400, 1048576, 10485760, 104857600], // 1KB to 100MB
  registers: [register],
});

// Database query duration
export const dbQueryDuration = new promClient.Histogram({
  name: 'reflux_db_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1], // 1ms to 1s
  registers: [register],
});

/**
 * System health metrics
 */

// Service health status
export const serviceHealth = new promClient.Gauge({
  name: 'reflux_service_health',
  help: 'Service health status (1 = healthy, 0 = unhealthy)',
  labelNames: ['service'],
  registers: [register],
});

// Queue depth
export const queueDepth = new promClient.Gauge({
  name: 'reflux_queue_depth',
  help: 'Number of pending workflows in queue',
  registers: [register],
});

/**
 * Data cleanup metrics
 */

// Cleanup operations total
export const cleanupTotal = new promClient.Counter({
  name: 'reflux_cleanup_total',
  help: 'Total number of cleanup operations',
  labelNames: ['status', 'dry_run'], // status: success|failure, dry_run: true|false
  registers: [register],
});

// Cleanup duration
export const cleanupDuration = new promClient.Histogram({
  name: 'reflux_cleanup_duration_seconds',
  help: 'Cleanup operation duration in seconds',
  labelNames: ['status'],
  buckets: [1, 5, 10, 30, 60, 120, 300, 600], // 1s to 10min
  registers: [register],
});

// Records deleted per cleanup
export const cleanupRecordsDeleted = new promClient.Histogram({
  name: 'reflux_cleanup_records_deleted',
  help: 'Number of records deleted per cleanup operation',
  buckets: [10, 50, 100, 500, 1000, 5000, 10000, 50000],
  registers: [register],
});

// Space reclaimed per cleanup
export const cleanupSpaceReclaimed = new promClient.Histogram({
  name: 'reflux_cleanup_space_reclaimed_bytes',
  help: 'Storage space reclaimed per cleanup operation in bytes',
  buckets: [1048576, 10485760, 104857600, 1073741824, 10737418240], // 1MB to 10GB
  registers: [register],
});

/**
 * Error tracking
 */

// Total errors
export const errorsTotal = new promClient.Counter({
  name: 'reflux_errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'component'],
  registers: [register],
});

/**
 * Get Prometheus registry for /metrics endpoint
 */
export function getRegistry(): promClient.Registry {
  return register;
}

/**
 * Get metrics as Prometheus text format
 */
export async function getMetrics(): Promise<string> {
  return register.metrics();
}

/**
 * Reset all metrics (useful for testing)
 */
export function resetMetrics(): void {
  register.resetMetrics();
}
