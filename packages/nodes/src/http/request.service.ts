/**
 * HTTP Request Node
 */

import { ServiceSchema } from 'moleculer';
import { createNodeService } from '../base-node.service';
import { NodeManifest } from '@reflux/core';
import axios from 'axios';

const manifest: NodeManifest = {
  name: 'http.request',
  version: '1.0.0',
  displayName: 'HTTP Request',
  description: 'Make HTTP requests to external APIs',
  category: 'http',
  inputs: {
    url: 'string',
    method: 'string',
    'headers?': 'object',
    'body?': 'object',
    'timeout?': 'number',
  },
  outputs: {
    status: 'number',
    data: 'json',
    headers: 'object',
  },
  policies: {
    timeoutSec: 30,
    retries: [1, 3, 5],
    idempotency: 'sha1(inputs)',
  },
  metrics: ['latency_ms', 'status_code', 'response_size'],
  tags: ['http', 'api', 'external'],
};

async function run(params: any): Promise<any> {
  const response = await axios({
    url: params.url,
    method: params.method || 'GET',
    headers: params.headers || {},
    data: params.body,
    timeout: (params.timeout || 30) * 1000,
    validateStatus: () => true, // Don't throw on 4xx/5xx
  });

  return {
    status: response.status,
    data: response.data,
    headers: response.headers,
  };
}

export default createNodeService(manifest, run);
