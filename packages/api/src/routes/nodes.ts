/**
 * Node catalog routes
 */

import { Router } from 'express';
import { NodeRepository } from '@reflux/core';

const router = Router();

/**
 * GET /api/nodes - List all active nodes
 */
router.get('/', async (req, res) => {
  try {
    const nodes = await NodeRepository.listActive();
    res.json(nodes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/nodes/:name - Get latest version of a node
 */
router.get('/:name', async (req, res) => {
  try {
    const node = await NodeRepository.getLatestByName(req.params.name);

    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }

    res.json(node);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/nodes/:name/:version - Get specific node version
 */
router.get('/:name/:version', async (req, res) => {
  try {
    const node = await NodeRepository.getByNameAndVersion(
      req.params.name,
      req.params.version
    );

    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }

    res.json(node);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/nodes/register - Register a new node
 */
router.post('/register', async (req, res) => {
  try {
    const { name, version, manifest } = req.body;

    const node = await NodeRepository.register({
      name,
      version,
      manifest,
    });

    res.status(201).json(node);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/nodes/:name/:version/heartbeat - Update node heartbeat
 */
router.post('/:name/:version/heartbeat', async (req, res) => {
  try {
    await NodeRepository.heartbeat(req.params.name, req.params.version);
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
