# n8n Node Adapter for REFLUX

## Overview

The **n8n Node Adapter** allows you to use **original n8n nodes** directly in REFLUX without any code conversion. This gives you:

✅ **400+ n8n nodes** available immediately
✅ **No code conversion** needed
✅ **Community nodes** support
✅ **Same behavior** as in n8n
✅ **Automatic updates** when n8n nodes are updated

## How It Works

```
┌─────────────────────────────────────────────────────┐
│                  REFLUX Workflow                    │
└───────────────────┬─────────────────────────────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │  Moleculer Broker    │
         │  broker.call(...)    │
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │  N8nNodeAdapter      │ ← Compatibility layer
         │  - Maps params       │
         │  - Implements        │
         │    IExecuteFunctions │
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────────┐
         │  Original n8n Node   │ ← No changes!
         │  (HttpRequest, etc)  │
         └──────────────────────┘
```

## Quick Start

### 1. Install n8n Nodes

```bash
# Install n8n core nodes
npm install n8n-workflow n8n-nodes-base

# Or install specific community node
npm install n8n-nodes-notion
npm install n8n-nodes-telegram
```

### 2. Load and Register Node

```typescript
import { ServiceBroker } from 'moleculer';
import { createN8nNodeService, loadN8nNode } from '@reflux/core/adapters/n8n-node-adapter';

const broker = new ServiceBroker();

// Load original n8n node
const HttpRequestNode = await loadN8nNode('n8n-nodes-base', 'HttpRequest');

// Convert to REFLUX service
const HttpRequestService = createN8nNodeService(HttpRequestNode);

// Register
broker.createService(HttpRequestService);

await broker.start();
```

### 3. Use in Workflow

```json
{
  "name": "My Workflow",
  "steps": [
    {
      "id": "fetch-data",
      "node": "1.0.0.nodes.n8n.httpRequest",
      "params": {
        "url": "https://api.example.com/data",
        "method": "GET",
        "json": true
      }
    }
  ]
}
```

## Supported n8n Nodes

### All Built-in Nodes (400+)

The adapter supports **all n8n built-in nodes**, including:

**Communication:**
- Slack
- Discord
- Telegram
- Email (SMTP, IMAP)
- Twilio

**Data Sources:**
- HTTP Request
- Webhook
- Database (Postgres, MySQL, MongoDB)
- Google Sheets
- Airtable

**AI/ML:**
- OpenAI
- Anthropic
- Hugging Face
- Stability AI

**CRM:**
- Salesforce
- HubSpot
- Pipedrive

**Project Management:**
- Jira
- Asana
- Trello
- Notion

**Cloud Storage:**
- Google Drive
- Dropbox
- S3

**And 300+ more!**

### Community Nodes

Any n8n community node can be used:

```bash
npm install n8n-nodes-<package-name>
```

```typescript
const CommunityNode = await loadN8nNode('n8n-nodes-<package>', 'NodeName');
broker.createService(createN8nNodeService(CommunityNode));
```

## API Reference

### `loadN8nNode(packageName, nodeName)`

Load an n8n node from npm package.

**Parameters:**
- `packageName` (string) - npm package name (e.g., `'n8n-nodes-base'`)
- `nodeName` (string) - Node class name (e.g., `'HttpRequest'`, `'Slack'`)

**Returns:** `Promise<INodeType>` - n8n node instance

**Example:**
```typescript
const node = await loadN8nNode('n8n-nodes-base', 'HttpRequest');
```

### `createN8nNodeService(n8nNode)`

Convert n8n node to Moleculer service.

**Parameters:**
- `n8nNode` (INodeType) - n8n node instance

**Returns:** `typeof Service` - Moleculer service class

**Example:**
```typescript
const ServiceClass = createN8nNodeService(node);
broker.createService(ServiceClass);
```

### Service Name Convention

Adapted nodes are registered as:

```
1.0.0.nodes.n8n.<node-name>
```

Examples:
- `1.0.0.nodes.n8n.httpRequest`
- `1.0.0.nodes.n8n.slack`
- `1.0.0.nodes.n8n.openAi`

### Actions

#### `execute`

Execute the n8n node.

**Parameters:** All parameters from n8n node's `properties` array

**Returns:**
```typescript
{
  items: INodeExecutionData[]
}
```

#### `getDescription`

Get n8n node metadata.

**Returns:**
```typescript
{
  displayName: string,
  name: string,
  description: string,
  version: number | number[],
  properties: any[]
}
```

## Credentials

n8n nodes use credentials. The adapter supports two methods:

### Method 1: Environment Variables

```bash
# Format: N8N_CREDENTIALS_<TYPE>
export N8N_CREDENTIALS_SLACKAPI='{"token":"xoxb-..."}'
export N8N_CREDENTIALS_OPENAIAPI='{"apiKey":"sk-..."}'
```

For simple token-based auth:
```bash
export N8N_CREDENTIALS_SLACKAPI='xoxb-...'
```

### Method 2: Pass in Parameters

```typescript
await broker.call('1.0.0.nodes.n8n.slack.execute', {
  channel: '#general',
  text: 'Hello',
  _credentials_slackApi: {
    token: 'xoxb-...'
  }
});
```

## Parameter Mapping

n8n parameters are automatically mapped to Moleculer params:

| n8n Property Type | Moleculer Type | Notes |
|-------------------|----------------|-------|
| `string` | `string` | Direct mapping |
| `number` | `number` | Direct mapping |
| `boolean` | `boolean` | Direct mapping |
| `json` | `object` | Parsed JSON |
| `options` | `string` | Single selection |
| `multiOptions` | `array` | Multiple selection |
| `collection` | `object` | Nested object |
| `fixedCollection` | `object` | Structured data |
| `dateTime` | `string` | ISO 8601 string |

## Examples

### Example 1: HTTP Request

```typescript
const result = await broker.call('1.0.0.nodes.n8n.httpRequest.execute', {
  url: 'https://api.github.com/users/n8n-io',
  method: 'GET',
  json: true,
});

console.log(result.items[0].json);
// { login: 'n8n-io', id: ..., ... }
```

### Example 2: Slack Message

```bash
export N8N_CREDENTIALS_SLACKAPI='{"token":"xoxb-your-token"}'
```

```typescript
const result = await broker.call('1.0.0.nodes.n8n.slack.execute', {
  resource: 'message',
  operation: 'post',
  channel: '#general',
  text: 'Hello from REFLUX!',
});
```

### Example 3: OpenAI Chat

```bash
export N8N_CREDENTIALS_OPENAIAPI='{"apiKey":"sk-your-key"}'
```

```typescript
const result = await broker.call('1.0.0.nodes.n8n.openAi.execute', {
  resource: 'chat',
  operation: 'complete',
  model: 'gpt-4',
  prompt: {
    messages: [
      { role: 'system', content: 'You are helpful.' },
      { role: 'user', content: 'What is REFLUX?' }
    ]
  },
  temperature: 0.7,
});

console.log(result.items[0].json.choices[0].message.content);
```

### Example 4: Database Query

```bash
export N8N_CREDENTIALS_POSTGRES='{"host":"localhost","database":"mydb","user":"user","password":"pass"}'
```

```typescript
const result = await broker.call('1.0.0.nodes.n8n.postgres.execute', {
  operation: 'executeQuery',
  query: 'SELECT * FROM users WHERE active = true',
});

console.log(result.items); // Array of rows
```

### Example 5: Google Sheets

```bash
export N8N_CREDENTIALS_GOOGLESHEETS='{"serviceAccount":"{...}"}'
```

```typescript
const result = await broker.call('1.0.0.nodes.n8n.googleSheets.execute', {
  resource: 'sheet',
  operation: 'append',
  spreadsheetId: '1abc...',
  range: 'Sheet1!A:Z',
  values: [['John', 'Doe', 'john@example.com']],
});
```

## Workflow Integration

### REFLUX Workflow JSON

```json
{
  "name": "Slack Notification Workflow",
  "steps": [
    {
      "id": "fetch-weather",
      "node": "1.0.0.nodes.n8n.httpRequest",
      "params": {
        "url": "https://api.weather.com/current?city=SF",
        "method": "GET",
        "json": true
      }
    },
    {
      "id": "format-message",
      "node": "1.0.0.nodes.n8n.set",
      "params": {
        "mode": "manual",
        "values": {
          "text": "Temperature in SF: {{ $json.temp }}°C"
        }
      }
    },
    {
      "id": "send-to-slack",
      "node": "1.0.0.nodes.n8n.slack",
      "params": {
        "resource": "message",
        "operation": "post",
        "channel": "#weather",
        "text": "{{ $json.text }}"
      }
    }
  ]
}
```

### Temporal Workflow

```typescript
import { proxyActivities } from '@temporalio/workflow';

const { executeNode } = proxyActivities({
  startToCloseTimeout: '1 minute',
});

export async function weatherAlertWorkflow() {
  // Fetch weather
  const weather = await executeNode({
    nodeId: '1.0.0.nodes.n8n.httpRequest',
    params: {
      url: 'https://api.weather.com/current',
      method: 'GET',
      json: true,
    },
  });

  // Send to Slack
  if (weather.items[0].json.temp > 30) {
    await executeNode({
      nodeId: '1.0.0.nodes.n8n.slack',
      params: {
        resource: 'message',
        operation: 'post',
        channel: '#alerts',
        text: `⚠️ High temperature: ${weather.items[0].json.temp}°C`,
      },
    });
  }
}
```

## Advanced Usage

### Batch Node Registration

```typescript
import { ServiceBroker } from 'moleculer';
import { createN8nNodeService, loadN8nNode } from '@reflux/core/adapters/n8n-node-adapter';

const broker = new ServiceBroker();

// List of n8n nodes to load
const nodesToLoad = [
  ['n8n-nodes-base', 'HttpRequest'],
  ['n8n-nodes-base', 'Slack'],
  ['n8n-nodes-base', 'OpenAi'],
  ['n8n-nodes-base', 'GoogleSheets'],
  ['n8n-nodes-base', 'Postgres'],
];

// Load and register all
for (const [pkg, name] of nodesToLoad) {
  const node = await loadN8nNode(pkg, name);
  const service = createN8nNodeService(node);
  broker.createService(service);
}

await broker.start();

console.log('✅ Registered n8n nodes:', nodesToLoad.length);
```

### Custom Credentials Provider

```typescript
import { N8nNodeAdapter } from '@reflux/core/adapters/n8n-node-adapter';

class CustomAdapter extends N8nNodeAdapter {
  // Override getCredentials to use custom storage
  async getCredentials(type: string): Promise<any> {
    // Fetch from database, vault, etc.
    const credentials = await db.credentials.findOne({ type });
    return credentials.data;
  }
}
```

### Error Handling

```typescript
try {
  const result = await broker.call('1.0.0.nodes.n8n.slack.execute', {
    channel: '#invalid',
    text: 'Test',
  });
} catch (error) {
  if (error.message.includes('channel_not_found')) {
    console.error('Slack channel does not exist');
  } else {
    console.error('Slack error:', error.message);
  }
}
```

## Limitations

### 1. No UI

The adapter provides **API access only**. n8n's visual editor UI is not included.

### 2. Expression Resolution

n8n expressions like `{{ $json.field }}` are **not automatically resolved**. You need to:

- Pre-process parameters in workflow engine
- Or use REFLUX's expression resolver
- Or pass resolved values directly

### 3. Binary Data

Binary data handling may require additional configuration:

```typescript
// n8n stores binary data in temp files
// REFLUX needs to adapt this to object storage (S3, MinIO)
```

### 4. Credentials UI

n8n's credential management UI is not available. Use:

- Environment variables
- Configuration management systems
- Secret managers (Vault, AWS Secrets Manager)

## Comparison: Adapter vs Converter

| Aspect | Adapter | Converter |
|--------|---------|-----------|
| **Code Changes** | None | Full rewrite |
| **Maintenance** | Auto-updates with n8n | Manual updates |
| **Performance** | Slight overhead | Native performance |
| **Features** | 100% n8n features | Subset of features |
| **Debugging** | n8n stack traces | REFLUX stack traces |
| **Customization** | Limited | Full control |

### When to Use Adapter

✅ Need many n8n nodes quickly
✅ Want community nodes support
✅ Don't need custom modifications
✅ Want automatic n8n updates

### When to Convert

✅ Need maximum performance
✅ Want full customization
✅ Need deep REFLUX integration
✅ Building custom nodes

## Best Practices

### 1. Use Adapter for Rapid Prototyping

```typescript
// Quick prototype with n8n nodes
const nodes = await loadMultipleN8nNodes([
  'HttpRequest', 'Slack', 'OpenAi', 'Database'
]);

// Later, convert critical nodes to native REFLUX services
```

### 2. Cache Node Instances

```typescript
// Don't load on every request
const nodeCache = new Map();

async function getN8nNode(name: string) {
  if (!nodeCache.has(name)) {
    const node = await loadN8nNode('n8n-nodes-base', name);
    nodeCache.set(name, node);
  }
  return nodeCache.get(name);
}
```

### 3. Monitor Performance

```typescript
broker.createService({
  name: 'metrics',
  events: {
    'metrics.trace.span.finish'(payload) {
      if (payload.service.startsWith('1.0.0.nodes.n8n.')) {
        console.log(`n8n node ${payload.service} took ${payload.duration}ms`);
      }
    },
  },
});
```

### 4. Handle Credentials Securely

```bash
# Use secret management
export N8N_CREDENTIALS_SLACKAPI="$(aws secretsmanager get-secret-value --secret-id slack-token --query SecretString --output text)"
```

## Troubleshooting

### Node Not Found

```
Error: Node "MyNode" not found in package "n8n-nodes-base"
```

**Solution:** Check node name spelling. Use exact class name:

```typescript
// ❌ Wrong
await loadN8nNode('n8n-nodes-base', 'http-request');

// ✅ Correct
await loadN8nNode('n8n-nodes-base', 'HttpRequest');
```

### Credentials Not Found

```
Error: Credentials "slackApi" not found
```

**Solution:** Set environment variable:

```bash
export N8N_CREDENTIALS_SLACKAPI='{"token":"xoxb-..."}'
```

### Import Error

```
Error: Cannot find module 'n8n-nodes-base'
```

**Solution:** Install n8n packages:

```bash
npm install n8n-workflow n8n-nodes-base
```

### Parameter Validation Failed

```
Error: Parameter 'url' is required
```

**Solution:** Check n8n node's `properties` for required fields:

```typescript
// Get node description
const desc = await broker.call('1.0.0.nodes.n8n.httpRequest.getDescription');
console.log(desc.properties); // See required fields
```

## Migration Path

### Phase 1: Use Adapter (Week 1)

```typescript
// Load all needed n8n nodes
const nodes = ['HttpRequest', 'Slack', 'OpenAi', 'Database'];
for (const name of nodes) {
  const node = await loadN8nNode('n8n-nodes-base', name);
  broker.createService(createN8nNodeService(node));
}
```

### Phase 2: Identify Critical Nodes (Week 2)

```typescript
// Monitor which nodes are used most
// Convert high-traffic nodes to native REFLUX
```

### Phase 3: Convert Gradually (Ongoing)

```typescript
// Replace adapter nodes with native nodes one by one
// Keep adapter for less-used nodes
```

## Summary

The n8n Node Adapter provides:

- ✅ **Instant access** to 400+ n8n nodes
- ✅ **Zero conversion** effort
- ✅ **Community nodes** support
- ✅ **Automatic updates** with n8n releases
- ✅ **Production-ready** compatibility layer

**Perfect for**: Rapid prototyping, testing, accessing niche services

**Trade-off**: Slight performance overhead vs native nodes

---

**Next Steps:**
1. Install n8n packages: `npm install n8n-workflow n8n-nodes-base`
2. Try examples from this guide
3. Build your first workflow with n8n nodes
4. Convert critical paths to native nodes later

**Resources:**
- [n8n Node Documentation](https://docs.n8n.io/integrations/)
- [n8n Node Source Code](https://github.com/n8n-io/n8n/tree/master/packages/nodes-base)
- [REFLUX Native Nodes](../nodes/)
