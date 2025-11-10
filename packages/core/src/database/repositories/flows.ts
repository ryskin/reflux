/**
 * Repository for managing flows
 */

import { getDatabase } from '../db';
import { Flow, NewFlow, FlowUpdate, FlowVersion, NewFlowVersion } from '../schema';
import { WorkflowSpec } from '../../types';

export class FlowRepository {
  /**
   * Create a new flow
   */
  static async create(flow: NewFlow): Promise<Flow> {
    const db = getDatabase();

    const result = await db
      .insertInto('flows')
      .values(flow)
      .returningAll()
      .executeTakeFirstOrThrow();

    return result;
  }

  /**
   * Get flow by ID
   */
  static async getById(id: string): Promise<Flow | undefined> {
    const db = getDatabase();

    return await db
      .selectFrom('flows')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
  }

  /**
   * Get flow by name and version
   */
  static async getByNameAndVersion(
    name: string,
    version: string
  ): Promise<Flow | undefined> {
    const db = getDatabase();

    return await db
      .selectFrom('flows')
      .selectAll()
      .where('name', '=', name)
      .where('version', '=', version)
      .executeTakeFirst();
  }

  /**
   * Get latest version of a flow by name
   */
  static async getLatestByName(name: string): Promise<Flow | undefined> {
    const db = getDatabase();

    return await db
      .selectFrom('flows')
      .selectAll()
      .where('name', '=', name)
      .where('is_active', '=', true)
      .orderBy('created_at', 'desc')
      .executeTakeFirst();
  }

  /**
   * List all flows
   */
  static async listAll(): Promise<Flow[]> {
    const db = getDatabase();

    return await db
      .selectFrom('flows')
      .selectAll()
      .orderBy('created_at', 'desc')
      .execute();
  }

  /**
   * List all active flows
   */
  static async listActive(): Promise<Flow[]> {
    const db = getDatabase();

    return await db
      .selectFrom('flows')
      .selectAll()
      .where('is_active', '=', true)
      .orderBy('name')
      .orderBy('version', 'desc')
      .execute();
  }

  /**
   * Update a flow
   */
  static async update(id: string, update: FlowUpdate): Promise<Flow> {
    const db = getDatabase();

    const result = await db
      .updateTable('flows')
      .set({
        ...update,
        updated_at: new Date(),
      })
      .where('id', '=', id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return result;
  }

  /**
   * Deactivate a flow
   */
  static async deactivate(id: string): Promise<void> {
    const db = getDatabase();

    await db
      .updateTable('flows')
      .set({ is_active: false, updated_at: new Date() })
      .where('id', '=', id)
      .execute();
  }

  /**
   * Create a new version of a flow
   */
  static async createVersion(version: NewFlowVersion): Promise<FlowVersion> {
    const db = getDatabase();

    const result = await db
      .insertInto('flow_versions')
      .values(version)
      .returningAll()
      .executeTakeFirstOrThrow();

    return result;
  }

  /**
   * Get all versions of a flow
   */
  static async getVersions(flowId: string): Promise<FlowVersion[]> {
    const db = getDatabase();

    return await db
      .selectFrom('flow_versions')
      .selectAll()
      .where('flow_id', '=', flowId)
      .orderBy('created_at', 'desc')
      .execute();
  }

  /**
   * Delete a flow and all its versions
   */
  static async delete(id: string): Promise<void> {
    const db = getDatabase();

    await db.deleteFrom('flows').where('id', '=', id).execute();
  }
}
