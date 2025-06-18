import { gql } from '@apollo/client';

// Workspace Queries
export const GET_WORKSPACE_BY_SLUG = gql`
  query GetWorkspaceBySlug($workspaceSlug: String!) {
    workspace(workspaceSlug: $workspaceSlug) {
      id
      name
      slug
      workspaceCode
      inviteCode
      creatorId
      createdAt
      updatedAt
    }
  }
`;

// Workflow Queries
export const GET_WORKFLOWS = gql`
  query GetWorkflows($workspaceSlug: String!, $workflowId: String, $page: Int, $limit: Int) {
    workflows(workspaceSlug: $workspaceSlug, workflowId: $workflowId, page: $page, limit: $limit) {
      id
      workspaceId
      name
      description
      status
      nodes
      edges
      triggers {
        id
        type
        config
        active
      }
      settings {
        timeout
        retryPolicy {
          maxRetries
          backoffStrategy
        }
        concurrency
      }
      tags
      createdAt
      updatedAt
    }
  }
`;

export const GET_WORKFLOW = gql`
  query GetWorkflow($workspaceId: ID!, $workflowId: ID!) {
    workflow(workspaceId: $workspaceId, workflowId: $workflowId) {
      id
      workspaceId
      name
      description
      status
      nodes
      edges
      triggers {
        id
        type
        config
        active
        createdAt
        updatedAt
      }
      settings {
        timeout
        retryPolicy {
          maxRetries
          backoffStrategy
        }
        concurrency
      }
      tags
      createdAt
      updatedAt
    }
  }
`;

export const GET_WORKFLOW_RUNS = gql`
  query GetWorkflowRuns($workspaceId: String!, $workflowId: String, $runId: String, $status: RunStatus, $page: Int, $limit: Int) {
    workflowRuns(workspaceId: $workspaceId, workflowId: $workflowId, runId: $runId, status: $status, page: $page, limit: $limit) {
      runs {
        id
        workflowId
        status
        startedAt
        completedAt
        duration
        triggeredBy {
          type
          source
          payload
        }
        input
        output
        error {
          message
          stack
          nodeId
        }
        steps {
          nodeId
          nodeType
          status
          startedAt
          completedAt
          duration
          input
          output
          error
          metadata
        }
        usage {
          aiTokensUsed
          estimatedCost
          webhooksCalled
          dataParsed
        }
        createdAt
        updatedAt
      }
      total
      page
      limit
      hasMore
    }
  }
`;

export const GET_WORKFLOW_RUN = gql`
  query GetWorkflowRun($workspaceId: ID!, $runId: ID!) {
    workflowRun(workspaceId: $workspaceId, runId: $runId) {
      id
      workflowId
      workflow {
        id
        name
        description
      }
      status
      startedAt
      completedAt
      duration
      triggeredBy {
        type
        source
        payload
      }
      input
      output
      error {
        message
        stack
        nodeId
      }
      steps {
        nodeId
        nodeType
        status
        startedAt
        completedAt
        duration
        input
        output
        error
        metadata
      }
      usage {
        aiTokensUsed
        estimatedCost
        webhooksCalled
        dataParsed
      }
      createdAt
      updatedAt
    }
  }
`;

export const GET_WORKFLOW_STATS = gql`
  query GetWorkflowStats($workspaceId: ID!, $workflowId: ID!) {
    workflowStats(workspaceId: $workspaceId, workflowId: $workflowId) {
      totalRuns
      successfulRuns
      failedRuns
      avgExecutionTime
      lastRun
    }
  }
`;

export const GET_TRIGGER_LISTENERS = gql`
  query GetTriggerListeners($workspaceId: String!) {
    triggerListeners(workspaceId: $workspaceId) {
      id
      workflowId
      workspaceId
      triggerType
      config {
        webhookUrl
        webhookSecret
        cronExpression
        timezone
        collection
        operation
        filter
      }
      active
      lastTriggered
      triggerCount
      createdAt
      updatedAt
    }
  }
`;

// Workflow Mutations
export const CREATE_WORKFLOW = gql`
  mutation CreateWorkflow(
    $workspaceSlug: String!, 
    $name: String!, 
    $description: String, 
    $nodes: JSON!, 
    $edges: JSON!, 
    $triggers: [JSON], 
    $settings: JSON, 
    $tags: [String]
  ) {
    createWorkflow(
      workspaceSlug: $workspaceSlug, 
      name: $name, 
      description: $description, 
      nodes: $nodes, 
      edges: $edges, 
      triggers: $triggers, 
      settings: $settings, 
      tags: $tags
    ) {
      id
      workspaceId
      name
      description
      status
      nodes
      edges
      triggers {
        id
        type
        config
        active
      }
      settings {
        timeout
        retryPolicy {
          maxRetries
          backoffStrategy
        }
        concurrency
      }
      tags
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_WORKFLOW = gql`
  mutation UpdateWorkflow(
    $workspaceSlug: String!, 
    $workflowId: String!, 
    $name: String, 
    $description: String, 
    $nodes: JSON, 
    $edges: JSON, 
    $triggers: [JSON], 
    $settings: JSON, 
    $tags: [String]
  ) {
    updateWorkflow(
      workspaceSlug: $workspaceSlug, 
      workflowId: $workflowId, 
      name: $name, 
      description: $description, 
      nodes: $nodes, 
      edges: $edges, 
      triggers: $triggers, 
      settings: $settings, 
      tags: $tags
    ) {
      id
      name
      description
      nodes
      edges
      settings {
        timeout
        retryPolicy {
          maxRetries
          backoffStrategy
        }
        concurrency
      }
      tags
      updatedAt
    }
  }
`;

export const DELETE_WORKFLOW = gql`
  mutation DeleteWorkflow($workspaceSlug: String!, $workflowId: String!) {
    deleteWorkflow(workspaceSlug: $workspaceSlug, workflowId: $workflowId)
  }
`;

export const ACTIVATE_WORKFLOW = gql`
  mutation ActivateWorkflow($workspaceId: String!, $workflowId: String!) {
    activateWorkflow(workspaceId: $workspaceId, workflowId: $workflowId) {
      id
      status
      updatedAt
    }
  }
`;

export const PAUSE_WORKFLOW = gql`
  mutation PauseWorkflow($workspaceId: String!, $workflowId: String!) {
    pauseWorkflow(workspaceId: $workspaceId, workflowId: $workflowId) {
      id
      status
      updatedAt
    }
  }
`;

// Note: Trigger management is handled through updateWorkflow mutation
// Individual trigger mutations are not implemented as triggers are part of workflow definition

// Run Mutations
export const CREATE_WORKFLOW_RUN = gql`
  mutation CreateWorkflowRun($workspaceId: String!, $workflowId: String!, $triggeredBy: JSON, $input: JSON) {
    createWorkflowRun(workspaceId: $workspaceId, workflowId: $workflowId, triggeredBy: $triggeredBy, input: $input) {
      id
      workflowId
      status
      triggeredBy {
        type
        source
        payload
      }
      input
      createdAt
    }
  }
`;

export const UPDATE_WORKFLOW_RUN = gql`
  mutation UpdateWorkflowRun($workspaceId: ID!, $runId: ID!, $status: RunStatus!, $output: JSON, $error: RunErrorInput) {
    updateWorkflowRun(workspaceId: $workspaceId, runId: $runId, status: $status, output: $output, error: $error) {
      id
      status
      output
      error {
        message
        stack
        nodeId
      }
      completedAt
      duration
      updatedAt
    }
  }
`;

export const CANCEL_WORKFLOW_RUN = gql`
  mutation CancelWorkflowRun($workspaceId: ID!, $runId: ID!) {
    cancelWorkflowRun(workspaceId: $workspaceId, runId: $runId) {
      id
      status
      completedAt
      updatedAt
    }
  }
`;

// Listener Mutations
export const CREATE_TRIGGER_LISTENER = gql`
  mutation CreateTriggerListener($input: CreateListenerInput!) {
    createTriggerListener(input: $input) {
      id
      workflowId
      triggerId
      type
      config
      active
      createdAt
    }
  }
`;

export const UPDATE_TRIGGER_LISTENER = gql`
  mutation UpdateTriggerListener($listenerId: ID!, $active: Boolean!) {
    updateTriggerListener(listenerId: $listenerId, active: $active) {
      id
      active
      updatedAt
    }
  }
`;

export const DELETE_TRIGGER_LISTENER = gql`
  mutation DeleteTriggerListener($listenerId: ID!) {
    deleteTriggerListener(listenerId: $listenerId)
  }
`;

// Subscriptions
export const WORKFLOW_RUN_UPDATED = gql`
  subscription WorkflowRunUpdated($workspaceId: String!, $workflowId: String) {
    workflowRunUpdated(workspaceId: $workspaceId, workflowId: $workflowId) {
      id
      workflowId
      status
      startedAt
      completedAt
      duration
      error {
        message
        stack
        nodeId
      }
      steps {
        nodeId
        nodeType
        status
        startedAt
        completedAt
        duration
        error
      }
      usage {
        aiTokensUsed
        estimatedCost
        webhooksCalled
        dataParsed
      }
      updatedAt
    }
  }
`;

export const WORKFLOW_STATS_UPDATED = gql`
  subscription WorkflowStatsUpdated($workspaceId: String!, $workflowId: String!) {
    workflowStatsUpdated(workspaceId: $workspaceId, workflowId: $workflowId) {
      totalRuns
      successfulRuns
      failedRuns
      avgExecutionTime
      lastRun
    }
  }
`;

export const DATA_CHANGE_EVENT = gql`
  subscription DataChangeEvent($workspaceId: ID!, $collection: String!) {
    dataChangeEvent(workspaceId: $workspaceId, collection: $collection) {
      collection
      operation
      documentId
      data
      timestamp
    }
  }
`;