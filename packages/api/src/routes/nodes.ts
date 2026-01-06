/**
 * Node catalog routes
 */

import { Router } from 'express';
import { NodeRepository } from '@reflux/core';
import { z } from 'zod';

const router = Router();

// Optional n8n adapter - only loaded if installed
let loadN8nNode: any = null;
let n8nAdapterAvailable = false;

// Try to load n8n adapter at runtime (optional dependency)
(async () => {
  try {
    // @ts-ignore - Optional peer dependency
    const adapter = await import('@reflux/adapter-n8n');
    loadN8nNode = adapter.loadN8nNode;
    n8nAdapterAvailable = true;
    console.log('[API] n8n adapter loaded successfully');
  } catch (err) {
    console.log('[API] n8n adapter not installed (optional dependency)');
    console.log('[API] Install with: npm install @reflux/adapter-n8n');
  }
})();

// Validation schemas
const nodeNameSchema = z.string()
  .min(1, 'Node name is required')
  .max(100, 'Node name too long')
  .regex(/^[A-Za-z0-9]+$/, 'Node name must contain only alphanumeric characters');

const versionSchema = z.string()
  .regex(/^\d+(\.\d+){0,2}$/, 'Invalid version format')
  .optional();

const registerNodeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  version: z.string().min(1, 'Version is required'),
  manifest: z.record(z.any()),
});

// Validation middleware
function validateParams(schema: z.ZodSchema) {
  return (req: any, res: any, next: any) => {
    try {
      schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
      }
      next(error);
    }
  };
}

function validateQuery(schema: z.ZodSchema) {
  return (req: any, res: any, next: any) => {
    try {
      schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
      }
      next(error);
    }
  };
}

function validateBody(schema: z.ZodSchema) {
  return (req: any, res: any, next: any) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
      }
      next(error);
    }
  };
}

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
 * GET /api/nodes/n8n/list - List available n8n nodes
 * IMPORTANT: This must come BEFORE the :name route to avoid matching "n8n" as a node name
 */
router.get('/n8n/list', async (req, res) => {
  // Check if n8n adapter is available
  if (!n8nAdapterAvailable) {
    return res.status(404).json({
      error: 'n8n adapter not installed',
      hint: 'Install with: npm install @reflux/adapter-n8n',
      note: 'n8n adapter is optional and uses n8n Sustainable Use License'
    });
  }

  try {
    const fs = require('fs');
    const path = require('path');

    // Dynamically scan all n8n nodes from the package
    // Path from packages/api/src/routes/nodes.ts to root node_modules
    const nodesDir = path.join(__dirname, '../../../../node_modules/n8n-nodes-base/dist/nodes');
    const nodes: Array<{name: string, displayName: string, category: string}> = [];

    // Recursive function to scan all .node.js files in directory tree
    function scanDirectory(dir: string): void {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          scanDirectory(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.node.js') && !entry.name.includes('Trigger')) {
          // Extract node name from filename (e.g., "Slack.node.js" -> "Slack")
          const nodeName = entry.name.replace('.node.js', '');

          // Auto-categorize based on common patterns
          let category = 'Other';
          if (['Slack', 'Discord', 'Telegram', 'Twilio', 'Mattermost', 'WhatsApp', 'RocketChat'].includes(nodeName)) {
            category = 'Communication';
          } else if (['OpenAi', 'Anthropic', 'Cohere', 'HuggingFace'].includes(nodeName)) {
            category = 'AI';
          } else if (['Postgres', 'MySQL', 'MongoDB', 'Redis', 'Supabase', 'ElasticSearch', 'QuestDb', 'Snowflake'].includes(nodeName)) {
            category = 'Database';
          } else if (['HttpRequest', 'Set', 'Code', 'DateTime', 'Crypto', 'Merge', 'Split', 'Wait', 'Html', 'Xml', 'Markdown'].includes(nodeName)) {
            category = 'Core';
          } else if (['If', 'Switch', 'Filter', 'Sort', 'Limit'].includes(nodeName)) {
            category = 'Logic';
          } else if (['GitHub', 'GitLab', 'Jira', 'Jenkins', 'Docker', 'Webhook'].includes(nodeName)) {
            category = 'Development';
          } else if (nodeName.startsWith('Google')) {
            category = 'Productivity';
          } else if (['Notion', 'Airtable', 'Trello', 'Asana', 'Monday', 'ClickUp', 'Todoist', 'Evernote'].includes(nodeName)) {
            category = 'Productivity';
          } else if (['Dropbox', 'Box', 'OneDrive', 'Aws', 'S3'].includes(nodeName)) {
            category = 'Storage';
          } else if (['Salesforce', 'HubSpot', 'Pipedrive', 'Zoho', 'Stripe', 'PayPal'].includes(nodeName)) {
            category = 'CRM';
          } else if (['Mailchimp', 'SendGrid', 'Typeform', 'Facebook', 'Twitter', 'LinkedIn', 'Instagram'].includes(nodeName)) {
            category = 'Marketing';
          } else if (['Mixpanel', 'Segment', 'Amplitude', 'GoogleAnalytics'].includes(nodeName)) {
            category = 'Analytics';
          }

          nodes.push({
            name: nodeName,
            displayName: nodeName.replace(/([A-Z])/g, ' $1').trim(), // Add spaces before capitals
            category
          });
        }
      }
    }

    try {
      scanDirectory(nodesDir);
    } catch (err) {
      console.error('Error scanning n8n nodes:', err);
      // Return minimal fallback if scanning completely fails
      return res.json([
        { name: 'HttpRequest', displayName: 'HTTP Request', category: 'Core' },
        { name: 'Set', displayName: 'Edit Fields (Set)', category: 'Core' },
        { name: 'Code', displayName: 'Code', category: 'Core' },
      ]);
    }

    // Sort by category then by name
    nodes.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.name.localeCompare(b.name);
    });

    console.log(`[API] Loaded ${nodes.length} n8n nodes`);
    res.json(nodes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/nodes/n8n/:nodeName/description - Get n8n node description with properties
 */
router.get(
  '/n8n/:nodeName/description',
  validateParams(z.object({ nodeName: nodeNameSchema })),
  validateQuery(z.object({ version: z.string().regex(/^\d+$/, 'Version must be a number').optional() })),
  async (req, res) => {
    // Check if n8n adapter is available
    if (!n8nAdapterAvailable || !loadN8nNode) {
      return res.status(404).json({
        error: 'n8n adapter not installed',
        hint: 'Install with: npm install @reflux/adapter-n8n'
      });
    }

    try {
      const { nodeName } = req.params;
      const { version } = req.query;

      console.log(`[API] Loading n8n node: ${nodeName}, version: ${version || 'latest'}`);

      // Load n8n node (security validation happens in loadN8nNode)
      const node = await loadN8nNode('n8n-nodes-base', nodeName, version ? parseInt(version as string) : undefined);

      // Return description with all properties
      const description = {
        displayName: node.description.displayName,
        name: node.description.name,
        description: node.description.description,
        version: node.description.version,
        inputs: node.description.inputs,
        outputs: node.description.outputs,
        properties: node.description.properties,
        credentials: node.description.credentials,
        defaults: node.description.defaults,
      };

      res.json(description);
    } catch (error: any) {
      console.error('[API] Error loading n8n node:', error.message);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/nodes/schemas - List all node schemas for auto-form generation
 */
router.get('/schemas', async (req, res) => {
  try {
    const { listNodeSchemas } = await import('@reflux/core/src/activities/moleculer-client');
    const schemas = await listNodeSchemas();
    res.json(schemas);
  } catch (error: any) {
    console.error('[API] Error listing node schemas:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/nodes/schema/:nodeName - Get schema for a specific node
 * Used for auto-generating forms in the UI
 */
router.get('/schema/:nodeName', async (req, res) => {
  try {
    const { getNodeSchema } = await import('@reflux/core/src/activities/moleculer-client');
    const { nodeName } = req.params;
    const version = (req.query.version as string) || '1.0.0';

    const schema = await getNodeSchema(nodeName, version);

    if (!schema) {
      return res.status(404).json({ error: `Schema not found for node: ${nodeName}` });
    }

    res.json(schema);
  } catch (error: any) {
    console.error('[API] Error getting node schema:', error.message);
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
router.post('/register', validateBody(registerNodeSchema), async (req, res) => {
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
