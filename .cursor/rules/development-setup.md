# Development Setup Rules

## Service Management

- **All services are started with `npm run dev`** - This command starts all necessary services including:
  - Batcher (job processing)
  - API Gateway
  - GraphQL server
  - Other microservices

- **Do NOT manually start individual services** - Services like the batcher should not be started individually with `npm start` or `node index.js` as they are already running as part of the dev setup

- **Services run continuously** - The batcher and other services run continuously and process jobs automatically when `npm run dev` is active

## Directory Structure

- The project uses a monorepo structure with separate service directories (batcher/, api-gateway/, graphql/, etc.)
- Each service has its own package.json but they are orchestrated through the root `npm run dev` command 