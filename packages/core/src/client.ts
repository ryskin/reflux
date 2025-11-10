/**
 * Temporal client for triggering workflows
 */

import { Client, Connection } from '@temporalio/client';
import { v4 as uuid } from 'uuid';
import type { ExecuteWorkflowInput, ExecuteWorkflowResult, FlowSpec } from './workflows/execute-workflow';

export class WorkflowClient {
  private client: Client;

  private constructor(client: Client) {
    this.client = client;
  }

  static async create(): Promise<WorkflowClient> {
    const connection = await Connection.connect({
      address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
    });

    const client = new Client({ connection });
    return new WorkflowClient(client);
  }

  /**
   * Start a workflow execution
   */
  async startWorkflow(
    flowId: string,
    flowName: string,
    spec: FlowSpec,
    inputs: Record<string, unknown> = {}
  ): Promise<{ runId: string; handle: any }> {
    const runId = uuid();

    const input: ExecuteWorkflowInput = {
      flowId,
      flowName,
      spec,
      inputs,
      runId,
    };

    const handle = await this.client.workflow.start('executeWorkflow', {
      taskQueue: 'reflux',
      workflowId: runId,
      args: [input],
    });

    console.log(`✅ Started workflow: ${flowName} (${runId})`);

    return { runId, handle };
  }

  /**
   * Start a workflow execution with a specific database run ID
   */
  async startWorkflowWithRunId(
    flowId: string,
    flowName: string,
    spec: FlowSpec,
    inputs: Record<string, unknown>,
    dbRunId: string
  ): Promise<{ runId: string; handle: any }> {
    const temporalWorkflowId = uuid();

    const input: ExecuteWorkflowInput = {
      flowId,
      flowName,
      spec,
      inputs,
      runId: dbRunId,  // Use database run ID for metrics
    };

    const handle = await this.client.workflow.start('executeWorkflow', {
      taskQueue: 'reflux',
      workflowId: temporalWorkflowId,
      args: [input],
    });

    console.log(`✅ Started workflow: ${flowName} (temporal: ${temporalWorkflowId}, db: ${dbRunId})`);

    return { runId: temporalWorkflowId, handle };
  }

  /**
   * Execute workflow and wait for result
   */
  async executeWorkflow(
    flowId: string,
    flowName: string,
    spec: FlowSpec,
    inputs: Record<string, unknown> = {}
  ): Promise<ExecuteWorkflowResult> {
    const { handle } = await this.startWorkflow(flowId, flowName, spec, inputs);
    const result = await handle.result();
    return result;
  }

  /**
   * Get workflow result
   */
  async getWorkflowResult(runId: string): Promise<ExecuteWorkflowResult> {
    const handle = this.client.workflow.getHandle(runId);
    const result = await handle.result();
    return result;
  }

  /**
   * Get workflow status
   */
  async getWorkflowStatus(runId: string): Promise<string> {
    const handle = this.client.workflow.getHandle(runId);
    const description = await handle.describe();
    return description.status.name;
  }
}
