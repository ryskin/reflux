# REFLUX Architecture

## Overview

REFLUX is a **self-improving workflow automation platform** built on three core principles:

1. **Nodes as Services** - versioned, Moleculer-based services ready for horizontal scaling
2. **Dynamic Graphs** - workflows that mutate at runtime based on data and context
3. **Continuous Learning** - reflection layer that captures traces and drives evolution

## Moleculer Service Mesh Architecture

### Current Implementation (Sprint 1)

REFLUX uses **Moleculer** as its service mesh for node communication. Unlike monolithic workflow platforms (n8n, Make), nodes communicate via a service bus rather than direct function calls.

**Key Components:**

```
┌─────────────────────────────────────────────────────────┐
│  Worker (Temporal)                                      │
│  ┌───────────────────────────────────────────────┐     │
│  │ Moleculer CLIENT                              │     │
│  │ - nodeID: 'reflux-core-client'                │     │
│  │ - Calls: broker.call('1.0.0.nodes.http.       │     │
│  │   request.execute', params)                   │     │
│  └─────────────────┬─────────────────────────────┘     │
└────────────────────┼───────────────────────────────────┘
                     │
                     ▼
            ┌────────────────┐
            │  Redis (6379)  │ ← Moleculer Transport
            │  - Pub/Sub     │
            │  - RPC routing │
            └────────┬───────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────┐
│  Nodes Broker (packages/nodes)                        │
│  ┌──────────────────────────────────────────────┐    │
│  │ Moleculer SERVER                             │    │
│  │ - nodeID: 'reflux-nodes-{timestamp}'         │    │
│  │                                              │    │
│  │ Registered Services (all in ONE process):   │    │
│  │  ├─ 1.0.0.nodes.http.request                │    │
│  │  ├─ 1.0.0.nodes.transform.execute           │    │
│  │  ├─ 1.0.0.nodes.webhook.trigger             │    │
│  │  ├─ 1.0.0.nodes.condition.execute           │    │
│  │  ├─ 1.0.0.nodes.database.query              │    │
│  │  ├─ 1.0.0.nodes.email.send                  │    │
│  │  └─ 1.0.0.nodes.openai.chat                 │    │
│  │                                              │    │
│  │ RAM: ~50-100 MB (all 7 nodes)               │    │
│  └──────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────┘
```

**Service Registration Example:**

```typescript
// packages/nodes/src/index.ts
const broker = new ServiceBroker({
  nodeID: `reflux-nodes-${Date.now()}`,
  transporter: 'redis://localhost:6379',
});

// All nodes registered in ONE broker
broker.createService(HttpRequestNode);
broker.createService(TransformNode);
broker.createService(WebhookTriggerNode);
// ... etc

await broker.start();
```

**Service Call Example:**

```typescript
// packages/core/src/activities/execute-node.ts
import { callNode } from './moleculer-client';

export async function executeNode(args: ExecuteNodeArgs) {
  // Calls via Moleculer: "1.0.0.nodes.http.request.execute"
  const result = await callNode(
    args.node,      // "nodes.http.request"
    args.version,   // "1.0.0"
    args.params     // { url: "..." }
  );

  return result;
}
```

### Scaling Modes

#### Mode 1: Monolith (Current)

```
✅ ONE Node.js process
✅ ALL 7 nodes inside
✅ Moleculer used for versioning + future scalability
📊 RAM: ~50-100 MB
🎯 Use: Development, < 1,000 workflows/day
```

#### Mode 2: Grouped Microservices

```bash
# Terminal 1: HTTP nodes
NODES_FILTER="http,webhook" node dist/index.js

# Terminal 2: Transform nodes
NODES_FILTER="transform,condition" node dist/index.js

# Terminal 3: Integrations
NODES_FILTER="database,email,openai" node dist/index.js
```

```
✅ 3 Node.js processes
✅ Nodes grouped by type
✅ Moleculer auto-discovers all
📊 RAM: ~150-300 MB
🎯 Use: Production, 1,000-10,000 workflows/day
```

#### Mode 3: Full Microservices (Kubernetes)

```yaml
# Each node type in separate deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nodes-http
spec:
  replicas: 5
  template:
    spec:
      containers:
      - name: nodes
        image: reflux/nodes
        env:
        - name: NODES_FILTER
          value: "http,webhook"
        - name: TRANSPORTER
          value: "redis://redis:6379"
```

```
✅ N Docker containers
✅ Each node type independently scaled
✅ Moleculer routes calls automatically
📊 RAM: ~500-2000 MB (depends on replicas)
🎯 Use: High load, > 10,000 workflows/day
```

### Moleculer Benefits

1. **Service Discovery** - Nodes auto-discover each other via Redis
2. **Load Balancing** - Multiple instances balanced automatically
3. **Versioning** - `1.0.0.nodes.http` and `2.0.0.nodes.http` can coexist
4. **Zero Code Changes** - Scale from monolith to microservices without rewriting
5. **Health Checks** - Dead nodes automatically removed from registry
6. **Metrics** - Built-in tracing and metrics collection

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         REFLUX Platform                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Presentation Layer                    │   │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────────────┐   │   │
│  │  │ React Flow │  │   Monaco   │  │   REST API       │   │   │
│  │  │  Canvas    │  │   Editor   │  │  (FastAPI/TS)    │   │   │
│  │  └────────────┘  └────────────┘  └──────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  Orchestration Layer                     │   │
│  │  ┌────────────────────┐  ┌──────────────────────────┐   │   │
│  │  │  Temporal          │  │  Moleculer Service Bus   │   │   │
│  │  │  (Workflows)       │  │  (Node Discovery/RPC)    │   │   │
│  │  └────────────────────┘  └──────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Execution Layer                       │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌──────────┐   │   │
│  │  │  Node   │  │  Node   │  │  Meta   │  │  Code    │   │   │
│  │  │Registry │  │Executor │  │  Nodes  │  │  Runner  │   │   │
│  │  │(Catalog)│  │(Worker) │  │(Dynamic)│  │(Sandbox) │   │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └──────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   Reflection Layer                       │   │
│  │  ┌────────────┐  ┌────────────┐  ┌─────────────────┐    │   │
│  │  │   Tracer   │  │  Metrics   │  │   ClickHouse    │    │   │
│  │  │ (Collect)  │  │(Aggregate) │  │  (Time Series)  │    │   │
│  │  └────────────┘  └────────────┘  └─────────────────┘    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  Evolution Layer                         │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │   │
│  │  │  Critic  │  │Optimizer │  │Historian │  │ Forge  │  │   │
│  │  │(Diagnose)│  │  (Tune)  │  │ (Memory) │  │(GenAI) │  │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Storage Layer                         │   │
│  │  ┌─────────┐  ┌───────┐  ┌───────┐  ┌──────────────┐   │   │
│  │  │Postgres │  │ Redis │  │  S3/  │  │  pgvector    │   │   │
│  │  │(Catalog)│  │(Cache)│  │ MinIO │  │  (Search)    │   │   │
│  │  └─────────┘  └───────┘  └───────┘  └──────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Node Engine

**Responsibility**: Execute individual workflow steps with retries, timeouts, and caching

**Technology**: Temporal (orchestration) + Moleculer (service mesh)

**Key Features**:
- DAG execution with dependency resolution
- Automatic retries with exponential backoff
- Step-level caching based on input hashing
- Pause/resume/re-drive individual steps
- Version pinning and gradual rollout

### 2. Node Registry

**Responsibility**: Catalog of all available nodes with versioning

**Storage**: Postgres (metadata) + S3 (artifacts/code)

**Schema**:
```sql
CREATE TABLE nodes (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,  -- e.g., 'excel.toParquet'
  latest_version TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE node_versions (
  id UUID PRIMARY KEY,
  node_id UUID REFERENCES nodes(id),
  version TEXT NOT NULL,
  manifest JSONB NOT NULL,
  code_url TEXT,  -- S3 URL to packaged code
  status TEXT NOT NULL,  -- draft, staging, production, deprecated
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(node_id, version)
);

CREATE INDEX idx_node_versions_status ON node_versions(status);
```

### 3. Dynamic Graph Engine

**Responsibility**: Runtime DAG mutations and meta-nodes

**Meta-Nodes**:
- `meta.parallel` - spawn N parallel branches
- `meta.conditional` - if/else branching
- `meta.loop` - iterate over collection
- `ai.meta` - AI-generated subgraph

**Mutation API**:
```typescript
interface GraphMutation {
  type: 'add_step' | 'remove_step' | 'update_params' | 'replace_node';
  stepId: string;
  data: unknown;
}
```

### 4. Reflection Layer

**Responsibility**: Capture execution traces for learning

**Storage**: ClickHouse (time-series optimized)

**Schema**:
```sql
CREATE TABLE traces (
  run_id UUID,
  step_id String,
  node String,
  node_version String,
  status Enum('ok', 'error', 'timeout', 'cancelled'),
  start DateTime,
  end DateTime,
  latency_ms UInt32,
  inputs_hash String,
  metrics Map(String, Float64),
  error Nullable(String),
  retry_count UInt8,
  cache_hit Boolean,
  cost_tokens Nullable(UInt32),
  context Map(String, String)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(start)
ORDER BY (node, start);
```

### 5. Critic & Optimizer

**Responsibility**: Diagnose failures and tune performance

**Critic Logic**:
```python
class Critic:
    def analyze_failure(self, trace: TraceEvent) -> Diagnosis:
        # Pattern matching on error classes
        if trace.error.class == "TypeCast":
            return self._diagnose_typecast(trace)
        elif trace.error.class == "NetworkTimeout":
            return self._diagnose_network(trace)
        # ... more patterns

    def _diagnose_typecast(self, trace: TraceEvent) -> Diagnosis:
        # Check historical patterns
        similar = self.historian.find_similar_failures(trace)
        if similar:
            successful_fix = self.historian.get_successful_fix(similar)
            return Diagnosis(
                issue="Date format ambiguity",
                fix=successful_fix,
                confidence=0.85
            )
```

**Optimizer Logic**:
```python
class Optimizer:
    def tune_parameters(self, node: str, runs: List[TraceEvent]):
        # Bayesian optimization over parameter space
        best_params = bayesian_search(
            objective=lambda p: self._score_params(p, runs),
            space=self._get_param_space(node)
        )
        return best_params
```

### 6. Historian

**Responsibility**: Store and retrieve successful patterns

**Storage**: Postgres (relational) + pgvector (similarity search)

**Schema**:
```sql
CREATE TABLE patterns (
  id UUID PRIMARY KEY,
  node TEXT NOT NULL,
  context_vector vector(384),  -- Embedding of context
  success_rate FLOAT,
  avg_latency_ms FLOAT,
  parameter_config JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_patterns_vector ON patterns USING ivfflat (context_vector);
```

### 7. Node Forge

**Responsibility**: AI-powered node generation

**Inputs**: Natural language description or OpenAPI spec

**Process**:
1. Parse intent and extract I/O schema
2. Generate code (Python/TypeScript)
3. Generate unit tests
4. Execute in sandbox (code.run)
5. Validate against schema
6. Register in catalog as draft
7. Promote to staging after manual review

**Example**:
```python
forge.create_node(
    description="Convert CSV to Parquet with column type inference",
    examples=[
        {"input": "data.csv", "output": "data.parquet", "rows": 1000}
    ]
)
# → Generates node manifest + code + tests
# → Runs in sandbox
# → Registers as csv.toParquet@0.1.0-draft
```

### 8. Code Runner (Sandbox)

**Responsibility**: Isolated execution of user code

**Technology**: Docker + gVisor (for extra isolation)

**API**:
```typescript
interface CodeRunRequest {
  lang: 'python' | 'node' | 'bash';
  entry: string;  // main.py, index.js, etc.
  code: string | { s3Url: string };
  inputs: Array<{ name: string; url: string }>;  // Files from S3
  packages: string[];  // Dependencies
  limits: {
    cpu: number;  // vCPUs
    memMb: number;
    timeoutSec: number;
    network: 'off' | 'limited' | 'full';
  };
}

interface CodeRunResult {
  status: 'ok' | 'error' | 'timeout';
  outputs: Array<{ name: string; url: string }>;
  logs: string;
  metrics: {
    duration_ms: number;
    peak_mem_mb: number;
    exit_code: number;
  };
}
```

## Data Flow

### Workflow Execution

```
1. User submits workflow (YAML/JSON)
   ↓
2. API validates against schema
   ↓
3. Temporal workflow created
   ↓
4. For each step:
   a. Check cache (Redis)
   b. If miss, invoke node via Moleculer
   c. Node executes in Docker container
   d. Result stored in S3
   e. Trace event sent to ClickHouse
   f. Cache result (Redis)
   ↓
5. Workflow completes or fails
   ↓
6. Critic analyzes traces
   ↓
7. If patterns found, suggest improvements
   ↓
8. Optimizer tunes parameters
   ↓
9. Historian stores successful config
```

### Self-Improvement Loop

```
Every N runs or on schedule:

1. Critic scans recent traces
   ↓
2. Identifies degradations or recurring errors
   ↓
3. Queries Historian for similar contexts
   ↓
4. Proposes mutations (param changes, node swaps)
   ↓
5. Validates in staging (shadow traffic)
   ↓
6. Measures improvement (A/B test)
   ↓
7. If better, promotes to production
   ↓
8. Updates Historian with new pattern
```

## Security

### Secrets Management
- Vault/KMS for sensitive data
- Secrets never in logs or traces
- Scoped access per workflow/tenant

### Isolation
- Nodes run in separate containers
- Network disabled by default for code.run
- Resource limits (CPU/memory/time)

### Validation
- Input/output schema validation (Zod/Pydantic)
- SQL injection prevention (parameterized queries)
- Rate limiting per tenant/node

## Observability

### Metrics
- **Node-level**: latency, error_rate, throughput, cache_hit_rate
- **Workflow-level**: duration, cost, quality_score
- **System-level**: CPU, memory, disk, network

### Dashboards
- Node reliability matrix (heatmap)
- Top failures by error class
- Cost breakdown by node
- Performance trends over time

### Alerts
- SLO violations (latency > p99, error_rate > 1%)
- Cost budget exceeded
- Quality degradation detected

## Deployment

### Local Development
```bash
docker-compose up -d  # Postgres, Redis, MinIO, ClickHouse, Temporal
npm run dev           # Start all services
```

### Production (Kubernetes)
- StatefulSets for Postgres, Redis, ClickHouse
- Deployments for API, workers, UI
- HPA for auto-scaling workers
- Persistent volumes for S3-compatible storage

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Workflow start latency | < 100ms | Cold start |
| Step execution overhead | < 50ms | Cache check + routing |
| Cache hit latency | < 10ms | Redis lookup |
| Trace ingestion | > 10k events/sec | ClickHouse batch insert |
| Node generation | < 60s | Forge creates + validates |

## Scalability

- **Horizontal**: Add more Temporal workers
- **Vertical**: Larger code.run containers for heavy workloads
- **Sharding**: Partition workflows by tenant/region
- **Caching**: Multi-layer (Redis → S3 → recompute)

## Future Enhancements

1. **Federated Learning** - nodes learn across tenants (privacy-preserving)
2. **AutoML Integration** - optimize hyperparameters with RL
3. **Visual Programming** - drag-drop canvas with AI suggestions
4. **Marketplace** - community-contributed nodes
5. **Multi-Cloud** - run nodes across AWS/GCP/Azure
