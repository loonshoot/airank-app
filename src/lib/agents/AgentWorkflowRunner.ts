import { Agent, run, tool } from '@openai/agents'
import { z } from 'zod'

// Define workflow node types
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

// Enhanced step types that support both AI and non-AI operations
export type WorkflowStep = 
  | { type: 'ai-agent'; agent: Agent; input: any }
  | { type: 'webhook'; url: string; method: string; data: any }
  | { type: 'parser'; parseType: string; config: any; input: any }
  | { type: 'transformer'; transformFn: (input: any) => any; input: any }
  | { type: 'condition'; condition: (input: any) => boolean; input: any }

export class AgentWorkflowRunner {
  private agents: Map<string, Agent> = new Map()
  
  constructor() {
    this.initializeDefaultAgents()
  }

  private initializeDefaultAgents() {
    // Create some default agents for common tasks
    const dataAnalysisAgent = new Agent({
      name: 'Data Analysis Agent',
      instructions: 'You are a data analysis expert. Analyze the provided data and extract insights.',
      tools: [this.createDataAnalysisTool()]
    })

    const textProcessingAgent = new Agent({
      name: 'Text Processing Agent', 
      instructions: 'You are a text processing expert. Clean, format, and process text data.',
      tools: [this.createTextProcessingTool()]
    })

    const decisionAgent = new Agent({
      name: 'Decision Agent',
      instructions: 'You are a decision-making expert. Evaluate conditions and make routing decisions.',
      tools: [this.createDecisionTool()]
    })

    this.agents.set('data-analysis', dataAnalysisAgent)
    this.agents.set('text-processing', textProcessingAgent)
    this.agents.set('decision', decisionAgent)
  }

  private createDataAnalysisTool() {
    return tool({
      name: 'analyze_data',
      description: 'Analyze data and extract insights',
      parameters: z.object({
        data: z.any(),
        analysisType: z.string()
      }),
      execute: async (input) => {
        // Basic data analysis logic
        return {
          summary: 'Data analysis completed',
          insights: ['Insight 1', 'Insight 2'],
          processed_data: input.data
        }
      }
    })
  }

  private createTextProcessingTool() {
    return tool({
      name: 'process_text',
      description: 'Process and clean text data',
      parameters: z.object({
        text: z.string(),
        operations: z.array(z.string())
      }),
      execute: async (input) => {
        let processedText = input.text
        
        for (const operation of input.operations) {
          switch (operation) {
            case 'lowercase':
              processedText = processedText.toLowerCase()
              break
            case 'trim':
              processedText = processedText.trim()
              break
            case 'remove_special_chars':
              processedText = processedText.replace(/[^a-zA-Z0-9\s]/g, '')
              break
          }
        }
        
        return { processed_text: processedText }
      }
    })
  }

  private createDecisionTool() {
    return tool({
      name: 'make_decision',
      description: 'Make a decision based on input conditions',
      parameters: z.object({
        conditions: z.any(),
        rules: z.array(z.any())
      }),
      execute: async (input) => {
        // Simple rule evaluation logic
        for (const rule of input.rules) {
          if (this.evaluateCondition(input.conditions, rule)) {
            return { decision: rule.action, confidence: 0.8 }
          }
        }
        return { decision: 'default', confidence: 0.5 }
      }
    })
  }

  private evaluateCondition(conditions: any, rule: any): boolean {
    // Basic condition evaluation - you can make this more sophisticated
    return true // Simplified for now
  }

  // Execute a workflow step (can be AI or non-AI)
  private async executeStep(step: WorkflowStep, context: any = {}): Promise<any> {
    switch (step.type) {
      case 'ai-agent':
        return await this.executeAIAgent(step.agent, step.input, context)
      
      case 'webhook':
        return await this.executeWebhook(step.url, step.method, step.data, context)
      
      case 'parser':
        return await this.executeParser(step.parseType, step.config, step.input, context)
      
      case 'transformer':
        return await this.executeTransformer(step.transformFn, step.input, context)
      
      case 'condition':
        return await this.executeCondition(step.condition, step.input, context)
      
      default:
        throw new Error(`Unknown step type: ${(step as any).type}`)
    }
  }

  private async executeAIAgent(agent: Agent, input: any, context: any): Promise<any> {
    try {
      const result = await run(agent, JSON.stringify(input))
      return {
        type: 'ai-result',
        output: result.finalOutput,
        context: { ...context, ai_executed: true }
      }
    } catch (error) {
      throw new Error(`AI Agent execution failed: ${error.message}`)
    }
  }

  private async executeWebhook(url: string, method: string, data: any, context: any): Promise<any> {
    try {
      const response = await fetch(url, {
        method: method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AI Rank-Workflow-Runner'
        },
        body: JSON.stringify(data)
      })
      
      const result = await response.json()
      return {
        type: 'webhook-result',
        output: result,
        status: response.status,
        context: { ...context, webhook_executed: true }
      }
    } catch (error) {
      throw new Error(`Webhook execution failed: ${error.message}`)
    }
  }

  private async executeParser(parseType: string, config: any, input: any, context: any): Promise<any> {
    try {
      let parsed
      
      switch (parseType) {
        case 'json':
          parsed = typeof input === 'string' ? JSON.parse(input) : input
          break
        
        case 'csv':
          // Basic CSV parsing - you might want to use a proper CSV library
          const lines = input.split('\n')
          const headers = lines[0].split(',')
          const data = lines.slice(1).map(line => {
            const values = line.split(',')
            return headers.reduce((obj, header, index) => {
              obj[header.trim()] = values[index]?.trim()
              return obj
            }, {})
          })
          parsed = data
          break
        
        case 'xml':
          // Basic XML parsing - you might want to use a proper XML library
          parsed = { raw_xml: input, note: 'XML parsing not fully implemented' }
          break
        
        case 'text':
        default:
          parsed = { text: input, words: input.split(' ').length }
          break
      }
      
      return {
        type: 'parser-result',
        output: parsed,
        parse_type: parseType,
        context: { ...context, parsed: true }
      }
    } catch (error) {
      throw new Error(`Parser execution failed: ${error.message}`)
    }
  }

  private async executeTransformer(transformFn: (input: any) => any, input: any, context: any): Promise<any> {
    try {
      const result = transformFn(input)
      return {
        type: 'transformer-result',
        output: result,
        context: { ...context, transformed: true }
      }
    } catch (error) {
      throw new Error(`Transformer execution failed: ${error.message}`)
    }
  }

  private async executeCondition(condition: (input: any) => boolean, input: any, context: any): Promise<any> {
    try {
      const result = condition(input)
      return {
        type: 'condition-result',
        output: result,
        condition_met: result,
        context: { ...context, condition_evaluated: true }
      }
    } catch (error) {
      throw new Error(`Condition execution failed: ${error.message}`)
    }
  }

  // Convert ReactFlow nodes and edges to executable workflow steps
  private convertNodesToWorkflow(nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowStep[] {
    const steps: WorkflowStep[] = []
    
    // Find the trigger node (starting point)
    const triggerNode = nodes.find(node => node.type === 'trigger')
    if (!triggerNode) {
      throw new Error('No trigger node found in workflow')
    }

    // Build execution order based on edges
    const visited = new Set<string>()
    const buildSteps = (nodeId: string, input: any = null) => {
      if (visited.has(nodeId)) return
      visited.add(nodeId)
      
      const node = nodes.find(n => n.id === nodeId)
      if (!node) return

      // Convert node to executable step
      const step = this.nodeToStep(node, input)
      if (step) {
        steps.push(step)
      }

      // Find connected nodes
      const outgoingEdges = edges.filter(edge => edge.source === nodeId)
      outgoingEdges.forEach(edge => {
        buildSteps(edge.target, step ? { from: nodeId, step } : input)
      })
    }

    buildSteps(triggerNode.id, { trigger: 'workflow_start' })
    return steps
  }

  private nodeToStep(node: WorkflowNode, input: any): WorkflowStep | null {
    switch (node.type) {
      case 'trigger':
        return null // Trigger nodes don't create executable steps
      
      case 'transformer':
        return {
          type: 'transformer',
          transformFn: (data) => {
            // Basic transformation logic - you can enhance this
            return { ...data, transformed_by: node.id, timestamp: Date.now() }
          },
          input
        }
      
      case 'destination':
        if (node.data.webhook_url) {
          return {
            type: 'webhook',
            url: node.data.webhook_url,
            method: 'POST',
            data: input
          }
        }
        return null
      
      case 'ifthenor':
        return {
          type: 'condition',
          condition: (data) => {
            // Basic condition logic - you can enhance this
            return data && Object.keys(data).length > 0
          },
          input
        }
      
      case 'ai-agent':
        const agentType = node.data.config?.agent_type || 'data-analysis'
        const agent = this.agents.get(agentType)
        if (agent) {
          return {
            type: 'ai-agent',
            agent,
            input
          }
        }
        return null
      
      case 'parser':
        return {
          type: 'parser',
          parseType: node.data.parse_type || 'json',
          config: node.data.parse_config || {},
          input
        }
      
      default:
        return null
    }
  }

  // Main execution method
  public async executeWorkflow(nodes: WorkflowNode[], edges: WorkflowEdge[]): Promise<any> {
    try {
      console.log('Starting workflow execution with', nodes.length, 'nodes and', edges.length, 'edges')
      
      const steps = this.convertNodesToWorkflow(nodes, edges)
      console.log('Converted to', steps.length, 'executable steps')
      
      let context = { workflow_id: Date.now().toString() }
      let lastResult = { trigger: 'workflow_start' }
      
      for (const step of steps) {
        console.log('Executing step:', step.type)
        
        // Update step input with previous result
        const updatedStep = { ...step, input: lastResult }
        
        const result = await this.executeStep(updatedStep, context)
        lastResult = result.output
        context = { ...context, ...result.context }
        
        console.log('Step completed:', step.type, 'Result:', result.type)
      }
      
      return {
        success: true,
        final_result: lastResult,
        context,
        steps_executed: steps.length
      }
      
    } catch (error) {
      console.error('Workflow execution failed:', error)
      return {
        success: false,
        error: error.message,
        context: {}
      }
    }
  }

  // Add a custom agent
  public addAgent(key: string, agent: Agent) {
    this.agents.set(key, agent)
  }

  // Get available agents
  public getAgents(): Map<string, Agent> {
    return this.agents
  }
} 