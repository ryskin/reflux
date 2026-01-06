/**
 * Run logger service for persisting workflow execution logs
 */

import { getDatabase } from '../database/db';
import { NewRunLog } from '../database/schema';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  runId: string;
  stepId: string;
  data?: unknown;
}

/**
 * Logger service for workflow execution
 */
export class RunLogger {
  private buffer: NewRunLog[] = [];
  private readonly bufferSize: number;
  private readonly maxBufferSize: number;
  private readonly flushIntervalMs: number;
  private readonly maxRetries: number;
  private flushTimer: NodeJS.Timeout | null = null;
  private failedFlushCount: number = 0;

  constructor(options?: {
    bufferSize?: number;
    flushIntervalMs?: number;
    maxBufferSize?: number;
    maxRetries?: number;
  }) {
    this.bufferSize = options?.bufferSize || 100;
    this.flushIntervalMs = options?.flushIntervalMs || 1000;
    this.maxBufferSize = options?.maxBufferSize || 10000; // ~10MB max
    this.maxRetries = options?.maxRetries || 3;
  }

  /**
   * Log a debug message
   */
  debug(context: LogContext, message: string, data?: unknown): void {
    this.log('debug', context, message, data);
  }

  /**
   * Log an info message
   */
  info(context: LogContext, message: string, data?: unknown): void {
    this.log('info', context, message, data);
  }

  /**
   * Log a warning message
   */
  warn(context: LogContext, message: string, data?: unknown): void {
    this.log('warn', context, message, data);
  }

  /**
   * Log an error message
   */
  error(context: LogContext, message: string, data?: unknown): void {
    this.log('error', context, message, data);
  }

  /**
   * Internal log method
   */
  private log(level: LogLevel, context: LogContext, message: string, data?: unknown): void {
    // Also log to console for immediate visibility
    const consoleMessage = `[${level.toUpperCase()}] [${context.runId}/${context.stepId}] ${message}`;
    switch (level) {
      case 'debug':
        console.debug(consoleMessage, data || '');
        break;
      case 'info':
        console.info(consoleMessage, data || '');
        break;
      case 'warn':
        console.warn(consoleMessage, data || '');
        break;
      case 'error':
        console.error(consoleMessage, data || '');
        break;
    }

    // Check buffer overflow before adding
    if (this.buffer.length >= this.maxBufferSize) {
      console.error(
        `RunLogger buffer overflow (${this.maxBufferSize}): Dropping log entry to prevent memory leak`
      );
      return;
    }

    // Limit data size to prevent memory issues
    let logData = data;
    if (data) {
      try {
        const dataStr = JSON.stringify(data);
        if (dataStr.length > 100_000) {
          // 100KB limit per log entry
          logData = {
            _truncated: true,
            _originalSize: dataStr.length,
            message: '[Data too large, truncated]',
          };
        } else {
          // Use structuredClone if available (Node 17+), fallback to JSON method
          logData = typeof structuredClone !== 'undefined'
            ? structuredClone(data)
            : JSON.parse(JSON.stringify(data));
        }
      } catch (error) {
        logData = { _error: 'Failed to serialize log data', _message: String(data) };
      }
    }

    // Add to buffer
    this.buffer.push({
      run_id: context.runId,
      step_id: context.stepId,
      level,
      message,
      data: logData,
    });

    // Flush if buffer is full
    if (this.buffer.length >= this.bufferSize) {
      void this.flush();
    } else if (!this.flushTimer) {
      // Schedule flush
      this.flushTimer = setTimeout(() => {
        void this.flush();
      }, this.flushIntervalMs);
    }
  }

  /**
   * Flush buffered logs to database
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }

    const logsToFlush = [...this.buffer];
    this.buffer = [];

    // Clear flush timer
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    try {
      const db = getDatabase();
      await db.insertInto('run_logs').values(logsToFlush).execute();
      console.info(`✅ Flushed ${logsToFlush.length} log entries to database`);

      // Reset failure count on success
      this.failedFlushCount = 0;
    } catch (error) {
      this.failedFlushCount++;
      console.error(
        `Failed to flush logs to database (attempt ${this.failedFlushCount}/${this.maxRetries}):`,
        error
      );

      // Circuit breaker: Stop retrying after max attempts
      if (this.failedFlushCount >= this.maxRetries) {
        console.error(
          `❌ Circuit breaker open: Dropping ${logsToFlush.length} logs after ${this.maxRetries} failed attempts`
        );
        // TODO: Implement fallback storage (file, dead-letter queue, external logging service)
        return;
      }

      // Only re-add to buffer if within limits
      if (this.buffer.length + logsToFlush.length <= this.maxBufferSize) {
        this.buffer.unshift(...logsToFlush);
      } else {
        const dropCount = this.buffer.length + logsToFlush.length - this.maxBufferSize;
        console.error(
          `Buffer overflow: Dropping ${dropCount} oldest logs to prevent memory leak`
        );
        this.buffer.unshift(...logsToFlush.slice(0, this.maxBufferSize - this.buffer.length));
      }
    }
  }

  /**
   * Shutdown logger and flush remaining logs
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
  }
}

/**
 * Singleton logger instance (process-level only)
 *
 * NOTE: In distributed/clustered environments, each process maintains its own instance.
 * For cross-process logging, consider dependency injection or a centralized logging service
 * (e.g., Redis-backed logger, external log aggregator like Datadog/CloudWatch).
 */
let globalLogger: RunLogger | null = null;

/**
 * Get or create global logger instance
 *
 * @example Dependency injection (recommended for testability):
 * ```typescript
 * class WorkflowExecutor {
 *   constructor(private logger: RunLogger) {}
 *   execute() { this.logger.info(...) }
 * }
 * ```
 */
export function getRunLogger(): RunLogger {
  if (!globalLogger) {
    globalLogger = new RunLogger();
  }
  return globalLogger;
}

/**
 * Shutdown global logger
 */
export async function shutdownLogger(): Promise<void> {
  if (globalLogger) {
    await globalLogger.shutdown();
    globalLogger = null;
  }
}
