# Migrating from n8n to REFLUX

## Overview

REFLUX provides a **migration tool** to convert n8n workflows into REFLUX format. The tool handles node mapping, parameter transformation, and generates warnings for unsupported features.

## Quick Start

### Install REFLUX

```bash
npm install -g @reflux/cli
```

### Migrate a Single Workflow

```bash
# Export from n8n
# In n8n UI: ... menu → Download

# Migrate to REFLUX
reflux-migrate my-workflow.json

# Output: my-workflow.reflux.json
```

### Migrate Multiple Workflows

```bash
# Export all workflows from n8n
# Place them in a folder

# Migrate entire folder
reflux-migrate --dir ./n8n-workflows

# Creates .reflux.json for each workflow
```

## What Gets Migrated?

### ✅ Fully Supported

| n8n Node | REFLUX Node | Status |
|----------|-------------|--------|
| **HTTP Request** | `nodes.http.request` | ✅ Full support |
| **Webhook** | `nodes.webhook.trigger` | ✅ Full support |
| **Code/Function** | `nodes.transform.execute` | ✅ Full support |
| **If/Switch** | `nodes.condition.execute` | ✅ Full support |
| **Postgres/MySQL** | `nodes.database.query` | ✅ Full support |
| **Email Send** | `nodes.email.send` | ✅ Full support |
| **OpenAI** | `nodes.openai.chat` | ✅ Full support |
| **Set** | `nodes.transform.execute` | ✅ Full support |

### ⚠️ Partial Support

| n8n Node | REFLUX Node | Notes |
|----------|-------------|-------|
| **Split Out** | `nodes.util.split` | May need manual adjustment |
| **Merge** | `nodes.util.merge` | Complex merges need review |
| **Filter** | `nodes.condition.execute` | Conditions simplified |
| **Loop** | `nodes.util.loop` | Iteration logic preserved |

### ❌ Not Supported (Manual Implementation Needed)

| n8n Node | Workaround |
|----------|-----------|
| **Specific SaaS integrations** (Slack, Notion, etc.) | Use HTTP Request or implement custom node |
| **Sub-workflows** | Flatten into single workflow |
| **Sticky Notes** | Converted to comments |
| **n8n AI nodes** | Map to equivalent REFLUX AI nodes |

## Migration Process

### Step 1: Export from n8n

**Option A: UI Export**
1. Open workflow in n8n
2. Click **`...`** menu (top right)
3. Select **Download**
4. Save as `workflow-name.json`

**Option B: CLI Export**
```bash
n8n export:workflow --id=<workflow-id> --output=workflow.json
```

**Option C: Bulk Export**
```bash
n8n export:workflow --all --output=./n8n-workflows
```

### Step 2: Run Migration Tool

```bash
# Single file
reflux-migrate workflow.json

# With verbose output
reflux-migrate workflow.json --verbose

# Custom output path
reflux-migrate workflow.json --output my-reflux-flow.json

# Directory
reflux-migrate --dir ./n8n-workflows
```

### Step 3: Review Migration Report

The tool outputs:

```
🔄 REFLUX n8n Migration Tool

📄 Migrating: my-workflow.json

⚠️  Warnings:
   - Skipping disabled node: Debug Node
   - Unsupported node type: n8n-nodes-base.slack (node: Send to Slack)

🔧 Unmapped n8n nodes (need manual implementation):
   - n8n-nodes-base.slack
   - n8n-nodes-base.notion

✅ Migrated workflow saved to: my-workflow.reflux.json

📋 Workflow Summary:
   Name: My Workflow
   Steps: 5
   Nodes: nodes.http.request, nodes.transform.execute, nodes.webhook.trigger
```

### Step 4: Review Generated Workflow

```bash
cat my-workflow.reflux.json
```

```json
{
  "name": "My Workflow",
  "version": "1.0.0",
  "description": "Migrated from n8n workflow",
  "steps": [
    {
      "id": "trigger_webhook",
      "node": "nodes.webhook.trigger",
      "version": "1.0.0",
      "with": {
        "path": "/webhook",
        "method": "POST"
      }
    },
    {
      "id": "fetch_data",
      "node": "nodes.http.request",
      "version": "1.0.0",
      "with": {
        "url": "https://api.example.com/data",
        "method": "GET"
      }
    },
    {
      "id": "transform_data",
      "node": "nodes.transform.execute",
      "version": "1.0.0",
      "with": {
        "code": "return items.map(item => ({ id: item.json.id, name: item.json.name }));",
        "language": "javascript"
      }
    }
  ]
}
```

### Step 5: Import to REFLUX

```bash
# Via API
curl -X POST http://localhost:4000/api/flows \
  -H "Content-Type: application/json" \
  -d @my-workflow.reflux.json

# Via UI
# Go to http://localhost:3002/flows/new
# Paste JSON or upload file
```

### Step 6: Configure Credentials

⚠️ **Important**: Credentials are NOT migrated for security reasons.

You need to manually configure:
1. HTTP authentication
2. Database connections
3. API keys
4. OAuth tokens

## Node Mapping Details

### HTTP Request Node

**n8n → REFLUX transformation:**

```javascript
// n8n
{
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "url": "https://api.example.com",
    "method": "POST",
    "headerParametersJson": { "Content-Type": "application/json" },
    "bodyParametersJson": { "key": "value" }
  }
}

// REFLUX
{
  "node": "nodes.http.request",
  "with": {
    "url": "https://api.example.com",
    "method": "POST",
    "headers": { "Content-Type": "application/json" },
    "body": { "key": "value" }
  }
}
```

### Code/Function Node

**n8n → REFLUX transformation:**

```javascript
// n8n
{
  "type": "n8n-nodes-base.code",
  "parameters": {
    "jsCode": "return items.map(item => ({ name: item.json.name.toUpperCase() }));"
  }
}

// REFLUX
{
  "node": "nodes.transform.execute",
  "with": {
    "code": "return items.map(item => ({ name: item.json.name.toUpperCase() }));",
    "language": "javascript"
  }
}
```

### Condition Node

**n8n → REFLUX transformation:**

```javascript
// n8n
{
  "type": "n8n-nodes-base.if",
  "parameters": {
    "conditions": {
      "number": [
        {
          "value1": "={{ $json.age }}",
          "operation": "larger",
          "value2": 18
        }
      ]
    }
  }
}

// REFLUX
{
  "node": "nodes.condition.execute",
  "with": {
    "conditions": {
      "number": [
        { "value1": "={{ $json.age }}", "operation": "larger", "value2": 18 }
      ]
    },
    "mode": "expression"
  }
}
```

## Handling Unmapped Nodes

If a node isn't supported, you have 3 options:

### Option 1: Use HTTP Request

Most SaaS integrations can be replaced with generic HTTP calls:

```javascript
// n8n Slack node
{ "type": "n8n-nodes-base.slack" }

// REFLUX equivalent
{
  "node": "nodes.http.request",
  "with": {
    "url": "https://slack.com/api/chat.postMessage",
    "method": "POST",
    "headers": {
      "Authorization": "Bearer YOUR_TOKEN"
    },
    "body": {
      "channel": "#general",
      "text": "Hello from REFLUX"
    }
  }
}
```

### Option 2: Implement Custom Node

Create a REFLUX node for the integration:

```typescript
// packages/nodes/src/slack.service.ts
export default class SlackNode extends Service {
  constructor(broker: ServiceBroker) {
    super(broker);

    this.parseServiceSchema({
      name: '1.0.0.nodes.slack.send',
      actions: {
        execute: {
          params: {
            channel: 'string',
            text: 'string',
          },
          async handler(ctx) {
            const { channel, text } = ctx.params;

            const response = await axios.post(
              'https://slack.com/api/chat.postMessage',
              { channel, text },
              { headers: { Authorization: `Bearer ${process.env.SLACK_TOKEN}` } }
            );

            return response.data;
          },
        },
      },
    });
  }
}
```

### Option 3: Request Feature

Open an issue on GitHub:
```
Feature Request: Add support for n8n-nodes-base.notion
```

## Common Migration Issues

### Issue 1: Credentials Not Working

**Problem**: "Authentication failed" after migration

**Solution**: Reconfigure credentials in REFLUX
```bash
# Set environment variables
export OPENAI_API_KEY="sk-..."
export DATABASE_URL="postgresql://..."

# Or configure in REFLUX UI
```

### Issue 2: JavaScript Code Not Working

**Problem**: "ReferenceError: items is not defined"

**Solution**: n8n and REFLUX have different execution contexts

```javascript
// n8n
return items.map(item => item.json.name);

// REFLUX (adjust context)
return $input.items.map(item => item.name);
```

### Issue 3: Connections Not Preserved

**Problem**: Nodes aren't connected correctly

**Solution**: n8n connections → REFLUX step order

```javascript
// n8n uses explicit connections
{ "connections": { "Node1": { "main": [[{ "node": "Node2" }]] } } }

// REFLUX uses implicit order
{ "steps": [
  { "id": "node1", ... },
  { "id": "node2", ... }  // Executes after node1
]}
```

### Issue 4: Expressions Not Working

**Problem**: `={{ $json.field }}` syntax errors

**Solution**: REFLUX uses similar but slightly different syntax

```javascript
// n8n
"={{ $json.user.name }}"

// REFLUX
"{{ $json.user.name }}"  // Remove =
```

## Migration Checklist

Before deploying migrated workflows:

- [ ] Review migration warnings
- [ ] Test unmapped nodes
- [ ] Reconfigure all credentials
- [ ] Update JavaScript code if needed
- [ ] Test workflow end-to-end
- [ ] Check error handling
- [ ] Verify data transformations
- [ ] Update expressions syntax
- [ ] Document custom nodes
- [ ] Set up monitoring

## Batch Migration Script

For migrating 100+ workflows:

```bash
#!/bin/bash
# migrate-all.sh

INPUT_DIR="./n8n-exports"
OUTPUT_DIR="./reflux-workflows"

mkdir -p "$OUTPUT_DIR"

for file in "$INPUT_DIR"/*.json; do
  echo "Migrating $(basename "$file")"

  reflux-migrate "$file" \
    --output "$OUTPUT_DIR/$(basename "$file" .json).reflux.json" \
    --verbose >> migration.log 2>&1
done

echo "Migration complete. Check migration.log for details."
```

## FAQ

### Q: Can I migrate workflows with credentials?

**A**: No. Credentials are NOT migrated for security. You must reconfigure them manually.

### Q: What happens to disabled nodes?

**A**: They are skipped with a warning in the migration report.

### Q: Can I migrate sub-workflows?

**A**: Not automatically. You need to flatten them into a single workflow or call them via HTTP.

### Q: Are n8n expressions supported?

**A**: Mostly yes, but some syntax adjustments may be needed (remove `=` prefix).

### Q: What about n8n-specific features (sticky notes, colors)?

**A**: Sticky notes → comments. Visual styling is not preserved.

## Getting Help

If migration fails:

1. Check migration.log for errors
2. Run with `--verbose` flag
3. Review unmapped nodes list
4. Open GitHub issue with workflow JSON (remove sensitive data)

## Summary

| Feature | Supported |
|---------|-----------|
| **Basic nodes** | ✅ Yes |
| **HTTP/Webhook** | ✅ Yes |
| **Code/Transform** | ✅ Yes |
| **Conditions** | ✅ Yes |
| **Database** | ✅ Yes |
| **Credentials** | ❌ Manual setup |
| **Custom integrations** | ⚠️ May need custom node |
| **Sub-workflows** | ❌ Flatten first |

**Migration success rate**: ~70-80% automated, rest needs manual review.

---

**Next**: [Custom Nodes Guide](./CUSTOM_NODES.md) | [REFLUX Workflows](../tutorials/WORKFLOWS.md)
