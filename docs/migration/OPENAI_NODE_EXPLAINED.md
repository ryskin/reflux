# How the Converted OpenAI Node Works

## Overview

The converted OpenAI node is a **Moleculer service** that exposes an `execute` action. Here's how it works:

## Node Structure

```typescript
export default class OpenAiChatNode extends Service {
  constructor(broker: ServiceBroker) {
    super(broker);

    this.parseServiceSchema({
      name: '1.0.0.nodes.openai.chat-v2',  // ← Service name for discovery
      actions: {
        execute: {  // ← Action that workflows can call
          params: {  // ← Input parameters with validation
            model: { type: 'string', optional: true, default: 'gpt-3.5-turbo' },
            systemMessage: { type: 'string', optional: true, default: 'You are a helpful assistant.' },
            userMessage: { type: 'string' },  // ← Required
            temperature: { type: 'number', optional: true, default: 0.7, min: 0, max: 2 },
            maxTokens: { type: 'number', optional: true, default: 1000, min: 1 },
          },
          async handler(ctx: Context<OpenAIChatParams>) {
            // ← Handler function that executes the node logic
          }
        }
      }
    });
  }
}
```

## How It's Different from n8n

### n8n Node Structure

```typescript
// n8n: Node has description + execute method
export class OpenAiChat implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'OpenAI Chat',
    name: 'openAiChat',
    properties: [  // ← UI configuration
      {
        displayName: 'Model',
        name: 'model',
        type: 'options',
        options: [
          { name: 'GPT-4', value: 'gpt-4' },
          { name: 'GPT-3.5', value: 'gpt-3.5-turbo' },
        ],
        default: 'gpt-3.5-turbo',
      },
      // ... more properties
    ],
  };

  async execute(this: IExecuteFunctions) {
    // Get parameters using n8n API
    const model = this.getNodeParameter('model', 0);
    const message = this.getNodeParameter('userMessage', 0);

    // Call OpenAI
    const response = await this.helpers.request({...});

    return [returnData];
  }
}
```

### REFLUX Moleculer Service

```typescript
// REFLUX: Pure Moleculer service with params + handler
export default class OpenAiChatNode extends Service {
  constructor(broker: ServiceBroker) {
    super(broker);

    this.parseServiceSchema({
      name: '1.0.0.nodes.openai.chat-v2',
      actions: {
        execute: {
          params: {  // ← Moleculer parameter validation (NOT UI)
            model: { type: 'string', default: 'gpt-3.5-turbo' },
            userMessage: { type: 'string' },
          },
          async handler(ctx) {
            // Get parameters from context
            const { model, userMessage } = ctx.params;

            // Call OpenAI
            const response = await axios({...});

            return { items: [{ json: response.data }] };
          }
        }
      }
    });
  }
}
```

## Key Differences

| Aspect | n8n | REFLUX |
|--------|-----|--------|
| **Purpose** | UI-driven workflow editor | API-driven orchestration |
| **Properties** | UI configuration (forms, dropdowns) | Moleculer parameter validation |
| **Execution** | `this.getNodeParameter('name', i)` | `ctx.params.name` |
| **Input** | `this.getInputData()` (items array) | `ctx.meta.items` (optional) |
| **Output** | `return [returnData]` (nested array) | `return { items: [...] }` (object) |
| **Discovery** | Manual registration in n8n | Automatic via Moleculer broker |

## Where Are the Properties?

**Short answer**: There are NO properties in REFLUX because there's no UI!

### In n8n (UI-based):

```typescript
properties: [
  {
    displayName: 'Model',  // ← Shows "Model" label in UI
    name: 'model',         // ← Parameter key
    type: 'options',       // ← Dropdown UI component
    options: [            // ← Dropdown options
      { name: 'GPT-4', value: 'gpt-4' },
    ],
    default: 'gpt-3.5-turbo',
  }
]
```

When user opens n8n UI:
1. See form with "Model" dropdown
2. Select "GPT-4" from list
3. n8n stores `{ model: 'gpt-4' }` internally
4. When executing: `this.getNodeParameter('model', 0)` returns `'gpt-4'`

### In REFLUX (API-based):

```typescript
params: {
  model: { type: 'string', default: 'gpt-3.5-turbo' }
}
```

When workflow executes:
1. Workflow JSON contains: `{ "params": { "model": "gpt-4" } }`
2. Moleculer validates: ✅ "gpt-4" is a string
3. Handler receives: `ctx.params.model === "gpt-4"`

**No UI needed** - parameters come from:
- Workflow JSON files
- API calls
- Temporal workflows
- Other services calling the node

## How to Use the Node

### 1. Via Workflow JSON

```json
{
  "name": "My Workflow",
  "steps": [
    {
      "id": "ask-ai",
      "node": "1.0.0.nodes.openai.chat-v2",
      "params": {
        "model": "gpt-4",
        "userMessage": "Explain microservices",
        "temperature": 0.7
      }
    }
  ]
}
```

### 2. Via Direct Service Call

```typescript
// From another service or workflow
const result = await broker.call('1.0.0.nodes.openai.chat-v2.execute', {
  model: 'gpt-4',
  userMessage: 'What is REFLUX?',
  temperature: 0.8,
  maxTokens: 500,
});

console.log(result.items[0].json.response);
// → "REFLUX is a workflow automation platform..."
```

### 3. Via Temporal Workflow

```typescript
// In Temporal workflow
const aiStep = await execute({
  nodeId: '1.0.0.nodes.openai.chat-v2',
  params: {
    userMessage: 'Summarize this text: ' + inputText,
  },
});

const summary = aiStep.output.items[0].json.response;
```

## Execution Flow

```
1. Workflow starts
   ↓
2. Reaches OpenAI Chat step
   ↓
3. Temporal calls Moleculer: broker.call('1.0.0.nodes.openai.chat-v2.execute', params)
   ↓
4. Moleculer validates params (type checking)
   ↓
5. Handler executes:
   - Get OPENAI_API_KEY from env
   - Build messages array
   - Call axios to OpenAI API
   - Parse response.data
   ↓
6. Return { items: [{ json: {...} }] }
   ↓
7. Temporal receives result
   ↓
8. Next step in workflow
```

## Parameter Validation

Moleculer automatically validates parameters:

```typescript
params: {
  model: { type: 'string', optional: true, default: 'gpt-3.5-turbo' },
  temperature: { type: 'number', optional: true, default: 0.7, min: 0, max: 2 },
  userMessage: { type: 'string' },  // Required!
}
```

**Invalid calls fail immediately:**

```typescript
// ❌ Missing required parameter
await broker.call('1.0.0.nodes.openai.chat-v2.execute', {
  model: 'gpt-4',
  // userMessage missing!
});
// → Error: Parameter 'userMessage' is required

// ❌ Wrong type
await broker.call('1.0.0.nodes.openai.chat-v2.execute', {
  userMessage: 'Hello',
  temperature: 'hot',  // Should be number!
});
// → Error: Parameter 'temperature' must be a number

// ❌ Out of range
await broker.call('1.0.0.nodes.openai.chat-v2.execute', {
  userMessage: 'Hello',
  temperature: 3.0,  // Max is 2.0
});
// → Error: Parameter 'temperature' must be <= 2

// ✅ Valid call
await broker.call('1.0.0.nodes.openai.chat-v2.execute', {
  userMessage: 'Hello',
  temperature: 0.8,
});
// → Success!
```

## Comparing Properties vs Params

### n8n Properties (UI-Driven)

```typescript
properties: [
  {
    displayName: 'Model',           // ← For human in UI
    name: 'model',                  // ← Parameter key
    type: 'options',                // ← UI component type
    options: [                      // ← UI dropdown items
      { name: 'GPT-4', value: 'gpt-4' },
      { name: 'GPT-3.5', value: 'gpt-3.5-turbo' },
    ],
    default: 'gpt-3.5-turbo',
    description: 'The model to use', // ← Help text in UI
    required: true,                 // ← UI validation
  },
  {
    displayName: 'Message',
    name: 'userMessage',
    type: 'string',
    typeOptions: {
      alwaysOpenEditWindow: true,   // ← UI behavior
      rows: 6,                      // ← Textarea height
    },
    default: '',
    required: true,
  }
]
```

**Purpose**: Define UI forms, dropdowns, textareas, etc.

### REFLUX Params (API-Driven)

```typescript
params: {
  model: {
    type: 'string',               // ← Type validation
    optional: true,               // ← Required/optional
    default: 'gpt-3.5-turbo',     // ← Default value
    enum: ['gpt-4', 'gpt-3.5-turbo'], // ← (optional) Allowed values
  },
  userMessage: {
    type: 'string',
    // No default = required
  },
  temperature: {
    type: 'number',
    optional: true,
    default: 0.7,
    min: 0,                       // ← Range validation
    max: 2,
  }
}
```

**Purpose**: Validate incoming API parameters, no UI involved

## Real Example: Testing the Node

Let's test the converted node!

### Step 1: Start Node Services

```bash
# Terminal 1: Start Redis (Moleculer transport)
docker run -p 6379:6379 redis

# Terminal 2: Start node services
npm run nodes
```

Output:
```
🚀 Starting node services broker...
✅ Node services started:
  - 1.0.0.nodes.openai.chat-v2 (n8n converted)
```

### Step 2: Create Test Workflow

File: `examples/test-openai-workflow.json`

```json
{
  "name": "Test OpenAI Chat",
  "steps": [
    {
      "id": "ask-question",
      "node": "1.0.0.nodes.openai.chat-v2",
      "params": {
        "userMessage": "Explain what Moleculer is in one sentence.",
        "model": "gpt-3.5-turbo",
        "temperature": 0.7
      }
    }
  ]
}
```

### Step 3: Execute Workflow

```bash
# Set OpenAI API key
export OPENAI_API_KEY="sk-..."

# Run workflow
npm run workflow examples/test-openai-workflow.json
```

### Expected Output

```json
{
  "workflowId": "wf_123",
  "status": "completed",
  "steps": [
    {
      "id": "ask-question",
      "node": "1.0.0.nodes.openai.chat-v2",
      "output": {
        "items": [
          {
            "json": {
              "response": "Moleculer is a fast, modern microservices framework for Node.js that helps build efficient, reliable, and scalable services with built-in service discovery, load balancing, and fault tolerance.",
              "model": "gpt-3.5-turbo-0125",
              "usage": {
                "promptTokens": 24,
                "completionTokens": 38,
                "totalTokens": 62
              },
              "finishReason": "stop"
            }
          }
        ]
      }
    }
  ]
}
```

## Summary

| n8n | REFLUX |
|-----|--------|
| UI-driven workflow editor | API-driven orchestration |
| `properties` = UI forms | `params` = API validation |
| User clicks buttons | JSON defines workflows |
| `this.getNodeParameter()` | `ctx.params.*` |
| Embedded in single app | Distributed microservices |

**The converted node is simpler** because:
- No UI code needed
- Direct parameter access
- Standard Moleculer patterns
- Auto-discovery via broker

**Trade-off**:
- ❌ No visual editor (yet!)
- ✅ More flexible (API-first)
- ✅ Better for programmatic workflows
- ✅ True microservices architecture

---

**Next**: Test the node in a real workflow with Temporal!
