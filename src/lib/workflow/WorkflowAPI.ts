import { ApolloClient, NormalizedCacheObject } from '@apollo/client'
import { executeQuery, executeMutation } from '@/graphql/operations'
import { 
  GET_WORKFLOWS, 
  CREATE_WORKFLOW, 
  UPDATE_WORKFLOW, 
  DELETE_WORKFLOW,
  ACTIVATE_WORKFLOW,
  PAUSE_WORKFLOW,
  GET_WORKFLOW_RUNS,
  CREATE_WORKFLOW_RUN,
  CANCEL_WORKFLOW_RUN,
  GET_WORKFLOW_STATS
} from '@/graphql/workflow-operations'

export interface WorkflowDefinition {
  id: string
  workspaceId: string
  name: string
  description?: string
  status: 'draft' | 'active' | 'paused' | 'archived'
  nodes: any[]
  edges: any[]
  triggers: WorkflowTrigger[]
  settings: WorkflowSettings
  tags?: string[]
}

export interface WorkflowTrigger {
  id: string
  type: 'webhook' | 'schedule' | 'data_change' | 'manual'
  config: any
  active: boolean
}

export interface WorkflowSettings {
  timeout: number
  retryPolicy: {
    maxRetries: number
    backoffStrategy: 'linear' | 'exponential'
  }
  concurrency: number
}

export interface WorkflowRun {
  id: string
  workflowId: string
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout'
  startedAt?: Date
  completedAt?: Date
  duration?: number
  triggeredBy: {
    type: string
    source: string
    payload: any
  }
  input?: any
  output?: any
  error?: {
    message: string
    stack: string
    nodeId?: string
  }
  steps: WorkflowStep[]
  usage: {
    aiTokensUsed: number
    estimatedCost: number
    webhooksCalled: number
    dataParsed: number
  }
}

export interface WorkflowStep {
  nodeId: string
  nodeType: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  startedAt?: Date
  completedAt?: Date
  duration?: number
  input?: any
  output?: any
  error?: string
  metadata?: any
}

export class WorkflowAPI {
  constructor(
    private workspaceId: string, 
    private graphqlClient: ApolloClient<NormalizedCacheObject>
  ) {}

  // Workflow Management
  async getWorkflows(): Promise<WorkflowDefinition[]> {
    const result = await executeQuery(
      this.graphqlClient,
      GET_WORKFLOWS,
      { workspaceId: this.workspaceId }
    )
    
    if (result.error) {
      throw new Error(result.error.message)
    }
    
    return result.data?.workflows || []
  }

  async getWorkflow(workflowId: string): Promise<WorkflowDefinition> {
    const result = await executeQuery(
      this.graphqlClient,
      GET_WORKFLOWS,
      { workspaceId: this.workspaceId, workflowId }
    )
    
    if (result.error) {
      throw new Error(result.error.message)
    }
    
    const workflows = result.data?.workflows || []
    if (workflows.length === 0) {
      throw new Error('Workflow not found')
    }
    
    return workflows[0]
  }

  async saveWorkflow(workflow: Partial<WorkflowDefinition>): Promise<WorkflowDefinition> {
    if (workflow.id) {
      // Update existing workflow
      const result = await executeMutation(
        this.graphqlClient,
        UPDATE_WORKFLOW,
        {
          workspaceId: this.workspaceId,
          workflowId: workflow.id,
          name: workflow.name,
          description: workflow.description,
          nodes: workflow.nodes,
          edges: workflow.edges,
          triggers: workflow.triggers,
          settings: workflow.settings,
          tags: workflow.tags
        }
      )
      
      if (result.error) {
        throw new Error(result.error.message)
      }
      
      return result.data?.updateWorkflow
    } else {
      // Create new workflow
      const result = await executeMutation(
        this.graphqlClient,
        CREATE_WORKFLOW,
        {
          workspaceId: this.workspaceId,
          name: workflow.name!,
          description: workflow.description,
          nodes: workflow.nodes || [],
          edges: workflow.edges || [],
          triggers: workflow.triggers,
          settings: workflow.settings,
          tags: workflow.tags
        }
      )
      
      if (result.error) {
        throw new Error(result.error.message)
      }
      
      return result.data?.createWorkflow
    }
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    const result = await executeMutation(
      this.graphqlClient,
      DELETE_WORKFLOW,
      { workspaceId: this.workspaceId, workflowId }
    )
    
    if (result.error) {
      throw new Error(result.error.message)
    }
  }

  // Workflow Status Management
  async activateWorkflow(workflowId: string): Promise<WorkflowDefinition> {
    const result = await executeMutation(
      this.graphqlClient,
      ACTIVATE_WORKFLOW,
      { workspaceId: this.workspaceId, workflowId }
    )
    
    if (result.error) {
      throw new Error(result.error.message)
    }
    
    return result.data?.activateWorkflow
  }

  async pauseWorkflow(workflowId: string): Promise<WorkflowDefinition> {
    const result = await executeMutation(
      this.graphqlClient,
      PAUSE_WORKFLOW,
      { workspaceId: this.workspaceId, workflowId }
    )
    
    if (result.error) {
      throw new Error(result.error.message)
    }
    
    return result.data?.pauseWorkflow
  }

  // Trigger Management (handled through updateWorkflow)
  async addTrigger(workflowId: string, trigger: Omit<WorkflowTrigger, 'id'>): Promise<WorkflowTrigger> {
    const workflow = await this.getWorkflow(workflowId)
    const newTrigger = { ...trigger, id: `trigger_${Date.now()}` }
    const updatedTriggers = [...workflow.triggers, newTrigger]
    
    await this.saveWorkflow({ ...workflow, triggers: updatedTriggers })
    return newTrigger
  }

  async updateTrigger(workflowId: string, triggerId: string, trigger: Partial<WorkflowTrigger>): Promise<WorkflowTrigger> {
    const workflow = await this.getWorkflow(workflowId)
    const updatedTriggers = workflow.triggers.map(t => 
      t.id === triggerId ? { ...t, ...trigger } : t
    )
    
    await this.saveWorkflow({ ...workflow, triggers: updatedTriggers })
    return updatedTriggers.find(t => t.id === triggerId)!
  }

  async deleteTrigger(workflowId: string, triggerId: string): Promise<void> {
    const workflow = await this.getWorkflow(workflowId)
    const updatedTriggers = workflow.triggers.filter(t => t.id !== triggerId)
    
    await this.saveWorkflow({ ...workflow, triggers: updatedTriggers })
  }

  // Manual Execution
  async triggerWorkflow(workflowId: string, input?: any): Promise<{ runId: string }> {
    const result = await executeMutation(
      this.graphqlClient,
      CREATE_WORKFLOW_RUN,
      {
        workspaceId: this.workspaceId,
        workflowId,
        triggeredBy: { type: 'manual', source: 'user', payload: {} },
        input
      }
    )
    
    if (result.error) {
      throw new Error(result.error.message)
    }
    
    return { runId: result.data?.createWorkflowRun?.id }
  }

  // Run History
  async getWorkflowRuns(workflowId: string, options?: {
    limit?: number
    page?: number
    status?: string
  }): Promise<{ runs: WorkflowRun[], total: number }> {
    const result = await executeQuery(
      this.graphqlClient,
      GET_WORKFLOW_RUNS,
      {
        workspaceId: this.workspaceId,
        workflowId,
        status: options?.status,
        page: options?.page,
        limit: options?.limit
      }
    )
    
    if (result.error) {
      throw new Error(result.error.message)
    }
    
    const data = result.data?.workflowRuns
    return {
      runs: data?.runs || [],
      total: data?.total || 0
    }
  }

  async getWorkflowRun(runId: string): Promise<WorkflowRun> {
    const result = await executeQuery(
      this.graphqlClient,
      GET_WORKFLOW_RUNS,
      {
        workspaceId: this.workspaceId,
        runId
      }
    )
    
    if (result.error) {
      throw new Error(result.error.message)
    }
    
    const runs = result.data?.workflowRuns?.runs || []
    if (runs.length === 0) {
      throw new Error('Workflow run not found')
    }
    
    return runs[0]
  }

  async cancelWorkflowRun(runId: string): Promise<void> {
    const result = await executeMutation(
      this.graphqlClient,
      CANCEL_WORKFLOW_RUN,
      { workspaceId: this.workspaceId, runId }
    )
    
    if (result.error) {
      throw new Error(result.error.message)
    }
  }

  // Analytics
  async getWorkflowStats(workflowId: string): Promise<{
    totalRuns: number
    successfulRuns: number
    failedRuns: number
    avgExecutionTime: number
    lastRun?: Date
  }> {
    const result = await executeQuery(
      this.graphqlClient,
      GET_WORKFLOW_STATS,
      { workspaceId: this.workspaceId, workflowId }
    )
    
    if (result.error) {
      throw new Error(result.error.message)
    }
    
    return result.data?.workflowStats || {
      totalRuns: 0,
      successfulRuns: 0,
      failedRuns: 0,
      avgExecutionTime: 0
    }
  }
}

// Factory function for creating WorkflowAPI instances
export const createWorkflowAPI = (workspaceId: string, graphqlClient: ApolloClient<NormalizedCacheObject>) => 
  new WorkflowAPI(workspaceId, graphqlClient) 