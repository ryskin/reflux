/**
 * OpenAI Chat Node
 * Auto-converted from n8n node
 */
import { Service, ServiceBroker } from 'moleculer';
import axios from 'axios';

export default class OpenAiChatNode extends Service {
  constructor(broker: ServiceBroker) {
    super(broker);

    this.parseServiceSchema({
      name: '1.0.0.nodes.openaichat.execute',
      actions: {
        execute: {
          params: {
            model: { type: 'any', optional: true },
            GPT-4: { type: 'any', optional: true },
            GPT-4 Turbo: { type: 'any', optional: true },
            GPT-3.5 Turbo: { type: 'any', optional: true },
            systemMessage: { type: 'any', optional: true },
            userMessage: { type: 'any', optional: true },
            temperature: { type: 'any', optional: true },
            maxTokens: { type: 'any', optional: true }
          },
          async handler(ctx: any) {
            const params = ctx.params;
            const workflowContext = ctx.meta || {};

            this.logger.info('[openAiChat] Executing...');

            try {
              // ⚠️ WARNING: Manual review needed for some n8n-specific code
              
    const items = workflowContext.items || []
    const returnData: INodeExecutionData[] = [];

    // Get credentials
    const credentials = { token: process.env.openAiApi_TOKEN || process.env.openAiApi };
    const apiKey = credentials.apiKey as string;

    for (let i = 0; i < items.length; i++) {
      try {
        // Get parameters
        const model = params.model as string;
        const systemMessage = (params.systemMessage ?? 'You are a helpful assistant.') as string;
        const userMessage = params.userMessage as string;
        const temperature = this.getNodeParameter('temperature', i, 0.7) as number;
        const maxTokens = this.getNodeParameter('maxTokens', i, 1000) as number;

        // Build messages array
        const messages = [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userMessage },
        ];

        // Call OpenAI API
        const response = await axios({
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
          }
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
        if ((workflowContext.continueOnFail || false)) {
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

    return { items: returnData };
  }
            } catch (error: any) {
              this.logger.error('[openAiChat] Execution failed:', error.message);
              throw new Error(`openAiChat execution failed: ${error.message}`);
            }
          },
        },
      },
    });
  }
}
