/**
 * Transform Node - data transformation with JMESPath
 */

import { ServiceSchema } from 'moleculer';
import { createNodeService } from '../base-node.service';
import { NodeManifest } from '@reflux/core';
import * as jmespath from 'jmespath';

const manifest: NodeManifest = {
  name: 'util.transform',
  version: '1.0.0',
  displayName: 'Transform Data',
  description: 'Transform data using JMESPath expressions',
  category: 'transform',
  inputs: {
    data: 'json',
    mapping: 'object', // { outputField: 'jmespath_expression' }
  },
  outputs: {
    result: 'json',
  },
  policies: {
    timeoutSec: 10,
    retries: [1],
    idempotency: 'sha1(inputs)',
  },
  metrics: ['latency_ms', 'fields_transformed'],
  tags: ['transform', 'jmespath', 'data'],
};

async function run(params: any): Promise<any> {
  const result: Record<string, any> = {};

  for (const [key, expression] of Object.entries(params.mapping)) {
    try {
      result[key] = jmespath.search(params.data, expression as string);
    } catch (error) {
      console.warn(`Transform error for ${key}:`, error);
      result[key] = null;
    }
  }

  return { result };
}

export default createNodeService(manifest, run);
