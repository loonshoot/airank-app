import { gql } from '@apollo/client';

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get billing profiles for the authenticated user
 */
export const GET_BILLING_PROFILES = gql`
  query GetBillingProfiles($billingProfileId: ID) {
    billingProfiles(billingProfileId: $billingProfileId) {
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
      defaultPaymentMethodId
      paymentMethodLast4
      paymentMethodBrand
      paymentMethodExpMonth
      paymentMethodExpYear
      createdAt
      updatedAt
      members {
        userId
        role
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
      description
      brandsLimit
      promptsLimit
      modelsLimit
      dataRetentionDays
      allowedModels
      batchFrequency
      monthlyPrice
      annualPrice
      features
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
      createdAt
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
      defaultPaymentMethodId
      paymentMethodLast4
      paymentMethodBrand
      paymentMethodExpMonth
      paymentMethodExpYear
    }
  }
`;
