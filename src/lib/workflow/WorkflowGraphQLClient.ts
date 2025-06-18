import { ApolloClient, ApolloError, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import {
  GET_WORKFLOWS,
  GET_WORKFLOW,
  GET_WORKFLOW_RUNS,
  GET_WORKFLOW_RUN,
  GET_WORKFLOW_STATS,
  GET_TRIGGER_LISTENERS,
  CREATE_WORKFLOW,
  UPDATE_WORKFLOW,
  DELETE_WORKFLOW,
  ACTIVATE_WORKFLOW,
  PAUSE_WORKFLOW,
  CREATE_WORKFLOW_RUN,
  WORKFLOW_RUN_UPDATED,
  WORKFLOW_STATS_UPDATED
} from '@/graphql/workflow-operations';

// Re-export types from WorkflowAPI for compatibility
export type {
  WorkflowDefinition,
  WorkflowTrigger,
  WorkflowSettings,
  WorkflowRun,
  WorkflowStep
} from './WorkflowAPI';

// Use separate outrun-core GraphQL endpoint
const OUTRUN_CORE_GRAPHQL_ENDPOINT = process.env.NEXT_PUBLIC_OUTRUN_CORE_GRAPHQL_ENDPOINT || 'http://localhost:3002/graphql';

export class WorkflowGraphQLClient {
  private client: ApolloClient<any>;
  private workspaceId: string;

  constructor(workspaceId: string) {
    this.workspaceId = workspaceId;
    
    // Create HTTP link
    const httpLink = createHttpLink({
      uri: OUTRUN_CORE_GRAPHQL_ENDPOINT,
      credentials: 'include', // Include cookies for authentication
    });

    // Create auth link that uses cookies (same as existing REST API)
    const authLink = setContext(async (_, { headers }) => {
      let token = '';
      
      // Get the session token from cookies (NextAuth JWT)
      if (typeof window !== 'undefined') {
        const cookies = document.cookie.split(';');
        const sessionCookie = cookies.find(cookie => 
          cookie.trim().startsWith('next-auth.session-token=') ||
          cookie.trim().startsWith('__Secure-next-auth.session-token=')
        );
        
        if (sessionCookie) {
          token = sessionCookie.split('=')[1];
        }
      }

      // Debug logging
      console.log('GraphQL Auth Debug:', {
        hasToken: !!token,
        tokenLength: token ? token.length : 0,
        tokenStart: token ? token.substring(0, 20) + '...' : 'none'
      });

      // Return the headers to the context so httpLink can read them
      return {
        headers: {
          ...headers,
          authorization: token,
        }
      }
    });

    this.client = new ApolloClient({
      link: authLink.concat(httpLink),
      cache: new InMemoryCache(),
      defaultOptions: {
        watchQuery: {
          errorPolicy: 'all',
        },
        query: {
          errorPolicy: 'all',
        },
      },
    });
  }

  // Workflow Management
  async getWorkflows() {
    try {
      const { data } = await this.client.query({
        query: GET_WORKFLOWS,
        variables: { workspaceId: this.workspaceId },
        fetchPolicy: 'network-only'
      });
      return data.workflows;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getWorkflow(workflowId: string) {
    try {
      const { data } = await this.client.query({
        query: GET_WORKFLOW,
        variables: { 
          workspaceId: this.workspaceId,
          workflowId 
        },
        fetchPolicy: 'network-only'
      });
      return data.workflow;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async saveWorkflow(workflow: any) {
    try {
      if (workflow.id) {
        // Update existing workflow
        const { id, workspaceId, status, createdAt, updatedAt, ...updateFields } = workflow;
        const { data } = await this.client.mutate({
          mutation: UPDATE_WORKFLOW,
          variables: {
            workspaceId: this.workspaceId,
            workflowId: id,
            ...updateFields
          }
        });
        return data.updateWorkflow;
      } else {
        // Create new workflow
        const { id, workspaceId, status, createdAt, updatedAt, ...createFields } = workflow;
        const { data } = await this.client.mutate({
          mutation: CREATE_WORKFLOW,
          variables: {
            workspaceId: this.workspaceId,
            ...createFields
          }
        });
        return data.createWorkflow;
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async deleteWorkflow(workflowId: string) {
    try {
      await this.client.mutate({
        mutation: DELETE_WORKFLOW,
        variables: {
          workspaceId: this.workspaceId,
          workflowId
        }
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Workflow Status Management
  async activateWorkflow(workflowId: string) {
    try {
      const { data } = await this.client.mutate({
        mutation: ACTIVATE_WORKFLOW,
        variables: {
          workspaceId: this.workspaceId,
          workflowId
        }
      });
      return data.activateWorkflow;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async pauseWorkflow(workflowId: string) {
    try {
      const { data } = await this.client.mutate({
        mutation: PAUSE_WORKFLOW,
        variables: {
          workspaceId: this.workspaceId,
          workflowId
        }
      });
      return data.pauseWorkflow;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Trigger Management
  // Note: Triggers are managed as part of the workflow definition
  // Use updateWorkflow() to modify triggers
  async addTrigger(workflowId: string, trigger: any) {
    // Get current workflow, add trigger, and update
    const workflow = await this.getWorkflow(workflowId);
    const updatedTriggers = [...(workflow.triggers || []), { ...trigger, id: Date.now().toString() }];
    return this.saveWorkflow({ ...workflow, triggers: updatedTriggers });
  }

  async updateTrigger(workflowId: string, triggerId: string, trigger: any) {
    // Get current workflow, update trigger, and save
    const workflow = await this.getWorkflow(workflowId);
    const updatedTriggers = workflow.triggers.map((t: any) => 
      t.id === triggerId ? { ...t, ...trigger } : t
    );
    return this.saveWorkflow({ ...workflow, triggers: updatedTriggers });
  }

  async deleteTrigger(workflowId: string, triggerId: string) {
    // Get current workflow, remove trigger, and save
    const workflow = await this.getWorkflow(workflowId);
    const updatedTriggers = workflow.triggers.filter((t: any) => t.id !== triggerId);
    return this.saveWorkflow({ ...workflow, triggers: updatedTriggers });
  }

  // Manual Execution (removed as per architecture plan)
  async triggerWorkflow(workflowId: string, input?: any) {
    // Create a manual trigger run
    try {
      const { data } = await this.client.mutate({
        mutation: CREATE_WORKFLOW_RUN,
        variables: {
          workspaceId: this.workspaceId,
          workflowId,
            triggeredBy: {
              type: 'manual',
              source: 'ui',
              payload: {}
            },
            input
        }
      });
      return { runId: data.createWorkflowRun.id };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Run History
  async getWorkflowRuns(workflowId: string, options?: {
    limit?: number;
    page?: number;
    status?: string;
  }) {
    try {
      const { data } = await this.client.query({
        query: GET_WORKFLOW_RUNS,
        variables: {
          workspaceId: this.workspaceId,
          workflowId,
          page: options?.page || 1,
          limit: options?.limit || 20,
          status: options?.status
        },
        fetchPolicy: 'network-only'
      });
      return {
        runs: data.workflowRuns.runs,
        total: data.workflowRuns.total,
        hasMore: data.workflowRuns.hasMore
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async getWorkflowRun(runId: string) {
    try {
      const { data } = await this.client.query({
        query: GET_WORKFLOW_RUN,
        variables: {
          workspaceId: this.workspaceId,
          runId
        },
        fetchPolicy: 'network-only'
      });
      return data.workflowRun;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async cancelWorkflowRun(runId: string) {
    // Note: Workflow run cancellation not implemented in current backend
    // This would require additional backend implementation
    throw new Error('Workflow run cancellation not yet implemented');
  }

  // Analytics
  async getWorkflowStats(workflowId: string) {
    try {
      const { data } = await this.client.query({
        query: GET_WORKFLOW_STATS,
        variables: {
          workspaceId: this.workspaceId,
          workflowId
        },
        fetchPolicy: 'network-only'
      });
      return data.workflowStats;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Subscriptions
  subscribeToWorkflowRunUpdates(onUpdate: (run: any) => void, workflowId?: string) {
    return this.client.subscribe({
      query: WORKFLOW_RUN_UPDATED,
      variables: {
        workspaceId: this.workspaceId,
        workflowId
      }
    }).subscribe({
      next: ({ data }) => {
        if (data?.workflowRunUpdated) {
          onUpdate(data.workflowRunUpdated);
        }
      },
      error: (error) => {
        console.error('Subscription error:', error);
      }
    });
  }

  subscribeToWorkflowStats(workflowId: string, onUpdate: (stats: any) => void) {
    return this.client.subscribe({
      query: WORKFLOW_STATS_UPDATED,
      variables: {
        workspaceId: this.workspaceId,
        workflowId
      }
    }).subscribe({
      next: ({ data }) => {
        if (data?.workflowStatsUpdated) {
          onUpdate(data.workflowStatsUpdated);
        }
      },
      error: (error) => {
        console.error('Subscription error:', error);
      }
    });
  }

  // Error handling
  private handleError(error: any): Error {
    if (error instanceof ApolloError) {
      const message = error.graphQLErrors?.[0]?.message || error.message;
      return new Error(message);
    }
    return error;
  }
}

// Factory function for creating WorkflowGraphQLClient instances
export const createWorkflowGraphQLClient = (workspaceId: string) => 
  new WorkflowGraphQLClient(workspaceId);