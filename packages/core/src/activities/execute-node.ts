/**
 * Temporal activity for executing nodes
 */

import { Context } from '@temporalio/activity';
import { TraceEvent } from '../types';
import { callNode } from './moleculer-client';
import { traced } from '../tracing';
import { shouldStoreAsArtifact, generateArtifactKey, createStorage, StorageConfig } from '../storage';
import { ArtifactRepository } from '../database';
import { nodesTotal, nodesDuration, artifactsTotal, artifactsSize } from '../metrics';

// Storage instance (lazy initialized)
let storage: Awaited<ReturnType<typeof createStorage>> | null = null;

async function getStorage() {
  if (!storage) {
    const config: StorageConfig = {
      backend: (process.env.ARTIFACT_STORAGE as 'local' | 's3') || 'local',
      localPath: process.env.ARTIFACT_LOCAL_PATH || './storage/artifacts',
      s3Endpoint: process.env.ARTIFACT_S3_ENDPOINT,
      s3Bucket: process.env.ARTIFACT_S3_BUCKET,
      s3AccessKeyId: process.env.ARTIFACT_S3_ACCESS_KEY_ID,
      s3SecretAccessKey: process.env.ARTIFACT_S3_SECRET_ACCESS_KEY,
      s3Region: process.env.ARTIFACT_S3_REGION,
      s3ForcePathStyle: process.env.ARTIFACT_S3_FORCE_PATH_STYLE === 'true',
    };
    storage = await createStorage(config);
  }
  return storage;
}

export interface ExecuteNodeArgs {
  node: string;
  version: string;
  params: Record<string, unknown>;
  runId: string;
  stepId: string;
  context?: Record<string, unknown>; // Full workflow context (inputs + previous node outputs)
}

/**
 * Execute a node and return its output
 * Calls node via Moleculer service bus
 */
export async function executeNode(args: ExecuteNodeArgs): Promise<unknown> {
  return traced(
    `node.execute.${args.node}`,
    async (span) => {
      const start = Date.now();

      // Add span attributes for better observability
      span.setAttribute('node.type', args.node);
      span.setAttribute('node.version', args.version);
      span.setAttribute('run.id', args.runId);
      span.setAttribute('step.id', args.stepId);

      console.log(`[${args.stepId}] Executing ${args.node}@${args.version}...`);

      try {
        // Call node via Moleculer
        const result = await callNode(
          args.node,
          args.version,
          args.params,
          {
            runId: args.runId,
            stepId: args.stepId,
            ...args.context, // Spread workflow context into meta
          }
        );

        const latency = Date.now() - start;
        span.setAttribute('latency.ms', latency);
        span.setAttribute('status', 'ok');

        // Record Prometheus metrics
        nodesTotal.inc({ node_type: args.node, status: 'success' });
        nodesDuration.observe({ node_type: args.node, status: 'success' }, latency / 1000);

        // Check if result should be stored as artifact
        let finalResult = result;
        if (shouldStoreAsArtifact(result)) {
          console.log(`[${args.stepId}] 📦 Large output detected, storing as artifact...`);

          try {
            const storage = await getStorage();

            // Generate unique key for artifact
            const filename = `output.json`;
            const key = generateArtifactKey(args.runId, args.stepId, filename);

            // Convert result to Buffer
            const data = Buffer.from(JSON.stringify(result), 'utf8');

            // Store artifact
            const storageResult = await storage.put(key, data, {
              contentType: 'application/json',
            });

            // Save metadata to database
            const artifact = await ArtifactRepository.create({
              run_id: args.runId,
              step_id: args.stepId,
              key: storageResult.key,
              size_bytes: storageResult.size,
              content_type: 'application/json',
              storage_backend: process.env.ARTIFACT_STORAGE || 'local',
              etag: storageResult.etag || null,
              expires_at: null, // No expiration by default
            });

            // Generate signed URL for access
            const signedUrl = await storage.getSignedUrl(key, 3600); // 1 hour expiration

            // Return artifact reference instead of full data
            finalResult = {
              __artifact: true,
              id: artifact.id,
              key: artifact.key,
              size: artifact.size_bytes,
              url: signedUrl,
              contentType: artifact.content_type,
            };

            console.log(`[${args.stepId}] ✅ Artifact stored: ${key} (${(storageResult.size / 1024 / 1024).toFixed(2)} MB)`);
            span.setAttribute('artifact.stored', true);
            span.setAttribute('artifact.size', storageResult.size);

            // Record artifact metrics
            const backend = process.env.ARTIFACT_STORAGE || 'local';
            artifactsTotal.inc({ operation: 'put', backend, status: 'success' });
            artifactsSize.observe({ backend }, storageResult.size);
          } catch (artifactError: any) {
            console.warn(`[${args.stepId}] ⚠️ Failed to store artifact:`, artifactError.message);
            // Fall back to returning full result if artifact storage fails
          }
        }

        // Emit trace event for backwards compatibility
        await emitTrace({
          run_id: args.runId,
          step_id: args.stepId,
          node: args.node,
          version: args.version,
          start: new Date(start),
          end: new Date(),
          status: 'ok',
          latency_ms: latency,
        });

        console.log(`[${args.stepId}] ✅ Completed in ${latency}ms`);

        return finalResult;
      } catch (error: any) {
        const latency = Date.now() - start;
        span.setAttribute('latency.ms', latency);
        span.setAttribute('status', 'error');
        span.setAttribute('error.type', error?.constructor?.name || 'Error');

        // Record Prometheus metrics for failures
        nodesTotal.inc({ node_type: args.node, status: 'failure' });
        nodesDuration.observe({ node_type: args.node, status: 'failure' }, latency / 1000);

        await emitTrace({
          run_id: args.runId,
          step_id: args.stepId,
          node: args.node,
          version: args.version,
          start: new Date(start),
          end: new Date(),
          status: 'error',
          latency_ms: latency,
          error: {
            class: error?.constructor?.name || 'Error',
            message: error?.message || String(error),
            stack: error?.stack,
            retryable: true,
          },
        });

        console.error(`[${args.stepId}] ❌ Failed:`, error?.message || error);
        throw error;
      }
    },
    {
      'node.type': args.node,
      'node.version': args.version,
    }
  );
}

/**
 * Emit trace event (will be replaced with ClickHouse insert in Sprint 2)
 */
async function emitTrace(event: TraceEvent): Promise<void> {
  // For now, just log to console
  // In full implementation, this will insert to ClickHouse
  console.log('[TRACE]', {
    run: event.run_id,
    step: event.step_id,
    node: event.node,
    status: event.status,
    latency: event.latency_ms,
  });
}
