# Outrun Workflow Migration Guide

## Overview

This guide documents the migration from Pages Router to App Router and the integration of the OpenAI Agents SDK with enhanced workflow capabilities.

## Major Updates

### 1. ReactFlow Upgrade (v11.10.4 → v12.7.0)

- **Package Change**: `reactflow` → `@xyflow/react`
- **Import Changes**: Updated all imports across components
- **New Features**: 
  - Server-side rendering support
  - Dark mode built-in
  - Better TypeScript support
  - Performance improvements

### 2. App Router Migration

Migrated key workflow pages from `src/pages/` to `src/app/`:

```
src/pages/[workspaceSlug]/workflow/
├── index.js                          → src/app/[workspaceSlug]/workflow/page.tsx
└── [workflowId]/index.js             → src/app/[workspaceSlug]/workflow/[workflowId]/page.tsx
```

#### Key Changes:
- Server Components for initial data fetching
- Client Components for interactive features
- Better TypeScript integration
- Improved loading states with Suspense

### 3. OpenAI Agents SDK Integration

Added comprehensive AI workflow capabilities:

#### New Dependencies:
```bash
npm install @openai/agents@latest zod
```

#### Core Components:

1. **AgentWorkflowRunner** (`src/lib/agents/AgentWorkflowRunner.ts`)
   - Orchestrates AI and non-AI workflow steps
   - Supports multiple agent types
   - Handles webhooks, parsers, and transformers
   - Error handling and execution context

2. **New Node Types**:
   - **AI Agent Node**: Executes LLM-powered operations
   - **Webhook Node**: HTTP requests for external integrations
   - **Parser Node**: Data transformation (JSON, XML, CSV, Text)

## New Workflow Node Types

### AI Agent Node
```typescript
{
  type: 'ai-agent',
  data: {
    config: {
      agent_type: 'data-analysis' | 'text-processing' | 'decision'
    },
    instructions: string
  }
}
```

### Webhook Node
```typescript
{
  type: 'webhook',
  data: {
    webhook_url: string,
    method: 'POST' | 'GET' | 'PUT' | 'PATCH' | 'DELETE'
  }
}
```

### Parser Node
```typescript
{
  type: 'parser',
  data: {
    parse_type: 'json' | 'xml' | 'csv' | 'text',
    parse_config: object
  }
}
```

## Workflow Execution

The new `AgentWorkflowRunner` supports mixed workflows:

```typescript
const runner = new AgentWorkflowRunner()

// Execute workflow with both AI and non-AI steps
const result = await runner.executeWorkflow(nodes, edges)

// Result includes:
// - success: boolean
// - final_result: any
// - context: execution context
// - steps_executed: number
```

## Example Workflow

1. **Trigger**: Workflow starts
2. **Parser**: Parse incoming JSON data
3. **AI Agent**: Analyze data with LLM
4. **Webhook**: Send results to external API
5. **Destination**: Store final output

## Configuration

### Environment Variables

Add these to your `.env.local`:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

### Agent Configuration

The system comes with pre-configured agents:

- **Data Analysis Agent**: Analyzes data and extracts insights
- **Text Processing Agent**: Cleans and processes text
- **Decision Agent**: Makes routing decisions based on conditions

Custom agents can be added:

```typescript
const customAgent = new Agent({
  name: 'Custom Agent',
  instructions: 'Your custom instructions',
  tools: [customTool]
})

runner.addAgent('custom', customAgent)
```

## Benefits of the New Architecture

### Cost Efficiency
- Non-LLM steps (parsing, webhooks) run without AI API calls
- Only use AI when necessary for complex decisions/analysis
- Reduced latency for simple operations

### Flexibility
- Mix AI and traditional programming logic
- Easy to extend with new node types
- Visual workflow builder controls complex agent orchestration

### Scalability
- Each step can be optimized independently
- Better error handling and retry logic
- Comprehensive execution context tracking

## Migration Steps

1. **Update Dependencies**:
   ```bash
   npm uninstall reactflow
   npm install @xyflow/react@latest @openai/agents@latest zod
   ```

2. **Update Imports**:
   - Change `reactflow` to `@xyflow/react`
   - Update CSS imports to `@xyflow/react/dist/style.css`

3. **Migrate Pages**:
   - Move workflow pages to app directory
   - Separate server and client components
   - Update data fetching patterns

4. **Configure Environment**:
   - Add OpenAI API key
   - Set up any custom agent configurations

5. **Test Workflows**:
   - Verify existing workflows still work
   - Test new AI-enabled node types
   - Validate execution flow

## Troubleshooting

### Common Issues

1. **Import Errors**: Make sure all ReactFlow imports use `@xyflow/react`
2. **Type Errors**: Update TypeScript types for new node structures
3. **API Key Issues**: Ensure OpenAI API key is properly configured
4. **Execution Errors**: Check console for detailed workflow execution logs

### Performance Tips

1. Use non-AI nodes for simple operations (parsing, transformations)
2. Combine multiple operations in single AI agent calls when possible
3. Implement proper error boundaries for AI operations
4. Consider caching for repeated AI operations

## Future Enhancements

- **Visual Agent Builder**: GUI for creating custom agents
- **Workflow Templates**: Pre-built workflows for common use cases
- **Advanced Analytics**: Execution metrics and performance monitoring
- **Multi-Model Support**: Integration with other AI providers
- **Real-time Collaboration**: Shared workflow editing

## Support

For issues or questions:
1. Check the console for detailed error messages
2. Verify environment configuration
3. Review workflow node connections
4. Test individual node types in isolation

The new architecture provides a powerful foundation for building complex AI-powered workflows while maintaining cost efficiency and performance. 