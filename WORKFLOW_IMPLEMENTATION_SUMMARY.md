# Event-Driven Workflow Architecture Implementation Summary

## 🎯 Overview
This implementation transforms the workflow system from a REST-based architecture to a comprehensive event-driven system using GraphQL, with real-time subscriptions and autonomous service components. The backend services are in `airank-core` while the frontend components remain in `airank-app`.

## 📁 Repository Structure

### airank-core (Backend Services)
```
airank-core/
├── src/
│   ├── graphql/
│   │   ├── workflow-schema.js      # GraphQL type definitions
│   │   └── workflow-resolvers.js   # GraphQL resolvers
│   ├── lib/
│   │   └── dbConnect.js           # MongoDB connection
│   └── index.js                   # GraphQL server
├── services/
│   ├── workflow-listener/         # Event listener service
│   ├── workflow-runner/           # Workflow execution service
│   └── stream-service/            # Webhook/data ingestion
├── docker-compose.yml             # Service orchestration
├── Dockerfile                     # GraphQL server image
└── package.json
```

### airank-app (Frontend Application)
```
airank-app/
├── src/
│   ├── graphql/
│   │   ├── workflow-operations.js  # GraphQL queries/mutations
│   │   ├── schema.js              # Base schema (without workflows)
│   │   └── resolvers.js           # Base resolvers
│   ├── lib/workflow/
│   │   ├── WorkflowGraphQLClient.ts # GraphQL client wrapper
│   │   └── WorkflowAPI.ts          # Legacy API (for reference)
│   └── app/[workspaceSlug]/workflow/
│       └── WorkflowList.tsx        # Updated UI component
└── package.json
```

## 📦 Components Implemented

### airank-core Components

#### 1. GraphQL Server (`src/index.js`)
- Standalone GraphQL server on port 4000
- WebSocket support for subscriptions
- MongoDB integration
- CORS enabled for frontend access

#### 2. Workflow Schema (`src/graphql/workflow-schema.js`)
- Complete GraphQL type definitions for workflows
- Extended Query, Mutation, and Subscription types
- Input types for all operations
- Custom JSON scalar type

#### 3. Workflow Resolvers (`src/graphql/workflow-resolvers.js`)
- Complete CRUD operations for workflows
- Trigger management with automatic listener creation
- Real-time run status updates via PubSub
- Workspace-specific MongoDB collections

#### 4. Workflow Listener Service (`services/workflow-listener/`)
- Autonomous service monitoring for trigger events
- GraphQL subscriptions to data changes
- Cron job scheduling for time-based triggers
- Dynamic listener reloading on configuration changes

#### 5. Workflow Runner Service (`services/workflow-runner/`)
- Executes workflows based on run IDs
- Multiple node type handlers (AI, HTTP, Transform, etc.)
- Queue-based execution with concurrency control
- Real-time status updates via GraphQL

#### 6. Stream Service (`services/stream-service/`)
- Webhook ingestion endpoints
- Data ingestion API
- Batch import support
- Triggers workflow events via database writes

### airank-app Components

#### 1. GraphQL Operations (`src/graphql/workflow-operations.js`)
- Pre-defined queries, mutations, and subscriptions
- Type-safe operations for frontend use

#### 2. Workflow GraphQL Client (`src/lib/workflow/WorkflowGraphQLClient.ts`)
- Drop-in replacement for REST API
- Apollo Client integration
- Subscription support for real-time updates

#### 3. Updated UI Components
- WorkflowList uses GraphQL client
- Real-time status updates
- Trigger visualization

## 🔄 Data Flow

1. **Workflow Creation**: Frontend → GraphQL (airank-core) → MongoDB
2. **Trigger Setup**: Workflow activation → GraphQL → Listener Service
3. **Event Detection**: 
   - Webhooks: External → Stream Service → MongoDB → GraphQL Subscription → Listener
   - Data Changes: Database Change → GraphQL Subscription → Listener
   - Schedules: Cron Job → Listener
4. **Workflow Execution**: Listener → Create Run (GraphQL) → Runner Service
5. **Status Updates**: Runner → GraphQL → MongoDB → Frontend Subscriptions

## 🚀 Deployment Instructions

### 1. Set up airank-core
```bash
cd airank-core
cp .env.example .env
# Edit .env with your configuration

# Install dependencies
npm install
cd services/workflow-listener && npm install && cd ../..
cd services/workflow-runner && npm install && cd ../..
cd services/stream-service && npm install && cd ../..

# Start services
docker-compose up -d
```

### 2. Configure airank-app
Update your frontend configuration to point to the airank-core GraphQL endpoint:
```javascript
// In your Apollo Client configuration
const graphqlEndpoint = process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || 'http://localhost:4000/graphql';
const wsEndpoint = process.env.NEXT_PUBLIC_GRAPHQL_WS_ENDPOINT || 'ws://localhost:4000/graphql';
```

### 3. Environment Variables

#### airank-core (.env)
```env
MONGODB_URI=mongodb://admin:password@localhost:27017/airank?authSource=admin
REDIS_URL=redis://:password@localhost:6379
PORT=4000
WEBHOOK_SECRET=your-webhook-secret
MAX_CONCURRENT_WORKFLOWS=5
WORKFLOW_TIMEOUT=300000
```

#### airank-app (.env.local)
```env
NEXT_PUBLIC_GRAPHQL_ENDPOINT=http://localhost:4000/graphql
NEXT_PUBLIC_GRAPHQL_WS_ENDPOINT=ws://localhost:4000/graphql
```

## 📊 Service Ports

- **GraphQL Server**: 4000
- **Workflow Runner**: 8080
- **Stream Service**: 8081
- **MongoDB**: 27017
- **Redis**: 6379

## � Architecture Benefits

1. **Separation of Concerns**: Backend services isolated in airank-core
2. **Scalability**: Each service can be scaled independently
3. **Real-time Updates**: GraphQL subscriptions provide live status
4. **Event-Driven**: Workflows respond automatically to events
5. **Unified API**: Single GraphQL endpoint for all operations
6. **Microservices**: Clean service boundaries and responsibilities

## 🧪 Testing the Implementation

1. Start airank-core services:
   ```bash
   cd airank-core
   docker-compose up -d
   ```

2. Test GraphQL endpoint:
   ```bash
   curl -X POST http://localhost:4000/graphql \
     -H "Content-Type: application/json" \
     -d '{"query": "{ __schema { types { name } } }"}'
   ```

3. Create a test workflow via the frontend
4. Add a webhook trigger
5. Send a test webhook:
   ```bash
   curl -X POST http://localhost:8081/webhook/workspace-id/webhook-id \
     -H "Content-Type: application/json" \
     -d '{"test": "data"}'
   ```

6. Monitor workflow execution in the UI

## 🚨 Important Notes

- The GraphQL server in airank-core runs on port 4000
- All backend workflow logic is now in airank-core
- Frontend components in airank-app communicate via GraphQL
- Services communicate internally via Docker network
- MongoDB collections are workspace-specific for data isolation