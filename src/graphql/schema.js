import { gql } from '@apollo/client';

const typeDefs = gql`
  type User {
    id: ID!
    name: String
    email: String
  }

  type Member {
    id: ID!
    email: String!
    status: String!
    teamRole: String!
    joinedAt: String
    invitedBy: User
  }

  type Workspace {
    id: ID!
    name: String!
    slug: String!
    workspaceCode: String!
    inviteCode: String!
    createdAt: String
    creator: User
    members: [Member]
  }

  type Invitation {
    id: ID!
    email: String!
    status: String!
    teamRole: String!
    joinedAt: String
    invitedBy: User
    workspace: Workspace
  }

  type Query {
    userWorkspaces: [Workspace]
    userInvitations: [Invitation]
  }

  type Mutation {
    acceptInvitation(invitationId: ID!): Boolean
    declineInvitation(invitationId: ID!): Boolean
  }
`;

export default typeDefs; 