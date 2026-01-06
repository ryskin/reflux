/**
 * OpenTelemetry tracing setup
 *
 * Provides distributed tracing for workflow execution across all services.
 * Integrates with Jaeger, Tempo, or any OTLP-compatible backend.
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { trace, context, SpanStatusCode, Span } from '@opentelemetry/api';

// Use require to avoid TypeScript module resolution issues with Resource class
const { Resource } = require('@opentelemetry/resources');

let sdk: NodeSDK | null = null;

export interface TracingConfig {
  enabled: boolean;
  serviceName: string;
  serviceVersion?: string;
  otlpEndpoint?: string;
  environment?: string;
}

/**
 * Initialize OpenTelemetry tracing
 *
 * Sets up auto-instrumentation for HTTP, database, and other operations.
 * Safe to call multiple times - will only initialize once.
 */
export function initTracing(config: TracingConfig): void {
  if (!config.enabled) {
    console.log('📊 Tracing disabled');
    return;
  }

  if (sdk) {
    console.log('📊 Tracing already initialized');
    return;
  }

  const otlpEndpoint = config.otlpEndpoint || process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces';

  const resource = Resource.default().merge(
    new Resource({
      [SEMRESATTRS_SERVICE_NAME]: config.serviceName,
      [SEMRESATTRS_SERVICE_VERSION]: config.serviceVersion || '0.1.0',
      environment: config.environment || process.env.NODE_ENV || 'development',
    })
  );

  sdk = new NodeSDK({
    resource,
    traceExporter: new OTLPTraceExporter({
      url: otlpEndpoint,
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        // Disable fs instrumentation to reduce noise
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  sdk.start();
  console.log(`📊 Tracing initialized: ${config.serviceName} -> ${otlpEndpoint}`);

  // Graceful shutdown on process exit
  process.on('SIGTERM', () => {
    sdk?.shutdown()
      .then(() => console.log('📊 Tracing shutdown complete'))
      .catch((error) => console.error('📊 Error shutting down tracing', error));
  });
}

/**
 * Shutdown tracing SDK
 */
export async function shutdownTracing(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
    sdk = null;
    console.log('📊 Tracing shutdown');
  }
}

/**
 * Get the tracer instance
 */
export function getTracer(name: string = 'reflux-core') {
  return trace.getTracer(name);
}

/**
 * Create a span for an async operation
 *
 * @example
 * ```typescript
 * const result = await traced('workflow-execution', async (span) => {
 *   span.setAttribute('workflow.id', workflowId);
 *   return await executeWorkflow();
 * });
 * ```
 */
export async function traced<T>(
  spanName: string,
  fn: (span: Span) => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  const tracer = getTracer();

  return tracer.startActiveSpan(spanName, async (span) => {
    try {
      // Add custom attributes
      if (attributes) {
        Object.entries(attributes).forEach(([key, value]) => {
          span.setAttribute(key, value);
        });
      }

      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error: any) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Create a synchronous span
 */
export function tracedSync<T>(
  spanName: string,
  fn: (span: Span) => T,
  attributes?: Record<string, string | number | boolean>
): T {
  const tracer = getTracer();

  return tracer.startActiveSpan(spanName, (span) => {
    try {
      if (attributes) {
        Object.entries(attributes).forEach(([key, value]) => {
          span.setAttribute(key, value);
        });
      }

      const result = fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error: any) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Get current trace context for propagation
 */
export function getCurrentContext() {
  return context.active();
}

/**
 * Run a function with a specific context
 */
export function withContext<T>(ctx: any, fn: () => T): T {
  return context.with(ctx, fn);
}

/**
 * Extract trace ID from current span for logging correlation
 */
export function getTraceId(): string | undefined {
  const span = trace.getActiveSpan();
  if (!span) return undefined;

  const spanContext = span.spanContext();
  return spanContext.traceId;
}

/**
 * Extract span ID from current span for logging correlation
 */
export function getSpanId(): string | undefined {
  const span = trace.getActiveSpan();
  if (!span) return undefined;

  const spanContext = span.spanContext();
  return spanContext.spanId;
}
