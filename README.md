# REFLUX

<div align="center">

**Self-improving workflow automation platform with dynamic DAG execution and AI-powered optimization**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![Status](https://img.shields.io/badge/Status-Alpha-orange.svg)]()

</div>

---

## 🎯 What is REFLUX?

REFLUX is not just another workflow orchestrator. It's a **self-learning system** that creates, analyzes, and optimizes workflows autonomously.

### The Core Idea

Traditional workflow tools (n8n, Make, Zapier) are like **LEGO** - you manually connect pre-built blocks and hope they work. If something breaks, you debug it yourself. If performance is slow, you tune it yourself. If you need a new integration, you wait for someone to build it.

**REFLUX is different.** It's like a **living organism** that:
- 🧠 **Learns from failures** - Analyzes execution traces and adapts automatically
- 🔄 **Mutates at runtime** - Workflows evolve based on data and context
- 🚀 **Generates nodes on demand** - AI-powered node creation from descriptions
- ⚖️ **Scales effortlessly** - Moleculer service mesh for microservices architecture
- 📊 **Processes data efficiently** - Built-in DuckDB for 100-300MB Excel/CSV files

### Why This Matters

Imagine you have a workflow that processes invoices:
1. **With n8n**: Workflow fails → you check logs → you fix the node → you redeploy → repeat
2. **With REFLUX**: Workflow fails → system analyzes the error → suggests fix or alternative node → tests it → auto-deploys if it works

After 100 executions, REFLUX knows:
- Which API endpoints are slow and retries them automatically
- Which data transformations fail and uses alternative approaches
- Which file formats cause issues and converts them proactively
- Which batch sizes are optimal for your data

**REFLUX doesn't just execute workflows - it makes them better over time.**

## ✨ Key Features

### Self-Improvement Engine
- **Reflection Layer**: Every execution leaves traces for learning
- **Critic**: Diagnoses failures and suggests improvements
- **Optimizer**: Auto-tunes parameters (batch size, retries, timeouts)
- **Historian**: Remembers successful patterns and reuses them

### Dynamic Workflows
- **Runtime Mutations**: Add/remove nodes during execution
- **Parallel Spawning**: Automatically parallelizes based on data
- **Node Versioning**: Run multiple versions simultaneously, A/B test changes
- **Self-Healing**: Replace failing nodes with alternatives

### Modern Architecture
- **Moleculer Service Mesh**: Start as monolith, scale to microservices without code changes
- **Temporal Orchestration**: Reliable, durable workflow execution
- **Visual Canvas**: React Flow-based drag-and-drop interface
- **Type-Safe**: Full TypeScript with strict mode

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- npm 10+

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/reflux.git
cd reflux

# Install dependencies
npm install

# Start infrastructure services (PostgreSQL, Redis, Temporal, etc.)
cd infra/docker
docker-compose up -d

# Return to root
cd ../..

# Start development servers
npm run dev
```

### Access Points

| Service | URL | Description |
|---------|-----|-------------|
| **UI** | http://localhost:3002 | Visual workflow builder |
| **API** | http://localhost:4000 | REST API |
| **Temporal UI** | http://localhost:8080 | Workflow monitoring |

### Your First Workflow

**Option 1: Using the UI**
1. Open http://localhost:3002
2. Navigate to "Flows" → "Create New"
3. Add nodes from the catalog
4. Connect them visually
5. Click "Execute"

**Option 2: Using the API**

```bash
# Create a simple HTTP workflow
curl -X POST http://localhost:4000/api/flows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my_first_flow",
    "spec": {
      "steps": [
        {
          "id": "fetch",
          "node": "http.request",
          "with": {"url": "https://api.github.com/users/github"}
        }
      ]
    }
  }'

# Execute the workflow
curl -X POST http://localhost:4000/api/flows/{FLOW_ID}/execute

# Check execution status
curl http://localhost:4000/api/runs
```

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFLUX Platform                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │   UI     │  │   API    │  │  Worker  │             │
│  │ Next.js  │  │ Express  │  │ Temporal │             │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘             │
│       │             │             │                    │
│       │             ▼             ▼                    │
│       │      ┌─────────────────────────┐               │
│       │      │   Moleculer Service     │               │
│       │      │   Bus (Nodes)           │               │
│       │      └─────────────────────────┘               │
│       │             │                                  │
│       └─────────────┼──────────┐                       │
│                     ▼          ▼                       │
│              ┌──────────┐  ┌──────────┐               │
│              │PostgreSQL│  │  Redis   │               │
│              └──────────┘  └──────────┘               │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │     Reflection Layer (ClickHouse Traces)         │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Tech Stack

| Component | Technology |
|-----------|-----------|
| **Orchestration** | Temporal |
| **Service Mesh** | Moleculer |
| **Database** | PostgreSQL + Kysely ORM |
| **Cache** | Redis |
| **Storage** | MinIO (S3-compatible) |
| **Traces** | ClickHouse |
| **Tabular Processing** | DuckDB + Parquet |
| **UI** | Next.js 14 + React Flow |
| **API** | Express.js |
| **Types** | TypeScript (strict) |
| **Monorepo** | npm workspaces + Turborepo |

## 🧩 Available Nodes

### Core Nodes (Sprint 1)
- `webhook.trigger` - Accept HTTP webhooks
- `http.request` - Make HTTP calls (GET, POST, PUT, DELETE)
- `transform.execute` - JavaScript data transformation

### Data Processing (Sprint 3)
- `excel.inspect` - Analyze Excel/CSV files
- `excel.toParquet` - Convert to Parquet format
- `table.sql` - Run SQL queries on tabular data
- `table.export` - Export to various formats

### AI & ML (Sprint 7-8)
- `openai.chat` - GPT integration
- `ai.meta` - Meta-planning with LLM
- `embed.text` - Text embeddings

## 📊 Comparison with Alternatives

| Feature | REFLUX | n8n | Airflow | Zapier |
|---------|--------|-----|---------|--------|
| **Node Versioning** | ✅ A/B testing | ❌ | ❌ | ❌ |
| **Runtime Mutations** | ✅ Dynamic | ❌ Static | ❌ Static | ❌ Static |
| **Self-Learning** | ✅ Reflection layer | ❌ | ❌ | ❌ |
| **Microservices** | ✅ Moleculer | ❌ Monolith | ✅ Heavy | ☁️ Cloud |
| **Visual UI** | ✅ React Flow | ✅ | ❌ Code-only | ✅ |
| **Self-Hosted** | ✅ Open source | ✅ | ✅ | ❌ SaaS |
| **Memory Usage** | 1-4 GB | 1-2 GB | 4-8 GB | N/A |
| **AI Node Generation** | 🚧 Planned | ❌ | ❌ | ❌ |

### Why REFLUX?

**vs n8n/Make**
- Moleculer service mesh - nodes can scale independently
- Versioned nodes - run multiple versions simultaneously
- Workflows mutate at runtime - dynamic graph changes
- System learns from failures - reflection layer

**vs Airflow**
- 10x lighter - ~1GB RAM vs Airflow's 4-8GB
- No Spark/Hadoop - runs on a laptop
- Visual canvas - Airflow is code-only
- Moleculer vs Celery - simpler, faster service mesh

**vs Zapier**
- Open source - full control, self-hosted
- Unlimited complexity - no workflow limits
- Custom nodes - write in any language
- Cost effective - no per-execution pricing

## 📁 Project Structure

```
reflux/
├── packages/
│   ├── core/           # Workflow engine, database, client
│   ├── nodes/          # Node implementations
│   ├── api/            # REST API service
│   ├── ui/             # Next.js UI with React Flow
│   ├── forge/          # AI-powered node generation (planned)
│   ├── reflection/     # Trace collection (planned)
│   ├── optimizer/      # Self-tuning (planned)
│   └── runner/         # Sandboxed execution (planned)
├── services/
│   ├── worker/         # Temporal workers (planned)
│   └── registry/       # Node version registry (planned)
├── infra/
│   └── docker/         # Docker Compose services
├── docs/               # Documentation
├── examples/           # Example workflows
├── test-e2e.sh         # End-to-end test script
├── QUICK_START.md      # Quick start guide
├── CURRENT_STATUS.md   # Current implementation status
└── PROJECT_SUMMARY.md  # Detailed project overview
```

## 🗺 Development Roadmap

### ✅ Sprint 1: Core Execution (Complete)
- Temporal + Moleculer integration
- PostgreSQL catalog with Kysely ORM
- REST API with Express
- Visual UI with React Flow
- Basic nodes (webhook, HTTP, transform)
- End-to-end test script

### 🚧 Sprint 2: Storage & Tracing (In Progress)
- MinIO artifact storage
- ClickHouse trace collection
- Retry policies and idempotency
- Complete Temporal worker integration
- Real workflow execution

### 📋 Sprint 3: Tabular Tools
- DuckDB-based data processing
- Excel/CSV inspection and conversion
- SQL queries over data
- Handle 100-300MB files efficiently

### 📋 Sprint 4: Dynamic Graphs
- Runtime DAG mutations
- Parallel node spawning
- Meta-planning nodes
- Step-level caching

### 📋 Sprint 5-6: Self-Improvement
- Reflection layer implementation
- Critic/Optimizer/Historian agents
- Auto-fix common errors
- Pattern recognition from execution history

### 📋 Sprint 7-8: AI-Powered Evolution
- Node generation from descriptions
- OpenAPI spec parsing
- Natural language workflows
- Autonomous optimization loop

## 🛠 Development

### Development Commands

```bash
# Install dependencies
npm install

# Start all services in development mode
npm run dev

# Build all packages
npm run build

# Run type checking
npm run typecheck

# Run linting
npm run lint

# Run tests
npm test

# Run end-to-end test
./test-e2e.sh

# Clean all build artifacts
npm run clean
```

### Package-Specific Scripts

```bash
# Work on API service
cd packages/api
npm run dev

# Work on UI
cd packages/ui
npm run dev

# Work on core engine
cd packages/core
npm run build
```

### Database Operations

```bash
# Run migrations
cd packages/core
npm run migrate

# Seed test data
npm run seed
```

## 🧪 Testing

```bash
# Run the full end-to-end test
./test-e2e.sh

# Expected output:
# ✓ API server running at http://localhost:4000
# ✓ UI server running at http://localhost:3002
# ✓ Created test flow: {uuid}
# ✓ Flow verified: e2e_test_flow
# ✓ Found N flow(s) in database
# ✓ Found N node(s) registered
# ✓ Found N run(s) in history
```

## 🐳 Docker Services

The `infra/docker/docker-compose.yml` includes:

```yaml
Services:
  - PostgreSQL:5432     # Main database
  - Redis:6379          # Cache & pub/sub
  - Temporal:7233       # Workflow server
  - Temporal UI:8080    # Workflow monitoring
  - ClickHouse:8123     # Trace analytics
  - MinIO:9000/9001     # S3-compatible storage
```

Start/stop services:
```bash
cd infra/docker
docker-compose up -d        # Start all services
docker-compose ps           # Check status
docker-compose logs -f      # View logs
docker-compose down         # Stop all services
```

## 🔧 Configuration

### Environment Variables

Create `.env` files in each package as needed:

```bash
# packages/api/.env
DATABASE_URL=postgresql://reflux:reflux@localhost:5432/reflux
REDIS_URL=redis://localhost:6379
PORT=4000

# packages/ui/.env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## 📖 Documentation

- [QUICK_START.md](./QUICK_START.md) - Quick start guide
- [CURRENT_STATUS.md](./CURRENT_STATUS.md) - Current implementation status
- [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) - Detailed project overview
- [SPRINT_1_COMPLETE.md](./SPRINT_1_COMPLETE.md) - Sprint 1 completion report

## 🐛 Current Limitations

As of Sprint 1 completion:

- **Workflow Execution**: Temporal worker integration not yet complete (Sprint 2)
- **Node Execution**: Nodes are registered but don't execute through workers yet
- **Webhook Server**: Trigger structure in place but needs HTTP server
- **Storage**: MinIO integration pending
- **Tracing**: ClickHouse integration pending

See [CURRENT_STATUS.md](./CURRENT_STATUS.md) for detailed status.

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Commit your changes (`git commit -m 'feat: add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Commit Convention

We follow conventional commits:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Test additions or changes
- `chore:` - Build process or tooling changes

## 💡 Use Cases

### XLS Agent (MVP Demo)
"Analyze Q2 revenue by region from this messy Excel file"
→ Auto-detects sheets, maps columns, runs SQL, exports CSV

### Deep Research
"Find all mentions of topic X across 100 PDFs"
→ Dynamically adds parallel processing nodes, indexes, searches

### Video Meta-Planning
"Create marketing video from script"
→ Generates scenes in parallel, auto-retries failed renders, adapts timeline

## 📈 System Requirements

### Minimal (Development)
- **CPU**: 2 cores
- **RAM**: 2 GB
- **Disk**: 10 GB
- **Workloads**: Development, < 100 workflows/day

### Recommended (Production - Monolith)
- **CPU**: 4 cores
- **RAM**: 4 GB
- **Disk**: 20 GB
- **Workloads**: < 1,000 workflows/day

### High Load (Production - Microservices)
- **CPU**: 8+ cores
- **RAM**: 8-16 GB
- **Disk**: 50 GB
- **Workloads**: 1,000-10,000 workflows/day

## 📜 License

MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

Built with excellent open source tools:
- [Temporal](https://temporal.io/) - Durable workflow execution
- [Moleculer](https://moleculer.services/) - Microservices framework
- [React Flow](https://reactflow.dev/) - Visual workflow builder
- [Kysely](https://kysely.dev/) - Type-safe SQL query builder
- [DuckDB](https://duckdb.org/) - Fast analytical database
- [Next.js](https://nextjs.org/) - React framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety

## 🌟 Status

**Current Phase**: Sprint 1 Complete ✅

- ✅ Core architecture established
- ✅ Database schema and repositories
- ✅ REST API functional
- ✅ Visual UI with React Flow
- ✅ Basic node catalog
- 🚧 Workflow execution in progress (Sprint 2)

---

<div align="center">

**REFLUX** - Workflows that learn and evolve

*Star this repo if you find it interesting!* ⭐

</div>
# reflux
