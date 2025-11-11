# n8n Integration Testing Guide

## Prerequisites

Make sure Docker is installed and running on your machine.

## Quick Test (Automated)

### 1. Start Docker services

```bash
# Start all infrastructure (Temporal, PostgreSQL, Redis, ClickHouse, MinIO)
cd infra/docker
docker-compose up -d

# Verify services are running
docker-compose ps

# Check logs if needed
docker-compose logs -f
```

Wait for all services to be healthy (about 30 seconds).

### 2. Start the application services

```bash
# Terminal 1 - Start API server
cd packages/api
npm run dev

# Terminal 2 - Start UI
cd packages/ui
npm run dev
```

### 3. Run the automated test

```bash
# Terminal 3 - Run test script (from project root)
cd /Users/ar/code/reflux
./test-n8n.sh
```

The test script will verify:
- ✅ API server is running
- ✅ n8n nodes list endpoint works
- ✅ Node description loading works
- ✅ Caching is functional
- ✅ Input validation blocks path traversal
- ✅ Multiple nodes load correctly

---

## Manual UI Testing

### 1. Open the UI
Navigate to: http://localhost:5173

### 2. Create a Workflow
1. Click **"Workflows"** in the sidebar
2. Click **"Create Workflow"** button
3. You'll see the visual workflow builder

### 3. Add n8n Nodes
1. Click the **"Add n8n Node..."** button in the top-left
2. A dialog appears with all available n8n nodes grouped by category:
   - **Core**: HttpRequest, Set, Code, DateTime, Crypto
   - **Logic**: If, Switch
   - **Communication**: Slack, Discord, Telegram
   - **AI**: OpenAI
   - **Database**: PostgreSQL, MySQL, MongoDB
   - **Productivity**: Google Sheets, Notion

3. Use the search bar to filter nodes (e.g., type "http")
4. Click on any node to add it to the canvas

### 4. Configure Node Properties
1. Click on any n8n node in the canvas
2. The right panel opens showing:
   - **Node name** (editable)
   - **All properties** from the original n8n node (dynamically loaded!)

3. Different property types are automatically rendered:
   - **Text inputs** - for strings
   - **Number inputs** - for numbers
   - **Checkboxes** - for booleans
   - **Dropdowns** - for options
   - **Multi-select** - for multiOptions
   - **JSON editors** - for complex objects
   - **Date pickers** - for dateTime
   - **Color pickers** - for colors

### 5. Test Different Nodes

#### HTTP Request Node
1. Add "HTTP Request" node
2. Configure properties:
   - **URL**: `https://api.github.com/users/octocat`
   - **Method**: `GET`
   - **Authentication**: None
3. The node should show all HTTP request options

#### Set (Edit Fields) Node
1. Add "Edit Fields (Set)" node
2. Configure which fields to set/modify
3. All n8n Set node properties appear

#### If (Conditional) Node
1. Add "If" node
2. Configure conditions dynamically
3. All condition types available

#### OpenAI Node
1. Add "OpenAI" node
2. All OpenAI parameters appear:
   - Model selection
   - Temperature
   - Max tokens
   - System prompt
   - etc.

---

## API Testing (Manual)

### Test 1: List Available Nodes
```bash
curl http://localhost:4000/api/nodes/n8n/list | jq
```

**Expected**: JSON array with 16+ nodes, grouped by category

### Test 2: Get Node Description
```bash
curl http://localhost:4000/api/nodes/n8n/HttpRequest/description | jq
```

**Expected**: Full node description with all properties, inputs, outputs

### Test 3: Test Caching
```bash
# First request (slow - loads from disk)
time curl -s http://localhost:4000/api/nodes/n8n/HttpRequest/description > /dev/null

# Second request (fast - from cache)
time curl -s http://localhost:4000/api/nodes/n8n/HttpRequest/description > /dev/null
```

**Expected**: Second request should be significantly faster (< 10ms vs 100-200ms)

### Test 4: Security Validation
```bash
# Should fail with validation error
curl http://localhost:4000/api/nodes/n8n/Invalid@Name/description

# Should fail with validation error
curl http://localhost:4000/api/nodes/n8n/../../../etc/passwd/description
```

**Expected**: Both should return 400 error with validation message

---

## What You're Testing

### Architecture
1. **n8n Node Adapter** (`packages/core/src/adapters/n8n-node-adapter.ts`)
   - Loads original n8n nodes without conversion
   - Wraps them as Moleculer services
   - Provides `IExecuteFunctions` interface

2. **Dynamic Property Loading** (`packages/api/src/routes/nodes.ts`)
   - API endpoint fetches node description from n8n package
   - Returns all properties, credentials, inputs/outputs

3. **Universal Property Renderer** (`packages/ui/src/features/workflows/components/N8nPropertyRenderer.tsx`)
   - Renders 10+ property types dynamically
   - No hardcoding - adapts to whatever n8n provides

4. **Caching Layer** (`packages/core/src/adapters/n8n-node-cache.ts`)
   - In-memory cache with 1-hour TTL
   - Prevents repeated disk I/O

5. **Security Features**
   - Package whitelist (only n8n-nodes-base allowed)
   - Input validation with Zod
   - Path traversal protection

---

## Troubleshooting

### Issue: Docker services won't start
```bash
# Check if Docker is running
docker ps

# Check service status
cd infra/docker
docker-compose ps

# View logs for specific service
docker-compose logs temporal
docker-compose logs postgres

# Restart all services
docker-compose down
docker-compose up -d

# Clean restart (removes volumes - WARNING: deletes data)
docker-compose down -v
docker-compose up -d
```

### Issue: API server won't start
```bash
# Check if port 4000 is in use
lsof -ti:4000

# If process found, kill it
kill -9 $(lsof -ti:4000)

# Check if database is accessible
cd infra/docker
docker-compose ps postgres

# Restart API
cd packages/api
npm run dev
```

### Issue: n8n nodes not loading
```bash
# Verify n8n packages are installed
cd packages/core
npm list n8n-nodes-base

# If missing, reinstall
npm install n8n-nodes-base n8n-workflow n8n-core --save

# Rebuild
npm run build
```

### Issue: Properties not showing in UI
1. Open browser DevTools (F12)
2. Go to Network tab
3. Add a node and click it
4. Look for request to `/api/nodes/n8n/[NodeName]/description`
5. Check if request succeeds and returns properties array

### Issue: Validation errors
Check API server logs for detailed error messages:
```bash
# In packages/api terminal
# You should see logs like:
# [API] Loading n8n node: HttpRequest, version: latest
# [n8n-adapter] Cache hit for n8n-nodes-base:HttpRequest:latest
```

---

## Expected Results

### ✅ Success Indicators

1. **Dialog shows 16+ nodes** grouped by category
2. **Search filters nodes** in real-time
3. **Clicking node adds it** to canvas
4. **Node editor shows many properties** (not just name/description)
5. **Properties render correctly** based on type
6. **Second load is instant** (caching works)
7. **Invalid node names rejected** with clear error

### 🎯 Performance Metrics

- **First node load**: 100-200ms (disk I/O)
- **Cached node load**: < 10ms
- **Dialog open**: < 100ms
- **Property rendering**: Instant

---

## Advanced Testing

### Test Custom Properties
Try nodes with complex properties:

1. **Code Node** - Has code editor property
2. **Switch Node** - Has collection/routing rules
3. **DateTime Node** - Has date/time formats
4. **Crypto Node** - Has encoding options

### Test All Categories
Make sure all categories work:
- ✅ Core (HttpRequest, Set, Code, DateTime, Crypto)
- ✅ Logic (If, Switch)
- ✅ Communication (Slack, Discord, Telegram)
- ✅ AI (OpenAI)
- ✅ Database (Postgres, MySQL, MongoDB)
- ✅ Productivity (Google Sheets, Notion)

### Test Edge Cases
1. Add 10+ nodes to canvas
2. Delete and re-add nodes
3. Edit properties multiple times
4. Search for non-existent node
5. Refresh page and reload

---

## Next Steps After Testing

Once n8n integration is verified:

1. **Add More Nodes** - Edit `packages/api/src/routes/nodes.ts` to include more n8n nodes
2. **Test Execution** - Actually run workflows with n8n nodes
3. **Add Credentials** - Implement credential management for nodes that need auth
4. **Add Node Versioning** - Support different versions of n8n nodes
5. **Error Handling** - Improve error messages for failed nodes

---

## Questions?

If something doesn't work:
1. Check API server logs
2. Check browser console
3. Run `./test-n8n.sh` to diagnose
4. Verify all packages are installed and built
