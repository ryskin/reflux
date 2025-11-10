/**
 * Webhook Trigger Node - Receives HTTP requests to start workflows
 */
import { Service, ServiceBroker } from 'moleculer';

export default class WebhookTriggerNode extends Service {
  constructor(broker: ServiceBroker) {
    super(broker);

    this.parseServiceSchema({
      name: '1.0.0.nodes.webhook.trigger',
      actions: {
        execute: {
          params: {
            method: { type: 'string', optional: true, default: 'POST' },
            path: { type: 'string', optional: true, default: '/' },
          },
          async handler(ctx: any) {
            const { method, path } = ctx.params;
            const inputs = ctx.meta || {};

            this.logger.info(`[Webhook] Triggered: ${method} ${path}`);

            // For now, just pass through the inputs
            // In a full implementation, this would set up an HTTP endpoint
            return {
              method,
              path,
              body: inputs.body || {},
              headers: inputs.headers || {},
              received_at: new Date().toISOString(),
            };
          },
        },
      },
    });
  }
}
