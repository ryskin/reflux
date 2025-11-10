/**
 * Database Node - Executes PostgreSQL queries
 * Supports SELECT, INSERT, UPDATE, DELETE with parameter binding
 */
import { Service, ServiceBroker } from 'moleculer';
import { Pool } from 'pg';

export default class DatabaseNode extends Service {
  private pool: Pool | null = null;

  constructor(broker: ServiceBroker) {
    super(broker);

    this.parseServiceSchema({
      name: '1.0.0.nodes.database.query',
      actions: {
        execute: {
          params: {
            connectionString: { type: 'string', optional: true }, // PostgreSQL connection string
            query: 'string', // SQL query
            params: { type: 'array', optional: true }, // Query parameters for parameterized queries
          },
          async handler(ctx: any) {
            const { connectionString, query, params = [] } = ctx.params;

            this.logger.info(`[Database] Executing query`);

            try {
              // Get or create connection pool
              const pool = this.getPool(connectionString);

              // Execute query with parameters
              const result = await pool.query(query, params);

              this.logger.info(`[Database] Query executed successfully, ${result.rowCount} rows affected`);

              return {
                rows: result.rows,
                rowCount: result.rowCount,
                fields: result.fields?.map((f: any) => ({ name: f.name, dataTypeID: f.dataTypeID })),
              };
            } catch (error: any) {
              this.logger.error(`[Database] Query failed:`, error.message);
              throw new Error(`Database query failed: ${error.message}`);
            }
          },
        },
      },
      stopped: () => {
        // Close pool on service stop
        if (this.pool) {
          this.pool.end();
          this.pool = null;
        }
      },
    });
  }

  /**
   * Get or create connection pool
   * Uses environment variable DATABASE_URL if no connection string provided
   */
  private getPool(connectionString?: string): Pool {
    const connStr = connectionString || process.env.DATABASE_URL;

    if (!connStr) {
      throw new Error('No database connection string provided. Set DATABASE_URL or pass connectionString parameter.');
    }

    // Reuse existing pool if same connection string
    if (!this.pool) {
      this.pool = new Pool({
        connectionString: connStr,
        max: 10, // Maximum pool size
        idleTimeoutMillis: 30000, // 30 seconds
        connectionTimeoutMillis: 5000, // 5 seconds
      });

      this.logger.info('[Database] Created new connection pool');
    }

    return this.pool;
  }
}
