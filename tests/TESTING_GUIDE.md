# Testing Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install
npx playwright install chromium
```

### 2. Start the Server

```bash
npm start
```

The server will start on `http://localhost:3000`

### 3. Run Tests

#### Automated Tests (Node.js built-in test runner)

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run with custom test runner
npm run test:all
```

#### Manual API Tests

In a separate terminal:

```bash
# Make script executable (first time only)
chmod +x tests/manual-test.sh

# Run manual tests
npm run test:manual
# or
./tests/manual-test.sh
```

## Test Structure

### Unit Tests (`tests/unit/`)

- **browser-launcher.test.js** - Tests browser lifecycle management
- **cdp-client.test.js** - Tests CDP protocol wrapper

### Integration Tests (`tests/integration/`)

- **session-flow.test.js** - Tests complete session lifecycle
- **api.test.js** - Tests all API endpoints

## Manual Testing Steps

### 1. Health Check

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 2. Create a Session

```bash
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"name": "My Test Session"}'
```

Expected response:
```json
{
  "sessionId": "uuid-here",
  "name": "My Test Session",
  "status": "idle",
  "startTime": "2024-01-01T00:00:00.000Z"
}
```

Save the `sessionId` for next steps.

### 3. Start Recording

```bash
curl -X POST http://localhost:3000/api/sessions/{SESSION_ID}/start \
  -H "Content-Type: application/json" \
  -d '{"targetUrl": "https://example.com"}'
```

This will:
- Open a browser window
- Navigate to the target URL
- Start capturing network traffic

### 4. Wait for Requests

Wait 10-15 seconds for the page to load and make requests.

### 5. Stop Recording

```bash
curl -X POST http://localhost:3000/api/sessions/{SESSION_ID}/stop
```

This will:
- Close the browser
- Finalize the recording
- Return session summary

### 6. View Captured Requests

```bash
curl http://localhost:3000/api/sessions/{SESSION_ID}/requests
```

Expected response: Array of request-response pairs

### 7. Get Session Details

```bash
curl http://localhost:3000/api/sessions/{SESSION_ID}
```

### 8. Delete Session

```bash
curl -X DELETE http://localhost:3000/api/sessions/{SESSION_ID}
```

## Test Scenarios

### Scenario 1: Basic Recording

1. Create session
2. Start recording with `https://example.com`
3. Wait 10 seconds
4. Stop recording
5. Verify requests were captured
6. Check request count > 0

### Scenario 2: Error Handling

1. Try to get non-existent session → Should return 404
2. Try to start session without targetUrl → Should return 400
3. Try to stop inactive session → Should return 409
4. Try to start already active session → Should return 409

### Scenario 3: Multiple Sessions

1. Create session 1
2. Create session 2
3. Start session 1
4. Start session 2 (should work)
5. Stop both sessions
6. Verify both have different sessionIds

### Scenario 4: Request Filtering (Future)

1. Record session with various resource types
2. Filter by method (GET, POST, etc.)
3. Filter by status code
4. Filter by resource type

## Troubleshooting

### Server Won't Start

1. Check if port 3000 is available:
   ```bash
   lsof -i :3000
   ```

2. Check Node.js version:
   ```bash
   node --version  # Should be 18+
   ```

3. Check database directory:
   ```bash
   ls -la data/
   ```

### Browser Won't Open

1. Install Playwright browsers:
   ```bash
   npx playwright install chromium
   ```

2. Check browser permissions (macOS):
   - System Preferences → Security & Privacy
   - Allow Terminal/IDE to control computer

### Tests Fail

1. Check if server is running:
   ```bash
   curl http://localhost:3000/api/health
   ```

2. Check database:
   ```bash
   sqlite3 data/api-recorder.db "SELECT COUNT(*) FROM sessions;"
   ```

3. Check logs in server terminal

### No Requests Captured

1. Verify Network domain is enabled
2. Check browser console for errors
3. Verify target URL is accessible
4. Wait longer for page to fully load

## Performance Testing

### Load Test with Apache Bench

```bash
# Install ab (Apache Bench)
# macOS: brew install httpd

# Test health endpoint
ab -n 1000 -c 10 http://localhost:3000/api/health

# Test session creation
ab -n 100 -c 5 -p session.json -T application/json \
   http://localhost:3000/api/sessions
```

### Memory Profiling

```bash
# Start with inspector
node --inspect src/index.js

# Connect Chrome DevTools
# chrome://inspect
```

## Test Coverage Goals

- [ ] Unit test coverage > 80%
- [ ] Integration test coverage > 70%
- [ ] All API endpoints tested
- [ ] Error scenarios covered
- [ ] Edge cases handled

## Continuous Integration

For CI/CD, add to `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npx playwright install chromium
      - run: npm test
```

## Next Steps

1. Add more unit tests for all modules
2. Add E2E tests with Playwright
3. Add performance benchmarks
4. Add load testing
5. Set up CI/CD pipeline
