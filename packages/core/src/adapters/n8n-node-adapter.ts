/**
 * n8n Node Compatibility Adapter
 *
 * Allows running original n8n nodes in REFLUX without conversion
 * Implements n8n's IExecuteFunctions interface
 */
import { Service, ServiceBroker, Context } from 'moleculer';
import axios from 'axios';
import { nodeCache } from './n8n-node-cache';

// Security: Whitelist of allowed n8n packages
const ALLOWED_N8N_PACKAGES = new Set([
  'n8n-nodes-base',
  // Add more when needed: 'n8n-nodes-community', etc.
]);

// n8n interfaces (simplified)
export interface INodeExecutionData {
  json: Record<string, any>;
  binary?: Record<string, any>;
  pairedItem?: number | { item: number };
}

export interface INodeTypeDescription {
  displayName: string;
  name: string;
  group: string[];
  version: number | number[];
  description: string;
  defaults: {
    name: string;
  };
  inputs: string[];
  outputs: string[];
  credentials?: Array<{
    name: string;
    required?: boolean;
  }>;
  properties: any[];
}

export interface INodeType {
  description: INodeTypeDescription;
  execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]>;
}

export interface IExecuteFunctions {
  getInputData(): INodeExecutionData[];
  getNodeParameter(parameterName: string, itemIndex: number, fallbackValue?: any): any;
  getCredentials(type: string, itemIndex?: number): Promise<any>;
  getWorkflow(): any;
  getNode(): any;
  continueOnFail(): boolean;
  helpers: {
    request(options: any): Promise<any>;
    requestWithAuthentication(credentialsType: string, options: any): Promise<any>;
    returnJsonArray(data: any[]): INodeExecutionData[];
    prepareBinaryData(data: Buffer, fileName?: string, mimeType?: string): any;
  };
}

/**
 * N8nNodeAdapter - Wraps n8n node as Moleculer service
 */
export class N8nNodeAdapter extends Service {
  private n8nNode: INodeType;
  private nodeDescription: INodeTypeDescription;

  constructor(broker: ServiceBroker, n8nNode: INodeType) {
    super(broker);

    this.n8nNode = n8nNode;
    this.nodeDescription = n8nNode.description;

    // Convert n8n node to Moleculer service
    this.parseServiceSchema({
      name: `1.0.0.nodes.n8n.${this.nodeDescription.name}`,

      metadata: {
        n8nCompatible: true,
        displayName: this.nodeDescription.displayName,
        description: this.nodeDescription.description,
        version: this.nodeDescription.version,
      },

      actions: {
        execute: {
          params: this.generateMoleculerParams(),

          async handler(ctx: Context) {
            const params = ctx.params;
            const workflowContext = ctx.meta || {};

            this.logger.info(`[n8n:${this.nodeDescription.name}] Executing...`);

            try {
              // Create n8n execution context
              const executeFunctions = this.createExecuteFunctions(ctx);

              // Execute original n8n node
              const result = await this.n8nNode.execute.call(executeFunctions);

              // Convert n8n result format to REFLUX format
              return this.convertN8nResult(result);

            } catch (error: any) {
              this.logger.error(`[n8n:${this.nodeDescription.name}] Failed:`, error.message);
              throw error;
            }
          },
        },

        // Expose n8n node metadata
        getDescription: {
          handler() {
            return this.nodeDescription;
          },
        },
      },
    });
  }

  /**
   * Generate Moleculer params from n8n properties
   */
  private generateMoleculerParams(): any {
    const params: any = {};

    // Handle case where properties might be a function or undefined
    const properties = this.nodeDescription.properties || [];
    if (!Array.isArray(properties)) {
      // If it's not an array, return empty params
      return {};
    }

    for (const prop of properties) {
      // Skip UI-only properties
      if (prop.type === 'notice' || prop.type === 'hidden') {
        continue;
      }

      params[prop.name] = {
        type: this.mapN8nTypeToMoleculer(prop.type),
        optional: !prop.required,
        default: prop.default,
      };
    }

    return params;
  }

  /**
   * Map n8n property types to Moleculer types
   */
  private mapN8nTypeToMoleculer(n8nType: string): string {
    const typeMap: Record<string, string> = {
      'string': 'string',
      'number': 'number',
      'boolean': 'boolean',
      'json': 'object',
      'options': 'string',
      'multiOptions': 'array',
      'collection': 'object',
      'fixedCollection': 'object',
      'color': 'string',
      'dateTime': 'string',
    };

    return typeMap[n8nType] || 'any';
  }

  /**
   * Create n8n IExecuteFunctions context
   */
  private createExecuteFunctions(ctx: Context): IExecuteFunctions {
    const params = ctx.params;
    const workflowContext: any = ctx.meta || {};
    const items = workflowContext.items || [];

    const self = this;

    return {
      /**
       * Get input data items
       */
      getInputData(): INodeExecutionData[] {
        return items;
      },

      /**
       * Get node parameter value
       */
      getNodeParameter(parameterName: string, itemIndex: number, fallbackValue?: any): any {
        // In REFLUX, parameters are not per-item, so ignore itemIndex
        const value = (params as any)[parameterName];

        if (value === undefined) {
          if (fallbackValue !== undefined) {
            return fallbackValue;
          }

          // Try to find default from property definition
          const prop = self.nodeDescription.properties.find(p => p.name === parameterName);
          if (prop?.default !== undefined) {
            return prop.default;
          }
        }

        return value;
      },

      /**
       * Get credentials
       */
      async getCredentials(type: string, itemIndex?: number): Promise<any> {
        // Check if credentials are provided in params
        if ((params as any)[`_credentials_${type}`]) {
          return (params as any)[`_credentials_${type}`];
        }

        // Fallback to environment variables
        const envVar = `N8N_CREDENTIALS_${type.toUpperCase()}`;
        const credentials = process.env[envVar];

        if (!credentials) {
          throw new Error(`Credentials "${type}" not found. Set ${envVar} environment variable.`);
        }

        try {
          return JSON.parse(credentials);
        } catch {
          return { token: credentials };
        }
      },

      /**
       * Get workflow info
       */
      getWorkflow(): any {
        return {
          id: workflowContext.workflowId || 'unknown',
          name: workflowContext.workflowName || 'REFLUX Workflow',
          active: true,
        };
      },

      /**
       * Get node info
       */
      getNode(): any {
        return {
          id: ctx.nodeID,
          name: self.nodeDescription.displayName,
          type: self.nodeDescription.name,
          typeVersion: self.nodeDescription.version,
          parameters: params,
        };
      },

      /**
       * Check if workflow should continue on fail
       */
      continueOnFail(): boolean {
        return workflowContext.continueOnFail || false;
      },

      /**
       * Helper functions
       */
      helpers: {
        /**
         * Make HTTP request
         */
        async request(options: any): Promise<any> {
          self.logger.debug('[n8n:helpers.request]', {
            method: options.method,
            url: options.url,
          });

          const axiosOptions: any = {
            method: options.method || 'GET',
            url: options.url,
            headers: options.headers || {},
            timeout: options.timeout || 30000,
          };

          // Handle body/data
          if (options.body !== undefined) {
            axiosOptions.data = options.body;
          }

          // Handle query parameters
          if (options.qs) {
            axiosOptions.params = options.qs;
          }

          // Handle JSON flag
          if (options.json === true) {
            axiosOptions.headers['Content-Type'] = 'application/json';
          }

          const response = await axios(axiosOptions);

          // n8n's request helper returns body directly for json: true
          if (options.json === true) {
            return response.data;
          }

          // Otherwise return full response
          return response.data;
        },

        /**
         * Make authenticated request
         */
        async requestWithAuthentication(this: IExecuteFunctions, credentialsType: string, options: any): Promise<any> {
          const credentials = await this.getCredentials(credentialsType);

          // Add authentication based on credentials type
          if (credentials.token) {
            options.headers = options.headers || {};
            options.headers['Authorization'] = `Bearer ${credentials.token}`;
          } else if (credentials.apiKey) {
            options.headers = options.headers || {};
            options.headers['X-API-Key'] = credentials.apiKey;
          }

          return this.helpers.request(options);
        },

        /**
         * Convert array to n8n format
         */
        returnJsonArray(data: any[]): INodeExecutionData[] {
          return data.map(item => ({
            json: typeof item === 'object' ? item : { data: item },
          }));
        },

        /**
         * Prepare binary data
         */
        prepareBinaryData(data: Buffer, fileName?: string, mimeType?: string): any {
          return {
            data: data.toString('base64'),
            fileName: fileName || 'file',
            mimeType: mimeType || 'application/octet-stream',
          };
        },
      },
    };
  }

  /**
   * Convert n8n result format to REFLUX format
   */
  private convertN8nResult(n8nResult: INodeExecutionData[][]): any {
    // n8n returns array of arrays (for multiple outputs)
    // REFLUX expects { items: [...] }

    if (!n8nResult || n8nResult.length === 0) {
      return { items: [] };
    }

    // Take first output (most nodes have single output)
    const items = n8nResult[0];

    return { items };
  }
}

/**
 * Factory function to create n8n node adapter service
 */
export function createN8nNodeService(n8nNode: INodeType): any {
  return class extends N8nNodeAdapter {
    constructor(broker: ServiceBroker) {
      super(broker, n8nNode);
    }
  };
}

/**
 * Load n8n node from package
 */
export async function loadN8nNode(packageName: string, nodeName: string, version?: number): Promise<INodeType> {
  // SECURITY: Validate package is whitelisted
  if (!ALLOWED_N8N_PACKAGES.has(packageName)) {
    throw new Error(`Package "${packageName}" is not in the allowed list. Only ${Array.from(ALLOWED_N8N_PACKAGES).join(', ')} are permitted.`);
  }

  // SECURITY: Validate node name (prevent path traversal)
  if (!/^[A-Za-z0-9]+$/.test(nodeName)) {
    throw new Error(`Invalid node name: "${nodeName}". Only alphanumeric characters are allowed.`);
  }

  // PERFORMANCE: Check cache first
  const cacheKey = `${packageName}:${nodeName}:${version || 'latest'}`;
  const cached = await nodeCache.get(cacheKey);
  if (cached) {
    console.log(`[n8n-adapter] Cache hit for ${cacheKey}`);
    return cached;
  }

  try {
    // Try to load from dist/nodes/<NodeName>/<NodeName>.node.js
    let nodePath = `${packageName}/dist/nodes/${nodeName}/${nodeName}.node`;

    try {
      const nodeModule = await import(nodePath);
      const NodeClass = nodeModule[nodeName] || nodeModule.default;

      if (NodeClass && typeof NodeClass === 'function') {
        const node = new NodeClass();

        // Check if it's a versioned node
        if (node.nodeVersions && typeof node.nodeVersions === 'object') {
          // Get the specific version or default version
          const versionToUse = version || node.currentVersion || node.description?.defaultVersion || 1;
          const versionedNode = node.nodeVersions[versionToUse];

          if (versionedNode) {
            // If it's a class, instantiate it
            if (typeof versionedNode === 'function') {
              return new versionedNode();
            }
            // If it's already an instance, return it
            return versionedNode;
          }

          // Fallback: try to find any available version
          const availableVersions = Object.keys(node.nodeVersions);
          if (availableVersions.length > 0) {
            const firstVersion = node.nodeVersions[availableVersions[0]];
            if (typeof firstVersion === 'function') {
              return new firstVersion();
            }
            return firstVersion;
          }
        }

        return node;
      }
    } catch (e) {
      // Try alternative path
    }

    // Try loading from package root
    const nodePackage = await import(packageName);
    const NodeClass = nodePackage[nodeName] || nodePackage.default;

    if (!NodeClass || typeof NodeClass !== 'function') {
      throw new Error(`Node "${nodeName}" not found or is not a constructor`);
    }

    const nodeInstance = new NodeClass();

    // PERFORMANCE: Cache the loaded node
    nodeCache.set(cacheKey, nodeInstance);
    console.log(`[n8n-adapter] Cached ${cacheKey}`);

    return nodeInstance;
  } catch (error: any) {
    throw new Error(`Failed to load n8n node "${nodeName}": ${error.message}`);
  }
}
