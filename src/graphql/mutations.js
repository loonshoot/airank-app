import { gql } from '@apollo/client';

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