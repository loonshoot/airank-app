import { gql } from '@apollo/client';

// Query to get all sources for a workspace
export const GET_WORKSPACE_SOURCES = gql`
  query GetWorkspaceSources($workspaceSlug: String!) {
    workspace(slug: $workspaceSlug) {
      id
      sources {
        id
        name
        type
        status
        createdAt
        lastSync
        recordsCount
      }
    }
  }
`;

// Query to get detailed source information
export const GET_SOURCE_DETAILS = gql`
  query GetSourceDetails($sourceId: ID!, $workspaceSlug: String!) {
    source(id: $sourceId, workspaceSlug: $workspaceSlug) {
      id
      name
      type
      status
      createdAt
      lastSync
      syncFrequency
      recordsCount
      config
      recentActivity {
        id
        description
        timestamp
        status
      }
    }
  }
`;

// Query to get workspace basic info
export const GET_WORKSPACE = gql`
  query GetWorkspace($workspaceSlug: String!) {
    workspace(slug: $workspaceSlug) {
      id
      name
      slug
    }
  }
`;

// Mutation to create OAuth URL
export const CREATE_OAUTH_URL = gql`
  query CreateOAuthUrl(
    $service: String!
    $workspaceSlug: String!
    $redirectUri: String!
    $scopes: [String!]!
    $additionalParams: JSON
  ) {
    createOAuthUrl(
      service: $service
      workspaceSlug: $workspaceSlug
      redirectUri: $redirectUri
      scopes: $scopes
      additionalParams: $additionalParams
    ) {
      url
      state
    }
  }
`;

// Mutation to create a new source
export const CREATE_SOURCE = gql`
  mutation CreateSource($workspaceSlug: String!, $input: CreateSourceInput!) {
    createSource(workspaceSlug: $workspaceSlug, input: $input) {
      id
      name
      type
      status
      createdAt
    }
  }
`;

// Mutation to schedule a sync job
export const SCHEDULE_SYNC_JOB = gql`
  mutation ScheduleSyncJob($sourceId: ID!) {
    scheduleSyncJob(sourceId: $sourceId) {
      id
      status
      scheduledAt
    }
  }
`;

// Mutation to update source configuration
export const UPDATE_SOURCE_CONFIG = gql`
  mutation UpdateSourceConfig($sourceId: ID!, $config: JSON!) {
    updateSourceConfig(sourceId: $sourceId, config: $config) {
      id
      config
    }
  }
`;

// Mutation to delete a source
export const DELETE_SOURCE = gql`
  mutation DeleteSource($sourceId: ID!) {
    deleteSource(sourceId: $sourceId) {
      success
      message
    }
  }
`;

// Query to check OAuth callback status
export const CHECK_OAUTH_STATUS = gql`
  query CheckOAuthStatus($state: String!) {
    checkOAuthStatus(state: $state) {
      success
      error
      workspaceSlug
      service
    }
  }
`;

// Subscription for source sync updates
export const SOURCE_SYNC_UPDATES = gql`
  subscription SourceSyncUpdates($sourceId: ID!) {
    sourceSyncUpdate(sourceId: $sourceId) {
      id
      status
      progress
      recordsProcessed
      error
    }
  }
`;