# Automatic API Invocation Architecture

## System Flow Diagram

```mermaid
graph TB
    subgraph "Phase 1: Capture"
        A[User Browser] -->|User Actions| B[Frontend App]
        B -->|API Calls| C[Backend API]
        C -->|Responses| B
        
        D[CDP Monitor] -->|Intercepts| B
        D -->|Captures| E[Request Data]
        D -->|Captures| F[Response Data]
        E --> G[Storage]
        F --> G
    end
    
    subgraph "Phase 2: Analysis"
        G --> H[Parameter Extractor]
        H --> I[Path Params]
        H --> J[Query Params]
        H --> K[Body Params]
        H --> L[Header Params]
        
        G --> M[Schema Generator]
        M --> N[Request Schema]
        M --> O[Response Schema]
    end
    
    subgraph "Phase 3: Replay"
        P[Replay Engine] -->|Read| G
        P -->|Read| N
        P -->|Read| O
        
        Q[Auth Manager] --> P
        R[Dependency Tracker] --> P
        S[Parameter Modifier] --> P
        
        P -->|Execute| T{Request Type}
        T -->|Direct| U[HTTP Client]
        T -->|CORS| V[Browser CDP]
        U --> W[Response]
        V --> W
        
        W --> X[Validator]
        X -->|Compare| O
        X --> Y[Results]
    end
    
    subgraph "Phase 4: Management"
        Z[UI Dashboard] --> P
        Z --> S
        Z --> Q
        Z --> Y
    end
```

## Request Replay Flow

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant ReplayEngine
    participant AuthManager
    participant HTTPClient
    participant API
    
    User->>UI: Select Request to Replay
    UI->>ReplayEngine: Replay Request(ID)
    
    ReplayEngine->>ReplayEngine: Load Request Data
    ReplayEngine->>AuthManager: Check Auth Status
    AuthManager->>AuthManager: Refresh Token if Needed
    AuthManager-->>ReplayEngine: Updated Headers
    
    ReplayEngine->>ReplayEngine: Modify Parameters (if needed)
    ReplayEngine->>HTTPClient: Execute Request
    
    HTTPClient->>API: HTTP Request
    API-->>HTTPClient: Response
    
    HTTPClient-->>ReplayEngine: Response Data
    ReplayEngine->>ReplayEngine: Validate Response
    ReplayEngine-->>UI: Replay Results
    UI-->>User: Display Results
```

## Parameter Extraction Flow

```mermaid
flowchart TD
    A[Captured Request] --> B{Parameter Type}
    
    B -->|Query| C[Parse Query String]
    B -->|Path| D[Extract Path Params]
    B -->|Body| E[Parse Body]
    B -->|Header| F[Extract Headers]
    
    C --> G[Query Parameters]
    D --> H[Path Parameters]
    E --> I[Body Parameters]
    F --> J[Header Parameters]
    
    G --> K[Parameter Schema]
    H --> K
    I --> K
    J --> K
    
    K --> L[Type Detection]
    L --> M[Required/Optional]
    M --> N[Final Schema]
```

## Dependency Tracking

```mermaid
graph LR
    A[Request 1: POST /login] -->|Extract token| B[Token Variable]
    B -->|Inject| C[Request 2: GET /profile]
    
    C -->|Extract userId| D[UserId Variable]
    D -->|Inject| E[Request 3: GET /users/:id]
    
    E -->|Extract postId| F[PostId Variable]
    F -->|Inject| G[Request 4: GET /posts/:id]
    
    style A fill:#e1f5ff
    style C fill:#fff4e1
    style E fill:#fff4e1
    style G fill:#fff4e1
```

## Implementation Components

### 1. Replay Engine
```javascript
class APIReplayEngine {
  async replay(requestId, options = {}) {
    // Load request
    // Apply modifications
    // Execute request
    // Return response
  }
  
  async replayBatch(requestIds, options = {}) {
    // Replay multiple requests
    // Support parallel or sequential
  }
}
```

### 2. Parameter Extractor
```javascript
class ParameterExtractor {
  extractPathParams(url, pattern) {
    // Extract :id, :userId, etc.
  }
  
  extractQueryParams(queryString) {
    // Parse query string
  }
  
  extractBodyParams(body) {
    // Parse JSON/form-data body
  }
}
```

### 3. Schema Generator
```javascript
class SchemaGenerator {
  generateRequestSchema(request) {
    // Generate JSON Schema from request
  }
  
  generateResponseSchema(response) {
    // Generate JSON Schema from response
  }
}
```

### 4. Auth Manager
```javascript
class AuthManager {
  async refreshToken(session) {
    // Refresh expired tokens
  }
  
  extractToken(response) {
    // Extract token from response
  }
  
  injectToken(request, token) {
    // Inject token into request headers
  }
}
```

### 5. Dependency Tracker
```javascript
class DependencyTracker {
  buildGraph(requests) {
    // Build dependency graph
  }
  
  extractVariables(response) {
    // Extract variables from response
  }
  
  injectVariables(request, variables) {
    // Inject variables into request
  }
}
```
