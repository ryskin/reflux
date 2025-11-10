/**
 * Activity for recording metrics
 */

import { MetricsRepository } from '../database/repositories/metrics';
import { NewMetric } from '../database/schema';

export interface RecordMetricArgs {
  metric: NewMetric;
}

/**
 * Record a metric to the database
 * This is an activity so it can be called from Temporal workflows
 */
export async function recordMetric(args: RecordMetricArgs): Promise<void> {
  try {
    await MetricsRepository.record(args.metric);
  } catch (error: any) {
    // Log but don't fail - metrics should not break workflow execution
    console.error('Failed to record metric:', error.message);
  }
}
