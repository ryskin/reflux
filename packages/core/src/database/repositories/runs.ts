/**
 * Repository for managing workflow runs
 */

import { sql } from 'kysely';
import { getDatabase } from '../db';
import { Run, NewRun, RunUpdate, RunLog } from '../schema';

export interface LogQueryFilters {
  stepId?: string;
  level?: RunLog['level'];
  limit?: number;
  offset?: number;
}

/**
 * Valid log levels for validation
 */
const VALID_LOG_LEVELS: RunLog['level'][] = ['debug', 'info', 'warn', 'error'];

export class RunRepository {
  /**
   * Create a new run
   */
  static async create(run: NewRun): Promise<Run> {
    const db = getDatabase();

    const result = await db
      .insertInto('runs')
      .values(run)
      .returningAll()
      .executeTakeFirstOrThrow();

    return result;
  }

  /**
   * Get run by ID
   */
  static async getById(id: string): Promise<Run | undefined> {
    // Validate UUID format to prevent database errors
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return undefined;
    }

    const db = getDatabase();

    return await db
      .selectFrom('runs')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  }

  /**
   * Get run by Temporal workflow ID
   */
  static async getByTemporalWorkflowId(
    workflowId: string
  ): Promise<Run | undefined> {
    const db = getDatabase();

    return await db
      .selectFrom('runs')
      .selectAll()
      .where('temporal_workflow_id', '=', workflowId)
      .executeTakeFirst();
  }

  /**
   * List runs for a flow
   */
  static async listByFlowId(flowId: string, limit = 50): Promise<Run[]> {
    const db = getDatabase();

    return await db
      .selectFrom('runs')
      .selectAll()
      .where('flow_id', '=', flowId)
      .orderBy('started_at', 'desc')
      .limit(limit)
      .execute();
  }

  /**
   * List runs by status
   */
  static async listByStatus(
    status: Run['status'],
    limit = 50
  ): Promise<Run[]> {
    const db = getDatabase();

    return await db
      .selectFrom('runs')
      .selectAll()
      .where('status', '=', status)
      .orderBy('started_at', 'desc')
      .limit(limit)
      .execute();
  }

  /**
   * List recent runs
   */
  static async listRecent(limit = 50): Promise<Run[]> {
    const db = getDatabase();

    return await db
      .selectFrom('runs')
      .selectAll()
      .orderBy('started_at', 'desc')
      .limit(limit)
      .execute();
  }

  /**
   * Update a run
   */
  static async update(id: string, update: RunUpdate): Promise<Run> {
    const db = getDatabase();

    const result = await db
      .updateTable('runs')
      .set(update)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return result;
  }

  /**
   * Mark run as completed
   *
   * Uses SQL-based atomic duration calculation to prevent race conditions
   * when multiple workers attempt to complete the same run concurrently.
   */
  static async markCompleted(
    id: string,
    outputs: unknown
  ): Promise<Run> {
    const db = getDatabase();
    const completedAt = new Date();

    const result = await db
      .updateTable('runs')
      .set({
        status: 'completed',
        outputs,
        completed_at: completedAt,
        // Calculate duration atomically in SQL to prevent race conditions
        duration_ms: sql`EXTRACT(EPOCH FROM (${completedAt}::timestamp - started_at))::integer * 1000`,
      })
      .where('id', '=', id)
      .where('status', '!=', 'completed') // Idempotency: prevent duplicate completion
      .returningAll()
      .executeTakeFirstOrThrow();

    return result;
  }

  /**
   * Mark run as failed
   *
   * Uses SQL-based atomic duration calculation to prevent race conditions
   * when multiple workers attempt to mark the same run as failed concurrently.
   */
  static async markFailed(id: string, error: string): Promise<Run> {
    const db = getDatabase();
    const completedAt = new Date();

    const result = await db
      .updateTable('runs')
      .set({
        status: 'failed',
        error,
        completed_at: completedAt,
        // Calculate duration atomically in SQL to prevent race conditions
        duration_ms: sql`EXTRACT(EPOCH FROM (${completedAt}::timestamp - started_at))::integer * 1000`,
      })
      .where('id', '=', id)
      .where('status', '!=', 'failed') // Idempotency: prevent duplicate failure marking
      .where('status', '!=', 'completed') // Don't override completed status
      .returningAll()
      .executeTakeFirstOrThrow();

    return result;
  }

  /**
   * Delete a run and its logs
   *
   * Uses explicit transaction for clarity, though PostgreSQL CASCADE is atomic.
   */
  static async delete(id: string): Promise<void> {
    const db = getDatabase();

    await db.transaction().execute(async (trx) => {
      // Delete logs first (explicit order for clarity)
      await trx.deleteFrom('run_logs').where('run_id', '=', id).execute();

      // Delete run (CASCADE would handle logs, but explicit is clearer)
      await trx.deleteFrom('runs').where('id', '=', id).execute();
    });
  }

  /**
   * Get run statistics for a flow
   */
  static async getFlowStats(flowId: string): Promise<{
    total: number;
    completed: number;
    failed: number;
    running: number;
  }> {
    const db = getDatabase();

    const results = await db
      .selectFrom('runs')
      .select(({ fn }) => [
        fn.count<number>('id').as('total'),
        fn
          .count<number>('id')
          .filterWhere('status', '=', 'completed')
          .as('completed'),
        fn.count<number>('id').filterWhere('status', '=', 'failed').as('failed'),
        fn.count<number>('id').filterWhere('status', '=', 'running').as('running'),
      ])
      .where('flow_id', '=', flowId)
      .executeTakeFirstOrThrow();

    return {
      total: Number(results.total),
      completed: Number(results.completed),
      failed: Number(results.failed),
      running: Number(results.running),
    };
  }

  /**
   * Get logs for a specific run
   */
  static async getLogs(runId: string, filters: LogQueryFilters = {}): Promise<RunLog[]> {
    const db = getDatabase();
    let query = db.selectFrom('run_logs').selectAll().where('run_id', '=', runId);

    if (filters.stepId) {
      query = query.where('step_id', '=', filters.stepId);
    }

    if (filters.level) {
      // Validate log level to prevent invalid queries
      if (!VALID_LOG_LEVELS.includes(filters.level)) {
        throw new Error(
          `Invalid log level: ${filters.level}. Must be one of: ${VALID_LOG_LEVELS.join(', ')}`
        );
      }
      query = query.where('level', '=', filters.level);
    }

    // Order by timestamp ascending (chronological)
    query = query.orderBy('timestamp', 'asc');

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.offset(filters.offset);
    }

    return await query.execute();
  }

  /**
   * Get run with logs
   */
  static async getWithLogs(runId: string, logFilters?: LogQueryFilters): Promise<(Run & { logs: RunLog[] }) | undefined> {
    const run = await this.getById(runId);
    if (!run) {
      return undefined;
    }

    const logs = await this.getLogs(runId, logFilters);
    return { ...run, logs };
  }
}
