# API Recorder - Architecture Diagrams

## System Architecture Overview

```mermaid
graph TB
    subgraph "User Layer"
        UI[Web Dashboard / Desktop App]
        CLI[Command Line Interface]
    end
    
    subgraph "Application Core"
        SM[Session Manager]
        RM[Recording Manager]
        STM[Storage Manager]
    end
    
    subgraph "CDP Layer"
        BL[Browser Launcher]
        CDP[CDP Client]
        NM[Network Monitor]
        PC[Page Controller]
    end
    
    subgraph "Browser Instance"
        BR[Chrome/Chromium Browser]
        CDP_WS[CDP WebSocket Connection]
    end
    
    subgraph "Storage"
        DB[(Database)]
        FS[File System]
    end
    
    UI --> SM
    CLI --> SM
    SM --> RM
    RM --> STM
    SM --> BL
    BL --> CDP
    CDP --> CDP_WS
    CDP_WS --> BR
    CDP --> NM
    CDP --> PC
    NM --> RM
    STM --> DB
    STM --> FS
```

## Data Flow Diagram

```mermaid
sequenceDiagram
    participant User
    participant App
    participant Browser
    participant CDP
    participant Storage
    
    User->>App: Start Recording Session
    App->>Browser: Launch Browser with CDP
    Browser-->>CDP: WebSocket Connection
    App->>CDP: Enable Network Domain
    App->>CDP: Navigate to URL
    CDP->>Browser: Page.navigate()
    
    Browser->>CDP: Network.requestWillBeSent
    CDP->>App: Capture Request
    App->>Storage: Store Request Metadata
    
    Browser->>CDP: Network.responseReceived
    CDP->>App: Capture Response Headers
    App->>CDP: Network.getResponseBody()
    CDP->>Browser: Fetch Response Body
    Browser-->>CDP: Response Body
    CDP->>App: Response Body Data
    App->>Storage: Store Complete Request-Response
    
    Browser->>CDP: Network.loadingFinished
    CDP->>App: Capture Timing Info
    App->>Storage: Update Timing Data
    
    App->>User: Display Real-time Updates
    User->>App: View Recordings
    App->>Storage: Query Recordings
    Storage-->>App: Return Data
    App->>User: Display Results
```

## Component Interaction Diagram

```mermaid
graph LR
    subgraph "Session Manager"
        SC[Session Controller]
        SL[Session List]
    end
    
    subgraph "Recording Manager"
        RC[Request Collector]
        RP[Request Processor]
        RT[Request Tracker]
    end
    
    subgraph "Network Monitor"
        NE[Network Events]
        RB[Response Body Fetcher]
        PB[Post Data Fetcher]
    end
    
    subgraph "CDP Client"
        WS[WebSocket Handler]
        CM[Command Manager]
        EM[Event Manager]
    end
    
    SC --> RC
    RC --> NE
    NE --> EM
    EM --> WS
    WS --> CM
    CM --> RB
    CM --> PB
    RB --> RP
    PB --> RP
    RP --> RT
    RT --> SC
```

## Request-Response Correlation Flow

```mermaid
flowchart TD
    Start[Network Event Received] --> Check{Event Type?}
    
    Check -->|requestWillBeSent| RWS[Store Request Metadata<br/>requestId, url, method, headers]
    RWS --> Store1[Create Request Record<br/>Status: Pending]
    
    Check -->|responseReceived| RR[Store Response Headers<br/>requestId, status, headers]
    RR --> Fetch[Fetch Response Body<br/>Network.getResponseBody]
    Fetch --> Store2[Update Request Record<br/>Add Response Data]
    
    Check -->|loadingFinished| LF[Store Timing Info<br/>requestId, timing data]
    LF --> Complete[Mark Request Complete]
    
    Check -->|loadingFailed| Error[Store Error Info<br/>requestId, errorText]
    Error --> Failed[Mark Request Failed]
    
    Store1 --> Wait[Wait for Response]
    Store2 --> Complete
    Complete --> End[Request-Response Pair Complete]
    Failed --> End
```

## Storage Schema Relationship

```mermaid
erDiagram
    SESSION ||--o{ REQUEST_RESPONSE : contains
    SESSION {
        uuid sessionId PK
        string name
        string targetUrl
        timestamp startTime
        timestamp endTime
        string status
        int totalRequests
        json metadata
    }
    
    REQUEST_RESPONSE ||--|| REQUEST : has
    REQUEST_RESPONSE ||--|| RESPONSE : has
    REQUEST_RESPONSE ||--o| TIMING : has
    
    REQUEST_RESPONSE {
        uuid id PK
        uuid sessionId FK
        string requestId
        timestamp createdAt
    }
    
    REQUEST {
        uuid id PK
        uuid requestResponseId FK
        string url
        string method
        json headers
        text postData
        json queryString
        string referrer
        json initiator
        string resourceType
    }
    
    RESPONSE {
        uuid id PK
        uuid requestResponseId FK
        int status
        string statusText
        json headers
        text body
        int bodySize
        string mimeType
        boolean fromCache
    }
    
    TIMING {
        uuid id PK
        uuid requestResponseId FK
        float startTime
        float requestTime
        float responseTime
        float endTime
        float duration
        float dns
        float connect
        float ssl
        float send
        float wait
        float receive
    }
```

## CDP Event Processing Pipeline

```mermaid
flowchart TD
    CDP[CDP WebSocket] --> Parser[Message Parser]
    Parser --> Router{Event Type}
    
    Router -->|Network.requestWillBeSent| Handler1[Request Handler]
    Router -->|Network.responseReceived| Handler2[Response Handler]
    Router -->|Network.loadingFinished| Handler3[Timing Handler]
    Router -->|Network.loadingFailed| Handler4[Error Handler]
    Router -->|Network.dataReceived| Handler5[Data Handler]
    
    Handler1 --> Queue1[Request Queue]
    Handler2 --> Queue2[Response Queue]
    Handler3 --> Queue3[Timing Queue]
    Handler4 --> Queue4[Error Queue]
    Handler5 --> Queue5[Data Queue]
    
    Queue1 --> Processor[Event Processor]
    Queue2 --> Processor
    Queue3 --> Processor
    Queue4 --> Processor
    Queue5 --> Processor
    
    Processor --> Correlator[Request-Response Correlator]
    Correlator --> Storage[(Database)]
```

## User Workflow

```mermaid
stateDiagram-v2
    [*] --> Idle: App Started
    
    Idle --> Configuring: User Clicks Start Recording
    Configuring --> Launching: User Enters URL
    Launching --> Connecting: Browser Launched
    Connecting --> Recording: CDP Connected
    
    Recording --> Capturing: Network Events
    Capturing --> Recording: Events Processed
    Recording --> Paused: User Pauses
    Paused --> Recording: User Resumes
    Recording --> Stopping: User Stops
    
    Stopping --> Processing: Finalize Data
    Processing --> Completed: Data Saved
    Completed --> Idle: Return to Main
    
    Recording --> Viewing: User Views Live Data
    Viewing --> Recording: Return to Recording
    
    Completed --> Viewing: User Views Recordings
    Viewing --> Exporting: User Exports
    Exporting --> Viewing: Export Complete
    Viewing --> Idle: Return to Main
```

## Technology Stack Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        React[React UI]
        API_Client[API Client]
    end
    
    subgraph "Backend Layer"
        Express[Express Server]
        Routes[API Routes]
        Services[Business Logic]
    end
    
    subgraph "CDP Layer"
        Puppeteer[Puppeteer/Playwright]
        CDP_Client[CDP Client]
    end
    
    subgraph "Data Layer"
        ORM[Database ORM]
        DB[(SQLite/PostgreSQL)]
        Cache[Redis Cache<br/>Optional]
    end
    
    subgraph "Browser"
        Chrome[Chrome Instance]
    end
    
    React --> API_Client
    API_Client --> Express
    Express --> Routes
    Routes --> Services
    Services --> Puppeteer
    Services --> ORM
    Puppeteer --> CDP_Client
    CDP_Client --> Chrome
    ORM --> DB
    Services --> Cache
```

## Request Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Initiated: Browser Makes Request
    
    Initiated --> Sent: requestWillBeSent Event
    Sent --> Waiting: Request Sent to Server
    
    Waiting --> HeadersReceived: responseReceived Event
    HeadersReceived --> BodyReceiving: Fetching Body
    
    BodyReceiving --> BodyReceived: getResponseBody Complete
    BodyReceived --> Loading: loadingFinished Event
    
    Loading --> Completed: Request Complete
    
    Waiting --> Failed: Network Error
    HeadersReceived --> Failed: Body Fetch Failed
    BodyReceiving --> Failed: Body Fetch Failed
    Loading --> Failed: Loading Failed
    
    Failed --> [*]
    Completed --> [*]
    
    note right of Sent
        Store: URL, Method, Headers, PostData
    end note
    
    note right of HeadersReceived
        Store: Status, Headers, MIME Type
    end note
    
    note right of BodyReceived
        Store: Response Body
    end note
    
    note right of Loading
        Store: Timing Information
    end note
```


