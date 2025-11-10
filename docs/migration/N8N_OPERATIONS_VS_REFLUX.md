# n8n Operations vs REFLUX Nodes

## Understanding n8n's Structure

n8n uses **one node with multiple operations** to handle different API endpoints:

```typescript
// n8n OpenAI Node structure
export class OpenAi implements INodeType {
  description: INodeTypeDescription = {
    name: 'openAi',
    displayName: 'OpenAI',
    properties: [
      // 1. Resource selector
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        options: [
          { name: 'Chat', value: 'chat' },
          { name: 'Image', value: 'image' },
          { name: 'Text', value: 'text' },
        ],
      },

      // 2. Import operations for each resource
      ...chatOperations,   // → [{ name: 'Complete', value: 'complete' }]
      ...imageOperations,  // → [{ name: 'Generate', value: 'generate' }]
      ...textOperations,   // → [{ name: 'Complete', value: 'complete' }, ...]

      // 3. Import fields for each resource
      ...chatFields,       // → Parameters for chat completion
      ...imageFields,      // → Parameters for image generation
      ...textFields,       // → Parameters for text completion
    ],
  };

  async execute(this: IExecuteFunctions) {
    // Get selected resource and operation
    const resource = this.getNodeParameter('resource', 0);
    const operation = this.getNodeParameter('operation', 0);

    // Route to appropriate handler
    if (resource === 'chat' && operation === 'complete') {
      return await this.chatComplete();
    } else if (resource === 'text' && operation === 'moderate') {
      return await this.textModerate();
    }
    // ... etc
  }
}
```

## n8n Operations Breakdown

### Chat Resource

**chatOperations**:
```typescript
[
  {
    displayName: 'Operation',
    name: 'operation',
    type: 'options',
    displayOptions: {
      show: { resource: ['chat'] }  // ← Only show when "Chat" selected
    },
    options: [
      {
        name: 'Complete',
        value: 'complete',
        action: 'Create a completion',
        description: 'Create one or more completions',
        routing: {
          request: {
            method: 'POST',
            url: '/v1/chat/completions',
          },
        },
      },
    ],
  },
]
```

**chatFields**:
```typescript
[
  {
    displayName: 'Model',
    name: 'model',
    type: 'options',
    displayOptions: {
      show: { resource: ['chat'], operation: ['complete'] }
    },
    typeOptions: {
      loadOptionsMethod: 'getModels',  // ← Dynamic dropdown
    },
    default: 'gpt-3.5-turbo',
    routing: {
      send: { type: 'body', property: 'model' },
    },
  },
  {
    displayName: 'Prompt',
    name: 'prompt',
    type: 'fixedCollection',
    typeOptions: { multipleValues: true },
    displayOptions: {
      show: { resource: ['chat'], operation: ['complete'] }
    },
    default: { messages: [{ role: 'user', content: '' }] },
    options: [
      {
        displayName: 'Messages',
        name: 'messages',
        values: [
          {
            displayName: 'Role',
            name: 'role',
            type: 'options',
            options: [
              { name: 'System', value: 'system' },
              { name: 'User', value: 'user' },
              { name: 'Assistant', value: 'assistant' },
            ],
          },
          {
            displayName: 'Content',
            name: 'content',
            type: 'string',
          },
        ],
      },
    ],
    routing: {
      send: { type: 'body', property: 'messages' },
    },
  },
  // ... temperature, max_tokens, etc.
]
```

### Text Resource

**textOperations**:
```typescript
[
  {
    displayName: 'Operation',
    name: 'operation',
    displayOptions: {
      show: { resource: ['text'] }
    },
    options: [
      {
        name: 'Complete',
        value: 'complete',
        routing: {
          request: {
            method: 'POST',
            url: '/v1/completions',
          },
        },
      },
      {
        name: 'Edit',
        value: 'edit',
        routing: {
          request: {
            method: 'POST',
            url: '/v1/edits',
          },
        },
      },
      {
        name: 'Moderate',
        value: 'moderate',
        routing: {
          request: {
            method: 'POST',
            url: '/v1/moderations',
          },
        },
      },
    ],
  },
]
```

**textFields** (example for "edit"):
```typescript
[
  {
    displayName: 'Model',
    name: 'model',
    displayOptions: {
      show: { resource: ['text'], operation: ['edit'] }
    },
    type: 'options',
    options: [
      { name: 'Code Davinci Edit', value: 'code-davinci-edit-001' },
      { name: 'Text Davinci Edit', value: 'text-davinci-edit-001' },
    ],
  },
  {
    displayName: 'Input',
    name: 'input',
    displayOptions: {
      show: { resource: ['text'], operation: ['edit'] }
    },
    type: 'string',
    description: 'The text to edit',
  },
  {
    displayName: 'Instruction',
    name: 'instruction',
    displayOptions: {
      show: { resource: ['text'], operation: ['edit'] }
    },
    type: 'string',
    description: 'The instruction that tells the model how to edit the prompt',
  },
]
```

## REFLUX Approach: Separate Services

In REFLUX, instead of ONE node with multiple operations, we create **separate services** for each operation:

```typescript
// 1. Chat Completion Service
export default class OpenAIChatNode extends Service {
  constructor(broker: ServiceBroker) {
    super(broker);
    this.parseServiceSchema({
      name: '1.0.0.nodes.openai.chat',  // ← Specific endpoint
      actions: {
        execute: {
          params: {
            model: { type: 'string', default: 'gpt-3.5-turbo' },
            messages: { type: 'array', items: 'object' },
            temperature: { type: 'number', optional: true },
          },
          async handler(ctx) {
            // POST /v1/chat/completions
          }
        }
      }
    });
  }
}

// 2. Text Completion Service
export default class OpenAITextNode extends Service {
  constructor(broker: ServiceBroker) {
    super(broker);
    this.parseServiceSchema({
      name: '1.0.0.nodes.openai.text',  // ← Different service
      actions: {
        execute: {
          params: {
            model: { type: 'string', default: 'gpt-3.5-turbo-instruct' },
            prompt: { type: 'string' },
          },
          async handler(ctx) {
            // POST /v1/completions
          }
        }
      }
    });
  }
}

// 3. Text Edit Service
export default class OpenAIEditNode extends Service {
  constructor(broker: ServiceBroker) {
    super(broker);
    this.parseServiceSchema({
      name: '1.0.0.nodes.openai.edit',  // ← Different service
      actions: {
        execute: {
          params: {
            model: { type: 'string', default: 'text-davinci-edit-001' },
            input: { type: 'string' },
            instruction: { type: 'string' },
          },
          async handler(ctx) {
            // POST /v1/edits
          }
        }
      }
    });
  }
}

// 4. Text Moderation Service
export default class OpenAIModerateNode extends Service {
  constructor(broker: ServiceBroker) {
    super(broker);
    this.parseServiceSchema({
      name: '1.0.0.nodes.openai.moderate',  // ← Different service
      actions: {
        execute: {
          params: {
            input: { type: 'string' },
            model: { type: 'string', optional: true },
          },
          async handler(ctx) {
            // POST /v1/moderations
          }
        }
      }
    });
  }
}

// 5. Image Generation Service
export default class OpenAIImageNode extends Service {
  constructor(broker: ServiceBroker) {
    super(broker);
    this.parseServiceSchema({
      name: '1.0.0.nodes.openai.image',  // ← Different service
      actions: {
        execute: {
          params: {
            prompt: { type: 'string' },
            size: { type: 'string', optional: true, default: '1024x1024' },
            n: { type: 'number', optional: true, default: 1 },
          },
          async handler(ctx) {
            // POST /v1/images/generations
          }
        }
      }
    });
  }
}
```

## Comparison Table

| Aspect | n8n | REFLUX |
|--------|-----|--------|
| **Structure** | 1 node with many operations | Many services, 1 operation each |
| **Selection** | UI dropdowns (Resource → Operation) | Direct service call by name |
| **Routing** | `displayOptions: { show: { resource, operation } }` | Service name: `1.0.0.nodes.openai.chat` |
| **Scalability** | All operations in one process | Each service can scale independently |
| **Code organization** | Large single file with routing logic | Small focused files |

## Usage Comparison

### n8n Workflow (UI-based)

```
1. User opens n8n editor
2. Drags "OpenAI" node
3. Selects Resource: "Chat"
4. Selects Operation: "Complete"
5. UI shows only relevant fields (model, messages, temperature)
6. User fills form
7. Saves workflow
```

Internally stored as:
```json
{
  "nodes": [
    {
      "type": "n8n-nodes-base.openAi",
      "parameters": {
        "resource": "chat",
        "operation": "complete",
        "model": "gpt-4",
        "prompt": {
          "messages": [
            { "role": "user", "content": "Hello" }
          ]
        }
      }
    }
  ]
}
```

### REFLUX Workflow (API-based)

```json
{
  "steps": [
    {
      "id": "chat-step",
      "node": "1.0.0.nodes.openai.chat",
      "params": {
        "model": "gpt-4",
        "messages": [
          { "role": "user", "content": "Hello" }
        ]
      }
    }
  ]
}
```

**Direct and explicit** - no resource/operation selection needed!

## Converting n8n Node to Multiple REFLUX Services

When you see:

```typescript
import { chatFields, chatOperations } from './ChatDescription';
import { imageFields, imageOperations } from './ImageDescription';
import { textFields, textOperations } from './TextDescription';
```

This means you should create **3 separate REFLUX services**:

### 1. Chat Service

```typescript
// packages/nodes/src/openai-chat.service.ts
export default class OpenAIChatNode extends Service {
  constructor(broker: ServiceBroker) {
    super(broker);
    this.parseServiceSchema({
      name: '1.0.0.nodes.openai.chat',
      actions: {
        execute: {
          params: {
            // Extract from chatFields
            model: { type: 'string', default: 'gpt-3.5-turbo' },
            messages: { type: 'array', items: 'object' },
            temperature: { type: 'number', optional: true, default: 1 },
            max_tokens: { type: 'number', optional: true },
            // ... other chatFields
          },
          async handler(ctx) {
            // Extract routing.request from chatOperations
            const response = await axios({
              method: 'POST',
              url: 'https://api.openai.com/v1/chat/completions',
              headers: { 'Authorization': `Bearer ${apiKey}` },
              data: ctx.params,
            });
            return { items: [{ json: response.data }] };
          }
        }
      }
    });
  }
}
```

### 2. Text Service (with multiple actions)

```typescript
// packages/nodes/src/openai-text.service.ts
export default class OpenAITextNode extends Service {
  constructor(broker: ServiceBroker) {
    super(broker);
    this.parseServiceSchema({
      name: '1.0.0.nodes.openai.text',
      actions: {
        // Action 1: Complete
        complete: {
          params: {
            model: { type: 'string', default: 'gpt-3.5-turbo-instruct' },
            prompt: { type: 'string' },
            // ... from textFields for "complete"
          },
          async handler(ctx) {
            const response = await axios.post(
              'https://api.openai.com/v1/completions',
              ctx.params
            );
            return { items: [{ json: response.data }] };
          }
        },

        // Action 2: Edit
        edit: {
          params: {
            model: { type: 'string' },
            input: { type: 'string' },
            instruction: { type: 'string' },
            // ... from textFields for "edit"
          },
          async handler(ctx) {
            const response = await axios.post(
              'https://api.openai.com/v1/edits',
              ctx.params
            );
            return { items: [{ json: response.data }] };
          }
        },

        // Action 3: Moderate
        moderate: {
          params: {
            input: { type: 'string' },
            model: { type: 'string', optional: true },
          },
          async handler(ctx) {
            const response = await axios.post(
              'https://api.openai.com/v1/moderations',
              ctx.params
            );
            return { items: [{ json: response.data }] };
          }
        },
      }
    });
  }
}
```

### 3. Image Service

```typescript
// packages/nodes/src/openai-image.service.ts
export default class OpenAIImageNode extends Service {
  constructor(broker: ServiceBroker) {
    super(broker);
    this.parseServiceSchema({
      name: '1.0.0.nodes.openai.image',
      actions: {
        execute: {
          params: {
            prompt: { type: 'string' },
            n: { type: 'number', optional: true, default: 1 },
            size: {
              type: 'string',
              optional: true,
              default: '1024x1024',
              enum: ['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792']
            },
            // ... from imageFields
          },
          async handler(ctx) {
            const response = await axios.post(
              'https://api.openai.com/v1/images/generations',
              ctx.params
            );
            return { items: [{ json: response.data }] };
          }
        }
      }
    });
  }
}
```

## Automatic Converter Enhancement

To properly convert multi-operation nodes, we need to detect operations:

```typescript
// Enhanced converter
export class N8nNodeConverter {
  convert(n8nNodeCode: string): ConversionResult {
    // Check if node has multiple operations
    const hasOperations = this.detectOperations(n8nNodeCode);

    if (hasOperations) {
      // Extract each operation
      const operations = this.extractOperations(n8nNodeCode);

      // Generate separate service for each operation
      return {
        success: true,
        services: operations.map(op => this.generateService(op)),
        warning: 'Multi-operation node detected. Generated multiple services.'
      };
    }

    // Single operation node - convert as before
    return this.convertSingle(n8nNodeCode);
  }
}
```

## Summary

| n8n Pattern | REFLUX Pattern | Example |
|-------------|----------------|---------|
| 1 node, many operations | Many services | `openAi` → `openai.chat`, `openai.text`, `openai.image` |
| `resource` + `operation` params | Service name | `{ resource: 'chat' }` → `1.0.0.nodes.openai.chat` |
| `displayOptions.show` | N/A (no UI) | Removed entirely |
| `routing.request.url` | Service handler URL | Extracted to `axios({ url: '...' })` |
| Dynamic field visibility | All params always available | Simplified |

**Key Insight**: n8n's operations are **UI convenience** for grouping related endpoints. In REFLUX, we make them **separate services** for better scalability and clarity.

---

Would you like me to create a fully working multi-operation OpenAI service set based on the actual n8n implementation?
