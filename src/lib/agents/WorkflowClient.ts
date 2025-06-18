export interface WorkflowNode {
  id: string
  type: 'trigger' | 'transformer' | 'destination' | 'ifthenor' | 'ai-agent' | 'webhook' | 'parser'
  data: {
    name?: string
    config?: any
    instructions?: string
    tools?: string[]
    prompt?: string
    webhook_url?: string
    parse_type?: 'json' | 'xml' | 'csv' | 'text'
    parse_config?: any
  }
  position: { x: number; y: number }
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  data?: any
}

export interface WorkflowExecutionResult {
  success: boolean
  result?: any
  error?: string
  timestamp: string
}

export class WorkflowClient {
  private baseUrl: string

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.WORKFLOW_SERVICE_URL || 'http://localhost:3005'
  }

  async executeWorkflow(nodes: WorkflowNode[], edges: WorkflowEdge[]): Promise<WorkflowExecutionResult> {
    try {
      const response = await fetch(`${this.baseUrl}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nodes, edges })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`)
      }

      return result
    } catch (error) {
      console.error('Workflow execution failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    }
  }

  async getAvailableAgents(): Promise<{ success: boolean; agents?: any[]; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/agents`)
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`)
      }

      return result
    } catch (error) {
      console.error('Failed to fetch agents:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async healthCheck(): Promise<{ status: string; service?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`)
      return await response.json()
    } catch (error) {
      return { status: 'error' }
    }
  }
}

// Export singleton instance
export const workflowClient = new WorkflowClient() 