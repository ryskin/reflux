/**
 * OpenAI Chat Node
 * Converted from n8n OpenAI node with manual improvements
 */
import { Service, ServiceBroker, Context } from 'moleculer';
import axios from 'axios';

interface OpenAIChatParams {
  model?: string;
  systemMessage?: string;
  userMessage: string;
  temperature?: number;
  maxTokens?: number;
}

interface OpenAIChatItem {
  response: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
}

export default class OpenAiChatNode extends Service {
  constructor(broker: ServiceBroker) {
    super(broker);

    this.parseServiceSchema({
      name: '1.0.0.nodes.openai.chat-v2',
      actions: {
        execute: {
          params: {
            model: { type: 'string', optional: true, default: 'gpt-3.5-turbo' },
            systemMessage: {
              type: 'string',
              optional: true,
              default: 'You are a helpful assistant.'
            },
            userMessage: { type: 'string' },
            temperature: { type: 'number', optional: true, default: 0.7, min: 0, max: 2 },
            maxTokens: { type: 'number', optional: true, default: 1000, min: 1 },
          },
          async handler(ctx: Context<OpenAIChatParams>) {
            const params = ctx.params;
            const workflowContext = ctx.meta || {};

            this.logger.info('[OpenAI Chat] Executing with model:', params.model);

            try {
              // Get API key from environment
              const apiKey = process.env.OPENAI_API_KEY;
              if (!apiKey) {
                throw new Error('OPENAI_API_KEY environment variable not set');
              }

              // Build messages array
              const messages = [
                { role: 'system', content: params.systemMessage || 'You are a helpful assistant.' },
                { role: 'user', content: params.userMessage },
              ];

              this.logger.debug('[OpenAI Chat] Request:', {
                model: params.model,
                temperature: params.temperature,
                maxTokens: params.maxTokens,
              });

              // Call OpenAI API
              const response = await axios({
                method: 'POST',
                url: 'https://api.openai.com/v1/chat/completions',
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                },
                data: {
                  model: params.model || 'gpt-3.5-turbo',
                  messages,
                  temperature: params.temperature ?? 0.7,
                  max_tokens: params.maxTokens ?? 1000,
                },
                timeout: 30000, // 30 second timeout
              });

              // Extract response
              const data = response.data;
              const completion = data.choices[0].message.content;
              const usage = data.usage;

              this.logger.info('[OpenAI Chat] Success. Tokens used:', usage.total_tokens);

              const result: OpenAIChatItem = {
                response: completion,
                model: data.model,
                usage: {
                  promptTokens: usage.prompt_tokens,
                  completionTokens: usage.completion_tokens,
                  totalTokens: usage.total_tokens,
                },
                finishReason: data.choices[0].finish_reason,
              };

              return { items: [{ json: result }] };

            } catch (error: any) {
              this.logger.error('[OpenAI Chat] Execution failed:', error.message);

              // Handle axios errors
              if (error.response) {
                // OpenAI API error
                const apiError = error.response.data?.error;
                if (apiError) {
                  throw new Error(`OpenAI API error: ${apiError.message || apiError.type}`);
                }
                throw new Error(`HTTP ${error.response.status}: ${error.response.statusText}`);
              } else if (error.request) {
                // Network error
                throw new Error('Network error: Could not reach OpenAI API');
              }

              throw new Error(`OpenAI Chat execution failed: ${error.message}`);
            }
          },
        },
      },
    });
  }
}
