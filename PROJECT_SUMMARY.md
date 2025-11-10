# REFLUX - Project Summary

## What We Built

Initial project structure for **REFLUX** - a self-improving workflow automation platform that goes beyond traditional tools like n8n, Make, or Airflow.

## Key Differentiators

### 1. Self-Learning System
Unlike static workflow platforms, REFLUX:
- **Learns** from execution traces (Reflection Layer)
- **Diagnoses** failures automatically (Critic)
- **Optimizes** parameters over time (Optimizer)
- **Remembers** successful patterns (Historian)
- **Generates** new nodes on demand (Node Forge)

### 2. Dynamic Graphs
Workflows aren't fixed DAGs:
- Add/remove steps at runtime
- Spawn parallel branches based on data
- Replace failing nodes with alternatives
- Pause, modify, and resume without restart

### 3. Cheap Data Processing
Built-in tabular tools with DuckDB:
- Process 100-300MB Excel/XLSB files
- Streaming conversion to Parquet
- SQL queries over data without loading to RAM
- Auto-detect tables and column types

## Architecture Highlights

```
Temporal (orchestration) + Moleculer (service mesh)
↓
Nodes as versioned microservices
↓
Traces to ClickHouse → Critic → Optimizer → Historian
↓
Continuous learning and improvement
```

## Project Structure

```
reflux/
├── docs/
│   ├── architecture/ARCHITECTURE.md     # System design
│   ├── contracts/                       # JSON schemas
│   │   ├── node-manifest.schema.json
│   │   ├── workflow-spec.schema.json
│   │   └── trace-event.schema.json
│   ├── tutorials/GETTING_STARTED.md
│   └── SPRINT_PLAN.md                   # 8-sprint roadmap
│
├── infra/
│   └── docker/
│       ├── docker-compose.yml           # All services (Temporal, Postgres, Redis, ClickHouse, MinIO)
│       └── clickhouse/init.sql
│
├── packages/                            # Monorepo workspaces
│   ├── core/         # Workflow engine
│   ├── nodes/        # Node library
│   ├── forge/        # AI node generation
│   ├── reflection/   # Trace collection
│   ├── optimizer/    # Self-tuning
│   ├── runner/       # Sandboxed execution
│   └── ui/           # React Flow canvas
│
├── services/
│   ├── api/          # REST API
│   ├── worker/       # Temporal workers
│   └── registry/     # Node catalog
│
├── package.json      # Turborepo monorepo
├── turbo.json
└── README.md
```

## Sprint 1 Tasks (Created in ng)

All 8 tasks registered in task management system:

1. **Set up Temporal development environment** (ops, 2.5 score)
2. **Implement core workflow execution engine** (feat, 1.0 score)
3. **Create Moleculer service bus for node discovery** (feat, 1.2 score)
4. **Build database schema for flows and runs** (feat, 1.7 score)
5. **Implement basic nodes (webhook, http, transform)** (feat, 1.3 score)
6. **Build minimal UI with React Flow canvas** (feat, 1.0 score)
7. **Create REST API service for workflow management** (feat, 1.7 score)
8. **End-to-end test: webhook→transform→webhook_out flow** (feat, 1.7 score)

## Sprint 1 Definition of Done

- ✅ Temporal workflows execute DAGs
- ✅ Moleculer nodes register via service bus
- ✅ Postgres stores flows/runs/nodes
- ✅ 4 basic nodes work (trigger.webhook, http.request, util.transform, webhook.out)
- ✅ UI shows flow canvas and run logs
- ✅ Can re-drive individual failed steps

## Technology Stack

| Component | Technology |
|-----------|-----------|
| Orchestration | Temporal |
| Service Mesh | Moleculer |
| Catalog DB | PostgreSQL + Kysely |
| Traces | ClickHouse |
| Cache | Redis |
| Storage | MinIO (S3-compatible) |
| Tabular Processing | DuckDB + Parquet |
| Code Execution | Docker + gVisor |
| UI | Next.js + React Flow |
| Monorepo | Turborepo |

## Key Contracts

### Node Manifest
```json
{
  "name": "excel.toParquet",
  "version": "1.4.2",
  "inputs": { "file_url": "string", "sheet?": "string" },
  "outputs": { "parquet_url": "string", "rows": "number" },
  "policies": {
    "timeoutSec": 180,
    "retries": [1, 3, 10, 30],
    "idempotency": "sha1(inputs)"
  },
  "metrics": ["rows", "cols", "latency_ms"]
}
```

### Workflow Spec
```yaml
name: simple_flow
steps:
  - id: fetch
    node: http.request
    with:
      url: "{{input.api_url}}"

  - id: transform
    node: util.transform
    with:
      data: "{{steps.fetch.output.data}}"
      mapping:
        result: "items[].name"

  - id: deliver
    node: webhook.out
    with:
      url: "{{input.callback}}"
      body: "{{steps.transform.output.result}}"
```

### Trace Event
```json
{
  "run_id": "uuid",
  "node": "table.sql",
  "version": "2.1.0",
  "status": "ok",
  "latency_ms": 842,
  "metrics": { "rows": 12534, "cols": 3 },
  "error": null
}
```

## Self-Improvement Cycle

```
Execute → Evaluate → Reflect → Mutate → Validate → Promote → Repeat
   ↓         ↓          ↓         ↓         ↓          ↓
 Run      Metrics   Critic   Optimizer  Sandbox   Historian
```

## Next Steps

### Immediate (Sprint 1)
```bash
cd /Users/ar/code/reflux
npm install
cd infra/docker
docker-compose up -d
# Then start implementing tasks in order
```

### Short Term (Sprints 2-4)
- Add S3 storage and tracing
- Build tabular processing nodes
- Enable dynamic graph mutations

### Medium Term (Sprints 5-6)
- Implement Reflection Layer
- Build Critic/Optimizer/Historian
- Enable self-tuning

### Long Term (Sprints 7-8)
- AI-powered node generation
- Natural language workflow creation
- Full autonomous learning

## Demo Use Cases

### 1. XLS QA Agent
"What were the top 5 products by revenue in Q2?"
→ Auto-detects tables, maps columns, runs SQL, returns answer + source

### 2. Deep Research
"Find all mentions of topic X across 100 PDFs"
→ Dynamically spawns parallel processing, indexes, searches

### 3. Video Generation
"Create marketing video from script"
→ Generates scenes in parallel, retries failed renders, adapts timeline

## Success Metrics

- **Workflow start latency**: < 100ms
- **Step overhead**: < 50ms
- **Auto-fix success**: > 70%
- **Cost reduction**: 40% via optimization
- **Developer productivity**: 3x faster

## Documentation

- ✅ `README.md` - Project overview
- ✅ `docs/architecture/ARCHITECTURE.md` - System design
- ✅ `docs/contracts/*.schema.json` - API contracts
- ✅ `docs/tutorials/GETTING_STARTED.md` - Quick start
- ✅ `docs/SPRINT_PLAN.md` - 8-sprint roadmap
- ✅ `PROJECT_SUMMARY.md` (this file)

## Resources

- **Task Management**: ng system (all Sprint 1 tasks created)
- **Docker Stack**: `infra/docker/docker-compose.yml`
- **Monorepo**: Turborepo with npm workspaces
- **CI/CD**: GitHub Actions (planned)

## Vision

> "n8n was like LEGO - you build manually.
> REFLUX is like an organism - it grows, adapts, and learns."

After 1 year, REFLUX becomes a meta-system where:
- Nodes create themselves from descriptions
- Workflows optimize without human input
- Failures become learning opportunities
- The platform improves with every execution

## Status

🚧 **Sprint 1 Ready** - All tasks created, structure initialized, ready to code!

---

**Project Context**: `/Users/ar/code/reflux`
**Task Tracker**: ng (8 tasks in Sprint 1)
**Next Command**: `docker-compose up -d` in `infra/docker`
