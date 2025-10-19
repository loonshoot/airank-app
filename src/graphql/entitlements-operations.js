import { gql } from '@apollo/client';

/**
 * Entitlements GraphQL Operations
 *
 * Query workspace entitlements to check limits and permissions
 */

export const GET_ENTITLEMENTS = gql`
  query GetEntitlements($workspaceId: ID!) {
    entitlements(workspaceId: $workspaceId) {
      workspaceId

      # Brand limits
      brandsLimit
      brandsUsed
      brandsRemaining

      # Prompt limits
      promptsLimit
      promptsUsed
      promptsRemaining
      promptsResetDate
      promptCharacterLimit

      # Model limits
      modelsLimit
      modelsAllowed {
        modelId
        name
        provider
        description
        isAllowed
        requiresUpgrade
        priority
        isCurrentlyEnabled
        isSelectable
        allowedInBatchJobs
        suggestedUpgrade {
          modelId
          name
        }
      }

      # Job configuration
      jobFrequency
      nextJobRunDate

      # Payment status
      paymentStatus
      paymentFailedAt
      gracePeriodEndsAt
      isInGracePeriod
      paymentExpired

      # Action permissions
      canCreateBrand
      canCreatePrompt
      canAddModel
      canRunJobs
    }
  }
`;

export const REFRESH_ENTITLEMENTS = gql`
  mutation RefreshEntitlements($workspaceId: ID!) {
    refreshEntitlements(workspaceId: $workspaceId) {
      workspaceId

      # Brand limits
      brandsLimit
      brandsUsed
      brandsRemaining

      # Prompt limits
      promptsLimit
      promptsUsed
      promptsRemaining
      promptsResetDate
      promptCharacterLimit

      # Model limits
      modelsLimit
      modelsAllowed {
        modelId
        name
        provider
        description
        isAllowed
        requiresUpgrade
        priority
        isCurrentlyEnabled
        isSelectable
        allowedInBatchJobs
        suggestedUpgrade {
          modelId
          name
        }
      }

      # Job configuration
      jobFrequency
      nextJobRunDate

      # Payment status
      paymentStatus
      paymentFailedAt
      gracePeriodEndsAt
      isInGracePeriod
      paymentExpired

      # Action permissions
      canCreateBrand
      canCreatePrompt
      canAddModel
      canRunJobs
    }
  }
`;
