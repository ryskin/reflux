/**
 * Repository for managing metrics
 */

import { getDatabase } from '../db';
import { Metric, NewMetric } from '../schema';
import { sql } from 'kysely';

export class MetricsRepository {
  /**
   * Record a metric
   */
  static async record(metric: NewMetric): Promise<Metric> {
    const db = getDatabase();

    const result = await db
      .insertInto('metrics')
      .values(metric)
      .returningAll()
      .executeTakeFirstOrThrow();

    return result;
  }

  /**
   * Get metrics for a specific flow
   */
  static async getByFlowId(
    flowId: string,
    options?: {
      limit?: number;
      startTime?: Date;
      endTime?: Date;
      metricType?: string;
    }
  ): Promise<Metric[]> {
    const db = getDatabase();
    const { limit = 100, startTime, endTime, metricType } = options || {};

    let query = db
      .selectFrom('metrics')
      .selectAll()
      .where('flow_id', '=', flowId);

    if (startTime) {
      query = query.where('timestamp', '>=', startTime);
    }

    if (endTime) {
      query = query.where('timestamp', '<=', endTime);
    }

    if (metricType) {
      query = query.where('metric_type', '=', metricType as any);
    }

    return await query
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .execute();
  }

  /**
   * Get metrics for a specific run
   */
  static async getByRunId(runId: string): Promise<Metric[]> {
    const db = getDatabase();

    return await db
      .selectFrom('metrics')
      .selectAll()
      .where('run_id', '=', runId)
      .orderBy('timestamp', 'asc')
      .execute();
  }

  /**
   * Get aggregated statistics for a flow
   */
  static async getFlowStats(
    flowId: string,
    options?: {
      startTime?: Date;
      endTime?: Date;
    }
  ): Promise<{
    totalExecutions: number;
    successRate: number;
    avgDurationMs: number;
    p50DurationMs: number;
    p95DurationMs: number;
    p99DurationMs: number;
    errorRate: number;
    errorsByType: Record<string, number>;
  }> {
    const db = getDatabase();
    const { startTime, endTime } = options || {};

    // Build query with optional time filters
    let query = db
      .selectFrom('metrics')
      .where('flow_id', '=', flowId)
      .where('metric_type', '=', 'workflow_execution');

    if (startTime) {
      query = query.where('timestamp', '>=', startTime);
    }

    if (endTime) {
      query = query.where('timestamp', '<=', endTime);
    }

    // Get aggregate stats
    const stats = await query
      .select(({ fn }) => [
        fn.count<number>('id').as('total'),
        fn.count<number>('id').filterWhere('status', '=', 'success').as('successes'),
        fn.avg<number>('duration_ms').as('avgDuration'),
        fn.count<number>('id').filterWhere('status', '=', 'failure').as('failures'),
      ])
      .executeTakeFirstOrThrow();

    // Get percentiles
    const percentiles = await query
      .select(({ fn }) => [
        sql<number>`percentile_cont(0.50) within group (order by duration_ms)`.as('p50'),
        sql<number>`percentile_cont(0.95) within group (order by duration_ms)`.as('p95'),
        sql<number>`percentile_cont(0.99) within group (order by duration_ms)`.as('p99'),
      ])
      .executeTakeFirst();

    // Get errors by type
    const errorRows = await query
      .select(['error_type', ({ fn }) => fn.count<number>('id').as('count')])
      .where('status', '=', 'failure')
      .where('error_type', 'is not', null)
      .groupBy('error_type')
      .execute();

    const errorsByType: Record<string, number> = {};
    for (const row of errorRows) {
      if (row.error_type) {
        errorsByType[row.error_type] = Number(row.count);
      }
    }

    const total = Number(stats.total);
    const successes = Number(stats.successes);
    const failures = Number(stats.failures);

    return {
      totalExecutions: total,
      successRate: total > 0 ? (successes / total) * 100 : 0,
      avgDurationMs: Number(stats.avgDuration) || 0,
      p50DurationMs: Number(percentiles?.p50) || 0,
      p95DurationMs: Number(percentiles?.p95) || 0,
      p99DurationMs: Number(percentiles?.p99) || 0,
      errorRate: total > 0 ? (failures / total) * 100 : 0,
      errorsByType,
    };
  }

  /**
   * Get node performance statistics
   */
  static async getNodeStats(
    flowId: string,
    options?: {
      startTime?: Date;
      endTime?: Date;
    }
  ): Promise<
    Array<{
      nodeId: string;
      executions: number;
      avgDurationMs: number;
      successRate: number;
    }>
  > {
    const db = getDatabase();
    const { startTime, endTime } = options || {};

    let query = db
      .selectFrom('metrics')
      .where('flow_id', '=', flowId)
      .where('metric_type', '=', 'node_execution')
      .where('node_id', 'is not', null);

    if (startTime) {
      query = query.where('timestamp', '>=', startTime);
    }

    if (endTime) {
      query = query.where('timestamp', '<=', endTime);
    }

    const results = await query
      .select(({ fn }) => [
        'node_id',
        fn.count<number>('id').as('executions'),
        fn.avg<number>('duration_ms').as('avgDuration'),
        fn.count<number>('id').filterWhere('status', '=', 'success').as('successes'),
      ])
      .groupBy('node_id')
      .execute();

    return results.map((row) => {
      const executions = Number(row.executions);
      const successes = Number(row.successes);

      return {
        nodeId: row.node_id!,
        executions,
        avgDurationMs: Number(row.avgDuration) || 0,
        successRate: executions > 0 ? (successes / executions) * 100 : 0,
      };
    });
  }

  /**
   * Get time-series data for charting
   */
  static async getTimeSeries(
    flowId: string,
    options: {
      metricType: string;
      interval: 'minute' | 'hour' | 'day';
      startTime: Date;
      endTime: Date;
    }
  ): Promise<Array<{ timestamp: Date; count: number; avgDuration: number }>> {
    const db = getDatabase();
    const { metricType, interval, startTime, endTime } = options;

    // Determine time bucket size
    const truncate = interval === 'minute'
      ? 'min'
      : interval === 'hour'
        ? 'hour'
        : 'day';

    const results = await db
      .selectFrom('metrics')
      .select(({ fn }) => [
        sql<Date>`date_trunc('${sql.raw(truncate)}', timestamp)`.as('bucket'),
        fn.count<number>('id').as('count'),
        fn.avg<number>('duration_ms').as('avgDuration'),
      ])
      .where('flow_id', '=', flowId)
      .where('metric_type', '=', metricType as any)
      .where('timestamp', '>=', startTime)
      .where('timestamp', '<=', endTime)
      .groupBy('bucket')
      .orderBy('bucket', 'asc')
      .execute();

    return results.map((row) => ({
      timestamp: row.bucket,
      count: Number(row.count),
      avgDuration: Number(row.avgDuration) || 0,
    }));
  }

  /**
   * Delete old metrics (for cleanup)
   */
  static async deleteOlderThan(date: Date): Promise<number> {
    const db = getDatabase();

    const result = await db
      .deleteFrom('metrics')
      .where('timestamp', '<', date)
      .executeTakeFirst();

    return Number(result.numDeletedRows);
  }
}
