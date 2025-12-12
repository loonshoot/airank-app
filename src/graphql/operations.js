import { gql } from '@apollo/client';

// Queries
export const GET_USER_WORKSPACES = gql`
  query GetUserWorkspaces($workspaceSlug: String) {
    workspace(workspaceSlug: $workspaceSlug) {
      _id
      name
      slug
      workspaceCode
      inviteCode
      creatorId
      billingProfileId
      defaultBillingProfileId
      config {
        advancedBilling
      }
      createdAt
      updatedAt
      chargebeeSubscriptionId
      chargebeeCustomerId
    }
  }
`;

export const GET_ALL_WORKSPACES = gql`
  query GetAllWorkspaces {
    workspaces {
      _id
      name
      slug
      workspaceCode
      inviteCode
      creatorId
      billingProfileId
      createdAt
      updatedAt
      chargebeeSubscriptionId
      chargebeeCustomerId
    }
  }
`;

export const GET_USER_INVITATIONS = gql`
  query GetUserInvitations {
    members {
      _id
      email
      status
      teamRole
      workspaceId
      inviter
      invitedAt
      permissions
      updatedAt
    }
  }
`;

// Mutations
export const CREATE_WORKSPACE = gql`
  mutation CreateWorkspace($name: String!) {
    createWorkspace(name: $name) {
      _id
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

export const ACCEPT_INVITATION = gql`
  mutation AcceptInvitation($invitationId: ID!) {
    acceptInvitation(invitationId: $invitationId)
  }
`;

export const DECLINE_INVITATION = gql`
  mutation DeclineInvitation($invitationId: ID!) {
    declineInvitation(invitationId: $invitationId)
  }
`;

// Member Management Queries
export const QUERY_MEMBERS = gql`
  query Members($workspaceId: String, $workspaceSlug: String) {
    members(workspaceId: $workspaceId, workspaceSlug: $workspaceSlug) {
      _id
      workspaceId
      userId
      email
      name
      inviter
      invitedAt
      joinedAt
      updatedAt
      status
      teamRole
      permissions
      isCurrentUser
    }
  }
`;

// Member Management Mutations
export const CREATE_MEMBER = gql`
  mutation CreateMember($input: CreateMemberInput!) {
    createMember(input: $input) {
      _id
      workspaceId
      userId
      email
      inviter
      permissions
      status
      teamRole
    }
  }
`;

export const UPDATE_MEMBER = gql`
  mutation UpdateMember($workspaceId: String!, $memberId: String!, $permissions: [String]!) {
    updateMember(workspaceId: $workspaceId, memberId: $memberId, permissions: $permissions) {
      _id
      email
      permissions
      status
      teamRole
    }
  }
`;

export const DELETE_MEMBER = gql`
  mutation DeleteMember($input: DeleteMemberInput!) {
    deleteMember(input: $input) {
      _id
      status
      deletedAt
    }
  }
`;

// Helper function to execute GraphQL queries with a client
export const executeQuery = async (client, query, variables = {}, options = {}) => {
  try {
    console.log(`Executing query: ${query.definitions[0]?.name?.value || 'unnamed'}`, variables);
    
    const result = await client.query({
      query,
      variables,
      fetchPolicy: options.fetchPolicy || 'network-only'
    });
    
    console.log(`Query result:`, result.data);
    return { data: result.data, error: null };
  } catch (error) {
    console.error('GraphQL query error:', error);
    // Extract network errors and GraphQL errors for better debugging
    const networkError = error.networkError ? 
      `Network error: ${error.networkError.message} (${error.networkError.statusCode})` : null;
    
    const graphQLErrors = error.graphQLErrors?.map(err => 
      `GraphQL error: ${err.message} (${err.path?.join('.')})`
    ).join('\n');
    
    return { 
      data: null, 
      error: {
        message: networkError || graphQLErrors || error.message,
        originalError: error
      } 
    };
  }
};

// Helper function to execute GraphQL mutations with a client
export const executeMutation = async (client, mutation, variables = {}) => {
  try {
    console.log(`Executing mutation: ${mutation.definitions[0]?.name?.value || 'unnamed'}`, variables);
    
    const result = await client.mutate({
      mutation,
      variables
    });
    
    console.log(`Mutation result:`, result.data);
    return { data: result.data, error: null };
  } catch (error) {
    console.error('GraphQL mutation error:', error);
    // Extract network errors and GraphQL errors for better debugging
    const networkError = error.networkError ? 
      `Network error: ${error.networkError.message} (${error.networkError.statusCode})` : null;
    
    const graphQLErrors = error.graphQLErrors?.map(err => 
      `GraphQL error: ${err.message} (${err.path?.join('.')})`
    ).join('\n');
    
    return { 
      data: null, 
      error: {
        message: networkError || graphQLErrors || error.message,
        originalError: error
      } 
    };
  }
}; 