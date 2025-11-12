# REFLUX Plugin Architecture

## Overview

REFLUX now uses a **plugin architecture** to separate MIT-licensed core from optional components with different licenses.

## Structure

```
reflux/
├── packages/
│   ├── core/              # MIT License - Core workflow engine
│   ├── adapter-n8n/       # Sustainable Use License - Optional n8n integration
│   ├── api/               # MIT License - REST API (supports optional adapters)
│   ├── ui/                # MIT License - Web UI (supports optional adapters)
│   └── nodes/             # MIT License - Native REFLUX nodes
```

## License Separation

### MIT Licensed (Commercial Use Allowed)

- **@reflux/core** - Workflow execution engine
- **@reflux/api** - REST API server
- **@reflux/ui** - Web interface
- **@reflux/nodes** - Native node implementations

### Sustainable Use License (Commercial Restrictions)

- **@reflux/adapter-n8n** - Optional n8n node compatibility
  - ⚠️ Cannot use in commercial products sold to others
  - ⚠️ Cannot offer as paid service
  - ✅ Can use for internal business purposes
  - ✅ Can use for personal/non-commercial projects

## Installation

### Core Only (MIT)

```bash
# Clone and install core
git clone https://github.com/ryskin/reflux.git
cd reflux
npm install

# Start infrastructure
cd infra/docker
docker-compose up -d

# Start REFLUX
cd ../..
npm run dev
```

**Result:** REFLUX runs with native nodes only (HTTP, webhook, transform)

### With n8n Adapter (Optional)

```bash
# After core installation, add n8n adapter
npm install @reflux/adapter-n8n

# Restart services
npm run dev
```

**Result:** REFLUX now has access to 450+ n8n nodes

## How It Works

### 1. Core Package

**packages/core** - Completely independent of n8n:

```typescript
// packages/core/src/index.ts
export * from './types';
export * from './client';
export * from './database';
// No n8n exports
```

**Dependencies:** Only MIT/permissive licenses (Temporal, Moleculer, PostgreSQL, etc.)

### 2. Adapter Package

**packages/adapter-n8n** - Separate optional package:

```typescript
// packages/adapter-n8n/src/index.ts
export * from './adapter';
export * from './cache';
export * from './migration';
```

**Dependencies:** Includes n8n packages (n8n-core, n8n-nodes-base, n8n-workflow)

### 3. API Dynamic Loading

**packages/api** - Conditionally loads adapter:

```typescript
// packages/api/src/routes/nodes.ts
let loadN8nNode: any = null;
let n8nAdapterAvailable = false;

(async () => {
  try {
    // @ts-ignore - Optional peer dependency
    const adapter = await import('@reflux/adapter-n8n');
    loadN8nNode = adapter.loadN8nNode;
    n8nAdapterAvailable = true;
    console.log('[API] n8n adapter loaded');
  } catch {
    console.log('[API] n8n adapter not installed (optional)');
  }
})();

router.get('/n8n/list', (req, res) => {
  if (!n8nAdapterAvailable) {
    return res.status(404).json({
      error: 'n8n adapter not installed',
      hint: 'Install with: npm install @reflux/adapter-n8n'
    });
  }
  // ... load n8n nodes
});
```

### 4. UI Graceful Degradation

**packages/ui** - Shows appropriate message:

```typescript
// packages/ui/src/features/workflows/components/AddNodeDialog.tsx
const [n8nAvailable, setN8nAvailable] = useState<boolean | null>(null);

useEffect(() => {
  fetch(API_ENDPOINTS.nodes.n8nList)
    .then(() => setN8nAvailable(true))
    .catch(() => setN8nAvailable(false));
}, []);

return n8nAvailable === false ? (
  <div>
    <p>n8n Adapter Not Installed</p>
    <code>npm install @reflux/adapter-n8n</code>
    <p>⚠️ Uses n8n Sustainable Use License</p>
  </div>
) : (
  // Show n8n nodes...
);
```

## Development

### Building Packages

```bash
# Build core (no n8n)
cd packages/core
npm run build

# Build n8n adapter (optional)
cd packages/adapter-n8n
npm install
npm run build

# Build API (works with or without adapter)
cd packages/api
npm run build
```

### Type Checking

```bash
# Check core
cd packages/core
npm run typecheck  # ✅ No n8n types

# Check adapter
cd packages/adapter-n8n
npm run typecheck  # ✅ Has n8n types

# Check API
cd packages/api
npm run typecheck  # ✅ Works without adapter (uses @ts-ignore)
```

## Adding New Adapters

The architecture supports multiple optional adapters:

```
packages/
├── adapter-n8n/        # Existing
├── adapter-zapier/     # Future
├── adapter-make/       # Future
└── adapter-aws/        # Future
```

### Steps to Add New Adapter

1. **Create package:**

```bash
mkdir packages/adapter-<name>
```

2. **Add package.json:**

```json
{
  "name": "@reflux/adapter-<name>",
  "license": "SEE LICENSE IN LICENSE.md",
  "dependencies": {
    "@reflux/core": "*",
    "<external-dependency>": "^x.x.x"
  }
}
```

3. **Add LICENSE.md** with appropriate license

4. **Export adapter interface:**

```typescript
// packages/adapter-<name>/src/index.ts
export function loadNode(...) { ... }
export function listNodes(...) { ... }
```

5. **Update API to support adapter:**

```typescript
// packages/api/src/routes/nodes.ts
let adapterAvailable = false;
try {
  const adapter = await import('@reflux/adapter-<name>');
  adapterAvailable = true;
} catch {}

router.get('/api/<name>/nodes', (req, res) => {
  if (!adapterAvailable) {
    return res.status(404).json({ error: 'Adapter not installed' });
  }
  // ...
});
```

## Benefits

### ✅ Legal Clarity

- Core is pure MIT - no license complications
- Optional components clearly marked
- Users choose what licenses they accept

### ✅ Flexibility

- Start with MIT-only REFLUX
- Add adapters as needed
- Remove adapters without breaking core

### ✅ Commercial Use

- **Without n8n adapter:** Fully commercial, no restrictions
- **With n8n adapter:** Subject to Sustainable Use License

### ✅ Extensibility

- Easy to add new adapters
- Clean separation of concerns
- No core changes needed for new adapters

## Migration from Old Structure

If you have the old monolithic structure:

```bash
# 1. Remove n8n from core dependencies
cd packages/core
npm uninstall n8n-core n8n-nodes-base n8n-workflow

# 2. Install new adapter package
cd ../..
npm install @reflux/adapter-n8n

# 3. Rebuild everything
npm run build

# 4. Test
npm run dev
```

## FAQ

### Q: Do I need the n8n adapter?

**A:** No! REFLUX works great with native nodes. Only install if you need n8n's 450+ integrations.

### Q: Can I use REFLUX commercially?

**A:**
- **Core only:** ✅ Yes, MIT license
- **With n8n adapter:** ⚠️ Only for internal use (see n8n Sustainable Use License)

### Q: What if I need commercial use of n8n nodes?

**A:** Contact n8n: license@n8n.io for commercial licensing

### Q: Can I create my own adapters?

**A:** Yes! Follow the "Adding New Adapters" section above

### Q: Will core features depend on adapters?

**A:** Never. Core must work standalone. Adapters are always optional.

### Q: How do I know which adapter is installed?

```bash
# Check API logs on startup
npm run dev

# Output shows:
[API] n8n adapter loaded successfully
# or
[API] n8n adapter not installed (optional)
```

### Q: Can I use multiple adapters?

**A:** Yes! Install as many as you need:

```bash
npm install @reflux/adapter-n8n
npm install @reflux/adapter-zapier
npm install @reflux/adapter-make
```

Each adapter is independent.

## License Summary

| Package | License | Commercial Use | Source |
|---------|---------|----------------|--------|
| @reflux/core | MIT | ✅ Allowed | reflux |
| @reflux/adapter-n8n | Sustainable Use | ⚠️ Restricted | n8n |
| @reflux/api | MIT | ✅ Allowed | reflux |
| @reflux/ui | MIT | ✅ Allowed | reflux |
| @reflux/nodes | MIT | ✅ Allowed | reflux |

**Bottom line:** REFLUX core is fully commercial-friendly. Adapters may have restrictions based on their underlying dependencies.
