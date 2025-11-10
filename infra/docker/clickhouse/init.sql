-- ClickHouse initialization script for REFLUX traces

CREATE DATABASE IF NOT EXISTS reflux;

USE reflux;

-- Trace events table (time-series optimized)
CREATE TABLE IF NOT EXISTS traces (
    run_id String,
    step_id String,
    node String,
    node_version String,
    status Enum8('ok' = 1, 'error' = 2, 'timeout' = 3, 'cancelled' = 4),
    start DateTime,
    end DateTime,
    latency_ms UInt32,
    inputs_hash String,
    metrics Map(String, Float64),
    error Nullable(String),
    retry_count UInt8,
    cache_hit Boolean,
    cost_tokens Nullable(UInt32),
    cost_compute_ms Nullable(UInt32),
    context Map(String, String)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(start)
ORDER BY (node, start)
TTL start + INTERVAL 90 DAY;

-- Materialized view for aggregated metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS node_metrics_hourly
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(hour)
ORDER BY (node, node_version, hour)
AS SELECT
    node,
    node_version,
    toStartOfHour(start) AS hour,
    count() AS executions,
    countIf(status = 'ok') AS successes,
    countIf(status = 'error') AS errors,
    countIf(status = 'timeout') AS timeouts,
    avg(latency_ms) AS avg_latency_ms,
    quantile(0.95)(latency_ms) AS p95_latency_ms,
    quantile(0.99)(latency_ms) AS p99_latency_ms
FROM traces
GROUP BY node, node_version, hour;

-- Index for fast run lookups
CREATE TABLE IF NOT EXISTS run_traces (
    run_id String,
    traces Array(String)
)
ENGINE = MergeTree()
ORDER BY run_id;
