/**
 * Repository for managing artifact metadata
 */

import { getDatabase } from '../db';
import { Artifact, NewArtifact, ArtifactUpdate } from '../schema';

export class ArtifactRepository {
  /**
   * Create artifact metadata record
   */
  static async create(artifact: NewArtifact): Promise<Artifact> {
    const db = getDatabase();

    const result = await db
      .insertInto('artifacts')
      .values(artifact)
      .returningAll()
      .executeTakeFirstOrThrow();

    return result;
  }

  /**
   * Get artifact by ID
   */
  static async getById(id: string): Promise<Artifact | undefined> {
    const db = getDatabase();

    return await db
      .selectFrom('artifacts')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  }

  /**
   * Get artifact by key
   */
  static async getByKey(key: string): Promise<Artifact | undefined> {
    const db = getDatabase();

    return await db
      .selectFrom('artifacts')
      .selectAll()
      .where('key', '=', key)
      .executeTakeFirst();
  }

  /**
   * List artifacts for a run
   */
  static async listByRunId(runId: string): Promise<Artifact[]> {
    const db = getDatabase();

    return await db
      .selectFrom('artifacts')
      .selectAll()
      .where('run_id', '=', runId)
      .orderBy('created_at', 'desc')
      .execute();
  }

  /**
   * List artifacts for a step
   */
  static async listByStepId(runId: string, stepId: string): Promise<Artifact[]> {
    const db = getDatabase();

    return await db
      .selectFrom('artifacts')
      .selectAll()
      .where('run_id', '=', runId)
      .where('step_id', '=', stepId)
      .orderBy('created_at', 'desc')
      .execute();
  }

  /**
   * Update artifact metadata
   */
  static async update(id: string, update: ArtifactUpdate): Promise<Artifact> {
    const db = getDatabase();

    const result = await db
      .updateTable('artifacts')
      .set(update)
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return result;
  }

  /**
   * Delete artifact metadata
   */
  static async delete(id: string): Promise<void> {
    const db = getDatabase();

    await db.deleteFrom('artifacts').where('id', '=', id).execute();
  }

  /**
   * Find expired artifacts
   *
   * Returns artifacts past their expiration date for cleanup
   */
  static async findExpired(limit = 1000): Promise<Artifact[]> {
    const db = getDatabase();

    return await db
      .selectFrom('artifacts')
      .selectAll()
      .where('expires_at', 'is not', null)
      .where('expires_at', '<', new Date())
      .limit(limit)
      .execute();
  }

  /**
   * Get artifact statistics
   */
  static async getStats(): Promise<{
    total: number;
    totalSize: number;
    byBackend: Record<string, { count: number; size: number }>;
  }> {
    const db = getDatabase();

    const results = await db
      .selectFrom('artifacts')
      .select(({ fn }) => [
        fn.count<number>('id').as('total'),
        fn.sum<number>('size_bytes').as('totalSize'),
        'storage_backend',
      ])
      .groupBy('storage_backend')
      .execute();

    const total = results.reduce((sum, r) => sum + Number(r.total), 0);
    const totalSize = results.reduce((sum, r) => sum + Number(r.totalSize || 0), 0);

    const byBackend: Record<string, { count: number; size: number }> = {};
    for (const result of results) {
      byBackend[result.storage_backend || 'unknown'] = {
        count: Number(result.total),
        size: Number(result.totalSize || 0),
      };
    }

    return { total, totalSize, byBackend };
  }
}
