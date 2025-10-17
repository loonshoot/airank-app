import { gql } from '@apollo/client';

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get billing profiles for the authenticated user
 */
export const GET_BILLING_PROFILES = gql`
  query GetBillingProfiles($billingProfileId: ID, $workspaceId: ID) {
    billingProfiles(billingProfileId: $billingProfileId, workspaceId: $workspaceId) {
      _id
      name
      stripeCustomerId
      stripeSubscriptionId
      currentPlan
      planStatus
      currentPeriodStart
      currentPeriodEnd
      brandsLimit
      brandsUsed
      promptsLimit
      promptsUsed
      promptsResetDate
      modelsLimit
      dataRetentionDays
      hasPaymentMethod
      paymentMethodLast4
      paymentMethodBrand
      paymentMethodExpMonth
      paymentMethodExpYear
      members {
        _id
        userId
        email
        role
        permissions {
          attach
          modify
          delete
        }
        addedBy
        createdAt
      }
    }
  }
`;

/**
 * Get available billing plans from Stripe
 */
export const GET_BILLING_PLANS = gql`
  query GetBillingPlans {
    billingPlans {
      id
      name
      price
      priceId
      priceIdAnnual
      annualPrice
      annualSavings
      brandsLimit
      promptsLimit
      modelsLimit
      dataRetentionDays
      allowedModels
      batchFrequency
      features
      isFree
      isPopular
      isEnterprise
      target
      costPerMonth
    }
  }
`;

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new billing profile
 */
export const CREATE_BILLING_PROFILE = gql`
  mutation CreateBillingProfile($name: String!, $workspaceId: ID) {
    createBillingProfile(name: $name, workspaceId: $workspaceId) {
      _id
      name
      stripeCustomerId
      currentPlan
      brandsLimit
      promptsLimit
      modelsLimit
    }
  }
`;

/**
 * Attach a billing profile to a workspace
 */
export const ATTACH_BILLING_PROFILE = gql`
  mutation AttachBillingProfile($workspaceId: ID!, $billingProfileId: ID!) {
    attachBillingProfile(workspaceId: $workspaceId, billingProfileId: $billingProfileId) {
      _id
      billingProfileId
      billingProfile {
        _id
        name
        currentPlan
      }
    }
  }
`;

/**
 * Create a subscription for a billing profile
 */
export const CREATE_SUBSCRIPTION = gql`
  mutation CreateSubscription(
    $billingProfileId: ID!
    $planId: String!
    $interval: String!
  ) {
    createSubscription(
      billingProfileId: $billingProfileId
      planId: $planId
      interval: $interval
    ) {
      billingProfile {
        _id
        currentPlan
        brandsLimit
        promptsLimit
        modelsLimit
      }
      stripeSubscriptionId
      clientSecret
    }
  }
`;

/**
 * Confirm a subscription after payment
 */
export const CONFIRM_SUBSCRIPTION = gql`
  mutation ConfirmSubscription($billingProfileId: ID!) {
    confirmSubscription(billingProfileId: $billingProfileId) {
      _id
      planStatus
      currentPeriodStart
      currentPeriodEnd
    }
  }
`;

/**
 * Change subscription plan (upgrade/downgrade)
 */
export const CHANGE_PLAN = gql`
  mutation ChangePlan(
    $billingProfileId: ID!
    $newPlanId: String!
    $interval: String!
  ) {
    changePlan(
      billingProfileId: $billingProfileId
      newPlanId: $newPlanId
      interval: $interval
    ) {
      _id
      currentPlan
      brandsLimit
      promptsLimit
      modelsLimit
      dataRetentionDays
    }
  }
`;

/**
 * Create a setup intent for collecting payment method
 */
export const CREATE_SETUP_INTENT = gql`
  mutation CreateSetupIntent($billingProfileId: ID!) {
    createSetupIntent(billingProfileId: $billingProfileId) {
      clientSecret
    }
  }
`;

/**
 * Save a payment method to billing profile
 */
export const SAVE_PAYMENT_METHOD = gql`
  mutation SavePaymentMethod(
    $billingProfileId: ID!
    $paymentMethodId: String!
  ) {
    savePaymentMethod(
      billingProfileId: $billingProfileId
      paymentMethodId: $paymentMethodId
    ) {
      _id
      hasPaymentMethod
      paymentMethodLast4
      paymentMethodBrand
      paymentMethodExpMonth
      paymentMethodExpYear
    }
  }
`;

/**
 * Update workspace config (including billing mode)
 */
export const UPDATE_WORKSPACE_CONFIG = gql`
  mutation UpdateWorkspaceConfig(
    $workspaceSlug: String!
    $configs: JSON!
  ) {
    updateWorkspaceConfigs(
      workspaceSlug: $workspaceSlug
      configs: $configs
    ) {
      _id
      configType
      data
      method
      updatedAt
    }
  }
`;

/**
 * Get workspace configs
 */
export const GET_WORKSPACE_CONFIGS = gql`
  query GetWorkspaceConfigs($workspaceSlug: String!) {
    configs(workspaceSlug: $workspaceSlug) {
      _id
      configType
      data
      method
      updatedAt
    }
  }
`;

/**
 * Add a member to a billing profile
 */
export const ADD_BILLING_PROFILE_MEMBER = gql`
  mutation AddBillingProfileMember(
    $billingProfileId: ID!
    $email: String!
    $permissions: BillingProfilePermissionsInput!
  ) {
    addBillingProfileMember(
      billingProfileId: $billingProfileId
      email: $email
      permissions: $permissions
    ) {
      _id
      userId
      role
      permissions {
        attach
        modify
        delete
      }
      addedBy
      createdAt
    }
  }
`;

/**
 * Update a billing profile member's permissions
 */
export const UPDATE_BILLING_PROFILE_MEMBER = gql`
  mutation UpdateBillingProfileMember(
    $billingProfileId: ID!
    $userId: ID!
    $permissions: BillingProfilePermissionsInput!
  ) {
    updateBillingProfileMember(
      billingProfileId: $billingProfileId
      userId: $userId
      permissions: $permissions
    ) {
      _id
      userId
      role
      permissions {
        attach
        modify
        delete
      }
    }
  }
`;

/**
 * Remove a member from a billing profile
 */
export const REMOVE_BILLING_PROFILE_MEMBER = gql`
  mutation RemoveBillingProfileMember(
    $billingProfileId: ID!
    $userId: ID!
  ) {
    removeBillingProfileMember(
      billingProfileId: $billingProfileId
      userId: $userId
    )
  }
`;

/**
 * Delete a billing profile
 */
export const DELETE_BILLING_PROFILE = gql`
  mutation DeleteBillingProfile($billingProfileId: ID!) {
    deleteBillingProfile(billingProfileId: $billingProfileId)
  }
`;
