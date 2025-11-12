# @reflux/adapter-n8n

Optional n8n node compatibility adapter for REFLUX.

## ⚠️ License Notice

This package uses n8n's **Sustainable Use License**, which has commercial restrictions:

- ✅ You can use it for **internal business purposes**
- ✅ You can use it for **non-commercial or personal use**
- ✅ You can distribute it **free of charge for non-commercial purposes**
- ❌ You **cannot** use it in commercial products sold to others
- ❌ You **cannot** offer it as a paid service

**Full license:** See [LICENSE.md](./LICENSE.md)

For commercial use, contact n8n: license@n8n.io

## What It Does

This adapter allows REFLUX to run original n8n nodes (450+ integrations) within the REFLUX architecture:

- Wraps n8n nodes as Moleculer services
- Provides n8n's IExecuteFunctions interface
- Enables dynamic property loading
- Includes caching layer for performance

## Installation

```bash
# Install the adapter (optional)
npm install @reflux/adapter-n8n
```

## Usage

### Automatic Registration

Simply install the package and import it to auto-register n8n nodes:

```typescript
import '@reflux/adapter-n8n';
```

### Use n8n Nodes in Workflows

```typescript
import { createClient } from '@reflux/core';

const client = createClient();

// Create workflow with n8n nodes
await client.flows.create({
  name: 'my_flow',
  spec: {
    steps: [
      {
        id: 'http',
        node: 'n8n.HttpRequest',  // n8n node
        with: {
          url: 'https://api.example.com',
          method: 'GET'
        }
      }
    ]
  }
});
```

## Available n8n Nodes

When this adapter is installed, you get access to:

- **Core**: HttpRequest, Set, Code, DateTime, Crypto
- **Logic**: If, Switch
- **Communication**: Slack, Discord, Telegram
- **AI**: OpenAI
- **Database**: PostgreSQL, MySQL, MongoDB
- **Productivity**: Google Sheets, Notion
- **And 450+ more...**

## Migration from n8n

This package includes CLI tools to migrate n8n workflows:

```bash
# Convert n8n workflow JSON to REFLUX format
npx @reflux/adapter-n8n migrate my-n8n-workflow.json
```

## Architecture

```
┌─────────────────────────────────────┐
│   REFLUX Core (MIT License)         │
│   - Workflow engine                 │
│   - Moleculer service mesh          │
│   - Temporal orchestration          │
└──────────────┬──────────────────────┘
               │ Plugin interface
               ▼
┌─────────────────────────────────────┐
│  @reflux/adapter-n8n (Optional)     │
│  Sustainable Use License            │
│  - Wraps n8n nodes                  │
│  - Dynamic property loading         │
│  - n8n workflow migration           │
└─────────────────────────────────────┘
```

## Without This Adapter

REFLUX works perfectly without this adapter using native nodes:

```typescript
// Native REFLUX nodes (MIT license)
import { createClient } from '@reflux/core';

const client = createClient();

await client.flows.create({
  name: 'my_flow',
  spec: {
    steps: [
      { id: 'trigger', node: 'webhook.trigger' },
      { id: 'http', node: 'http.request' },
      { id: 'transform', node: 'transform.execute' }
    ]
  }
});
```

## Security Features

- Package whitelist (only n8n-nodes-base allowed)
- Input validation with Zod
- Path traversal protection
- In-memory caching with TTL

## Questions?

- **Commercial use?** Contact n8n: license@n8n.io
- **Technical issues?** Open issue in REFLUX repo
- **Want MIT license?** Use native REFLUX nodes instead
