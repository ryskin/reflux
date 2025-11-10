/**
 * Webhook Out Node - send data to external webhook
 */

import { ServiceSchema } from 'moleculer';
import { createNodeService } from '../base-node.service';
import { NodeManifest } from '@reflux/core';
import axios from 'axios';

const manifest: NodeManifest = {
  name: 'webhook.out',
  version: '1.0.0',
  displayName: 'Webhook Out',
  description: 'Send data to external webhook',
  category: 'webhook',
  inputs: {
    url: 'string',
    'method?': 'string',
    'headers?': 'object',
    body: 'json',
  },
  outputs: {
    status: 'number',
    delivered: 'boolean',
  },
  policies: {
    timeoutSec: 30,
    retries: [1, 5, 15, 60], // Aggressive retries for delivery
    idempotency: 'none', // Each webhook delivery is unique
  },
  metrics: ['latency_ms', 'status_code', 'retry_count'],
  tags: ['webhook', 'output', 'notification'],
};

async function run(params: any): Promise<any> {
  const response = await axios({
    url: params.url,
    method: params.method || 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...params.headers,
    },
    data: params.body,
    timeout: 30000,
  });

  return {
    status: response.status,
    delivered: response.status >= 200 && response.status < 300,
  };
}

export default createNodeService(manifest, run);
