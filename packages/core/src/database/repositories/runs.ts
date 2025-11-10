/**
 * Repository for managing workflow runs
 */

import { getDatabase } from '../db';
import { Run, NewRun, RunUpdate } from '../schema';

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
   */
  static async markCompleted(
    id: string,
    outputs: unknown
  ): Promise<Run> {
    const db = getDatabase();

    const result = await db
      .updateTable('runs')
      .set({
        status: 'completed',
        outputs,
        completed_at: new Date(),
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return result;
  }

  /**
   * Mark run as failed
   */
  static async markFailed(id: string, error: string): Promise<Run> {
    const db = getDatabase();

    const result = await db
      .updateTable('runs')
      .set({
        status: 'failed',
        error,
        completed_at: new Date(),
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return result;
  }

  /**
   * Delete a run
   */
  static async delete(id: string): Promise<void> {
    const db = getDatabase();

    await db.deleteFrom('runs').where('id', '=', id).execute();
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
}
