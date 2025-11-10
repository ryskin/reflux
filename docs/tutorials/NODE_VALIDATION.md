# Node Schema Validation

REFLUX includes a comprehensive node schema validation system that ensures workflow integrity by validating node connections and data flow compatibility at design time.

## Overview

Every node in REFLUX has a schema that defines:
- **Input ports**: What data the node expects to receive
- **Output ports**: What data the node produces
- **Data types**: Type constraints for each port
- **Required parameters**: Configuration that must be provided

The validation system checks these schemas when you connect nodes in the visual editor, preventing type mismatches and ensuring data flows correctly through your workflow.

## Node Schema Structure

Each node schema includes:

```typescript
interface NodeSchema {
  type: string;              // e.g., 'nodes.webhook.trigger'
  label: string;             // Human-readable name
  description: string;       // What the node does
  category: 'trigger' | 'action' | 'logic' | 'transform';
  inputs: NodePort[];        // Input requirements
  outputs: NodePort[];       // Output data
  icon?: string;             // Visual icon
  color?: string;            // Visual color
}

interface NodePort {
  name: string;              // Port identifier
  type: DataType;            // Data type constraint
  required?: boolean;        // Is this port required?
  description?: string;      // Port documentation
}
```

## Data Types

REFLUX supports the following data types:

### Basic Types
- `string` - Text data
- `number` - Numeric values
- `boolean` - True/false values
- `object` - JSON objects
- `array` - Lists of values
- `json` - Generic JSON data
- `any` - Accepts any type

### Specialized Types
- `http.request` - HTTP request configuration
- `http.response` - HTTP response data
- `openai.message` - OpenAI API response
- `webhook.payload` - Webhook request data

## Type Compatibility Rules

The validation system uses smart type compatibility rules:

### Exact Matches
```typescript
string → string         ✅ Valid
number → number         ✅ Valid
object → object         ✅ Valid
```

### Compatible Conversions
```typescript
json → object           ✅ Valid (JSON can be treated as object)
json → array            ✅ Valid (JSON can be array)
object → json           ✅ Valid (Object can serialize to JSON)
http.response → object  ✅ Valid (Response is object-like)
webhook.payload → object ✅ Valid (Payload is object-like)
openai.message → string ✅ Valid (Message has text content)
object → string         ✅ Valid (For variable templating like {{body.field}})
json → string           ✅ Valid (For variable templating)
webhook.payload → string ✅ Valid (For variable templating)
object → number         ✅ Valid (For variable templating like {{body.count}})
json → number           ✅ Valid (For variable templating)
webhook.payload → number ✅ Valid (For variable templating)
```

### Universal Type
```typescript
any → [anything]        ✅ Valid ('any' accepts all)
[anything] → any        ✅ Valid ('any' outputs to all)
```

### Incompatible Types
```typescript
string → number         ❌ Invalid
number → boolean        ❌ Invalid
array → string          ❌ Invalid
```

## Available Node Schemas

### Triggers

#### Webhook Trigger
```typescript
{
  type: 'nodes.webhook.trigger',
  category: 'trigger',
  inputs: [],  // Triggers have no inputs
  outputs: [
    { name: 'payload', type: 'webhook.payload', required: true },
    { name: 'body', type: 'json' },
    { name: 'headers', type: 'object' },
    { name: 'query', type: 'object' }
  ]
}
```

### Actions

#### OpenAI Chat
```typescript
{
  type: 'nodes.openai.chat',
  category: 'action',
  inputs: [
    { name: 'prompt', type: 'string', required: true },
    { name: 'model', type: 'string' },
    { name: 'temperature', type: 'number' },
    { name: 'systemPrompt', type: 'string' }
  ],
  outputs: [
    { name: 'response', type: 'openai.message', required: true },
    { name: 'content', type: 'string', required: true },
    { name: 'usage', type: 'object' }
  ]
}
```

#### HTTP Request
```typescript
{
  type: 'nodes.http.request',
  category: 'action',
  inputs: [
    { name: 'url', type: 'string', required: true },
    { name: 'method', type: 'string' },
    { name: 'headers', type: 'object' },
    { name: 'body', type: 'json' },
    { name: 'query', type: 'object' }
  ],
  outputs: [
    { name: 'response', type: 'http.response', required: true },
    { name: 'body', type: 'json' },
    { name: 'status', type: 'number' },
    { name: 'headers', type: 'object' }
  ]
}
```

#### Database Query
```typescript
{
  type: 'nodes.database.query',
  category: 'action',
  inputs: [
    { name: 'query', type: 'string', required: true },
    { name: 'params', type: 'array' }
  ],
  outputs: [
    { name: 'rows', type: 'array', required: true },
    { name: 'count', type: 'number' }
  ]
}
```

#### Send Email
```typescript
{
  type: 'nodes.email.send',
  category: 'action',
  inputs: [
    { name: 'to', type: 'string', required: true },
    { name: 'subject', type: 'string', required: true },
    { name: 'body', type: 'string', required: true },
    { name: 'from', type: 'string' }
  ],
  outputs: [
    { name: 'messageId', type: 'string', required: true },
    { name: 'success', type: 'boolean', required: true }
  ]
}
```

### Logic & Transform

#### Condition
```typescript
{
  type: 'nodes.condition.execute',
  category: 'logic',
  inputs: [
    { name: 'value', type: 'any', required: true },
    { name: 'condition', type: 'string', required: true }
  ],
  outputs: [
    { name: 'true', type: 'any' },
    { name: 'false', type: 'any' },
    { name: 'result', type: 'boolean', required: true }
  ]
}
```

#### Transform
```typescript
{
  type: 'nodes.transform.execute',
  category: 'transform',
  inputs: [
    { name: 'input', type: 'any', required: true },
    { name: 'code', type: 'string', required: true }
  ],
  outputs: [
    { name: 'output', type: 'any', required: true }
  ]
}
```

## Real-Time Validation

### Visual Feedback

When you connect nodes in the workflow editor:

**Valid Connection:**
- Standard edge with normal styling
- Connection succeeds immediately
- Console logs success with type information

**Invalid Connection:**
- Red animated edge (pulsing)
- "Type mismatch" label on the edge
- Error added to validation panel
- Connection still created (for editing)

### Error Panel

The validation error panel appears in the bottom-right when there are incompatible connections:

```
┌─────────────────────────────────────────┐
│ ⚠️ Connection Errors (2)                │
│                                         │
│ • Cannot connect OpenAI Chat (openai.  │
│   message) to Database Query (string): │
│   incompatible types                    │
│                                         │
│ • Cannot connect HTTP Request (http.   │
│   response) to Send Email (string):    │
│   incompatible types                    │
│                                         │
│ [Clear errors]                          │
└─────────────────────────────────────────┘
```

## Pre-Save Validation

Before saving or activating a workflow, the system validates:

### 1. Connection Type Compatibility
Checks all edges for type mismatches:
```
❌ Invalid: webhook.payload → number
✅ Valid: webhook.payload → object
```

### 2. Required Parameters
Ensures all required node parameters are filled:
```
❌ Missing: OpenAI Chat node missing required "prompt" parameter
✅ Valid: All required parameters configured
```

### 3. Node Connectivity
Verifies all action nodes have incoming connections:
```
❌ Disconnected: HTTP Request node has no input
✅ Valid: All nodes properly connected
```

### Validation Dialog

If errors are found, you'll see a confirmation dialog:

```
Workflow has 3 validation error(s):

• 1 connection(s) have type mismatches
• Node "OpenAI Chat" missing required parameter: prompt
• Node "HTTP Request" is not connected to any input

Do you want to save anyway?
```

You can choose to:
- **Cancel** - Fix the errors before saving
- **Save Anyway** - Save with errors (for draft workflows)

## Using Variables with Object Types

One of the most powerful features is connecting object-type outputs (like `webhook.payload`) to action nodes that have string/number inputs (like email or HTTP nodes). This works through **variable templating**.

### Example: Webhook to Email

When you connect a webhook node to an email node:

1. **Connect the nodes** - webhook → email (connection is valid because object types can flow into string inputs)
2. **Open the email node editor** - Click on the email node to configure it
3. **Use variables in the fields**:
   ```
   To:      {{body.email}}
   Subject: New message from {{body.name}}
   Body:    Message: {{body.message}}
   ```

The webhook's payload (an object) will be available, and you extract specific fields using the `{{path.to.field}}` syntax.

### Variable Syntax

- `{{body.fieldName}}` - Access webhook request body field
- `{{query.paramName}}` - Access query parameter
- `{{headers.headerName}}` - Access request header
- Nested fields: `{{body.user.email}}`, `{{body.data.items[0].name}}`

### Why This Works

The validation system allows `webhook.payload` → `string` connections because:
1. Action nodes support variable templating
2. At runtime, variables like `{{body.email}}` are resolved to actual string values
3. The object provides the data context that variables can access

This makes workflows flexible while still catching genuinely incompatible connections (like trying to connect a number directly to an email address field).

## Best Practices

### 1. Check Types Early
Connect nodes as you add them to catch type mismatches immediately.

### 2. Use Transform Nodes
When types don't match, add a Transform node to convert data:

```typescript
// Convert HTTP response to string for email
Transform Node:
  input: http.response
  code: "JSON.stringify(input.body)"
  output: string → Email node
```

### 3. Leverage 'any' Type
Use Transform nodes with `any` input/output for complex conversions.

### 4. Review Error Panel
Regularly check the error panel during workflow design.

### 5. Validate Before Activation
Always run pre-save validation before activating workflows in production.

## Adding New Node Types

To add a new node type with validation:

### 1. Define Schema
Add to `/packages/core/src/types/node-registry.ts`:

```typescript
'nodes.slack.send': {
  type: 'nodes.slack.send',
  label: 'Send Slack Message',
  description: 'Post message to Slack channel',
  category: 'action',
  icon: 'message-square',
  color: '#4A154B',
  inputs: [
    {
      name: 'channel',
      type: 'string',
      required: true,
      description: 'Slack channel ID or name'
    },
    {
      name: 'text',
      type: 'string',
      required: true,
      description: 'Message text'
    },
    {
      name: 'attachments',
      type: 'array',
      description: 'Message attachments'
    }
  ],
  outputs: [
    {
      name: 'ts',
      type: 'string',
      required: true,
      description: 'Message timestamp'
    },
    {
      name: 'success',
      type: 'boolean',
      required: true,
      description: 'Whether message was sent'
    }
  ]
}
```

### 2. Rebuild Core Package
```bash
cd packages/core
npm run build
```

### 3. Use in Workflow
The new node type will now appear in the editor with full validation support.

## Implementation Details

### Files
- `/packages/core/src/types/node-schema.ts` - Type definitions and validation logic
- `/packages/core/src/types/node-registry.ts` - Node schema registry
- `/packages/ui/src/features/workflows/components/FlowBuilder.tsx` - UI validation

### Functions

#### `areTypesCompatible(sourceType, targetType)`
Checks if two data types can be connected.

```typescript
areTypesCompatible('webhook.payload', 'object')  // true
areTypesCompatible('string', 'number')           // false
areTypesCompatible('any', 'string')              // true
```

#### `validateConnection(sourceNode, sourcePort, targetNode, targetPort)`
Validates a complete node-to-node connection.

```typescript
validateConnection(
  webhookNode, 'payload',
  httpNode, 'body'
)
// Returns: { valid: true }
```

#### `getNodeSchema(nodeType)`
Retrieves schema for a node type.

```typescript
const schema = getNodeSchema('nodes.openai.chat');
// Returns: NodeSchema with inputs/outputs
```

## Future Enhancements

### Planned Features
- **Multi-port connections**: Connect specific output ports to specific input ports
- **Advanced type inference**: Automatically infer compatible connections
- **Schema validation API**: Validate workflows programmatically
- **Custom type definitions**: User-defined complex types
- **Auto-fix suggestions**: Automatically suggest Transform nodes for type mismatches

## Troubleshooting

### Connection appears valid but shows error
- Check console for detailed error messages
- Verify both nodes have schemas defined
- Confirm data types are correctly specified

### Schema not found for custom node
- Ensure node type is registered in `node-registry.ts`
- Rebuild core package after adding schema
- Check for typos in node type name

### Validation passes but workflow fails
- Validation checks types, not runtime data
- Add runtime error handling in node code
- Check node implementation for edge cases

## Support

For questions or issues:
- Check [Architecture Documentation](../architecture/ARCHITECTURE.md)
- Review [Getting Started Guide](./GETTING_STARTED.md)
- Open issue on GitHub

---

**Next Steps:**
- Learn about [Creating Custom Nodes](./CUSTOM_NODES.md)
- Explore [Dynamic Workflows](./DYNAMIC_WORKFLOWS.md)
- Read about [Workflow Activation](./ACTIVATION.md)
