#!/bin/bash

# REFLUX Development Environment Startup Script

echo "🚀 Starting REFLUX Development Environment"
echo "=========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Start Docker services
echo "1️⃣  Starting Docker services..."
cd infra/docker

# Check if already running
if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}✓ Docker services already running${NC}"
else
    docker-compose up -d
    echo -e "${YELLOW}⏳ Waiting for services to be healthy (30 seconds)...${NC}"
    sleep 30
fi

# Verify services
echo ""
echo "Docker Services Status:"
docker-compose ps

echo ""
echo "=========================================="
echo -e "${GREEN}✅ Infrastructure is ready!${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Start API server (Terminal 1):"
echo "   cd packages/api && npm run dev"
echo ""
echo "2. Start UI (Terminal 2):"
echo "   cd packages/ui && npm run dev"
echo ""
echo "3. Run n8n tests (Terminal 3):"
echo "   ./test-n8n.sh"
echo ""
echo "4. Access services:"
echo "   • UI:          http://localhost:5173"
echo "   • API:         http://localhost:4000"
echo "   • Temporal UI: http://localhost:8080"
echo "   • MinIO:       http://localhost:9001"
echo ""
echo "To stop all services:"
echo "   cd infra/docker && docker-compose down"
echo ""
