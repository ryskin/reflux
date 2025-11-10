# REFLUX Sprint Plan

8-sprint roadmap to build self-improving workflow automation platform.

## Sprint 1: Core Execution (Week 1-2) ✅ TASKS CREATED

**Goal**: Basic workflow orchestration with re-drive capability

**Tasks** (7 tasks created in ng):
1. ✅ Set up Temporal development environment
2. ✅ Implement core workflow execution engine
3. ✅ Create Moleculer service bus for node discovery
4. ✅ Build database schema for flows and runs
5. ✅ Implement basic nodes (webhook, http, transform)
6. ✅ Build minimal UI with React Flow canvas
7. ✅ Create REST API service for workflow management
8. ✅ End-to-end test: webhook→transform→webhook_out flow

**Definition of Done**:
- ✅ Temporal workflows execute DAGs
- ✅ Moleculer nodes register and respond via RPC
- ✅ Postgres stores flows/runs with versioning
- ✅ 4 basic nodes work (webhook trigger, HTTP, transform, webhook out)
- ✅ UI shows flow canvas and run logs
- ✅ Can re-drive individual steps without full restart

**Deliverables**:
- Working monorepo with turbo
- Docker compose with all infrastructure
- Core packages: `@reflux/core`, `@reflux/nodes`
- Services: `api`, `ui`
- Comprehensive architecture docs
- Getting started tutorial

---

## Sprint 2: Storage & Tracing (Week 3-4)

**Goal**: Observability and artifact management

**Tasks**:
1. Set up MinIO for artifact storage
2. Implement S3 upload/download nodes
3. Set up ClickHouse for trace collection
4. Build trace event emitter middleware
5. Create retry policy engine
6. Implement idempotency via input hashing
7. Add step-level caching (Redis)
8. Build metrics dashboard (Grafana)

**Definition of Done**:
- Workflows store artifacts in S3
- All node executions emit traces to ClickHouse
- Retry policies configurable per node
- Idempotent operations skip duplicate work
- Can query traces by run_id, node, time range
- Dashboard shows node reliability metrics

---

## Sprint 3: Tabular Tools (XLS/CSV) (Week 5-7)

**Goal**: Enable data processing workflows

**Tasks**:
1. Create `@reflux/tabular` package with DuckDB
2. Implement `excel.inspect` - analyze sheets/structure
3. Implement `excel.toParquet` - streaming conversion
4. Implement `excel.find_tables` - auto-detect tables
5. Implement `table.profile` - column types/stats
6. Implement `table.sql` - DuckDB query executor
7. Implement `table.validate` - schema validation
8. Implement `table.export` - CSV/JSON export
9. Build XLS QA agent demo workflow
10. Performance test: 300MB XLSB file

**Definition of Done**:
- Can process Excel/XLSB files 100-300MB
- Streaming conversion to Parquet (no full load to RAM)
- SQL queries via DuckDB over Parquet
- XLS QA agent answers questions about data
- Returns source attribution (sheet/range/SQL)

**Demo Workflow**:
```yaml
name: xls_qa_agent
input: { file_url, question, callback }
steps:
  1. excel.inspect → sheets
  2. excel.find_tables → ranked tables
  3. table.profile → column types
  4. excel.toParquet → convert
  5. sql.plan → generate SQL
  6. table.sql → execute
  7. webhook.out → deliver answer + SQL
```

---

## Sprint 4: Dynamic Graph & Meta-nodes (Week 8-9)

**Goal**: Runtime DAG mutations

**Tasks**:
1. Design graph mutation API
2. Implement `meta.parallel` - spawn N branches
3. Implement `meta.conditional` - if/else logic
4. Implement `meta.loop` - iterate collections
5. Implement `ai.meta` - AI-generated subgraph (rule-based MVP)
6. Add Temporal signals for runtime mutations
7. Build step dependency resolver
8. Add workflow pause/resume
9. E2E test: dynamic branch creation

**Definition of Done**:
- Meta-nodes create child steps at runtime
- Workflow DAG can mutate during execution
- Parallel branches execute independently
- Can pause workflow, modify graph, resume
- No restarts required for graph changes

---

## Sprint 5: Reflection Layer (Week 10-12)

**Goal**: Automated failure analysis

**Tasks**:
1. Build trace aggregation service
2. Implement error classification (TypeCast, Network, Validation, etc.)
3. Create pattern matcher for recurring failures
4. Build auto-fix library (date parsing, type coercion, etc.)
5. Implement Critic service
6. Add mutation proposals API
7. Build post-mortem UI
8. Auto-apply fixes on repeated errors

**Definition of Done**:
- System detects recurring error patterns
- Critic proposes fixes with confidence scores
- Auto-fixes applied for common errors (date formats, encoding)
- Post-mortem shows failure chain and root cause
- Fixes persisted and reused across workflows

**Auto-Fixes**:
- Date format ambiguity → add locale hint
- Encoding errors → try UTF-8/Latin1/CP1252
- Type mismatches → add coercion step
- Network timeouts → increase retry backoff

---

## Sprint 6: Critic/Optimizer/Historian (Week 13-15)

**Goal**: Self-tuning system

**Tasks**:
1. Build Historian database (patterns + pgvector)
2. Implement similarity search for contexts
3. Create Optimizer service (Bayesian search)
4. Auto-tune parameters (batch size, sample rate, retries)
5. Build A/B testing framework for mutations
6. Implement gradual rollout (canary deployments)
7. Add performance regression detection
8. Build recommendation engine

**Definition of Done**:
- System tunes node parameters automatically
- Detects performance regressions within 1 hour
- Recommends alternative nodes for failures
- A/B tests show measurable improvements
- Successful configs stored in Historian

**Optimization Targets**:
- Minimize latency (p95, p99)
- Minimize cost (tokens, compute)
- Maximize quality (user-defined metrics)
- Balance speed vs accuracy

---

## Sprint 7: Node Forge (MVP) (Week 16-18)

**Goal**: AI-powered node generation

**Tasks**:
1. Build code generation prompt templates
2. Implement OpenAPI → node converter
3. Create sandbox executor (code.run)
4. Add test generation from examples
5. Build validation pipeline
6. Implement version management
7. Add staging → production promotion
8. Build node marketplace UI

**Definition of Done**:
- Can generate node from description or OpenAPI spec
- Generated code runs in sandbox
- Auto-generated tests validate I/O
- Nodes register in catalog as draft
- Manual review + promotion to production

**Example**:
```
User: "Create a Stripe payment node"
→ Forge fetches Stripe OpenAPI spec
→ Generates TypeScript service
→ Generates unit tests
→ Validates in sandbox
→ Registers as stripe.createCharge@0.1.0-draft
```

---

## Sprint 8: Intelligent Agent (Week 19-20)

**Goal**: Natural language workflow creation

**Tasks**:
1. Integrate mini-LLM (Mistral/Phi-3)
2. Build task parser (NL → workflow spec)
3. Implement field mapper (auto-match columns)
4. Create budget tracker (token/cost limits)
5. Build safe SQL planner (injection prevention)
6. Implement self-improvement loop
7. Add feedback collection
8. E2E demo: XLS agent with learning

**Definition of Done**:
- User asks question in natural language
- System generates workflow spec
- Maps Excel columns to query fields
- Executes safely with budget limits
- Learns from failures (Critic + Historian)
- Improves over repeated queries

**Self-Improvement Cycle**:
```
1. Execute (run workflow with current strategy)
2. Evaluate (measure quality/cost/latency)
3. Reflect (analyze what failed and why)
4. Mutate (replace nodes, tune params, add steps)
5. Validate (test mutation in sandbox)
6. Promote (deploy if better)
7. Repeat (continuous learning)
```

---

## Success Metrics

### Technical Metrics
- **Workflow start latency**: < 100ms (cold)
- **Step overhead**: < 50ms (routing + cache)
- **Trace ingestion**: > 10k events/sec
- **Node reliability**: > 99% success rate
- **Cache hit rate**: > 60% on repeated inputs

### Business Metrics
- **Time to workflow creation**: < 5 min (vs 30 min in n8n)
- **Auto-fix success rate**: > 70% for common errors
- **Cost reduction**: 40% via optimization
- **Developer productivity**: 3x faster integration development

### Learning Metrics
- **Pattern recognition**: Identify recurring failures within 10 runs
- **Auto-tuning improvement**: 20%+ latency reduction
- **Node generation quality**: 80%+ tests pass on first try
- **Self-healing coverage**: 50% of failures auto-fixed

---

## Technology Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Orchestration | Temporal | Workflow execution, retries, state |
| Service Mesh | Moleculer | Node discovery, RPC, load balancing |
| Catalog | PostgreSQL | Flows, runs, nodes, versions |
| Traces | ClickHouse | Time-series execution data |
| Cache | Redis | Idempotency, rate limits, hot data |
| Storage | MinIO/S3 | Artifacts, code packages |
| Search | pgvector | Pattern similarity, recommendations |
| Tabular | DuckDB | In-process SQL over Parquet |
| Compute | Docker/gVisor | Isolated code execution |
| UI | Next.js + React Flow | Visual workflow editor |
| AI | Mistral/Phi-3 | Task parsing, code generation |

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| Large XLSB files crash | High | High | Streaming processing, memory limits |
| LLM hallucinations | Medium | High | Sandboxed execution, validation |
| Temporal performance | Low | Medium | Horizontal scaling, sharding |
| Schema drift | Medium | Low | Strict versioning, migrations |
| Node compatibility | Medium | Medium | Semver, gradual rollout |

---

## Current Status

**Sprint 1**: ✅ READY TO START
- All tasks created in ng task manager
- Project structure initialized
- Docker compose configured
- Documentation complete

**Next Steps**:
1. Start first task: "Set up Temporal development environment"
2. Run `docker-compose up -d` in `infra/docker`
3. Implement Temporal workflow executor
4. Build node execution activities
5. Test simple 3-step flow

**Command to Start**:
```bash
cd /Users/ar/code/reflux
npm install
cd infra/docker
docker-compose up -d
cd ../../packages/core
npm run worker
```
