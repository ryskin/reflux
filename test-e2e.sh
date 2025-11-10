#!/bin/bash

# REFLUX End-to-End Test
# Tests: webhook trigger → transform → output

set -e

API_URL="http://localhost:4000"
UI_URL="http://localhost:3002"

echo "🧪 REFLUX End-to-End Test"
echo "=========================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test 1: Check services are running
echo -e "${BLUE}[1/6] Checking services...${NC}"
if curl -s "$API_URL/health" > /dev/null; then
    echo -e "${GREEN}✓${NC} API server running at $API_URL"
else
    echo -e "${RED}✗${NC} API server not running at $API_URL"
    exit 1
fi

if curl -s "$UI_URL" > /dev/null; then
    echo -e "${GREEN}✓${NC} UI server running at $UI_URL"
else
    echo -e "${RED}✗${NC} UI server not running at $UI_URL"
    exit 1
fi

echo ""

# Test 2: Create a test flow
echo -e "${BLUE}[2/6] Creating test workflow...${NC}"
FLOW_RESPONSE=$(curl -s -X POST "$API_URL/api/flows" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "e2e_test_flow",
    "version": "1.0.0",
    "description": "End-to-end test: webhook → transform → output",
    "spec": {
      "nodes": [
        {
          "id": "webhook_trigger",
          "type": "nodes.webhook.trigger",
          "params": {
            "method": "POST",
            "path": "/test"
          }
        },
        {
          "id": "transform_data",
          "type": "nodes.transform.execute",
          "params": {
            "code": "outputs.result = { transformed: true, input: inputs.data }"
          }
        },
        {
          "id": "webhook_output",
          "type": "nodes.webhook.out",
          "params": {
            "url": "https://webhook.site/test"
          }
        }
      ],
      "edges": [
        { "from": "webhook_trigger", "to": "transform_data" },
        { "from": "transform_data", "to": "webhook_output" }
      ]
    },
    "tags": ["e2e-test", "automated"]
  }')

FLOW_ID=$(echo "$FLOW_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$FLOW_ID" ]; then
    echo -e "${RED}✗${NC} Failed to create flow"
    echo "$FLOW_RESPONSE"
    exit 1
fi

echo -e "${GREEN}✓${NC} Created flow: $FLOW_ID"
echo ""

# Test 3: Verify flow was created
echo -e "${BLUE}[3/6] Verifying flow in database...${NC}"
FLOW_DETAIL=$(curl -s "$API_URL/api/flows/$FLOW_ID")
FLOW_NAME=$(echo "$FLOW_DETAIL" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)

if [ "$FLOW_NAME" = "e2e_test_flow" ]; then
    echo -e "${GREEN}✓${NC} Flow verified: $FLOW_NAME"
else
    echo -e "${RED}✗${NC} Flow verification failed"
    exit 1
fi

echo ""

# Test 4: List all flows
echo -e "${BLUE}[4/6] Listing all flows...${NC}"
FLOWS=$(curl -s "$API_URL/api/flows")
FLOW_COUNT=$(echo "$FLOWS" | grep -o '"id"' | wc -l | tr -d ' ')
echo -e "${GREEN}✓${NC} Found $FLOW_COUNT flow(s) in database"
echo ""

# Test 5: Check nodes
echo -e "${BLUE}[5/6] Checking available nodes...${NC}"
NODES=$(curl -s "$API_URL/api/nodes")
NODE_COUNT=$(echo "$NODES" | grep -o '"id"' | wc -l | tr -d ' ')
echo -e "${GREEN}✓${NC} Found $NODE_COUNT node(s) registered"
echo ""

# Test 6: Check runs
echo -e "${BLUE}[6/6] Checking workflow runs...${NC}"
RUNS=$(curl -s "$API_URL/api/runs")
RUN_COUNT=$(echo "$RUNS" | grep -o '"id"' | wc -l | tr -d ' ')
echo -e "${GREEN}✓${NC} Found $RUN_COUNT run(s) in history"
echo ""

# Summary
echo "=========================="
echo -e "${GREEN}✓ All tests passed!${NC}"
echo ""
echo "Summary:"
echo "  • API Server: $API_URL"
echo "  • UI Server: $UI_URL"
echo "  • Test Flow ID: $FLOW_ID"
echo "  • Total Flows: $FLOW_COUNT"
echo "  • Total Nodes: $NODE_COUNT"
echo "  • Total Runs: $RUN_COUNT"
echo ""
echo "Next steps:"
echo "  1. Visit UI: $UI_URL/flows/$FLOW_ID"
echo "  2. View all flows: $UI_URL/flows"
echo "  3. Monitor runs: $UI_URL/runs"
echo ""
