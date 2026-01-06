/**
 * Repository for managing flows
 */

import { getDatabase } from '../db';
import { Flow, NewFlow, FlowUpdate, FlowVersion, NewFlowVersion } from '../schema';
import { WorkflowSpec } from '../../types';
import { compareVersions, VersionDiff } from '../../utils/version-diff';

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
   * Update a flow (with automatic versioning)
   *
   * Creates a snapshot of the current flow state before applying updates.
   * This enables rollback and audit trail of all changes.
   *
   * @param id - Flow ID to update
   * @param update - Fields to update
   * @param changelog - Optional description of changes
   * @param createdBy - User making the change
   */
  static async update(
    id: string,
    update: FlowUpdate,
    options?: { changelog?: string; createdBy?: string }
  ): Promise<Flow> {
    const db = getDatabase();

    return await db.transaction().execute(async (trx) => {
      // Get current flow state
      const currentFlow = await trx
        .selectFrom('flows')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();

      if (!currentFlow) {
        throw new Error(`Flow ${id} not found`);
      }

      // Create version snapshot of current state before update
      await trx
        .insertInto('flow_versions')
        .values({
          flow_id: currentFlow.id,
          version: currentFlow.version,
          spec: currentFlow.spec,
          created_by: options?.createdBy || currentFlow.created_by,
          changelog: options?.changelog || 'Auto-saved version before update',
        })
        .execute();

      // Apply update
      const result = await trx
        .updateTable('flows')
        .set({
          ...update,
          updated_at: new Date(),
        })
        .where('id', '=', id)
        .returningAll()
        .executeTakeFirstOrThrow();

      return result;
    });
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
   * Get a specific version of a flow
   */
  static async getVersionById(versionId: string): Promise<FlowVersion | undefined> {
    const db = getDatabase();

    return await db
      .selectFrom('flow_versions')
      .selectAll()
      .where('id', '=', versionId)
      .executeTakeFirst();
  }

  /**
   * Get a specific version by flow ID and version string
   */
  static async getVersionByFlowAndVersion(
    flowId: string,
    version: string
  ): Promise<FlowVersion | undefined> {
    const db = getDatabase();

    return await db
      .selectFrom('flow_versions')
      .selectAll()
      .where('flow_id', '=', flowId)
      .where('version', '=', version)
      .executeTakeFirst();
  }

  /**
   * Rollback flow to a specific version
   *
   * Restores the flow to a previous version's specification.
   * Creates a new version entry documenting the rollback.
   *
   * @param flowId - Flow ID to rollback
   * @param versionId - Version ID to restore from
   * @param createdBy - User performing the rollback
   */
  static async rollbackToVersion(
    flowId: string,
    versionId: string,
    createdBy?: string
  ): Promise<Flow> {
    const db = getDatabase();

    return await db.transaction().execute(async (trx) => {
      // Get the target version to restore
      const targetVersion = await trx
        .selectFrom('flow_versions')
        .selectAll()
        .where('id', '=', versionId)
        .where('flow_id', '=', flowId)
        .executeTakeFirst();

      if (!targetVersion) {
        throw new Error(`Version ${versionId} not found for flow ${flowId}`);
      }

      // Get current flow state
      const currentFlow = await trx
        .selectFrom('flows')
        .selectAll()
        .where('id', '=', flowId)
        .executeTakeFirst();

      if (!currentFlow) {
        throw new Error(`Flow ${flowId} not found`);
      }

      // Save current state as a version before rollback
      await trx
        .insertInto('flow_versions')
        .values({
          flow_id: currentFlow.id,
          version: currentFlow.version,
          spec: currentFlow.spec,
          created_by: createdBy || currentFlow.created_by,
          changelog: `Auto-saved before rollback to version ${targetVersion.version}`,
        })
        .execute();

      // Restore flow to target version
      const result = await trx
        .updateTable('flows')
        .set({
          spec: targetVersion.spec,
          updated_at: new Date(),
        })
        .where('id', '=', flowId)
        .returningAll()
        .executeTakeFirstOrThrow();

      // Create version entry documenting the rollback
      await trx
        .insertInto('flow_versions')
        .values({
          flow_id: flowId,
          version: result.version,
          spec: result.spec,
          created_by: createdBy,
          changelog: `Rolled back to version ${targetVersion.version} (${new Date(targetVersion.created_at).toISOString()})`,
        })
        .execute();

      return result;
    });
  }

  /**
   * Compare two versions of a flow
   *
   * @param flowId - Flow ID
   * @param version1Id - First version ID
   * @param version2Id - Second version ID
   */
  static async compareVersions(
    flowId: string,
    version1Id: string,
    version2Id: string
  ): Promise<VersionDiff> {
    const db = getDatabase();

    const [version1, version2] = await Promise.all([
      db
        .selectFrom('flow_versions')
        .selectAll()
        .where('id', '=', version1Id)
        .where('flow_id', '=', flowId)
        .executeTakeFirst(),
      db
        .selectFrom('flow_versions')
        .selectAll()
        .where('id', '=', version2Id)
        .where('flow_id', '=', flowId)
        .executeTakeFirst(),
    ]);

    if (!version1 || !version2) {
      throw new Error('One or both versions not found');
    }

    return compareVersions(version1.spec, version2.spec);
  }

  /**
   * Delete a flow and all its versions
   */
  static async delete(id: string): Promise<void> {
    const db = getDatabase();

    await db.deleteFrom('flows').where('id', '=', id).execute();
  }
}
