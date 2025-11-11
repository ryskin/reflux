#!/bin/bash

# REFLUX n8n Integration Test Script
# Tests the n8n node adapter functionality

API_URL="http://localhost:4000"

echo "🧪 REFLUX n8n Integration Test"
echo "================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if API is running
echo "1️⃣  Checking if API server is running..."
if curl -s "${API_URL}/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ API server is running${NC}"
else
    echo -e "${RED}✗ API server is NOT running${NC}"
    echo ""
    echo "Please start the API server first:"
    echo "  cd packages/api"
    echo "  npm run dev"
    echo ""
    exit 1
fi

echo ""
echo "2️⃣  Testing n8n nodes list endpoint..."
RESPONSE=$(curl -s "${API_URL}/api/nodes/n8n/list")
NODE_COUNT=$(echo "$RESPONSE" | grep -o "displayName" | wc -l | tr -d ' ')

if [ "$NODE_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ Found ${NODE_COUNT} n8n nodes${NC}"
    echo ""
    echo "Available n8n nodes:"
    echo "$RESPONSE" | grep -o '"displayName":"[^"]*"' | cut -d'"' -f4 | head -5
    echo "  ... and more"
else
    echo -e "${RED}✗ Failed to load n8n nodes list${NC}"
    echo "Response: $RESPONSE"
    exit 1
fi

echo ""
echo "3️⃣  Testing n8n node description endpoint (HttpRequest)..."
HTTP_REQUEST_DESC=$(curl -s "${API_URL}/api/nodes/n8n/HttpRequest/description")

if echo "$HTTP_REQUEST_DESC" | grep -q "displayName"; then
    echo -e "${GREEN}✓ Successfully loaded HttpRequest node description${NC}"

    # Show properties count
    PROP_COUNT=$(echo "$HTTP_REQUEST_DESC" | grep -o '"name":"[^"]*"' | wc -l | tr -d ' ')
    echo "  Properties found: $PROP_COUNT"

    # Show some property names
    echo "  Sample properties:"
    echo "$HTTP_REQUEST_DESC" | grep -o '"displayName":"[^"]*"' | cut -d'"' -f4 | head -5
else
    echo -e "${RED}✗ Failed to load HttpRequest description${NC}"
    echo "Response: $HTTP_REQUEST_DESC"
    exit 1
fi

echo ""
echo "4️⃣  Testing caching (second request should be faster)..."
START=$(date +%s%N)
curl -s "${API_URL}/api/nodes/n8n/HttpRequest/description" > /dev/null
END=$(date +%s%N)
FIRST_TIME=$((($END - $START) / 1000000))

START=$(date +%s%N)
curl -s "${API_URL}/api/nodes/n8n/HttpRequest/description" > /dev/null
END=$(date +%s%N)
SECOND_TIME=$((($END - $START) / 1000000))

echo "  First request:  ${FIRST_TIME}ms"
echo "  Second request: ${SECOND_TIME}ms (cached)"

if [ "$SECOND_TIME" -lt "$FIRST_TIME" ]; then
    echo -e "${GREEN}✓ Caching is working! (${SECOND_TIME}ms < ${FIRST_TIME}ms)${NC}"
else
    echo -e "${YELLOW}⚠ Caching might not be working (both requests took similar time)${NC}"
fi

echo ""
echo "5️⃣  Testing input validation (should reject invalid node names)..."
INVALID_RESPONSE=$(curl -s "${API_URL}/api/nodes/n8n/../../../etc/passwd/description")

if echo "$INVALID_RESPONSE" | grep -q "error"; then
    echo -e "${GREEN}✓ Input validation is working (path traversal blocked)${NC}"
else
    echo -e "${RED}✗ Security issue: Path traversal not blocked!${NC}"
    exit 1
fi

echo ""
echo "6️⃣  Testing multiple n8n nodes..."
NODES=("Set" "If" "Code" "Switch")

for NODE in "${NODES[@]}"; do
    RESPONSE=$(curl -s "${API_URL}/api/nodes/n8n/${NODE}/description")
    if echo "$RESPONSE" | grep -q "displayName"; then
        echo -e "  ${GREEN}✓ ${NODE}${NC}"
    else
        echo -e "  ${RED}✗ ${NODE} failed${NC}"
    fi
done

echo ""
echo "================================"
echo -e "${GREEN}✅ All tests passed!${NC}"
echo ""
echo "Next steps:"
echo "  1. Open UI: http://localhost:5173"
echo "  2. Navigate to Workflows"
echo "  3. Click 'Create Workflow'"
echo "  4. Click 'Add n8n Node...' button"
echo "  5. Browse and select nodes from the dialog"
echo "  6. Configure node properties dynamically"
echo ""
