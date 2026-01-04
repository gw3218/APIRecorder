# API Recorder - Usage Guide

## Quick Start

### 1. Start the Server

Open a terminal and run:

```bash
cd /Users/wen/Documents/Projects/APIRecorder
npm start
```

You should see:
```
Database initialized successfully
API Recorder server running on http://localhost:3000
Web dashboard available at http://localhost:3000
```

Keep this terminal open - the server needs to keep running.

### 2. Test the Server

In a new terminal, test the health endpoint:

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{"status":"ok","timestamp":"2024-01-01T00:00:00.000Z"}
```

## Basic Usage Workflow

### Step 1: Create a Recording Session

```bash
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"name": "My First Recording"}'
```

Response:
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "My First Recording",
  "targetUrl": null,
  "startTime": "2024-01-01T12:00:00.000Z",
  "endTime": null,
  "status": "idle",
  "totalRequests": 0,
  "metadata": {}
}
```

**Save the `sessionId`** - you'll need it for the next steps!

### Step 2: Start Recording

This will open a browser window and start capturing network traffic:

```bash
curl -X POST http://localhost:3000/api/sessions/{SESSION_ID}/start \
  -H "Content-Type: application/json" \
  -d '{"targetUrl": "https://example.com"}'
```

Replace `{SESSION_ID}` with the actual sessionId from Step 1.

**What happens:**
- A browser window opens
- Navigates to the target URL
- Starts capturing all network requests/responses
- You can interact with the page normally

### Step 3: Wait and Interact

Let the page load and interact with it:
- Click links
- Fill forms
- Trigger API calls
- All network traffic is being captured automatically

Wait at least 10-15 seconds for requests to be captured.

### Step 4: Stop Recording

```bash
curl -X POST http://localhost:3000/api/sessions/{SESSION_ID}/stop
```

**What happens:**
- Browser window closes
- Recording stops
- All captured data is saved to database

Response:
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "My First Recording",
  "status": "stopped",
  "totalRequests": 42,
  "endTime": "2024-01-01T12:05:00.000Z"
}
```

### Step 5: View Captured Requests

```bash
curl http://localhost:3000/api/sessions/{SESSION_ID}/requests
```

This returns an array of all captured request-response pairs:
```json
[
  {
    "id": "request-1",
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "url": "https://example.com/api/data",
    "method": "GET",
    "status": 200,
    "headers": {...},
    "body": "..."
  },
  ...
]
```

## Complete Example

Here's a complete example from start to finish:

```bash
# 1. Create session
SESSION=$(curl -s -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"name": "Example.com Recording"}' | jq -r '.sessionId')

echo "Session ID: $SESSION"

# 2. Start recording
curl -X POST http://localhost:3000/api/sessions/$SESSION/start \
  -H "Content-Type: application/json" \
  -d '{"targetUrl": "https://example.com"}'

# 3. Wait 15 seconds
echo "Recording... (wait 15 seconds)"
sleep 15

# 4. Stop recording
curl -X POST http://localhost:3000/api/sessions/$SESSION/stop

# 5. View requests
curl http://localhost:3000/api/sessions/$SESSION/requests | jq '.[0:5]'  # Show first 5
```

## API Endpoints Reference

### Health Check
```bash
GET /api/health
```

### Sessions

**List all sessions:**
```bash
GET /api/sessions
```

**Get specific session:**
```bash
GET /api/sessions/{sessionId}
```

**Create session:**
```bash
POST /api/sessions
Content-Type: application/json

{
  "name": "Session Name",
  "targetUrl": "https://example.com"  # optional
}
```

**Start recording:**
```bash
POST /api/sessions/{sessionId}/start
Content-Type: application/json

{
  "targetUrl": "https://example.com"  # required
}
```

**Stop recording:**
```bash
POST /api/sessions/{sessionId}/stop
```

**Delete session:**
```bash
DELETE /api/sessions/{sessionId}
```

### Requests

**Get all requests for a session:**
```bash
GET /api/sessions/{sessionId}/requests
```

## Using with Different Tools

### Using Postman

1. Import the API collection (create manually):
   - Base URL: `http://localhost:3000`
   - Endpoints as listed above

2. Create a session → Start recording → Stop → View requests

### Using JavaScript/Node.js

```javascript
const BASE_URL = 'http://localhost:3000';

// Create session
const sessionResponse = await fetch(`${BASE_URL}/api/sessions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'My Session' })
});
const { sessionId } = await sessionResponse.json();

// Start recording
await fetch(`${BASE_URL}/api/sessions/${sessionId}/start`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ targetUrl: 'https://example.com' })
});

// Wait...
await new Promise(resolve => setTimeout(resolve, 15000));

// Stop recording
await fetch(`${BASE_URL}/api/sessions/${sessionId}/stop`, {
  method: 'POST'
});

// Get requests
const requestsResponse = await fetch(`${BASE_URL}/api/sessions/${sessionId}/requests`);
const requests = await requestsResponse.json();
console.log(`Captured ${requests.length} requests`);
```

### Using Python

```python
import requests
import time

BASE_URL = 'http://localhost:3000'

# Create session
session = requests.post(f'{BASE_URL}/api/sessions', json={
    'name': 'Python Recording'
}).json()
session_id = session['sessionId']

# Start recording
requests.post(f'{BASE_URL}/api/sessions/{session_id}/start', json={
    'targetUrl': 'https://example.com'
})

# Wait
time.sleep(15)

# Stop recording
requests.post(f'{BASE_URL}/api/sessions/{session_id}/stop')

# Get requests
requests_data = requests.get(f'{BASE_URL}/api/sessions/{session_id}/requests').json()
print(f"Captured {len(requests_data)} requests")
```

## Use Cases

### 1. Analyze API Calls from a Website

1. Start recording with target URL
2. Navigate through the website
3. Stop recording
4. Analyze captured API calls to understand:
   - What endpoints are called
   - Request/response formats
   - Authentication methods
   - Data flow

### 2. Debug Network Issues

1. Record a problematic session
2. Review captured requests
3. Identify failed requests
4. Analyze error responses

### 3. API Documentation

1. Record interactions with an API
2. Export captured requests
3. Use as examples in documentation

### 4. Testing & QA

1. Record user flows
2. Verify all expected API calls are made
3. Check request/response data

## Tips & Best Practices

### 1. Wait for Page Load
After starting recording, wait 10-15 seconds for the page to fully load and make requests.

### 2. Multiple Sessions
You can have multiple recording sessions, but each opens a browser window. Be mindful of system resources.

### 3. Large Responses
Very large response bodies (>10MB) may take time to process. Be patient.

### 4. Headless Mode
To run browser in headless mode (no window), edit `config/default.json`:
```json
{
  "browser": {
    "headless": true
  }
}
```

### 5. Filter Requests
Currently all requests are captured. Future versions will support filtering by:
- Resource type (XHR, Fetch, Document, etc.)
- URL patterns
- HTTP methods
- Status codes

## Troubleshooting

### Browser Doesn't Open
- Check Playwright installation: `npx playwright --version`
- Reinstall browsers: `npx playwright install chromium`

### No Requests Captured
- Wait longer (15-20 seconds)
- Check browser console for errors
- Verify target URL is accessible
- Check network monitor is enabled

### Server Won't Start
- Check port 3000 is available: `lsof -i :3000`
- Check database directory exists: `ls -la data/`
- Check Node.js version: `node --version` (should be 18+)

### Can't Connect to API
- Verify server is running: `curl http://localhost:3000/api/health`
- Check firewall settings
- Try different port in `config/default.json`

## Next Steps

1. **Explore the API**: Try different endpoints
2. **Record Real Websites**: Test with your target websites
3. **Analyze Data**: Review captured requests/responses
4. **Export Data**: Use export utilities (coming soon)
5. **Build UI**: Create a web dashboard (future feature)

## Example Workflows

### Workflow 1: Quick Test
```bash
# One-liner to create, start, wait, stop, and view
SESSION=$(curl -s -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"name":"Quick Test"}' | jq -r '.sessionId') && \
curl -X POST http://localhost:3000/api/sessions/$SESSION/start \
  -H "Content-Type: application/json" \
  -d '{"targetUrl":"https://example.com"}' && \
sleep 15 && \
curl -X POST http://localhost:3000/api/sessions/$SESSION/stop && \
curl http://localhost:3000/api/sessions/$SESSION/requests | jq 'length'
```

### Workflow 2: Multiple Sites
```bash
# Record multiple sites in sequence
for site in "https://example.com" "https://httpbin.org" "https://jsonplaceholder.typicode.com"; do
  SESSION=$(curl -s -X POST http://localhost:3000/api/sessions \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"Recording $site\"}" | jq -r '.sessionId')
  
  curl -X POST http://localhost:3000/api/sessions/$SESSION/start \
    -H "Content-Type: application/json" \
    -d "{\"targetUrl\":\"$site\"}"
  
  sleep 10
  
  curl -X POST http://localhost:3000/api/sessions/$SESSION/stop
  
  echo "Recorded $site: $SESSION"
done
```

## Getting Help

- Check `README.md` for overview
- Check `TESTING_GUIDE.md` for testing examples
- Review `ARCHITECTURE.md` for system design
- Check `SPECIFICATIONS.md` for detailed requirements

Happy Recording! 🎉
