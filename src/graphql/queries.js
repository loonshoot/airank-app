import { gql } from '@apollo/client';

export const GET_USER_WORKSPACES = gql`
  query GetUserWorkspaces {
    userWorkspaces {
      id
      name
      slug
      workspaceCode
      inviteCode
      createdAt
      creator {
        id
        name
        email
      }
    }
  }
`;

export const GET_USER_INVITATIONS = gql`
  query GetUserInvitations {
    userInvitations {
      id
      email
      status
      teamRole
      joinedAt
      invitedBy {
        id
        name
        email
      }
      workspace {
        id
        name
        slug
        workspaceCode
        inviteCode
      }
    }
  }
`; 