/**
 * Converter: n8n Node Code → REFLUX Moleculer Service
 *
 * Converts n8n node TypeScript implementations to REFLUX Moleculer services
 */

export interface ConversionResult {
  success: boolean;
  code?: string;
  nodeName?: string;
  errors: string[];
  warnings: string[];
}

export class N8nNodeConverter {
  private errors: string[] = [];
  private warnings: string[] = [];

  /**
   * Convert n8n node code to REFLUX Moleculer service
   */
  convert(n8nNodeCode: string): ConversionResult {
    this.errors = [];
    this.warnings = [];

    try {
      // Extract node information
      const nodeName = this.extractNodeName(n8nNodeCode);
      const displayName = this.extractDisplayName(n8nNodeCode);
      const properties = this.extractProperties(n8nNodeCode);
      const executeMethod = this.extractExecuteMethod(n8nNodeCode);

      if (!nodeName || !executeMethod) {
        this.errors.push('Could not extract node name or execute method');
        return {
          success: false,
          errors: this.errors,
          warnings: this.warnings,
        };
      }

      // Generate REFLUX service code
      const refluxCode = this.generateRefluxService(
        nodeName,
        displayName,
        properties,
        executeMethod
      );

      return {
        success: true,
        code: refluxCode,
        nodeName,
        errors: this.errors,
        warnings: this.warnings,
      };
    } catch (error: any) {
      this.errors.push(`Conversion failed: ${error.message}`);
      return {
        success: false,
        errors: this.errors,
        warnings: this.warnings,
      };
    }
  }

  private extractNodeName(code: string): string | null {
    // Extract from description.name
    const match = code.match(/name:\s*['"]([^'"]+)['"]/);
    return match ? match[1] : null;
  }

  private extractDisplayName(code: string): string | null {
    const match = code.match(/displayName:\s*['"]([^'"]+)['"]/);
    return match ? match[1] : null;
  }

  private extractProperties(code: string): any[] {
    // Extract properties array from description
    const propertiesMatch = code.match(/properties:\s*\[([\s\S]*?)\],?\s*\}/);
    if (!propertiesMatch) return [];

    try {
      // Parse properties (simplified - real implementation would need proper AST parsing)
      const propsStr = propertiesMatch[1];
      // For now, just extract property names
      const names = propsStr.match(/name:\s*['"]([^'"]+)['"]/g) || [];
      return names.map((n) => {
        const match = n.match(/['"]([^'"]+)['"]/);
        return match ? match[1] : null;
      }).filter(Boolean);
    } catch (error) {
      this.warnings.push('Could not parse properties');
      return [];
    }
  }

  private extractExecuteMethod(code: string): string | null {
    // Extract execute method body
    const match = code.match(/async execute\([\s\S]*?\{([\s\S]*)\n\s*\}/m);
    return match ? match[1] : null;
  }

  private generateRefluxService(
    nodeName: string,
    displayName: string | null,
    properties: string[],
    executeBody: string
  ): string {
    // Convert n8n node name to REFLUX format
    const refluxNodeName = this.convertNodeName(nodeName);

    // Generate Moleculer service parameters
    const params = this.generateParams(properties);

    // Convert execute body
    const convertedBody = this.convertExecuteBody(executeBody);

    return `/**
 * ${displayName || nodeName} Node
 * Auto-converted from n8n node
 */
import { Service, ServiceBroker } from 'moleculer';
import axios from 'axios';

export default class ${this.toPascalCase(nodeName)}Node extends Service {
  constructor(broker: ServiceBroker) {
    super(broker);

    this.parseServiceSchema({
      name: '1.0.0.${refluxNodeName}',
      actions: {
        execute: {
          params: ${params},
          async handler(ctx: any) {
            const params = ctx.params;
            const workflowContext = ctx.meta || {};

            this.logger.info('[${nodeName}] Executing...');

            try {
              ${convertedBody}
            } catch (error: any) {
              this.logger.error('[${nodeName}] Execution failed:', error.message);
              throw new Error(\`${nodeName} execution failed: \${error.message}\`);
            }
          },
        },
      },
    });
  }
}
`;
  }

  private convertNodeName(n8nName: string): string {
    // Convert n8n node name to REFLUX format
    // e.g., "slack" → "nodes.slack.send"
    return `nodes.${n8nName.toLowerCase()}.execute`;
  }

  private generateParams(properties: string[]): string {
    if (properties.length === 0) {
      return '{}';
    }

    const params = properties
      .map((prop) => `            ${prop}: { type: 'any', optional: true }`)
      .join(',\n');

    return `{\n${params}\n          }`;
  }

  private convertExecuteBody(body: string): string {
    // Convert n8n-specific code to REFLUX equivalents
    let converted = body;

    // Convert this.getInputData() first
    converted = converted.replace(
      /const items = this\.getInputData\(\);?/g,
      'const items = workflowContext.items || []'
    );

    // Convert this.getNodeParameter() with index → params.paramName
    // Handle pattern: this.getNodeParameter('name', i, 'default')
    converted = converted.replace(
      /this\.getNodeParameter\(['"](\w+)['"],\s*i(?:,\s*['"]([^'"]*?)['"])?\)/g,
      (match, paramName, defaultValue) => {
        if (defaultValue !== undefined) {
          return `(params.${paramName} ?? '${defaultValue}')`;
        }
        return `params.${paramName}`;
      }
    );

    // Convert this.getNodeParameter() without index
    converted = converted.replace(
      /this\.getNodeParameter\(['"](\w+)['"]\)/g,
      'params.$1'
    );

    // Convert await this.getCredentials() → environment variable access
    converted = converted.replace(
      /const (\w+) = await this\.getCredentials\(['"](\w+)['"]\);?/g,
      'const $1 = { token: process.env.$2_TOKEN || process.env.$2 };'
    );

    // Convert this.helpers.request() → axios() with proper options
    converted = converted.replace(
      /await this\.helpers\.request\(\{/g,
      'await axios({'
    );

    // Fix axios body → data for POST/PUT requests
    // Handle both: "body," (shorthand) and "body: variable"
    converted = converted.replace(
      /(\s+)body(,|\s*:\s*\w+)/g,
      (match, whitespace, rest) => {
        if (rest === ',') {
          return `${whitespace}data: body,`;
        }
        return `${whitespace}data${rest}`;
      }
    );

    // Remove json: true from axios calls (axios handles this automatically)
    converted = converted.replace(
      /,?\s*json:\s*true,?/g,
      ''
    );

    // Convert this.continueOnFail()
    converted = converted.replace(
      /this\.continueOnFail\(\)/g,
      '(workflowContext.continueOnFail || false)'
    );

    // Convert return [returnData] → return { items: returnData }
    converted = converted.replace(
      /return \[returnData\];?$/gm,
      'return { items: returnData };'
    );

    // Convert return [this.helpers.returnJsonArray(...)]
    converted = converted.replace(
      /return \[this\.helpers\.returnJsonArray\((.*?)\)\];?/g,
      'return { items: $1 };'
    );

    // Clean up any double awaits
    converted = converted.replace(
      /await await /g,
      'await '
    );

    // Clean up any double const
    converted = converted.replace(
      /const const /g,
      'const '
    );

    // Add axios response handling comment
    if (converted.includes('await axios(')) {
      this.warnings.push(
        'Axios responses: use response.data to access body, response.status for status code'
      );
    }

    // Add warning comments for remaining complex conversions
    if (converted.includes('this.')) {
      this.warnings.push(
        'Code contains unconverted "this." references - manual review needed'
      );
      converted = `// ⚠️ WARNING: Manual review needed for some n8n-specific code\n              ${converted}`;
    }

    return converted.trim();
  }

  private toPascalCase(str: string): string {
    return str
      .split(/[-_.]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
  }
}

/**
 * Convert n8n node code to REFLUX service
 */
export function convertN8nNode(n8nNodeCode: string): ConversionResult {
  const converter = new N8nNodeConverter();
  return converter.convert(n8nNodeCode);
}
