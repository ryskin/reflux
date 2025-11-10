# REFLUX System Requirements

## Overview

REFLUX is designed to be **lightweight and scalable**. You can start with minimal resources and scale horizontally as needed WITHOUT rewriting code, thanks to the Moleculer service mesh architecture.

## Quick Comparison

| Platform | Min RAM | Production RAM | Architecture |
|----------|---------|----------------|--------------|
| **REFLUX (monolith)** | 1.2 GB | 2-4 GB | Moleculer-ready monolith |
| **REFLUX (microservices)** | 2.6 GB | 4-8 GB | Horizontal scaling |
| **n8n** | 0.6 GB | 1-2 GB | Monolith only |
| **Airflow** | 2 GB | 4-8 GB | Heavy microservices |

**Key Advantage**: REFLUX starts as lightweight as n8n but scales like Airflow!

---

## Deployment Modes

### Mode 1: Monolith (Recommended for Start)

**When to use:**
- Development
- Small teams (< 10 users)
- Low to medium workload (< 1,000 workflows/day)
- Budget-conscious deployments

**Architecture:**
```
ONE Node.js process (packages/nodes)
├── All 7 nodes registered in Moleculer
├── Communicates via Redis transport
└── Ready to split into microservices later
```

**Requirements:**

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| **CPU** | 2 cores | 4 cores |
| **RAM** | 2 GB | 4 GB |
| **Disk** | 10 GB | 20 GB |
| **Network** | 10 Mbps | 100 Mbps |

**Resource Breakdown:**
```
Node.js Processes:
├── API Server           50-100 MB
├── Nodes Broker         50-100 MB  ← All nodes here
├── Worker (Temporal)    50-100 MB
└── UI (Next.js)         200-300 MB
                         ──────────
Total Node.js:           350-600 MB

Docker Containers:
├── PostgreSQL           50-100 MB
├── Redis                10-20 MB
├── Temporal             100-200 MB
├── Temporal UI          50-100 MB
├── ClickHouse*          200-300 MB
└── MinIO*               50-100 MB
                         ──────────
Total Docker:            460-820 MB

*Optional for Sprint 1

═══════════════════════════════════
TOTAL RAM:               810-1420 MB
```

**Cost Estimate:**
- **AWS**: t3.medium ($30-40/month)
- **DigitalOcean**: 4GB Droplet ($24/month)
- **Hetzner**: CX21 (€5.39/month)

---

### Mode 2: Grouped Microservices

**When to use:**
- Production workloads (1,000-10,000 workflows/day)
- Need isolation between node types
- Want independent scaling
- Team size: 10-50 users

**Architecture:**
```
3 Node.js processes
├── nodes-http       (http, webhook)
├── nodes-transform  (transform, condition)
└── nodes-integration (database, email, openai)

Each process registers its nodes with Moleculer
Worker calls them transparently via Redis
```

**Requirements:**

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| **CPU** | 4 cores | 8 cores |
| **RAM** | 4 GB | 8 GB |
| **Disk** | 20 GB | 50 GB |
| **Network** | 100 Mbps | 1 Gbps |

**Resource Breakdown:**
```
Node.js Processes:
├── API Server           50-100 MB
├── Worker               50-100 MB
├── UI                   200-300 MB
├── nodes-http × 2       200 MB (100 MB each)
├── nodes-transform × 3  300 MB (100 MB each)
└── nodes-integration × 2 200 MB (100 MB each)
                         ──────────
Total Node.js:           1000-1800 MB

Docker:                  460-820 MB

═══════════════════════════════════
TOTAL RAM:               1460-2620 MB
```

**Scaling Strategy:**
```bash
# Scale transform nodes (most CPU-heavy)
NODES_FILTER="transform,condition" node dist/index.js &
NODES_FILTER="transform,condition" node dist/index.js &
NODES_FILTER="transform,condition" node dist/index.js &

# Moleculer automatically load-balances between 3 instances
```

**Cost Estimate:**
- **AWS**: t3.large ($60-70/month)
- **DigitalOcean**: 8GB Droplet ($48/month)
- **Hetzner**: CCX12 (€15.90/month)

---

### Mode 3: Full Microservices (Kubernetes)

**When to use:**
- High load (> 10,000 workflows/day)
- Enterprise deployments
- Need auto-scaling
- Multi-tenant SaaS
- Team size: 50+ users

**Architecture:**
```yaml
Kubernetes cluster:
├── Deployment: nodes-http (3-10 replicas)
├── Deployment: nodes-transform (5-20 replicas)
├── Deployment: nodes-integration (2-5 replicas)
├── Deployment: worker (2-5 replicas)
└── Deployment: api (2-5 replicas)

HorizontalPodAutoscaler watches CPU/RAM
Scales nodes independently based on load
```

**Requirements:**

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| **CPU** | 8 cores | 16+ cores |
| **RAM** | 8 GB | 16-32 GB |
| **Disk** | 50 GB | 100+ GB SSD |
| **Network** | 1 Gbps | 10 Gbps |

**Kubernetes Cluster:**
- **3+ worker nodes** (4 CPU / 8 GB each)
- **1 control plane** (2 CPU / 4 GB)
- **Load balancer** (managed or self-hosted)

**Resource Breakdown (with autoscaling):**
```
Baseline (idle):
├── API (2 replicas)         200 MB
├── Worker (2 replicas)      200 MB
├── UI (2 replicas)          400 MB
├── nodes-http (3)           300 MB
├── nodes-transform (5)      500 MB
├── nodes-integration (2)    200 MB
└── Infrastructure           800 MB
                             ──────
Baseline:                    2600 MB

Peak (auto-scaled):
├── API (5 replicas)         500 MB
├── Worker (5 replicas)      500 MB
├── UI (3 replicas)          600 MB
├── nodes-http (10)          1000 MB
├── nodes-transform (20)     2000 MB
├── nodes-integration (5)    500 MB
└── Infrastructure           800 MB
                             ──────
Peak:                        5900 MB

Autoscale range: 2.6-6 GB
```

**Cost Estimate:**
- **AWS EKS**: $150-500/month (cluster + nodes)
- **GKE**: $150-400/month
- **DigitalOcean K8s**: $120-300/month
- **Self-hosted (Hetzner)**: €40-100/month

---

## Comparison with Alternatives

### REFLUX vs n8n

| Metric | n8n | REFLUX Monolith | REFLUX Microservices |
|--------|-----|-----------------|---------------------|
| **Min RAM** | 600 MB | 1.2 GB | 2.6 GB |
| **Production RAM** | 1-2 GB | 2-4 GB | 4-8 GB |
| **Scalability** | Vertical only | Vertical → Horizontal | Horizontal |
| **Node Versioning** | ❌ No | ✅ Yes | ✅ Yes |
| **Node Isolation** | ❌ No | ⚠️ Process-level | ✅ Container-level |
| **Service Mesh** | ❌ No | ✅ Moleculer | ✅ Moleculer |
| **Cost (small)** | $24/mo | $30-40/mo | $60-70/mo |
| **Cost (large)** | $100-200/mo | $60-100/mo | $150-300/mo |

**Verdict**: REFLUX costs 50-100% more for small deployments but becomes CHEAPER at scale due to horizontal scaling.

### REFLUX vs Airflow

| Metric | Airflow | REFLUX Monolith | REFLUX Microservices |
|--------|---------|-----------------|---------------------|
| **Min RAM** | 2 GB | 1.2 GB | 2.6 GB |
| **Production RAM** | 4-8 GB | 2-4 GB | 4-8 GB |
| **Dependencies** | Python, Celery, Spark* | Node.js, Redis | Node.js, Redis |
| **Setup Time** | Hours | Minutes | Minutes |
| **Visual Editor** | ❌ Code-only | ✅ React Flow | ✅ React Flow |
| **Service Mesh** | Celery (heavy) | Moleculer (light) | Moleculer (light) |
| **Cost (small)** | $80-120/mo | $30-40/mo | $60-70/mo |
| **Cost (large)** | $300-1000/mo | $60-100/mo | $150-300/mo |

**Verdict**: REFLUX is 2-3x CHEAPER than Airflow at all scales, plus easier to set up and use.

---

## Resource Optimization Tips

### 1. Disable Unused Services

```yaml
# docker-compose.yml
services:
  # Required
  postgres: ...
  redis: ...
  temporal: ...

  # Optional - disable for development
  # clickhouse: ...  # Uncomment when you need traces
  # minio: ...       # Uncomment when you need S3 storage
  # temporal-ui: ... # Uncomment for debugging
```

**Savings**: ~300-500 MB RAM

### 2. Use Production Node.js Builds

```bash
# Development (watch mode)
npm run dev  # Uses ts-node, heavier

# Production (compiled)
npm run build
npm start    # Uses compiled JS, lighter
```

**Savings**: ~100-200 MB RAM

### 3. Adjust Temporal Workers

```typescript
// packages/core/src/worker.ts
const worker = await Worker.create({
  maxConcurrentActivityTaskExecutions: 10,  // Reduce from 100
  maxConcurrentWorkflowTaskExecutions: 5,   // Reduce from 100
});
```

**Savings**: ~50-100 MB RAM per worker

### 4. Use Redis Instead of ClickHouse for Traces (Small Deployments)

ClickHouse is overkill for < 10,000 workflows/day. Use Redis or PostgreSQL for traces instead.

**Savings**: ~200-300 MB RAM

---

## Monitoring Resource Usage

### Docker Stats

```bash
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```

### Node.js Memory

```bash
# Add to your Node.js process
console.log(process.memoryUsage());
# {
#   rss: 50000000,        # Total memory
#   heapTotal: 20000000,  # Allocated heap
#   heapUsed: 15000000,   # Used heap
# }
```

### Prometheus Metrics (Production)

```yaml
# docker-compose.yml
services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
```

Monitor:
- `process_resident_memory_bytes` - Node.js memory
- `moleculer_requests_total` - Node calls
- `temporal_workflow_completed` - Workflow throughput

---

## Scaling Decision Tree

```
Start here
    ↓
Are you running < 1,000 workflows/day?
    ├─ YES → Use Monolith Mode (2-4 GB RAM)
    └─ NO  → Continue ↓

Are you running < 10,000 workflows/day?
    ├─ YES → Use Grouped Microservices (4-8 GB RAM)
    └─ NO  → Continue ↓

Need auto-scaling?
    ├─ YES → Use Kubernetes (8-32 GB RAM)
    └─ NO  → Use Grouped Microservices with manual scaling
```

---

## FAQ

### Q: Can I run REFLUX on a Raspberry Pi?

**A**: Yes! Monolith mode with minimal Docker services (PostgreSQL + Redis only) can run on 2 GB RAM. Disable ClickHouse, MinIO, and Temporal UI.

### Q: How does REFLUX compare to AWS Step Functions?

**A**: REFLUX is self-hosted (free compute) vs Step Functions ($0.025 per 1K transitions). At 10K workflows/day with 10 steps each:
- **Step Functions**: $75/month
- **REFLUX (self-hosted)**: $30-60/month (server cost)

### Q: Can I use REFLUX on Kubernetes from day 1?

**A**: Yes, but NOT recommended. Start with monolith, scale when needed. K8s adds complexity that's unnecessary for < 10K workflows/day.

### Q: What if I already have a PostgreSQL/Redis instance?

**A**: Great! Disable those Docker containers and configure REFLUX to use your existing instances. This saves ~60-120 MB RAM.

---

## Summary

| Deployment Mode | RAM | Cost/month | Use Case |
|----------------|-----|-----------|----------|
| **Monolith** | 1-2 GB | $5-40 | Dev, small teams, < 1K wf/day |
| **Grouped** | 2-4 GB | $30-70 | Production, 1K-10K wf/day |
| **Kubernetes** | 4-32 GB | $100-500 | Enterprise, > 10K wf/day |

**Start small, scale when needed!** 🚀
