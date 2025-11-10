/**
 * OpenAI Node - Chat completion using OpenAI API
 */

import { Service, ServiceBroker } from 'moleculer';

export default class OpenAINode extends Service {
  constructor(broker: ServiceBroker) {
    super(broker);

    this.parseServiceSchema({
      name: '1.0.0.nodes.openai.chat',
      actions: {
        execute: {
          params: {
            model: { type: 'string', optional: true, default: 'gpt-4o-mini' },
            prompt: 'string',
            systemPrompt: { type: 'string', optional: true },
            temperature: { type: 'number', optional: true, default: 0.7 },
            maxTokens: { type: 'number', optional: true, default: 1000 },
            apiKey: { type: 'string', optional: true },
          },
          async handler(ctx: any) {
            const {
              model,
              prompt,
              systemPrompt,
              temperature,
              maxTokens,
              apiKey,
            } = ctx.params;

            const apiKeyToUse = apiKey || process.env.OPENAI_API_KEY;

            if (!apiKeyToUse) {
              throw new Error(
                'OpenAI API key is required. Provide it via apiKey parameter or OPENAI_API_KEY env variable.'
              );
            }

            // Resolve template variables in prompt
            const workflowInputs = ctx.meta?.inputs || {};
            const previousNodes = ctx.meta?.nodes || {};

            // Build context for template resolution
            const context = {
              ...workflowInputs,
              ...Object.fromEntries(
                Object.entries(previousNodes).map(([key, value]: [string, any]) => [
                  key,
                  value.output,
                ])
              ),
            };

            // Simple template variable replacement: {{variable}}
            const resolvedPrompt = this.resolveTemplate(prompt, context);
            const resolvedSystemPrompt = systemPrompt
              ? this.resolveTemplate(systemPrompt, context)
              : undefined;

            // Call OpenAI API
            const messages: any[] = [];

            if (resolvedSystemPrompt) {
              messages.push({
                role: 'system',
                content: resolvedSystemPrompt,
              });
            }

            messages.push({
              role: 'user',
              content: resolvedPrompt,
            });

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKeyToUse}`,
              },
              body: JSON.stringify({
                model,
                messages,
                temperature,
                max_tokens: maxTokens,
              }),
            });

            if (!response.ok) {
              const error = await response.text();
              throw new Error(`OpenAI API error: ${response.status} - ${error}`);
            }

            const data: any = await response.json();

            const content = data.choices?.[0]?.message?.content || '';
            const usage = data.usage || {};

            return {
              content,
              model: data.model,
              usage: {
                promptTokens: usage.prompt_tokens || 0,
                completionTokens: usage.completion_tokens || 0,
                totalTokens: usage.total_tokens || 0,
              },
              finishReason: data.choices?.[0]?.finish_reason || 'stop',
            };
          },
        },
      },
    });
  }

  /**
   * Resolve template variables in a string
   * Supports: {{variable}} and {{object.property}}
   */
  private resolveTemplate(template: string, context: Record<string, any>): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const trimmedPath = path.trim();
      const value = this.getNestedValue(context, trimmedPath);
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}
