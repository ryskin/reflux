/**
 * Moleculer client for calling nodes from Temporal activities
 */

import { ServiceBroker } from 'moleculer';

let clientBroker: ServiceBroker | null = null;

/**
 * Get or create Moleculer client broker
 */
export function getMoleculerClient(): ServiceBroker {
  if (!clientBroker) {
    clientBroker = new ServiceBroker({
      nodeID: 'reflux-core-client',
      transporter: process.env.TRANSPORTER || 'redis://localhost:6379',
      requestTimeout: 30 * 1000,
      logger: false, // Disable logging for client
    });

    // Start the client broker
    clientBroker.start().then(() => {
      console.log('✅ Moleculer client connected');
    });
  }

  return clientBroker;
}

/**
 * Call a node via Moleculer
 */
export async function callNode(
  nodeName: string,
  version: string,
  params: Record<string, unknown>,
  meta?: Record<string, unknown>
): Promise<unknown> {
  const broker = getMoleculerClient();

  // Handle "latest" version by using "1.0.0" (TODO: implement proper version resolution)
  const resolvedVersion = version === 'latest' ? '1.0.0' : version;

  // Call format: "version.nodeName.execute"
  // Service is registered as "1.0.0.http.request" with action "execute"
  const action = `${resolvedVersion}.${nodeName}.execute`;

  try {
    const result = await broker.call(action, params, { meta });
    return result;
  } catch (error: any) {
    console.error(`❌ Failed to call ${nodeName}:`, error.message);
    throw error;
  }
}

/**
 * Cleanup on shutdown
 */
export async function closeMoleculerClient(): Promise<void> {
  if (clientBroker) {
    await clientBroker.stop();
    clientBroker = null;
  }
}
