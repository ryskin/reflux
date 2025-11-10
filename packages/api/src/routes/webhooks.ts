/**
 * Dynamic webhook routes for workflow triggers
 */

import { Router, Request, Response } from 'express';
import { FlowRepository, RunRepository, WorkflowClient } from '@reflux/core';

const router = Router();

/**
 * Dynamic webhook handler - matches any path and finds corresponding active workflow
 */
router.all('/*', async (req: Request, res: Response) => {
  const webhookPath = req.path; // e.g., "/ask-ai"

  try {
    console.log(`📨 Webhook received: ${req.method} ${webhookPath}`);

    // Find active flow with matching webhook trigger
    const flows = await FlowRepository.listActive();

    const matchingFlow = flows.find((flow) => {
      if (!flow.spec || typeof flow.spec !== 'object') return false;

      const spec = flow.spec as { nodes?: any[] };
      if (!spec.nodes || !Array.isArray(spec.nodes)) return false;

      // Check if any webhook trigger node matches this path
      return spec.nodes.some((node) => {
        return (
          node.type === 'nodes.webhook.trigger' &&
          node.params?.path === webhookPath &&
          (node.params?.method === req.method || !node.params?.method || node.params?.method === 'POST')
        );
      });
    });

    if (!matchingFlow) {
      console.log(`❌ No active workflow found for webhook: ${webhookPath}`);
      return res.status(404).json({
        error: 'Webhook not found',
        message: `No active workflow is configured to handle ${req.method} ${webhookPath}`,
        hint: 'Make sure your workflow is active and has a webhook trigger with this path',
      });
    }

    console.log(`✅ Found matching workflow: ${matchingFlow.name} (${matchingFlow.id})`);

    // Prepare inputs from webhook request
    const inputs = {
      method: req.method,
      path: webhookPath,
      headers: req.headers,
      query: req.query,
      body: req.body,
      params: req.params,
    };

    // Create workflow client
    let client;
    try {
      client = await WorkflowClient.create();
    } catch (clientError: any) {
      console.error(`❌ Failed to create workflow client:`, clientError);
      return res.status(503).json({
        error: 'Workflow service unavailable',
        details: 'Unable to connect to workflow engine',
        retryAfter: 5,
      });
    }

    // Create run record
    const run = await RunRepository.create({
      flow_id: matchingFlow.id,
      flow_version: matchingFlow.version,
      status: 'pending',
      inputs,
      outputs: null,
      temporal_workflow_id: '',
      temporal_run_id: '',
    });

    console.log(`🚀 Starting workflow execution: ${matchingFlow.name}`);

    // Start workflow execution
    const { runId: temporalWorkflowId, handle } = await client.startWorkflowWithRunId(
      matchingFlow.id,
      matchingFlow.name,
      matchingFlow.spec as any,
      inputs,
      run.id
    );

    // Update run with temporal IDs
    await RunRepository.update(run.id, {
      temporal_workflow_id: temporalWorkflowId,
      temporal_run_id: temporalWorkflowId,
      status: 'running',
    });

    console.log(`✅ Workflow started: ${temporalWorkflowId} (db: ${run.id})`);

    // Return immediately with run information
    res.status(202).json({
      message: 'Workflow execution started',
      runId: run.id,
      workflowId: matchingFlow.id,
      workflowName: matchingFlow.name,
      status: 'running',
    });

    // Update run status in background
    handle.result()
      .then(async (result: unknown) => {
        console.log(`✅ Workflow completed: ${temporalWorkflowId}`);
        try {
          await RunRepository.update(run.id, {
            status: 'completed',
            outputs: result,
            completed_at: new Date(),
          });
        } catch (updateError: any) {
          console.error(`❌ Failed to update run ${run.id}:`, updateError.message);
        }
      })
      .catch(async (workflowError: any) => {
        console.error(`❌ Workflow failed: ${temporalWorkflowId}`, workflowError.message);
        try {
          await RunRepository.update(run.id, {
            status: 'failed',
            error: workflowError.message,
            completed_at: new Date(),
          });
        } catch (updateError: any) {
          console.error(`❌ Failed to update run ${run.id}:`, updateError.message);
        }
      });
  } catch (error: any) {
    console.error('❌ Webhook handler error:', error);

    // Return appropriate error response
    if (error.message?.includes('not found')) {
      return res.status(404).json({
        error: 'Resource not found',
        details: error.message,
      });
    }

    if (error.message?.includes('validation') || error.message?.includes('invalid')) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.message,
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      details: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    });
  }
});

export default router;
