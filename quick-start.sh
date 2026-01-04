#!/bin/bash

# Quick Start Script for API Recorder
# This script demonstrates basic usage

BASE_URL="http://localhost:3000"

echo "🚀 API Recorder Quick Start"
echo "============================"
echo ""

# Check if server is running
echo "Checking if server is running..."
if ! curl -s "$BASE_URL/api/health" > /dev/null; then
    echo "❌ Server is not running!"
    echo "Please start the server first: npm start"
    exit 1
fi
echo "✅ Server is running"
echo ""

# Step 1: Create a session
echo "Step 1: Creating a recording session..."
SESSION_RESPONSE=$(curl -s -X POST "$BASE_URL/api/sessions" \
    -H "Content-Type: application/json" \
    -d '{"name": "Quick Start Demo"}')

SESSION_ID=$(echo "$SESSION_RESPONSE" | grep -o '"sessionId":"[^"]*' | cut -d'"' -f4)

if [ -z "$SESSION_ID" ]; then
    echo "❌ Failed to create session"
    exit 1
fi

echo "✅ Session created: $SESSION_ID"
echo ""

# Step 2: Start recording
echo "Step 2: Starting recording..."
echo "A browser window will open. Please wait..."
START_RESPONSE=$(curl -s -X POST "$BASE_URL/api/sessions/$SESSION_ID/start" \
    -H "Content-Type: application/json" \
    -d '{"targetUrl": "https://example.com"}')

if echo "$START_RESPONSE" | grep -q '"status":"active"'; then
    echo "✅ Recording started"
else
    echo "❌ Failed to start recording"
    echo "Response: $START_RESPONSE"
    exit 1
fi
echo ""

# Step 3: Wait
echo "Step 3: Waiting 15 seconds for requests to be captured..."
echo "You can interact with the browser window if you want."
for i in {15..1}; do
    echo -ne "\r⏳ Waiting... $i seconds remaining"
    sleep 1
done
echo -e "\r✅ Wait complete                    "
echo ""

# Step 4: Stop recording
echo "Step 4: Stopping recording..."
STOP_RESPONSE=$(curl -s -X POST "$BASE_URL/api/sessions/$SESSION_ID/stop")
TOTAL_REQUESTS=$(echo "$STOP_RESPONSE" | grep -o '"totalRequests":[0-9]*' | cut -d':' -f2)

if echo "$STOP_RESPONSE" | grep -q '"status":"stopped"'; then
    echo "✅ Recording stopped"
    echo "   Total requests captured: $TOTAL_REQUESTS"
else
    echo "❌ Failed to stop recording"
    exit 1
fi
echo ""

# Step 5: Get requests
echo "Step 5: Retrieving captured requests..."
REQUESTS=$(curl -s "$BASE_URL/api/sessions/$SESSION_ID/requests")
REQUEST_COUNT=$(echo "$REQUESTS" | grep -o '"url"' | wc -l | tr -d ' ')

echo "✅ Retrieved $REQUEST_COUNT requests"
echo ""

# Step 6: Show summary
echo "============================"
echo "📊 Summary"
echo "============================"
echo "Session ID: $SESSION_ID"
echo "Total Requests: $REQUEST_COUNT"
echo ""
echo "To view all requests, run:"
echo "  curl $BASE_URL/api/sessions/$SESSION_ID/requests | jq"
echo ""
echo "To view session details, run:"
echo "  curl $BASE_URL/api/sessions/$SESSION_ID | jq"
echo ""
echo "✅ Quick start complete!"
