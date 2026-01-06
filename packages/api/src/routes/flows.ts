/**
 * Flow management routes
 */

import { Router } from 'express';
import { FlowRepository, RunRepository, WorkflowClient, runsTotal, runsDuration, runsActive } from '@reflux/core';

const router = Router();

/**
 * POST /api/flows - Create a new flow
 */
router.post('/', async (req, res) => {
  try {
    const { name, version, description, spec, tags } = req.body;

    console.log('📝 Creating flow:', { name, version, hasSpec: !!spec });

    const flow = await FlowRepository.create({
      name,
      version,
      description: description || null,
      spec,
      tags: tags || [],
    });

    console.log('✅ Flow created:', flow.id);
    res.status(201).json(flow);
  } catch (error: any) {
    console.error('❌ Flow creation failed:', error.message);
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/flows - List all flows
 */
router.get('/', async (req, res) => {
  try {
    const flows = await FlowRepository.listAll();
    res.json(flows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/flows/:id - Get flow by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const flow = await FlowRepository.getById(req.params.id);

    if (!flow) {
      return res.status(404).json({ error: 'Flow not found' });
    }

    res.json(flow);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/flows/:id/versions - Get all versions of a flow
 */
router.get('/:id/versions', async (req, res) => {
  try {
    const versions = await FlowRepository.getVersions(req.params.id);
    res.json(versions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/flows/:id/versions/:versionId - Get a specific version
 */
router.get('/:id/versions/:versionId', async (req, res) => {
  try {
    const version = await FlowRepository.getVersionById(req.params.versionId);

    if (!version || version.flow_id !== req.params.id) {
      return res.status(404).json({ error: 'Version not found' });
    }

    res.json(version);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/flows/:id/versions/:versionId/rollback - Rollback to a specific version
 */
router.post('/:id/versions/:versionId/rollback', async (req, res) => {
  try {
    const { createdBy } = req.body;

    const flow = await FlowRepository.rollbackToVersion(
      req.params.id,
      req.params.versionId,
      createdBy
    );

    res.json({
      message: 'Flow rolled back successfully',
      flow,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/flows/:id/versions/compare - Compare two versions
 */
router.get('/:id/versions/compare', async (req, res) => {
  try {
    const { version1, version2 } = req.query;

    if (!version1 || !version2) {
      return res.status(400).json({
        error: 'Missing required query parameters: version1 and version2',
      });
    }

    const diff = await FlowRepository.compareVersions(
      req.params.id,
      version1 as string,
      version2 as string
    );

    res.json(diff);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * PUT /api/flows/:id - Update a flow
 */
router.put('/:id', async (req, res) => {
  try {
    const { description, spec, tags, is_active } = req.body;

    // Only include fields that are explicitly provided (not undefined)
    const updates: any = {};
    if (description !== undefined) updates.description = description;
    if (spec !== undefined) updates.spec = spec;
    if (tags !== undefined) updates.tags = tags;
    if (is_active !== undefined) updates.is_active = is_active;

    const flow = await FlowRepository.update(req.params.id, updates);

    res.json(flow);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/flows/:id - Delete a flow
 */
router.delete('/:id', async (req, res) => {
  try {
    await FlowRepository.delete(req.params.id);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/flows/:id/execute - Execute a flow
 */
router.post('/:id/execute', async (req, res) => {
  let runId: string | undefined;
  let client: any;

  try {
    const flow = await FlowRepository.getById(req.params.id);

    if (!flow) {
      return res.status(404).json({
        error: 'Flow not found',
        flowId: req.params.id
      });
    }

    if (!flow.is_active) {
      return res.status(400).json({
        error: 'Flow is not active',
        flowId: flow.id,
        status: 'inactive'
      });
    }

    const inputs = req.body.inputs || {};

    // Validate flow spec
    const spec = flow.spec as { nodes?: unknown[] };
    if (!spec || !spec.nodes || !Array.isArray(spec.nodes)) {
      return res.status(400).json({
        error: 'Invalid flow specification',
        flowId: flow.id,
        details: 'Flow must have a valid spec with nodes array'
      });
    }

    // Create workflow client
    try {
      client = await WorkflowClient.create();
    } catch (clientError: any) {
      console.error(`❌ Failed to create workflow client:`, clientError);
      return res.status(503).json({
        error: 'Workflow service unavailable',
        details: 'Unable to connect to workflow engine',
        retryAfter: 5
      });
    }

    console.log(`🚀 Executing flow: ${flow.name} (${flow.id})`);

    // Create run record FIRST so we have a database ID for metrics
    const run = await RunRepository.create({
      flow_id: flow.id,
      flow_version: flow.version,
      status: 'pending',
      inputs,
      outputs: null,
      temporal_workflow_id: '', // Will be set after workflow starts
      temporal_run_id: '',
    });

    // Start workflow execution with database run.id
    const { runId: temporalWorkflowId, handle } = await client.startWorkflowWithRunId(
      flow.id,
      flow.name,
      flow.spec as any,
      inputs,
      run.id  // Pass database run ID
    );

    // Update run with temporal IDs and set status to running
    await RunRepository.update(run.id, {
      temporal_workflow_id: temporalWorkflowId,
      temporal_run_id: temporalWorkflowId,
      status: 'running',
    });

    console.log(`✅ Started workflow: ${flow.name} (temporal: ${temporalWorkflowId}, db: ${run.id})`);

    // Track active workflows
    runsActive.inc({ flow_id: flow.id });

    // Return immediately - don't block on workflow completion!
    res.json(run);

    // Track workflow start time for duration calculation
    const workflowStartTime = Date.now();

    // Update run async in background
    handle.result()
      .then(async (result: unknown) => {
        console.log(`✅ Workflow completed: ${temporalWorkflowId}`);

        // Record workflow completion metrics
        const durationSeconds = (Date.now() - workflowStartTime) / 1000;
        runsTotal.inc({ flow_id: flow.id, flow_name: flow.name, status: 'completed' });
        runsDuration.observe({ flow_id: flow.id, flow_name: flow.name, status: 'completed' }, durationSeconds);
        runsActive.dec({ flow_id: flow.id });

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
        console.error(`❌ Workflow failed: ${runId}`, workflowError.message);

        // Record workflow failure metrics
        const durationSeconds = (Date.now() - workflowStartTime) / 1000;
        runsTotal.inc({ flow_id: flow.id, flow_name: flow.name, status: 'failed' });
        runsDuration.observe({ flow_id: flow.id, flow_name: flow.name, status: 'failed' }, durationSeconds);
        runsActive.dec({ flow_id: flow.id });

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
    console.error('❌ Execute endpoint error:', error);

    // Try to mark run as failed if we created it
    if (runId) {
      try {
        const existingRun = await RunRepository.getByTemporalWorkflowId(runId);
        if (existingRun) {
          await RunRepository.update(existingRun.id, {
            status: 'failed',
            error: error.message,
            completed_at: new Date(),
          });
        }
      } catch (updateError) {
        console.error(`❌ Failed to mark run as failed:`, updateError);
      }
    }

    // Return appropriate error response
    if (error.message?.includes('not found')) {
      return res.status(404).json({
        error: 'Resource not found',
        details: error.message
      });
    }

    if (error.message?.includes('validation') || error.message?.includes('invalid')) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.message
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      details: error.message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }
});

export default router;
