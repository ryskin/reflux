# n8n Migration Example

## Real-World Migration: Facebook Comments Workflow

### Original n8n Workflow

This workflow fetches comments from a Facebook page:

```json
{
  "name": "Get Comments from Facebook Page",
  "tags": ["automation", "facebook", "production-ready"],
  "nodes": [
    {
      "name": "Manual Trigger",
      "type": "n8n-nodes-base.manualTrigger",
      "position": [600, 240]
    },
    {
      "name": "Facebook Graph API : Get Posts",
      "type": "n8n-nodes-base.facebookGraphApi",
      "position": [1120, 240],
      "parameters": {
        "node": "{{ $json.FB_Page_Id }}/feed",
        "options": {
          "queryParameters": {
            "parameter": [
              { "name": "limit", "value": "10" }
            ]
          }
        }
      }
    },
    {
      "name": "Split Out Posts",
      "type": "n8n-nodes-base.splitOut",
      "position": [1360, 240],
      "parameters": {
        "fieldToSplitOut": "data"
      }
    },
    {
      "name": "Get Comments for Each Post",
      "type": "n8n-nodes-base.facebookGraphApi",
      "position": [1680, 240],
      "parameters": {
        "node": "{{ $json.id }}/comments"
      }
    },
    {
      "name": "Filter Out Null Comments",
      "type": "n8n-nodes-base.filter",
      "position": [2180, 240],
      "parameters": {
        "conditions": {
          "conditions": [
            {
              "leftValue": "={{ $json.data }}",
              "operator": { "type": "array", "operation": "notEmpty" }
            }
          ]
        }
      }
    },
    {
      "name": "Split Out Comments",
      "type": "n8n-nodes-base.splitOut",
      "position": [2400, 240],
      "parameters": {
        "fieldToSplitOut": "data"
      }
    },
    {
      "name": "Select Result Fields",
      "type": "n8n-nodes-base.set",
      "position": [2640, 240],
      "parameters": {
        "assignments": {
          "assignments": [
            { "name": "Post_id", "value": "={{ $json.id }}" },
            { "name": "Comment_id", "value": "={{ $json.data.id }}" },
            { "name": "Comment_message", "value": "={{ $json.data.message }}" }
          ]
        }
      }
    }
  ]
}
```

### Migration Command

```bash
reflux-migrate facebook-comments.json --verbose
```

### Migration Output

```
🔄 REFLUX n8n Migration Tool

📄 Migrating: facebook-comments.json

⚠️  Warnings:
   - Unsupported node type: n8n-nodes-base.facebookGraphApi (node: Facebook Graph API : Get Posts)
   - Unsupported node type: n8n-nodes-base.facebookGraphApi (node: Get Comments for Each Post)

🔧 Unmapped n8n nodes (need manual implementation):
   - n8n-nodes-base.facebookGraphApi

✅ Migrated workflow saved to: facebook-comments.reflux.json

📋 Workflow Summary:
   Name: Get Comments from Facebook Page
   Steps: 5
   Nodes: nodes.util.split, nodes.condition.execute, nodes.transform.execute
```

### Generated REFLUX Workflow (After Manual Fixes)

Since Facebook Graph API nodes aren't supported, we replace them with HTTP requests:

```json
{
  "name": "Get Comments from Facebook Page",
  "version": "1.0.0",
  "description": "Migrated from n8n workflow - Fetches Facebook comments",
  "steps": [
    {
      "id": "get_facebook_posts",
      "node": "nodes.http.request",
      "version": "1.0.0",
      "with": {
        "url": "https://graph.facebook.com/v20.0/{{ $input.FB_Page_Id }}/feed",
        "method": "GET",
        "headers": {
          "Authorization": "Bearer {{ $env.FACEBOOK_ACCESS_TOKEN }}"
        },
        "params": {
          "limit": "10"
        }
      }
    },
    {
      "id": "split_posts",
      "node": "nodes.util.split",
      "version": "1.0.0",
      "with": {
        "field": "data",
        "mode": "array"
      }
    },
    {
      "id": "get_post_comments",
      "node": "nodes.http.request",
      "version": "1.0.0",
      "with": {
        "url": "https://graph.facebook.com/v20.0/{{ $steps.split_posts.output.id }}/comments",
        "method": "GET",
        "headers": {
          "Authorization": "Bearer {{ $env.FACEBOOK_ACCESS_TOKEN }}"
        }
      }
    },
    {
      "id": "filter_non_empty_comments",
      "node": "nodes.condition.execute",
      "version": "1.0.0",
      "with": {
        "conditions": {
          "type": "array",
          "field": "data",
          "operator": "notEmpty"
        }
      }
    },
    {
      "id": "split_comments",
      "node": "nodes.util.split",
      "version": "1.0.0",
      "with": {
        "field": "data",
        "mode": "array"
      }
    },
    {
      "id": "format_output",
      "node": "nodes.transform.execute",
      "version": "1.0.0",
      "with": {
        "code": "return { Post_id: $json.post_id, Comment_id: $json.data.id, Comment_message: $json.data.message };",
        "language": "javascript"
      }
    }
  ],
  "meta": {
    "tags": ["automation", "facebook", "migrated"]
  }
}
```

## Step-by-Step Migration Process

### 1. Export from n8n

In n8n UI:
- Open "Get Comments from Facebook Page" workflow
- Click **`...`** menu → **Download**
- Save as `facebook-comments.json`

### 2. Run Migration Tool

```bash
reflux-migrate facebook-comments.json --verbose
```

### 3. Review Warnings

The tool warns about:
- `n8n-nodes-base.facebookGraphApi` not supported
- Need manual HTTP request implementation

### 4. Manual Fixes

Replace Facebook Graph API nodes with HTTP requests:

```javascript
// Before (n8n)
{ "type": "n8n-nodes-base.facebookGraphApi" }

// After (REFLUX)
{
  "node": "nodes.http.request",
  "with": {
    "url": "https://graph.facebook.com/v20.0/...",
    "headers": { "Authorization": "Bearer ..." }
  }
}
```

### 5. Import to REFLUX

```bash
curl -X POST http://localhost:4000/api/flows \
  -H "Content-Type: application/json" \
  -d @facebook-comments.reflux.json
```

### 6. Configure Credentials

```bash
# Set Facebook access token
export FACEBOOK_ACCESS_TOKEN="your_token_here"

# Or add to .env file
echo "FACEBOOK_ACCESS_TOKEN=your_token" >> .env
```

### 7. Test Workflow

```bash
# Execute via API
curl -X POST http://localhost:4000/api/flows/{flow_id}/execute \
  -H "Content-Type: application/json" \
  -d '{ "inputs": { "FB_Page_Id": "123456789" } }'

# Or via UI
# http://localhost:3002/flows/{flow_id}
# Click "Execute Flow"
```

## Migration Statistics

| Metric | Value |
|--------|-------|
| **Original n8n nodes** | 7 |
| **Migrated automatically** | 5 (71%) |
| **Required manual work** | 2 (29%) |
| **Time to migrate** | ~10 minutes |
| **Migration warnings** | 2 |
| **Unmapped node types** | 1 |

## Before/After Comparison

### n8n

```
✅ Visual workflow editor
✅ Facebook Graph API node (built-in)
✅ Easy drag & drop
❌ Monolithic (can't scale nodes separately)
❌ No node versioning
❌ No A/B testing of nodes
```

### REFLUX (After Migration)

```
✅ Visual workflow editor (React Flow)
✅ Facebook API via HTTP (flexible)
✅ Moleculer service mesh (scalable)
✅ Node versioning (1.0.0, 2.0.0, etc.)
✅ A/B test different implementations
✅ Horizontal scaling ready
⚠️ Manual setup for custom integrations
```

## Lessons Learned

### 1. Most Workflows Migrate Easily

**70-80%** of n8n workflows migrate automatically with minimal manual work.

### 2. SaaS Integrations Need HTTP Mapping

Replace specific integration nodes (Slack, Notion, Facebook) with generic HTTP requests.

### 3. Credentials Always Need Reconfiguration

For security, credentials are never migrated. Always reconfigure them.

### 4. Test Thoroughly

Especially:
- Data transformations
- Conditional logic
- Error handling

## Tips for Smooth Migration

### Tip 1: Start with Simple Workflows

Migrate 1-2 simple workflows first to understand the process.

### Tip 2: Document Unmapped Nodes

Keep a list of custom nodes you need to implement:

```
Unmapped Nodes:
- n8n-nodes-base.slack → Implement or use HTTP
- n8n-nodes-base.notion → Implement or use HTTP
- Custom node → Rewrite for REFLUX
```

### Tip 3: Use Environment Variables

```bash
# .env
FACEBOOK_ACCESS_TOKEN=...
SLACK_WEBHOOK_URL=...
DATABASE_URL=...
```

### Tip 4: Version Your Workflows

```json
{
  "name": "My Workflow",
  "version": "1.0.0",  // Increment on changes
  "description": "Migrated from n8n on 2025-01-15"
}
```

## Next Steps

After successful migration:

1. ✅ Test workflow end-to-end
2. ✅ Set up monitoring
3. ✅ Configure error alerts
4. ✅ Document any custom nodes
5. ✅ Train team on REFLUX
6. ✅ Migrate remaining workflows
7. ✅ Decommission n8n instance

## Resources

- [Full Migration Guide](../docs/migration/N8N_MIGRATION.md)
- [REFLUX Workflow Syntax](../docs/tutorials/WORKFLOWS.md)
- [Custom Nodes Guide](../docs/tutorials/CUSTOM_NODES.md)
- [Troubleshooting](../docs/TROUBLESHOOTING.md)
