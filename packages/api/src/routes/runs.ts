/**
 * Run management routes
 */

import { Router } from 'express';
import { RunRepository } from '@reflux/core';

const router = Router();

// Max limits to prevent DoS attacks
const MAX_RUN_LIMIT = 1000;
const MAX_LOG_LIMIT = 10000;

/**
 * GET /api/runs - List recent runs
 */
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(
      parseInt(req.query.limit as string) || 50,
      MAX_RUN_LIMIT
    );
    const status = req.query.status as any;

    const runs = status
      ? await RunRepository.listByStatus(status, limit)
      : await RunRepository.listRecent(limit);

    res.json(runs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/runs/:id - Get run by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const run = await RunRepository.getById(req.params.id);

    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    res.json(run);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/flows/:flowId/runs - List runs for a flow
 */
router.get('/flow/:flowId', async (req, res) => {
  try {
    const limit = Math.min(
      parseInt(req.query.limit as string) || 50,
      MAX_RUN_LIMIT
    );
    const runs = await RunRepository.listByFlowId(req.params.flowId, limit);

    res.json(runs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/flows/:flowId/stats - Get statistics for a flow
 */
router.get('/flow/:flowId/stats', async (req, res) => {
  try {
    const stats = await RunRepository.getFlowStats(req.params.flowId);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/runs/:id - Update run status
 */
router.put('/:id', async (req, res) => {
  try {
    const { status, outputs, error } = req.body;

    const run = await RunRepository.update(req.params.id, {
      status,
      outputs,
      error,
    });

    res.json(run);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/runs/:id/logs - Get logs for a run
 */
router.get('/:id/logs', async (req, res) => {
  try {
    const filters = {
      stepId: req.query.step as string | undefined,
      level: req.query.level as any | undefined,
      limit: Math.min(
        parseInt(req.query.limit as string) || 1000,
        MAX_LOG_LIMIT
      ),
      offset: parseInt(req.query.offset as string) || 0,
    };

    const logs = await RunRepository.getLogs(req.params.id, filters);
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/runs/:id/with-logs - Get run with logs
 */
router.get('/:id/with-logs', async (req, res) => {
  try {
    const filters = {
      stepId: req.query.step as string | undefined,
      level: req.query.level as any | undefined,
      limit: Math.min(
        parseInt(req.query.limit as string) || 1000,
        MAX_LOG_LIMIT
      ),
    };

    const runWithLogs = await RunRepository.getWithLogs(req.params.id, filters);

    if (!runWithLogs) {
      return res.status(404).json({ error: 'Run not found' });
    }

    res.json(runWithLogs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
