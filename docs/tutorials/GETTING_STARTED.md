# Getting Started with REFLUX

Quick guide to running REFLUX locally and creating your first self-improving workflow.

## Prerequisites

- Node.js >= 20.0.0
- Docker Desktop
- npm >= 10.0.0

## 1. Clone and Install

```bash
git clone https://github.com/yourorg/reflux.git
cd reflux
npm install
```

## 2. Start Infrastructure

```bash
# Start all services (Temporal, Postgres, Redis, ClickHouse, MinIO)
cd infra/docker
docker-compose up -d

# Verify all services are healthy
docker-compose ps
```

You should see:
- ✅ Temporal Server - port 7233
- ✅ Temporal UI - http://localhost:8080
- ✅ PostgreSQL - port 5432
- ✅ Redis - port 6379
- ✅ ClickHouse - port 8123
- ✅ MinIO - http://localhost:9001 (console)

## 3. Run Database Migrations

```bash
cd ../../packages/core
npm run db:migrate
```

This creates the schema for flows, runs, nodes, and traces.

## 4. Start Services

Open 3 terminal tabs:

### Tab 1: Temporal Worker
```bash
cd packages/core
npm run worker
```

### Tab 2: API Server
```bash
cd services/api
npm run dev
# Running on http://localhost:3001
```

### Tab 3: UI
```bash
cd packages/ui
npm run dev
# Running on http://localhost:3000
```

## 5. Create Your First Workflow

### Via UI

1. Open http://localhost:3000
2. Click "New Workflow"
3. Use the visual canvas to connect nodes:
   - Drag `trigger.webhook` onto canvas
   - Drag `util.transform` and connect it
   - Drag `webhook.out` and connect it
4. Configure each node's parameters
5. Click "Save"
6. Click "Run"

### Via API

```bash
# Create workflow
curl -X POST http://localhost:3001/api/flows \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "hello_world",
    "spec": {
      "version": "1.0.0",
      "steps": [
        {
          "id": "greet",
          "node": "util.transform",
          "with": {
            "data": "{{input}}",
            "mapping": {
              "message": "'\''Hello, '\'' + name + '\''!'\''"
            }
          }
        },
        {
          "id": "send",
          "node": "webhook.out",
          "with": {
            "url": "https://webhook.site/your-unique-url",
            "body": "{{steps.greet.output.result}}"
          }
        }
      ]
    }
  }'

# Response: { "id": "flow-uuid", "name": "hello_world", ... }
```

### Trigger the Workflow

```bash
# Run workflow
curl -X POST http://localhost:3001/api/runs \
  -H 'Content-Type: application/json' \
  -d '{
    "flow_id": "flow-uuid",
    "inputs": {
      "name": "World"
    }
  }'

# Response: { "id": "run-uuid", "status": "running", ... }
```

### Check Status

```bash
# Get run status
curl http://localhost:3001/api/runs/run-uuid

# Response:
# {
#   "id": "run-uuid",
#   "status": "success",
#   "outputs": {
#     "greet": { "result": { "message": "Hello, World!" } },
#     "send": { "delivered": true }
#   }
# }
```

## 6. View Traces

Open ClickHouse to see execution traces:

```bash
docker exec -it reflux-clickhouse clickhouse-client

# Query traces
SELECT
  node,
  node_version,
  status,
  latency_ms
FROM reflux.traces
WHERE run_id = 'run-uuid';
```

Or query via Temporal UI:
- Open http://localhost:8080
- Find your workflow by ID
- View event history with inputs/outputs

## 7. Re-drive a Failed Step

Simulate a failure:

```bash
# Run workflow with invalid webhook URL
curl -X POST http://localhost:3001/api/runs \
  -d '{"flow_id": "flow-uuid", "inputs": {"name": "Test"}}'

# Wait for failure...

# Re-drive the failed step
curl -X POST http://localhost:3001/api/runs/run-uuid/steps/send/redrive
```

The workflow will retry just the failed step, not the entire flow!

## Example Workflows

### 1. Data Processing Pipeline

```yaml
name: csv_to_parquet
steps:
  - id: download
    node: http.request
    with:
      url: "{{input.csv_url}}"

  - id: convert
    node: excel.toParquet
    with:
      file_url: "{{steps.download.output.data}}"

  - id: upload
    node: s3.upload
    with:
      file: "{{steps.convert.output.parquet_url}}"
      bucket: my-data
```

### 2. API Aggregation

```yaml
name: multi_api_fetch
steps:
  - id: fetch_all
    node: meta.parallel
    with:
      branches:
        - node: http.request
          params: { url: "https://api1.com/data" }
        - node: http.request
          params: { url: "https://api2.com/data" }

  - id: merge
    node: util.transform
    with:
      data: "{{steps.fetch_all.output}}"
      mapping:
        combined: "api1.data + api2.data"
```

## Next Steps

1. **Explore Nodes** - Check available nodes at http://localhost:3001/api/nodes
2. **Add Custom Node** - See [Creating Custom Nodes](./CUSTOM_NODES.md)
3. **Enable Reflection** - Configure auto-optimization in Sprint 5
4. **Deploy to Production** - See [Deployment Guide](../architecture/DEPLOYMENT.md)

## Troubleshooting

### Services won't start

```bash
# Check logs
docker-compose logs -f temporal
docker-compose logs -f postgres

# Restart everything
docker-compose down
docker-compose up -d
```

### Workflow stuck in "running"

Check Temporal UI at http://localhost:8080 for detailed event history.

### Database connection errors

```bash
# Verify Postgres is ready
docker exec -it reflux-postgres pg_isready -U reflux

# Check migrations
cd packages/core
npm run db:migrate
```

## Clean Up

```bash
# Stop all services
docker-compose down

# Remove volumes (WARNING: deletes all data)
docker-compose down -v
```

## Support

- 📖 [Architecture Docs](../architecture/ARCHITECTURE.md)
- 🐛 [Report Issues](https://github.com/yourorg/reflux/issues)
- 💬 [Discussions](https://github.com/yourorg/reflux/discussions)
