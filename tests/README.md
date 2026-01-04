# Testing Guide

This directory contains tests for the API Recorder application.

## Test Structure

```
tests/
├── unit/              # Unit tests for individual modules
│   ├── browser-launcher.test.js
│   └── cdp-client.test.js
├── integration/      # Integration tests
│   ├── session-flow.test.js
│   └── api.test.js
├── test-setup.js     # Test utilities and setup
├── run-tests.js      # Test runner script
├── manual-test.sh    # Manual API testing script
└── README.md         # This file
```

## Prerequisites

1. **Install Node.js** (version 18 or higher)
   ```bash
   # Check if Node.js is installed
   node --version
   ```

2. **Install Dependencies**
   ```bash
   npm install
   npx playwright install chromium
   ```

3. **Install Test Dependencies** (if using Jest or other test framework)
   ```bash
   npm install --save-dev jest supertest
   ```

## Running Tests

### Option 1: Node.js Built-in Test Runner

Node.js 18+ includes a built-in test runner. Run tests with:

```bash
# Run all tests
node --test tests/**/*.test.js

# Run specific test file
node --test tests/unit/browser-launcher.test.js
```

### Option 2: Using the Test Runner Script

```bash
node tests/run-tests.js
```

### Option 3: Manual API Testing

1. **Start the server** in one terminal:
   ```bash
   npm start
   ```

2. **Run manual tests** in another terminal:
   ```bash
   ./tests/manual-test.sh
   ```

   Or if you don't have bash:
   ```bash
   bash tests/manual-test.sh
   ```

## Test Categories

### Unit Tests

Test individual modules in isolation:
- `browser-launcher.test.js` - Browser lifecycle
- `cdp-client.test.js` - CDP protocol wrapper

### Integration Tests

Test how modules work together:
- `session-flow.test.js` - Complete session lifecycle
- `api.test.js` - API endpoint testing

## Manual Testing Checklist

### Basic Functionality

- [ ] Server starts without errors
- [ ] Health endpoint returns OK
- [ ] Can create a session
- [ ] Can start recording
- [ ] Browser opens and navigates
- [ ] Network requests are captured
- [ ] Can stop recording
- [ ] Can view captured requests
- [ ] Can delete session

### Error Handling

- [ ] Invalid session ID returns 404
- [ ] Starting already active session returns error
- [ ] Stopping inactive session returns error
- [ ] Missing required fields return 400

### Edge Cases

- [ ] Multiple concurrent sessions
- [ ] Very long URLs
- [ ] Large response bodies
- [ ] Network errors
- [ ] Browser crashes

## Test Data

Test sessions are stored in the database. To clean up test data:

```bash
# Delete the test database
rm data/api-recorder.db
```

## Troubleshooting

### Tests Fail to Run

1. **Check Node.js version**:
   ```bash
   node --version  # Should be 18+
   ```

2. **Check dependencies**:
   ```bash
   npm list
   ```

3. **Check Playwright installation**:
   ```bash
   npx playwright --version
   ```

### Browser Tests Fail

1. **Install Playwright browsers**:
   ```bash
   npx playwright install chromium
   ```

2. **Check browser permissions** (macOS):
   - System Preferences → Security & Privacy → Privacy → Accessibility
   - Allow Terminal/IDE to control computer

### API Tests Fail

1. **Ensure server is running**:
   ```bash
   curl http://localhost:3000/api/health
   ```

2. **Check port availability**:
   ```bash
   lsof -i :3000
   ```

## Writing New Tests

### Unit Test Template

```javascript
import { ModuleName } from '../../src/path/to/module.js';

describe('ModuleName', () => {
  let instance;

  beforeEach(() => {
    instance = new ModuleName();
  });

  test('should do something', () => {
    expect(instance.method()).toBe(expected);
  });
});
```

### Integration Test Template

```javascript
import { initializeDatabase } from '../../src/storage/database.js';

describe('Feature Integration', () => {
  beforeAll(async () => {
    await initializeDatabase();
  });

  test('should work end-to-end', async () => {
    // Test complete flow
  });
});
```

## Continuous Integration

To set up CI/CD testing:

1. Create `.github/workflows/test.yml` (for GitHub Actions)
2. Add test script to `package.json`:
   ```json
   {
     "scripts": {
       "test": "node --test tests/**/*.test.js"
     }
   }
   ```
3. Run tests on every push

## Performance Testing

For performance testing, consider:

1. **Load testing** with tools like:
   - Apache Bench (ab)
   - wrk
   - k6

2. **Memory profiling**:
   ```bash
   node --inspect src/index.js
   # Use Chrome DevTools to profile
   ```

3. **Database performance**:
   - Monitor query times
   - Check index usage
   - Analyze slow queries

## Coverage

To check test coverage (requires coverage tool):

```bash
npm install --save-dev c8
c8 node --test tests/**/*.test.js
```
