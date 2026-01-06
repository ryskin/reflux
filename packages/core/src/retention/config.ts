/**
 * Data retention configuration
 *
 * Defines how long different types of data are retained before cleanup.
 */

export interface RetentionPolicy {
  /**
   * Run retention policies (in days)
   */
  runs: {
    /** Successful runs retention */
    successful: number;
    /** Failed runs retention (keep longer for debugging) */
    failed: number;
    /** Cancelled runs retention */
    cancelled: number;
  };

  /**
   * Log retention policies (in days)
   */
  logs: {
    /** Debug logs retention */
    debug: number;
    /** Info logs retention */
    info: number;
    /** Warning logs retention */
    warn: number;
    /** Error logs retention (keep longer for analysis) */
    error: number;
  };

  /**
   * Artifact retention policies (in days)
   */
  artifacts: {
    /** Default artifact retention */
    default: number;
    /** Maximum artifact retention (null = indefinite) */
    max: number | null;
  };

  /**
   * Flow version retention policies
   */
  flowVersions: {
    /** Keep N most recent versions per flow */
    keepRecent: number;
    /** Minimum age before deletion (days) */
    minAge: number;
  };

  /**
   * Metrics retention policies (in days)
   */
  metrics: {
    /** Raw metrics retention */
    raw: number;
    /** Aggregated metrics retention */
    aggregated: number;
  };
}

/**
 * Default retention policy
 */
export const DEFAULT_RETENTION_POLICY: RetentionPolicy = {
  runs: {
    successful: 30, // 30 days
    failed: 90,     // 90 days - keep failures longer for debugging
    cancelled: 14,  // 14 days
  },
  logs: {
    debug: 7,   // 7 days
    info: 30,   // 30 days
    warn: 60,   // 60 days
    error: 90,  // 90 days - keep errors longer
  },
  artifacts: {
    default: 30,  // 30 days
    max: null,    // No maximum - keep indefinitely unless explicitly cleaned
  },
  flowVersions: {
    keepRecent: 10, // Keep last 10 versions per flow
    minAge: 7,      // Don't delete versions younger than 7 days
  },
  metrics: {
    raw: 30,        // 30 days of raw metrics
    aggregated: 365, // 1 year of aggregated metrics
  },
};

/**
 * Validate retention policy values
 */
function validateRetentionPolicy(policy: RetentionPolicy): void {
  const errors: string[] = [];

  // Validate runs retention (min 1 day, max 3650 days = 10 years)
  if (policy.runs.successful < 1 || policy.runs.successful > 3650 || isNaN(policy.runs.successful)) {
    errors.push(`Invalid runs.successful: ${policy.runs.successful} (must be 1-3650 days)`);
  }
  if (policy.runs.failed < 1 || policy.runs.failed > 3650 || isNaN(policy.runs.failed)) {
    errors.push(`Invalid runs.failed: ${policy.runs.failed} (must be 1-3650 days)`);
  }
  if (policy.runs.cancelled < 1 || policy.runs.cancelled > 3650 || isNaN(policy.runs.cancelled)) {
    errors.push(`Invalid runs.cancelled: ${policy.runs.cancelled} (must be 1-3650 days)`);
  }

  // Validate logs retention (min 1 day, max 365 days)
  if (policy.logs.debug < 1 || policy.logs.debug > 365 || isNaN(policy.logs.debug)) {
    errors.push(`Invalid logs.debug: ${policy.logs.debug} (must be 1-365 days)`);
  }
  if (policy.logs.info < 1 || policy.logs.info > 365 || isNaN(policy.logs.info)) {
    errors.push(`Invalid logs.info: ${policy.logs.info} (must be 1-365 days)`);
  }
  if (policy.logs.warn < 1 || policy.logs.warn > 365 || isNaN(policy.logs.warn)) {
    errors.push(`Invalid logs.warn: ${policy.logs.warn} (must be 1-365 days)`);
  }
  if (policy.logs.error < 1 || policy.logs.error > 365 || isNaN(policy.logs.error)) {
    errors.push(`Invalid logs.error: ${policy.logs.error} (must be 1-365 days)`);
  }

  // Validate artifacts retention (min 1 day, max 3650 days)
  if (policy.artifacts.default < 1 || policy.artifacts.default > 3650 || isNaN(policy.artifacts.default)) {
    errors.push(`Invalid artifacts.default: ${policy.artifacts.default} (must be 1-3650 days)`);
  }
  if (policy.artifacts.max !== null && (policy.artifacts.max < 1 || policy.artifacts.max > 3650 || isNaN(policy.artifacts.max))) {
    errors.push(`Invalid artifacts.max: ${policy.artifacts.max} (must be 1-3650 days or null)`);
  }

  // Validate flow versions (keepRecent: 1-100, minAge: 1-365 days)
  if (policy.flowVersions.keepRecent < 1 || policy.flowVersions.keepRecent > 100 || isNaN(policy.flowVersions.keepRecent)) {
    errors.push(`Invalid flowVersions.keepRecent: ${policy.flowVersions.keepRecent} (must be 1-100)`);
  }
  if (policy.flowVersions.minAge < 1 || policy.flowVersions.minAge > 365 || isNaN(policy.flowVersions.minAge)) {
    errors.push(`Invalid flowVersions.minAge: ${policy.flowVersions.minAge} (must be 1-365 days)`);
  }

  // Validate metrics retention (min 1 day, max 3650 days)
  if (policy.metrics.raw < 1 || policy.metrics.raw > 3650 || isNaN(policy.metrics.raw)) {
    errors.push(`Invalid metrics.raw: ${policy.metrics.raw} (must be 1-3650 days)`);
  }
  if (policy.metrics.aggregated < 1 || policy.metrics.aggregated > 3650 || isNaN(policy.metrics.aggregated)) {
    errors.push(`Invalid metrics.aggregated: ${policy.metrics.aggregated} (must be 1-3650 days)`);
  }

  if (errors.length > 0) {
    throw new Error(`Invalid retention policy:\n${errors.join('\n')}`);
  }
}

/**
 * Load retention policy from environment or use defaults
 * Validates all values to prevent misconfigurations
 */
export function getRetentionPolicy(): RetentionPolicy {
  const policy: RetentionPolicy = {
    runs: {
      successful: parseInt(process.env.RETENTION_RUNS_SUCCESSFUL || '30', 10),
      failed: parseInt(process.env.RETENTION_RUNS_FAILED || '90', 10),
      cancelled: parseInt(process.env.RETENTION_RUNS_CANCELLED || '14', 10),
    },
    logs: {
      debug: parseInt(process.env.RETENTION_LOGS_DEBUG || '7', 10),
      info: parseInt(process.env.RETENTION_LOGS_INFO || '30', 10),
      warn: parseInt(process.env.RETENTION_LOGS_WARN || '60', 10),
      error: parseInt(process.env.RETENTION_LOGS_ERROR || '90', 10),
    },
    artifacts: {
      default: parseInt(process.env.RETENTION_ARTIFACTS_DEFAULT || '30', 10),
      max: process.env.RETENTION_ARTIFACTS_MAX
        ? parseInt(process.env.RETENTION_ARTIFACTS_MAX, 10)
        : null,
    },
    flowVersions: {
      keepRecent: parseInt(process.env.RETENTION_FLOW_VERSIONS_KEEP || '10', 10),
      minAge: parseInt(process.env.RETENTION_FLOW_VERSIONS_MIN_AGE || '7', 10),
    },
    metrics: {
      raw: parseInt(process.env.RETENTION_METRICS_RAW || '30', 10),
      aggregated: parseInt(process.env.RETENTION_METRICS_AGGREGATED || '365', 10),
    },
  };

  // Validate before returning
  validateRetentionPolicy(policy);

  return policy;
}

/**
 * Cleanup preview result
 */
export interface CleanupPreview {
  runs: {
    successful: number;
    failed: number;
    cancelled: number;
  };
  logs: {
    debug: number;
    info: number;
    warn: number;
    error: number;
  };
  artifacts: number;
  flowVersions: number;
  metrics: number;
  totalRecords: number;
  estimatedSpaceBytes: number;
}

/**
 * Cleanup execution result
 */
export interface CleanupResult {
  success: boolean;
  preview: CleanupPreview;
  deleted: CleanupPreview;
  durationMs: number;
  errors: string[];
}
