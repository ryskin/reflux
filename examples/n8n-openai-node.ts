// Realistic n8n OpenAI Chat Completion node
// Based on n8n OpenAI node patterns

import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from 'n8n-workflow';

export class OpenAiChat implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'OpenAI Chat',
    name: 'openAiChat',
    icon: 'file:openai.svg',
    group: ['transform'],
    version: 1,
    description: 'Send messages to OpenAI Chat Completion API',
    defaults: {
      name: 'OpenAI Chat',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'openAiApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Model',
        name: 'model',
        type: 'options',
        options: [
          {
            name: 'GPT-4',
            value: 'gpt-4',
          },
          {
            name: 'GPT-4 Turbo',
            value: 'gpt-4-turbo-preview',
          },
          {
            name: 'GPT-3.5 Turbo',
            value: 'gpt-3.5-turbo',
          },
        ],
        default: 'gpt-3.5-turbo',
        description: 'The model to use for completion',
      },
      {
        displayName: 'System Message',
        name: 'systemMessage',
        type: 'string',
        typeOptions: {
          alwaysOpenEditWindow: true,
          rows: 4,
        },
        default: 'You are a helpful assistant.',
        description: 'System message to set behavior',
      },
      {
        displayName: 'User Message',
        name: 'userMessage',
        type: 'string',
        typeOptions: {
          alwaysOpenEditWindow: true,
          rows: 6,
        },
        default: '',
        required: true,
        description: 'The message to send to the AI',
      },
      {
        displayName: 'Temperature',
        name: 'temperature',
        type: 'number',
        typeOptions: {
          minValue: 0,
          maxValue: 2,
          numberPrecision: 1,
        },
        default: 0.7,
        description: 'Sampling temperature (0-2). Higher = more random.',
      },
      {
        displayName: 'Max Tokens',
        name: 'maxTokens',
        type: 'number',
        default: 1000,
        description: 'Maximum number of tokens to generate',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];

    // Get credentials
    const credentials = await this.getCredentials('openAiApi');
    const apiKey = credentials.apiKey as string;

    for (let i = 0; i < items.length; i++) {
      try {
        // Get parameters
        const model = this.getNodeParameter('model', i) as string;
        const systemMessage = this.getNodeParameter('systemMessage', i, 'You are a helpful assistant.') as string;
        const userMessage = this.getNodeParameter('userMessage', i) as string;
        const temperature = this.getNodeParameter('temperature', i, 0.7) as number;
        const maxTokens = this.getNodeParameter('maxTokens', i, 1000) as number;

        // Build messages array
        const messages = [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage },
        ];

        // Call OpenAI API
        const response = await this.helpers.request({
          method: 'POST',
          url: 'https://api.openai.com/v1/chat/completions',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: {
            model,
            messages,
            temperature,
            max_tokens: maxTokens,
          },
          json: true,
        });

        // Extract response
        const completion = response.choices[0].message.content;
        const usage = response.usage;

        returnData.push({
          json: {
            response: completion,
            model: response.model,
            usage: {
              promptTokens: usage.prompt_tokens,
              completionTokens: usage.completion_tokens,
              totalTokens: usage.total_tokens,
            },
            finishReason: response.choices[0].finish_reason,
          },
        });

      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: {
              error: error.message,
            },
          });
          continue;
        }
        throw error;
      }
    }

    return [returnData];
  }
}
