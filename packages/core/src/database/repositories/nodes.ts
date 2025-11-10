/**
 * Repository for managing node catalog
 */

import { getDatabase } from '../db';
import { Node, NewNode, NodeUpdate } from '../schema';

export class NodeRepository {
  /**
   * Register a new node
   */
  static async register(node: NewNode): Promise<Node> {
    const db = getDatabase();

    // Upsert - update if exists, insert if not
    const result = await db
      .insertInto('nodes')
      .values(node)
      .onConflict((oc) =>
        oc.columns(['name', 'version']).doUpdateSet({
          manifest: node.manifest,
          last_seen_at: new Date(),
          is_active: true,
        })
      )
      .returningAll()
      .executeTakeFirstOrThrow();

    return result;
  }

  /**
   * Get node by name and version
   */
  static async getByNameAndVersion(
    name: string,
    version: string
  ): Promise<Node | undefined> {
    const db = getDatabase();

    return await db
      .selectFrom('nodes')
      .selectAll()
      .where('name', '=', name)
      .where('version', '=', version)
      .executeTakeFirst();
  }

  /**
   * Get latest version of a node
   */
  static async getLatestByName(name: string): Promise<Node | undefined> {
    const db = getDatabase();

    return await db
      .selectFrom('nodes')
      .selectAll()
      .where('name', '=', name)
      .where('is_active', '=', true)
      .orderBy('registered_at', 'desc')
      .executeTakeFirst();
  }

  /**
   * List all active nodes
   */
  static async listActive(): Promise<Node[]> {
    const db = getDatabase();

    return await db
      .selectFrom('nodes')
      .selectAll()
      .where('is_active', '=', true)
      .orderBy('name')
      .execute();
  }

  /**
   * Update node heartbeat
   */
  static async heartbeat(name: string, version: string): Promise<void> {
    const db = getDatabase();

    await db
      .updateTable('nodes')
      .set({ last_seen_at: new Date() })
      .where('name', '=', name)
      .where('version', '=', version)
      .execute();
  }

  /**
   * Deactivate a node
   */
  static async deactivate(name: string, version: string): Promise<void> {
    const db = getDatabase();

    await db
      .updateTable('nodes')
      .set({ is_active: false })
      .where('name', '=', name)
      .where('version', '=', version)
      .execute();
  }

  /**
   * Mark nodes as inactive if not seen recently
   */
  static async markStaleNodesInactive(thresholdMinutes = 5): Promise<number> {
    const db = getDatabase();

    const threshold = new Date(Date.now() - thresholdMinutes * 60 * 1000);

    const result = await db
      .updateTable('nodes')
      .set({ is_active: false })
      .where('last_seen_at', '<', threshold)
      .where('is_active', '=', true)
      .executeTakeFirst();

    return Number(result.numUpdatedRows || 0);
  }
}
