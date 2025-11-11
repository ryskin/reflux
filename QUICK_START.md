# 🚀 REFLUX Quick Start - Testing n8n Integration

## One-Command Setup

```bash
./start-dev.sh
```

This will:
- ✅ Start all Docker services (Temporal, PostgreSQL, Redis, ClickHouse, MinIO)
- ✅ Wait for services to be healthy
- ✅ Show status of all services

## Start Application

### Terminal 1 - API Server
```bash
cd packages/api
npm run dev
```

API will be available at: http://localhost:4000

### Terminal 2 - UI
```bash
cd packages/ui
npm run dev
```

UI will be available at: http://localhost:5173

## Test n8n Integration

### Terminal 3 - Run Automated Tests
```bash
./test-n8n.sh
```

This will test:
- ✅ n8n nodes list endpoint
- ✅ Node description loading
- ✅ Caching functionality
- ✅ Input validation
- ✅ Multiple node types

## Manual UI Test

1. Open http://localhost:5173
2. Click **"Workflows"** → **"Create Workflow"**
3. Click **"Add n8n Node..."** button
4. Browse 16+ available n8n nodes:
   - **Core**: HttpRequest, Set, Code, DateTime, Crypto
   - **Logic**: If, Switch
   - **Communication**: Slack, Discord, Telegram
   - **AI**: OpenAI
   - **Database**: PostgreSQL, MySQL, MongoDB
   - **Productivity**: Google Sheets, Notion

5. Click any node to add it
6. Click the node on canvas
7. See **all properties** load dynamically!

## Services

| Service | URL | Credentials |
|---------|-----|-------------|
| UI | http://localhost:5173 | - |
| API | http://localhost:4000 | - |
| Temporal UI | http://localhost:8080 | - |
| MinIO Console | http://localhost:9001 | reflux / reflux123 |
| PostgreSQL | localhost:5432 | reflux / reflux |
| Redis | localhost:6379 | - |

## Stop Services

```bash
cd infra/docker
docker-compose down

# To also remove data volumes:
docker-compose down -v
```

## Troubleshooting

See [N8N_TESTING_GUIDE.md](./N8N_TESTING_GUIDE.md) for detailed troubleshooting.

---

**Ready to test!** 🎉

Just run `./start-dev.sh` and follow the terminal output.
