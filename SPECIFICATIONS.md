# API Recorder - Specifications & Architecture

## 1. Overview

### 1.1 Purpose
Build an application that records all API requests and responses from frontend to backend for any given website using Browser DevTools Protocol (CDP).

### 1.2 Core Functionality
- Launch a controlled browser instance
- Navigate to target websites
- Capture all network traffic (HTTP/HTTPS requests and responses)
- Record request/response headers, bodies, timing, and metadata
- Store recordings in a searchable format
- Provide UI to view, search, filter, and export recordings

### 1.3 Key Benefits of CDP Approach
- **Complete Coverage**: Captures ALL network traffic, including:
  - Fetch API calls
  - XMLHttpRequest
  - Service Worker requests
  - WebSocket connections
  - Preflight requests
  - Redirects
  - Resource loading (images, CSS, JS)
- **No Code Injection**: No need to modify target websites
- **Full Control**: Can control browser behavior, cookies, headers
- **Automation Ready**: Can automate user interactions and record flows

---

## 2. Technical Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User Interface                        │
│  (Web Dashboard / Desktop App / CLI)                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Application Core                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Session    │  │   Recording  │  │   Storage    │      │
│  │  Manager     │  │   Manager    │  │   Manager    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  CDP Client Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Browser    │  │   Network     │  │   Page       │      │
│  │   Launcher   │  │   Monitor     │  │   Controller │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Browser Instance (Chrome/Chromium)              │
│              Controlled via CDP WebSocket                    │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Component Breakdown

#### 2.2.1 Browser Launcher
- **Responsibility**: Launch and manage browser instances
- **Key Functions**:
  - Launch Chrome/Chromium in remote debugging mode
  - Configure browser flags (headless/headed, user data dir, etc.)
  - Establish CDP WebSocket connection
  - Manage browser lifecycle (start, stop, restart)
  - Handle browser crashes and recovery

#### 2.2.2 CDP Client
- **Responsibility**: Communicate with browser via CDP protocol
- **Key Functions**:
  - Send CDP commands (Page.navigate, Network.enable, etc.)
  - Receive CDP events (Network.requestWillBeSent, Network.responseReceived, etc.)
  - Parse CDP messages (JSON-RPC format)
  - Handle WebSocket connection management
  - Implement retry logic for failed commands

#### 2.2.3 Network Monitor
- **Responsibility**: Capture and process network events
- **Key Functions**:
  - Enable Network domain in CDP
  - Listen to network events:
    - `Network.requestWillBeSent` - Request initiated
    - `Network.responseReceived` - Response received
    - `Network.loadingFinished` - Request completed
    - `Network.loadingFailed` - Request failed
    - `Network.requestServedFromCache` - Cached response
  - Correlate requests with responses
  - Extract request/response bodies using `Network.getResponseBody`
  - Extract request post data using `Network.getRequestPostData`
  - Handle streaming responses
  - Track redirect chains

#### 2.2.4 Recording Manager
- **Responsibility**: Organize and structure captured data
- **Key Functions**:
  - Create recording sessions
  - Associate requests with sessions
  - Build request/response pairs
  - Calculate timing metrics
  - Handle concurrent requests
  - Generate unique request IDs
  - Track request dependencies (redirects, preflight)

#### 2.2.5 Storage Manager
- **Responsibility**: Persist recordings to storage
- **Key Functions**:
  - Store recordings in database (SQLite/PostgreSQL/MongoDB)
  - Store request/response bodies (handle large payloads)
  - Index recordings for fast search
  - Implement data retention policies
  - Export recordings (JSON, HAR format)
  - Handle storage cleanup

#### 2.2.6 Session Manager
- **Responsibility**: Manage recording sessions
- **Key Functions**:
  - Create new recording sessions
  - Start/stop/pause recordings
  - Associate sessions with target URLs
  - Track session metadata (start time, duration, request count)
  - Manage multiple concurrent sessions

#### 2.2.7 User Interface
- **Responsibility**: Provide user interaction layer
- **Key Functions**:
  - Start/stop recording sessions
  - Configure target URLs
  - View recorded requests/responses
  - Search and filter recordings
  - Export recordings
  - Real-time monitoring dashboard
  - Request/response viewer with syntax highlighting

---

## 3. Data Models

### 3.1 Recording Session
```json
{
  "sessionId": "uuid",
  "name": "string",
  "targetUrl": "string",
  "startTime": "ISO 8601 timestamp",
  "endTime": "ISO 8601 timestamp",
  "status": "active|paused|stopped|completed",
  "totalRequests": "number",
  "metadata": {
    "userAgent": "string",
    "viewport": { "width": "number", "height": "number" },
    "cookies": ["array"],
    "headers": { "key": "value" }
  }
}
```

### 3.2 Network Request
```json
{
  "requestId": "string (CDP requestId)",
  "sessionId": "uuid",
  "timestamp": "ISO 8601 timestamp",
  "url": "string",
  "method": "GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD",
  "headers": { "key": "value" },
  "postData": "string|null",
  "postDataJSON": "object|null",
  "queryString": "string",
  "referrer": "string",
  "initiator": {
    "type": "parser|script|preflight|other",
    "url": "string",
    "lineNumber": "number",
    "columnNumber": "number"
  },
  "redirectChain": ["array of requestIds"],
  "isNavigationRequest": "boolean",
  "frameId": "string",
  "resourceType": "document|stylesheet|image|media|font|script|texttrack|xhr|fetch|eventsource|websocket|manifest|other"
}
```

### 3.3 Network Response
```json
{
  "requestId": "string (matches request)",
  "timestamp": "ISO 8601 timestamp",
  "status": "number",
  "statusText": "string",
  "headers": { "key": "value" },
  "mimeType": "string",
  "body": "string|binary",
  "bodySize": "number",
  "bodyTruncated": "boolean",
  "fromCache": "boolean",
  "fromServiceWorker": "boolean",
  "protocol": "http/1.1|h2|h3|websocket",
  "remoteIPAddress": "string",
  "remotePort": "number"
}
```

### 3.4 Request-Response Pair (Complete Record)
```json
{
  "id": "uuid",
  "sessionId": "uuid",
  "request": { /* Network Request object */ },
  "response": { /* Network Response object */ },
  "timing": {
    "startTime": "number (relative to session start)",
    "requestTime": "number",
    "responseTime": "number",
    "endTime": "number",
    "duration": "number",
    "dns": "number",
    "connect": "number",
    "ssl": "number",
    "send": "number",
    "wait": "number",
    "receive": "number"
  },
  "error": {
    "errorText": "string",
    "canceled": "boolean",
    "blockedReason": "string"
  }
}
```

---

## 4. CDP Protocol Usage

### 4.1 Required CDP Domains

#### Network Domain
- **Enable**: `Network.enable`
- **Events**:
  - `Network.requestWillBeSent` - Capture request details
  - `Network.responseReceived` - Capture response headers
  - `Network.loadingFinished` - Request completed
  - `Network.loadingFailed` - Request failed
  - `Network.requestServedFromCache` - Cached response
  - `Network.dataReceived` - Track data transfer
- **Commands**:
  - `Network.getResponseBody` - Get response body
  - `Network.getRequestPostData` - Get request body
  - `Network.setCacheDisabled` - Disable cache (optional)
  - `Network.setBypassServiceWorker` - Bypass service workers (optional)

#### Page Domain
- **Enable**: `Page.enable`
- **Commands**:
  - `Page.navigate` - Navigate to URL
  - `Page.setUserAgentOverride` - Override user agent
  - `Page.setExtraHTTPHeaders` - Set custom headers
- **Events**:
  - `Page.frameNavigated` - Track navigation
  - `Page.loadEventFired` - Page loaded

#### Runtime Domain (Optional)
- **Enable**: `Runtime.enable`
- **Use**: Execute JavaScript in page context if needed

### 4.2 CDP Connection Flow

1. Launch browser with `--remote-debugging-port` flag
2. Connect to `ws://localhost:{port}/devtools/browser` or `ws://localhost:{port}/devtools/page/{targetId}`
3. Send `Target.createTarget` to create new page (if using browser endpoint)
4. Enable required domains (`Network.enable`, `Page.enable`)
5. Start listening to events
6. Navigate to target URL using `Page.navigate`
7. Capture all network events
8. For each response, call `Network.getResponseBody` to get body
9. For POST requests, call `Network.getRequestPostData` to get body

### 4.3 Event Correlation

CDP provides `requestId` for correlating requests and responses:
- `Network.requestWillBeSent` contains `requestId` and `request`
- `Network.responseReceived` contains same `requestId` and `response`
- `Network.loadingFinished` contains same `requestId` and timing info
- Use `requestId` as primary key to match requests with responses

---

## 5. User Flows

### 5.1 Start Recording Session

1. User opens application
2. User enters target URL
3. User clicks "Start Recording"
4. Application:
   - Launches browser instance
   - Establishes CDP connection
   - Creates new session record
   - Navigates to target URL
   - Begins capturing network events
5. User sees real-time request list
6. User can interact with the page (clicks, form submissions, etc.)
7. All API calls are automatically captured

### 5.2 View Recordings

1. User navigates to "Recordings" view
2. User sees list of sessions
3. User selects a session
4. Application displays:
   - Session metadata
   - List of all requests (filterable by method, status, resource type)
   - Request/response details on selection
5. User can:
   - Search by URL, method, status code
   - Filter by resource type (XHR, Fetch, Document, etc.)
   - View request/response bodies with syntax highlighting
   - Copy request/response data
   - Export as HAR or JSON

### 5.3 Export Recordings

1. User selects session or individual requests
2. User chooses export format (HAR, JSON, CSV)
3. Application generates export file
4. User downloads file

---

## 6. Technical Requirements

### 6.1 Technology Stack Options

#### Option A: Node.js + Puppeteer/Playwright
- **Puppeteer**: Official Chrome DevTools Protocol library
- **Playwright**: Multi-browser support (Chrome, Firefox, Safari)
- **Pros**: 
  - High-level API, easier to use
  - Built-in browser management
  - Active community
- **Cons**: 
  - Less control over CDP directly
  - Additional abstraction layer

#### Option B: Node.js + chrome-remote-interface
- **chrome-remote-interface**: Direct CDP client
- **Pros**: 
  - Direct CDP access
  - More control
  - Lighter weight
- **Cons**: 
  - More manual work
  - Need to manage browser launch separately

#### Option C: Python + pyppeteer/pywb
- **pyppeteer**: Python port of Puppeteer
- **pywb**: Python WebDriver
- **Pros**: 
  - Python ecosystem
  - Good for data processing
- **Cons**: 
  - Less maintained than Node.js options

#### Option D: Go + chromedp
- **chromedp**: Go CDP client
- **Pros**: 
  - High performance
  - Good concurrency
- **Cons**: 
  - Smaller ecosystem

**Recommended**: Node.js + Puppeteer or Playwright (easier development, good documentation)

### 6.2 Storage Options

#### SQLite
- **Pros**: Simple, no server needed, good for single-user
- **Cons**: Limited concurrency, not ideal for large scale

#### PostgreSQL
- **Pros**: Robust, good for production, supports JSON columns
- **Cons**: Requires database server

#### MongoDB
- **Pros**: Flexible schema, good for nested data
- **Cons**: More complex queries

**Recommended**: Start with SQLite, migrate to PostgreSQL if needed

### 6.3 UI Options

#### Web Dashboard (React/Vue)
- **Pros**: Cross-platform, modern UI
- **Cons**: Requires web server

#### Desktop App (Electron/Tauri)
- **Pros**: Native feel, integrated
- **Cons**: Larger bundle size

#### CLI
- **Pros**: Simple, scriptable
- **Cons**: Limited visualization

**Recommended**: Web Dashboard (React) + optional Electron wrapper

---

## 7. Implementation Considerations

### 7.1 Performance

- **Large Response Bodies**: 
  - Store bodies separately or compress
  - Implement pagination for large lists
  - Consider streaming for very large responses

- **High Request Volume**:
  - Batch database writes
  - Use connection pooling
  - Implement rate limiting for storage

- **Memory Management**:
  - Don't keep all requests in memory
  - Stream data to storage
  - Implement cleanup for old sessions

### 7.2 Error Handling

- **Browser Crashes**: 
  - Detect and restart browser
  - Save partial recordings
  - Implement recovery mechanism

- **CDP Connection Loss**:
  - Implement reconnection logic
  - Handle WebSocket errors gracefully
  - Queue events during disconnection

- **Missing Response Bodies**:
  - Some responses may not be available (cached, blocked)
  - Handle `Network.getResponseBody` errors
  - Mark unavailable bodies clearly

### 7.3 Security & Privacy

- **Sensitive Data**:
  - Option to mask sensitive headers (Authorization, Cookie)
  - Option to redact request/response bodies
  - Encryption for stored data

- **User Permissions**:
  - Clear indication of what's being recorded
  - User control over recording scope
  - Easy deletion of recordings

### 7.4 Browser Configuration

- **Headless vs Headed**:
  - Support both modes
  - Headless for automation
  - Headed for debugging

- **User Data**:
  - Option to use existing browser profile
  - Option for clean profile
  - Handle cookies and local storage

- **Network Conditions**:
  - Simulate slow network
  - Throttle bandwidth
  - Simulate offline mode

### 7.5 Filtering & Filtering

- **Request Filtering**:
  - Filter by URL pattern
  - Filter by resource type
  - Filter by method
  - Filter by status code
  - Filter by MIME type

- **Body Filtering**:
  - Only record API requests (exclude images, CSS, etc.)
  - Configurable inclusion/exclusion rules

---

## 8. File Structure (Proposed)

```
APIRecorder/
├── src/
│   ├── core/
│   │   ├── browser-launcher.js
│   │   ├── cdp-client.js
│   │   ├── network-monitor.js
│   │   └── event-handler.js
│   ├── managers/
│   │   ├── session-manager.js
│   │   ├── recording-manager.js
│   │   └── storage-manager.js
│   ├── models/
│   │   ├── session.js
│   │   ├── request.js
│   │   └── response.js
│   ├── storage/
│   │   ├── database.js
│   │   └── migrations/
│   ├── utils/
│   │   ├── har-exporter.js
│   │   ├── json-exporter.js
│   │   └── formatters.js
│   └── api/
│       └── routes.js
├── ui/
│   ├── components/
│   ├── pages/
│   └── services/
├── config/
│   └── default.json
├── tests/
├── docs/
└── package.json
```

---

## 9. Success Criteria

### 9.1 Functional Requirements
- ✅ Capture all HTTP/HTTPS requests and responses
- ✅ Record request/response headers and bodies
- ✅ Record timing information
- ✅ Support multiple concurrent sessions
- ✅ Search and filter recordings
- ✅ Export to HAR and JSON formats
- ✅ Real-time monitoring dashboard

### 9.2 Non-Functional Requirements
- ✅ Handle 1000+ requests per session
- ✅ Support response bodies up to 10MB
- ✅ UI response time < 200ms
- ✅ Storage efficient (compression, cleanup)
- ✅ Cross-platform (Windows, macOS, Linux)

---

## 10. Future Enhancements

- **Request Replay**: Replay captured requests
- **Request Modification**: Modify and replay requests
- **Comparison**: Compare requests across sessions
- **Mocking**: Create mock responses from recordings
- **Performance Analysis**: Analyze request timing and bottlenecks
- **WebSocket Support**: Full WebSocket message capture
- **Authentication**: Support for authenticated sessions
- **Team Collaboration**: Share recordings with team
- **CI/CD Integration**: Record API calls in automated tests

---

## 11. Dependencies (Estimated)

### Core Dependencies
- **CDP Client**: puppeteer or playwright or chrome-remote-interface
- **Database**: sqlite3 or pg or mongodb
- **Web Framework**: express or fastify (if web UI)
- **WebSocket**: ws (if direct CDP connection)

### UI Dependencies (if web dashboard)
- **Frontend Framework**: React or Vue
- **UI Library**: Material-UI or Ant Design
- **State Management**: Redux or Zustand
- **HTTP Client**: axios or fetch

### Utility Dependencies
- **UUID**: uuid
- **Date Handling**: date-fns or moment
- **JSON Parsing**: json-bigint (for large numbers)
- **Compression**: zlib

---

## 12. Development Phases

### Phase 1: Core CDP Integration
- Browser launcher
- CDP client setup
- Basic network event capture
- Request/response correlation

### Phase 2: Data Storage
- Database schema
- Storage manager
- Session management
- Request/response persistence

### Phase 3: Recording Manager
- Complete request/response pairs
- Timing calculation
- Error handling
- Redirect chain tracking

### Phase 4: User Interface
- Session management UI
- Request list view
- Request/response detail view
- Search and filter

### Phase 5: Export & Polish
- HAR export
- JSON export
- Performance optimization
- Error handling improvements
- Documentation

---

This specification provides a comprehensive foundation for building the API Recorder application using CDP. The architecture is modular, scalable, and follows best practices for handling network traffic capture and storage.

