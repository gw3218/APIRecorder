# Implementation Examples: Automatic API Invocation

## Quick Start Examples

### Example 1: Basic Single Request Replay

```javascript
import { APIReplayEngine } from './src/core/api-replay-engine.js';
import { getStorageManager } from './src/storage/database.js';

const storageManager = getStorageManager();
const replayEngine = new APIReplayEngine();

// Get a captured request
const requests = await storageManager.getRequestResponses(sessionId);
const apiRequest = requests.find(r => r.method === 'POST' && r.url.includes('/api/users'));

// Replay it
const result = await replayEngine.replay(apiRequest);

console.log('Status:', result.status);
console.log('Response:', result.body);
```

### Example 2: Batch Replay All JSON APIs

```javascript
// Replay all JSON API requests from a session
const requests = await storageManager.getRequestResponses(sessionId);
const jsonRequests = requests.filter(req => {
  const mimeType = req.mimeType?.toLowerCase() || '';
  return mimeType.includes('json');
});

const results = await replayEngine.replayBatch(jsonRequests, {
  parallel: true,
  maxConcurrent: 5
});

results.forEach((result, index) => {
  console.log(`${jsonRequests[index].method} ${jsonRequests[index].url}: ${result.status}`);
});
```

### Example 3: Sequential Replay with Dependencies

```javascript
// Replay requests in order, handling dependencies
const requests = await storageManager.getRequestResponses(sessionId);
const dependencyTracker = new DependencyTracker();

// Build dependency graph
const graph = dependencyTracker.buildGraph(requests);
const executionOrder = dependencyTracker.topologicalSort(graph);

const variables = {}; // Store extracted variables

for (const requestId of executionOrder) {
  const request = requests.find(r => r.id === requestId);
  
  // Inject variables from previous responses
  const modifiedRequest = dependencyTracker.injectVariables(request, variables);
  
  // Execute request
  const result = await replayEngine.replay(modifiedRequest);
  
  // Extract variables from response
  const extracted = dependencyTracker.extractVariables(result);
  Object.assign(variables, extracted);
  
  console.log(`✅ ${request.method} ${request.url}: ${result.status}`);
}
```

### Example 4: Parameter Modification

```javascript
// Modify request parameters before replay
const request = await storageManager.getRequest(requestId);

// Parse and modify request body
const body = JSON.parse(request.postData);
const modifiedBody = {
  ...body,
  userId: 999,           // Change userId
  timestamp: Date.now(), // Update timestamp
  status: 'active'       // Add new field
};

const modifiedRequest = {
  ...request,
  postData: JSON.stringify(modifiedBody)
};

const result = await replayEngine.replay(modifiedRequest);
```

### Example 5: Authentication Token Refresh

```javascript
const authManager = new AuthManager();

// Replay with automatic token refresh
const request = await storageManager.getRequest(requestId);

// Check if token is expired
if (authManager.isTokenExpired(request.headers.Authorization)) {
  // Refresh token
  const newToken = await authManager.refreshToken(sessionId);
  
  // Update request with new token
  request.headers.Authorization = `Bearer ${newToken}`;
}

const result = await replayEngine.replay(request);
```

### Example 6: Extract and Use Variables

```javascript
// Login and use token in subsequent requests
const loginRequest = requests.find(r => r.url.includes('/login'));
const loginResult = await replayEngine.replay(loginRequest);

// Extract token from login response
const loginResponse = JSON.parse(loginResult.body);
const token = loginResponse.data.token;

// Use token in profile request
const profileRequest = requests.find(r => r.url.includes('/profile'));
profileRequest.headers.Authorization = `Bearer ${token}`;

const profileResult = await replayEngine.replay(profileRequest);
```

### Example 7: Compare Responses

```javascript
// Replay and compare with original response
const originalRequest = await storageManager.getRequest(requestId);
const originalResponse = await storageManager.getResponse(requestId);

// Replay request
const replayedResponse = await replayEngine.replay(originalRequest);

// Compare
const differences = compareResponses(originalResponse, replayedResponse);

if (differences.length === 0) {
  console.log('✅ Responses match');
} else {
  console.log('⚠️ Differences found:');
  differences.forEach(diff => {
    console.log(`  - ${diff.path}: ${diff.original} → ${diff.replayed}`);
  });
}
```

### Example 8: Generate Test Cases

```javascript
// Generate test cases from captured requests
const requests = await storageManager.getRequestResponses(sessionId);
const jsonRequests = requests.filter(r => isJsonResponse(r));

const testGenerator = new TestGenerator();

for (const request of jsonRequests) {
  const testCase = testGenerator.generateTestCase(request, {
    framework: 'jest',
    includeAssertions: true
  });
  
  console.log(testCase);
}
```

## API Replay Engine Interface

```javascript
class APIReplayEngine {
  /**
   * Replay a single request
   * @param {Object} request - Captured request object
   * @param {Object} options - Replay options
   * @returns {Promise<Object>} - Response object
   */
  async replay(request, options = {}) {
    // Implementation
  }
  
  /**
   * Replay multiple requests
   * @param {Array} requests - Array of request objects
   * @param {Object} options - Replay options
   * @returns {Promise<Array>} - Array of response objects
   */
  async replayBatch(requests, options = {}) {
    // Implementation
  }
  
  /**
   * Replay requests sequentially with dependency handling
   * @param {Array} requests - Array of request objects
   * @param {Object} options - Replay options
   * @returns {Promise<Array>} - Array of response objects
   */
  async replaySequential(requests, options = {}) {
    // Implementation
  }
}
```

## Options Object

```javascript
const options = {
  // Authentication
  refreshToken: true,           // Auto-refresh expired tokens
  updateCookies: true,          // Update cookies from responses
  
  // Execution
  parallel: false,              // Execute in parallel (for batch)
  maxConcurrent: 5,            // Max concurrent requests
  timeout: 30000,              // Request timeout in ms
  
  // Modifications
  parameterModifications: {    // Modify parameters
    'userId': 999,
    'timestamp': () => Date.now()
  },
  
  // Validation
  validateResponse: true,      // Validate against schema
  compareWithOriginal: true,   // Compare with original response
  
  // Error handling
  continueOnError: false,      // Continue on error (batch mode)
  retryOnFailure: true,        // Retry failed requests
  maxRetries: 3                // Max retry attempts
};
```

## Expected Implementation Timeline

### Week 1-2: Basic Replay Engine
- ✅ HTTP client integration
- ✅ Single request replay
- ✅ Basic error handling

### Week 3-4: Enhanced Features
- ✅ Parameter modification
- ✅ Batch replay
- ✅ Authentication handling

### Week 5-6: Advanced Features
- ✅ Dependency tracking
- ✅ Sequential replay
- ✅ Variable extraction/injection

### Week 7-8: UI Integration
- ✅ Replay button in UI
- ✅ Results display
- ✅ Parameter editor

### Week 9-10: Polish & Testing
- ✅ Error handling improvements
- ✅ Performance optimization
- ✅ Documentation
