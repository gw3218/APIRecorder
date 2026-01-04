#!/bin/bash

# Manual Test Script for API Recorder
# This script tests the API endpoints manually

set -e

BASE_URL="http://localhost:3000"
SESSION_ID=""

echo "🧪 API Recorder Manual Tests"
echo "=============================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=$4
    local description=$5

    echo -n "Testing: $description ... "
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq "$expected_status" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (HTTP $http_code)"
        if [ -n "$body" ] && [ "$body" != "null" ]; then
            echo "$body" | jq '.' 2>/dev/null || echo "$body"
        fi
        return 0
    else
        echo -e "${RED}✗ FAILED${NC} (Expected HTTP $expected_status, got HTTP $http_code)"
        echo "Response: $body"
        return 1
    fi
}

# Check if server is running
echo "Checking if server is running..."
if ! curl -s "$BASE_URL/api/health" > /dev/null; then
    echo -e "${RED}Error: Server is not running at $BASE_URL${NC}"
    echo "Please start the server with: npm start"
    exit 1
fi
echo -e "${GREEN}Server is running${NC}\n"

# Test 1: Health check
test_endpoint "GET" "/api/health" "" 200 "Health check"

# Test 2: Create session
echo ""
echo "Creating test session..."
SESSION_RESPONSE=$(curl -s -X POST "$BASE_URL/api/sessions" \
    -H "Content-Type: application/json" \
    -d '{"name": "Manual Test Session"}')

SESSION_ID=$(echo "$SESSION_RESPONSE" | jq -r '.sessionId' 2>/dev/null)

if [ -z "$SESSION_ID" ] || [ "$SESSION_ID" == "null" ]; then
    echo -e "${RED}Failed to create session${NC}"
    echo "Response: $SESSION_RESPONSE"
    exit 1
fi

echo -e "${GREEN}Session created: $SESSION_ID${NC}"

# Test 3: Get session
test_endpoint "GET" "/api/sessions/$SESSION_ID" "" 200 "Get session"

# Test 4: Get all sessions
test_endpoint "GET" "/api/sessions" "" 200 "Get all sessions"

# Test 5: Start recording
echo ""
echo "Starting recording session..."
echo "This will open a browser window. Please wait..."
START_RESPONSE=$(curl -s -X POST "$BASE_URL/api/sessions/$SESSION_ID/start" \
    -H "Content-Type: application/json" \
    -d '{"targetUrl": "https://example.com"}')

if echo "$START_RESPONSE" | jq -e '.status == "active"' > /dev/null 2>&1; then
    echo -e "${GREEN}Recording started${NC}"
else
    echo -e "${RED}Failed to start recording${NC}"
    echo "Response: $START_RESPONSE"
    exit 1
fi

# Wait for some requests to be captured
echo "Waiting 10 seconds for requests to be captured..."
sleep 10

# Test 6: Get requests (while recording)
test_endpoint "GET" "/api/sessions/$SESSION_ID/requests" "" 200 "Get requests (during recording)"

# Test 7: Stop recording
echo ""
echo "Stopping recording session..."
STOP_RESPONSE=$(curl -s -X POST "$BASE_URL/api/sessions/$SESSION_ID/stop")

if echo "$STOP_RESPONSE" | jq -e '.status == "stopped"' > /dev/null 2>&1; then
    echo -e "${GREEN}Recording stopped${NC}"
    TOTAL_REQUESTS=$(echo "$STOP_RESPONSE" | jq -r '.totalRequests' 2>/dev/null)
    echo "Total requests captured: $TOTAL_REQUESTS"
else
    echo -e "${RED}Failed to stop recording${NC}"
    echo "Response: $STOP_RESPONSE"
fi

# Test 8: Get requests (after recording)
test_endpoint "GET" "/api/sessions/$SESSION_ID/requests" "" 200 "Get requests (after recording)"

# Test 9: Delete session
echo ""
test_endpoint "DELETE" "/api/sessions/$SESSION_ID" "" 200 "Delete session"

# Test 10: Verify session is deleted
test_endpoint "GET" "/api/sessions/$SESSION_ID" "" 404 "Verify session deleted"

echo ""
echo "=============================="
echo -e "${GREEN}All manual tests completed!${NC}"
echo ""
