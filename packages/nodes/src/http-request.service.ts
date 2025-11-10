/**
 * HTTP Request Node - Makes HTTP calls to external APIs
 */
import { Service, ServiceBroker } from 'moleculer';
import axios from 'axios';

export default class HttpRequestNode extends Service {
  constructor(broker: ServiceBroker) {
    super(broker);

    this.parseServiceSchema({
      name: '1.0.0.nodes.http.request',
      actions: {
        execute: {
          params: {
            url: 'string',
            method: { type: 'string', optional: true, default: 'GET' },
            headers: { type: 'object', optional: true },
            body: { type: 'any', optional: true },
          },
          async handler(ctx: any) {
            const { url, method, headers, body } = ctx.params;

            this.logger.info(`[HTTP] ${method} ${url}`);

            try {
              const response = await axios({
                url,
                method,
                headers: headers || {},
                data: body,
                timeout: 30000,
              });

              return {
                status: response.status,
                headers: response.headers,
                data: response.data,
              };
            } catch (error: any) {
              this.logger.error(`[HTTP] Request failed:`, error.message);
              throw new Error(`HTTP request failed: ${error.message}`);
            }
          },
        },
      },
    });
  }
}
