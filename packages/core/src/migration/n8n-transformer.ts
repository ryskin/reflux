/**
 * n8n to REFLUX workflow transformer
 */

import { N8nWorkflow, N8nNode, N8N_TO_REFLUX_NODE_MAP } from './n8n-types';
import { WorkflowSpec, StepSpec } from '../types';

export interface TransformResult {
  success: boolean;
  workflow?: WorkflowSpec;
  warnings: string[];
  errors: string[];
  unmappedNodes: string[];
}

export class N8nTransformer {
  private warnings: string[] = [];
  private errors: string[] = [];
  private unmappedNodes: Set<string> = new Set();

  /**
   * Transform n8n workflow to REFLUX workflow
   */
  transform(n8nWorkflow: N8nWorkflow): TransformResult {
    this.warnings = [];
    this.errors = [];
    this.unmappedNodes = new Set();

    try {
      const workflow = this.transformWorkflow(n8nWorkflow);

      return {
        success: true,
        workflow,
        warnings: this.warnings,
        errors: this.errors,
        unmappedNodes: Array.from(this.unmappedNodes),
      };
    } catch (error: any) {
      this.errors.push(`Transformation failed: ${error.message}`);
      return {
        success: false,
        warnings: this.warnings,
        errors: this.errors,
        unmappedNodes: Array.from(this.unmappedNodes),
      };
    }
  }

  private transformWorkflow(n8nWorkflow: N8nWorkflow): WorkflowSpec {
    // Convert nodes to steps
    const steps: StepSpec[] = [];

    for (const n8nNode of n8nWorkflow.nodes) {
      const step = this.transformNode(n8nNode);
      if (step) {
        steps.push(step);
      }
    }

    // Build workflow spec
    const workflow: WorkflowSpec = {
      name: n8nWorkflow.name,
      version: '1.0.0',
      description: `Migrated from n8n workflow`,
      steps,
    };

    // Add tags if present
    if (n8nWorkflow.tags && n8nWorkflow.tags.length > 0) {
      workflow.meta = {
        tags: n8nWorkflow.tags,
      };
    }

    return workflow;
  }

  private transformNode(n8nNode: N8nNode): StepSpec | null {
    // Skip disabled nodes
    if (n8nNode.disabled) {
      this.warnings.push(`Skipping disabled node: ${n8nNode.name}`);
      return null;
    }

    // Map n8n node type to REFLUX node
    const refluxNodeType = this.mapNodeType(n8nNode.type);
    if (!refluxNodeType) {
      this.unmappedNodes.add(n8nNode.type);
      this.warnings.push(
        `Unsupported node type: ${n8nNode.type} (node: ${n8nNode.name})`
      );
      return null;
    }

    // Transform parameters based on node type
    const params = this.transformParameters(n8nNode.type, n8nNode.parameters);

    // Build step spec
    const step: StepSpec = {
      id: this.sanitizeId(n8nNode.name),
      node: refluxNodeType,
      version: '1.0.0',
      with: params,
    };

    // Add notes as comment if present
    if (n8nNode.notes) {
      (step as any).comment = n8nNode.notes;
    }

    return step;
  }

  private mapNodeType(n8nType: string): string | null {
    return N8N_TO_REFLUX_NODE_MAP[n8nType] || null;
  }

  private transformParameters(
    nodeType: string,
    params: Record<string, unknown>
  ): Record<string, unknown> {
    // Transform based on node type
    switch (nodeType) {
      case 'n8n-nodes-base.httpRequest':
        return this.transformHttpRequestParams(params);

      case 'n8n-nodes-base.webhook':
        return this.transformWebhookParams(params);

      case 'n8n-nodes-base.code':
      case 'n8n-nodes-base.function':
        return this.transformCodeParams(params);

      case 'n8n-nodes-base.if':
      case 'n8n-nodes-base.switch':
        return this.transformConditionParams(params);

      case 'n8n-nodes-base.postgres':
      case 'n8n-nodes-base.mysql':
        return this.transformDatabaseParams(params);

      case 'n8n-nodes-base.openAi':
        return this.transformOpenAIParams(params);

      default:
        // Return as-is for unmapped nodes
        return params;
    }
  }

  private transformHttpRequestParams(
    params: Record<string, unknown>
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {
      url: params.url || '',
      method: params.method || 'GET',
    };

    // Transform headers
    if (params.headerParametersJson) {
      result.headers = params.headerParametersJson;
    } else if (params.headerParametersUi) {
      const ui = params.headerParametersUi as any;
      if (ui.parameter && Array.isArray(ui.parameter)) {
        result.headers = ui.parameter.reduce(
          (acc: any, p: any) => ({
            ...acc,
            [p.name]: p.value,
          }),
          {}
        );
      }
    }

    // Transform body
    if (params.bodyParametersJson) {
      result.body = params.bodyParametersJson;
    } else if (params.bodyParametersUi) {
      const ui = params.bodyParametersUi as any;
      if (ui.parameter && Array.isArray(ui.parameter)) {
        result.body = ui.parameter.reduce(
          (acc: any, p: any) => ({
            ...acc,
            [p.name]: p.value,
          }),
          {}
        );
      }
    }

    // Authentication
    if (params.authentication) {
      this.warnings.push(
        'HTTP authentication detected - credentials need manual setup in REFLUX'
      );
    }

    return result;
  }

  private transformWebhookParams(
    params: Record<string, unknown>
  ): Record<string, unknown> {
    return {
      path: params.path || '/webhook',
      method: params.httpMethod || 'POST',
      responseMode: params.responseMode || 'onReceived',
    };
  }

  private transformCodeParams(
    params: Record<string, unknown>
  ): Record<string, unknown> {
    return {
      code: params.jsCode || params.functionCode || '',
      language: 'javascript',
    };
  }

  private transformConditionParams(
    params: Record<string, unknown>
  ): Record<string, unknown> {
    // n8n uses complex condition UI, simplify for REFLUX
    return {
      conditions: params.conditions || params.rules,
      mode: params.mode || 'expression',
    };
  }

  private transformDatabaseParams(
    params: Record<string, unknown>
  ): Record<string, unknown> {
    return {
      query: params.query || '',
      operation: params.operation || 'executeQuery',
    };
  }

  private transformOpenAIParams(
    params: Record<string, unknown>
  ): Record<string, unknown> {
    return {
      model: params.model || 'gpt-4',
      prompt: params.prompt || params.text || '',
      temperature: params.temperature || 0.7,
      maxTokens: params.maxTokens || 1000,
    };
  }

  private sanitizeId(name: string): string {
    // Convert n8n node name to valid step ID
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  }
}

/**
 * Transform n8n workflow to REFLUX workflow
 */
export function transformN8nWorkflow(n8nWorkflow: N8nWorkflow): TransformResult {
  const transformer = new N8nTransformer();
  return transformer.transform(n8nWorkflow);
}
