'use client';

import { useState, useEffect, use } from 'react';
import { useWorkspace } from '@/providers/workspace';
import { useGraphQLClient } from '@/hooks/data/index';
import { AccountLayout } from '@/layouts/index';
import Meta from '@/components/Meta/index';
import Content from '@/components/Content/index';
import { executeQuery, executeMutation, GET_USER_WORKSPACES } from '@/graphql/operations';
import { useSearchParams } from 'next/navigation';
import {
  GET_BILLING_PROFILES,
  GET_BILLING_PLANS,
  CREATE_SUBSCRIPTION,
  CONFIRM_SUBSCRIPTION,
  CREATE_SETUP_INTENT,
  SAVE_PAYMENT_METHOD,
  GET_WORKSPACE_CONFIGS,
  UPDATE_WORKSPACE_CONFIG,
  ATTACH_BILLING_PROFILE,
  CREATE_BILLING_PROFILE
} from '@/graphql/billing-operations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import Button from '@/components/Button/index';
import toast from 'react-hot-toast';
import { CheckIcon, CreditCardIcon, ChartBarIcon, DocumentTextIcon } from '@heroicons/react/24/solid';
import { useStripe, useElements, CardElement, Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: '#ffffff',
      fontFamily: 'system-ui, sans-serif',
      fontSmoothing: 'antialiased',
      fontSize: '16px',
      '::placeholder': {
        color: '#71717a',
      },
    },
    invalid: {
      color: '#ef4444',
      iconColor: '#ef4444',
    },
  },
};

function PaymentMethodStep({ billingProfile, onSuccess, onBack, isUpdate = false }) {
  const stripe = useStripe();
  const elements = useElements();
  const graphqlClient = useGraphQLClient();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      toast.error('Stripe has not loaded yet');
      return;
    }

    setIsProcessing(true);

    try {
      // Create setup intent
      const setupIntentResult = await executeMutation(
        graphqlClient,
        CREATE_SETUP_INTENT,
        { billingProfileId: billingProfile._id }
      );

      if (!setupIntentResult.data?.createSetupIntent?.clientSecret) {
        throw new Error('Failed to create setup intent');
      }

      const { clientSecret } = setupIntentResult.data.createSetupIntent;

      // Confirm card setup
      const { error, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
        },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      // Save payment method
      const saveResult = await executeMutation(
        graphqlClient,
        SAVE_PAYMENT_METHOD,
        {
          billingProfileId: billingProfile._id,
          paymentMethodId: setupIntent.payment_method,
        }
      );

      if (saveResult.data?.savePaymentMethod) {
        toast.success(isUpdate ? 'Payment method updated successfully!' : 'Payment method added successfully!');
        onSuccess(saveResult.data.savePaymentMethod);
      } else if (saveResult.error) {
        toast.error(saveResult.error.message);
      }
    } catch (err) {
      console.error('Payment method error:', err);
      toast.error('Failed to save payment method');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{isUpdate ? 'Update Payment Method' : 'Select Payment Method'}</CardTitle>
        <CardDescription>
          {isUpdate ? 'Update your card details' : 'Choose your preferred payment method'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Card Information
            </label>
            <div className="p-4 border border-border rounded-lg bg-card">
              <CardElement options={CARD_ELEMENT_OPTIONS} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Your payment information is securely processed by Stripe
            </p>
          </div>

          {!isUpdate && onBack ? (
            <div className="flex gap-3">
              <Button
                background="Green"
                border="Light"
                type="button"
                onClick={onBack}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                background="Green"
                border="Light"
                type="submit"
                disabled={!stripe || isProcessing}
                className="flex-1"
              >
                {isProcessing ? 'Processing...' : 'Subscribe'}
              </Button>
            </div>
          ) : (
            <Button
              background="Green"
              border="Light"
              type="submit"
              disabled={!stripe || isProcessing}
              className="w-full"
            >
              {isProcessing ? 'Processing...' : (isUpdate ? 'Update Card' : 'Add Payment Method')}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

function PlanSelectionStep({ plans, billingProfile, selectedInterval, onIntervalChange, onPlanSelect }) {
  const getPlanPrice = (plan) => {
    if (plan.isFree || plan.id === 'free') {
      return {
        display: '$0',
        subtext: '/month',
        annualSubtext: null
      };
    }
    if (plan.isEnterprise || plan.id === 'enterprise') {
      return {
        display: 'Varies',
        subtext: '',
        annualSubtext: null
      };
    }

    // Get monthly and annual prices
    const monthlyAmount = plan.costPerMonth || parseInt((plan.price || '$0').replace(/[^0-9]/g, ''));
    const annualAmount = plan.annualPrice ? parseInt(plan.annualPrice.replace(/[^0-9]/g, '')) : monthlyAmount * 12;

    // Calculate savings
    const savings = (monthlyAmount * 12) - annualAmount;
    const savingsText = savings > 0 ? ` (save $${savings})` : '';

    // Return price based on selected interval
    if (selectedInterval === 'annual') {
      return {
        display: `$${annualAmount.toLocaleString()}`,
        subtext: '/year',
        annualSubtext: savings > 0 ? `Saves $${savings} vs monthly` : null
      };
    } else {
      return {
        display: `$${monthlyAmount}`,
        subtext: '/month',
        annualSubtext: plan.annualPrice ? `$${annualAmount.toLocaleString()}/year${savingsText}` : null
      };
    }
  };

  const getPlanFeatures = (plan) => {
    return plan.features || [];
  };

  const getPlanDescription = (plan) => {
    if (plan.target) return plan.target;
    if (plan.id === 'free') return 'Perfect for trying out AI Rank';
    return '';
  };

  const isCurrentPlan = (planId) => {
    return billingProfile?.currentPlan === planId;
  };

  return (
    <div className="space-y-6">
      {/* Interval Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg border border-border p-1 bg-card">
          <button
            onClick={() => onIntervalChange('monthly')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedInterval === 'monthly'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => onIntervalChange('annual')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedInterval === 'annual'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Annual
            <span className="ml-2 text-xs text-green-500">Save 17%</span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {plans.map((plan) => {
          const price = getPlanPrice(plan);
          const features = getPlanFeatures(plan);
          const description = getPlanDescription(plan);
          const isCurrent = isCurrentPlan(plan.id);
          const isPopular = plan.id === 'medium';

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl p-8 ${
                isPopular
                  ? 'bg-gradient-to-b from-green-600/10 to-zinc-900/50 border-2 border-green-600/50'
                  : 'bg-zinc-900/50 border border-zinc-800'
              }`}
            >
              {isPopular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 px-4 py-1 bg-green-600 text-black text-sm font-semibold rounded-full">
                  POPULAR
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-4xl font-bold">{price.display}</span>
                  {price.subtext && <span className="text-gray-400">{price.subtext}</span>}
                </div>
                {price.annualSubtext && (
                  <p className="text-sm text-green-600 mb-2">{price.annualSubtext}</p>
                )}
                {description && (
                  <p className="text-gray-400 text-sm">{description}</p>
                )}
              </div>

              <ul className="space-y-3 mb-8 flex-grow">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <button
                  disabled
                  className="w-full py-3 bg-zinc-800 text-white rounded-lg font-medium opacity-50 cursor-not-allowed text-center"
                >
                  Current Plan
                </button>
              ) : (
                <button
                  onClick={() => onPlanSelect(plan)}
                  className={`w-full py-3 rounded-lg font-medium transition-colors text-center ${
                    isPopular
                      ? 'bg-green-600 text-black hover:bg-green-600/90'
                      : plan.id === 'enterprise'
                      ? 'bg-white text-black hover:bg-gray-200'
                      : 'bg-zinc-800 text-white hover:bg-zinc-700'
                  }`}
                >
                  {plan.id === 'free' ? 'Get Started' : plan.id === 'enterprise' ? 'Contact Sales' : 'Get Started'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ManageBillingView({ billingProfile, plans, onRefetch, isChangingPlan, setIsChangingPlan }) {
  const graphqlClient = useGraphQLClient();
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedInterval, setSelectedInterval] = useState('monthly');

  const currentPlanDetails = plans.find(p => p.id === billingProfile.currentPlan);

  const getUsagePercentage = (used, limit) => {
    if (!limit || limit === 0 || limit === 999999 || limit === -1) return 0;
    return Math.min((used / limit) * 100, 100);
  };

  const getUsageColor = (percentage) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const handlePaymentMethodAdded = () => {
    setShowPaymentForm(false);
    onRefetch();
  };

  const brandsPercentage = getUsagePercentage(billingProfile.brandsUsed, billingProfile.brandsLimit);
  const promptsPercentage = getUsagePercentage(billingProfile.promptsUsed, billingProfile.promptsLimit);

  return (
    <div className="space-y-6">
      {/* Current Plan Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-2xl capitalize">{billingProfile.currentPlan} Plan</CardTitle>
            {billingProfile.planStatus && ['past_due', 'incomplete_expired', 'canceled', 'unpaid'].includes(billingProfile.planStatus) && (
              <CardDescription>
                <span className="text-red-600">● Payment Failed - {billingProfile.planStatus}</span>
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Brands</p>
                <p className="text-2xl font-bold">
                  {billingProfile.brandsLimit === 999999 || billingProfile.brandsLimit === -1 ? 'Unlimited' : billingProfile.brandsLimit}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Prompts/Month</p>
                <p className="text-2xl font-bold">
                  {billingProfile.promptsLimit === 999999 || billingProfile.promptsLimit === -1 ? 'Unlimited' : billingProfile.promptsLimit}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">AI Models</p>
                <p className="text-2xl font-bold">
                  {billingProfile.modelsLimit === 999999 || billingProfile.modelsLimit === -1 ? 'Unlimited' : billingProfile.modelsLimit}
                </p>
              </div>
            </div>

            {billingProfile.currentPlan !== 'free' && (
              <Button
                background="Green"
                border="Light"
                onClick={() => setIsChangingPlan(true)}
              >
                Change Plan
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {billingProfile.collectionMethod === 'send_invoice' ? (
                <DocumentTextIcon className="h-5 w-5 mr-2" />
              ) : (
                <CreditCardIcon className="h-5 w-5 mr-2" />
              )}
              Payment Method
            </CardTitle>
          </CardHeader>
          <CardContent>
            {billingProfile.collectionMethod === 'send_invoice' ? (
              <div className="space-y-4">
                <div className="flex items-center p-3 border border-border rounded-lg bg-blue-500/10">
                  <DocumentTextIcon className="h-8 w-8 mr-3 text-blue-500" />
                  <div>
                    <p className="font-medium">Pay via Invoice</p>
                    <p className="text-sm text-muted-foreground">
                      Invoices will be sent to your billing email
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Contact support to update your billing method
                </p>
              </div>
            ) : billingProfile.hasPaymentMethod ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div className="flex items-center">
                    <CreditCardIcon className="h-8 w-8 mr-3 text-muted-foreground" />
                    <div>
                      <p className="font-medium capitalize">{billingProfile.paymentMethodBrand}</p>
                      <p className="text-sm text-muted-foreground">
                        •••• {billingProfile.paymentMethodLast4}
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Expires {billingProfile.paymentMethodExpMonth}/{billingProfile.paymentMethodExpYear}
                </p>
                <Button
                  background="Green"
                  border="Light"
                  onClick={() => setShowPaymentForm(true)}
                >
                  Update Card
                </Button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-4">
                  No payment method on file
                </p>
                <Button
                  background="Green"
                  border="Light"
                  className="w-full"
                  onClick={() => setShowPaymentForm(true)}
                >
                  Add Payment Method
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Usage Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ChartBarIcon className="h-5 w-5 mr-2" />
              Brand Usage
            </CardTitle>
            <CardDescription>
              {billingProfile.brandsUsed} of {billingProfile.brandsLimit === 999999 || billingProfile.brandsLimit === -1 ? 'Unlimited' : billingProfile.brandsLimit} brands used
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Usage</span>
                <span className="font-medium">{brandsPercentage.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className={`${getUsageColor(brandsPercentage)} h-3 rounded-full transition-all duration-300`}
                  style={{ width: `${brandsPercentage}%` }}
                />
              </div>
              {brandsPercentage >= 90 && (
                <p className="text-xs text-red-600 mt-2">
                  ⚠️ Approaching limit. Consider upgrading.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ChartBarIcon className="h-5 w-5 mr-2" />
              Prompt Usage
            </CardTitle>
            <CardDescription>
              {billingProfile.promptsUsed} of {billingProfile.promptsLimit === 999999 || billingProfile.promptsLimit === -1 ? 'Unlimited' : billingProfile.promptsLimit} prompts used
              {billingProfile.promptsResetDate && (
                <span className="block mt-1">
                  Resets {new Date(billingProfile.promptsResetDate).toLocaleDateString()}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Usage</span>
                <span className="font-medium">{promptsPercentage.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className={`${getUsageColor(promptsPercentage)} h-3 rounded-full transition-all duration-300`}
                  style={{ width: `${promptsPercentage}%` }}
                />
              </div>
              {promptsPercentage >= 90 && (
                <p className="text-xs text-red-600 mt-2">
                  ⚠️ Approaching limit. Consider upgrading.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Method Modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="max-w-lg w-full relative">
            <button
              onClick={() => setShowPaymentForm(false)}
              className="absolute -top-2 -right-2 bg-zinc-900 border border-zinc-800 rounded-full p-2 z-10 hover:bg-zinc-800"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <Elements stripe={stripePromise}>
              <PaymentMethodStep
                billingProfile={billingProfile}
                onSuccess={handlePaymentMethodAdded}
                onBack={() => setShowPaymentForm(false)}
                isUpdate={true}
              />
            </Elements>
          </div>
        </div>
      )}

      {/* Plan Change Modal */}
      {isChangingPlan && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="max-w-6xl w-full my-8">
            <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Change Plan</h2>
                <button
                  onClick={() => setIsChangingPlan(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <PlanSelectionStep
                plans={plans}
                billingProfile={billingProfile}
                selectedInterval={selectedInterval}
                onIntervalChange={setSelectedInterval}
                onPlanSelect={(plan) => {
                  // Handle plan change
                  toast.info('Plan change coming soon!');
                  setIsChangingPlan(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdvancedBillingSelector({
  workspace,
  availableProfiles,
  currentProfile,
  onAttachProfile,
  onCreateProfile,
  isLoading
}) {
  const [selectedProfileId, setSelectedProfileId] = useState(workspace?.billingProfileId || '');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleAttach = async () => {
    if (selectedProfileId && selectedProfileId !== workspace?.billingProfileId) {
      await onAttachProfile(selectedProfileId);
    }
  };

  const handleCreate = async () => {
    if (!newProfileName.trim()) {
      toast.error('Please enter a billing profile name');
      return;
    }

    setIsCreating(true);
    try {
      await onCreateProfile(newProfileName);
      setShowCreateModal(false);
      setNewProfileName('');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="mt-8">
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle>Billing Profile</CardTitle>
          <CardDescription>
            Select which billing profile to use for this workspace
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <select
              value={selectedProfileId}
              onChange={(e) => setSelectedProfileId(e.target.value)}
              className="flex-1 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-600"
              disabled={isLoading}
            >
              {availableProfiles?.map((profile) => {
                const isDefault = profile._id === workspace?.defaultBillingProfileId;
                return (
                  <option key={profile._id} value={profile._id}>
                    {profile.name} {isDefault ? '(Default)' : ''} - {profile.currentPlan}
                  </option>
                );
              })}
            </select>

            <Button
              background="Green"
              border="Light"
              onClick={handleAttach}
              disabled={isLoading || selectedProfileId === workspace?.billingProfileId}
            >
              {isLoading ? 'Attaching...' : 'Attach'}
            </Button>
          </div>

          <Button
            background="Green"
            border="Light"
            width="Full"
            onClick={() => setShowCreateModal(true)}
            disabled={isLoading}
          >
            + Create New Billing Profile
          </Button>

          {showCreateModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-xl font-bold mb-4">Create Billing Profile</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Create a new billing profile that starts on the free tier. You can share this profile across multiple workspaces.
                </p>
                <input
                  type="text"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="Enter billing profile name"
                  className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-600 mb-4"
                  disabled={isCreating}
                />
                <div className="flex gap-3">
                  <Button
                    background="Green"
                    border="Light"
                    onClick={() => {
                      setShowCreateModal(false);
                      setNewProfileName('');
                    }}
                    disabled={isCreating}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    background="Green"
                    border="Light"
                    onClick={handleCreate}
                    disabled={isCreating}
                    className="flex-1"
                  >
                    {isCreating ? 'Creating...' : 'Create'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BillingModeToggle({ workspaceSlug, isAdvanced, onToggle, isLoading }) {
  return (
    <div className="mt-12 pt-8 border-t border-zinc-800">
      <div className="bg-zinc-900/30 rounded-lg p-6">
        {!isAdvanced ? (
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-2">Complex billing needs?</h3>
              <p className="text-sm text-gray-400 mb-4">
                Switch to advanced billing to manage multiple billing profiles, share billing across workspaces, and gain more control over your subscription management.
              </p>
            </div>
            <Button
              background="Green"
              border="Light"
              onClick={onToggle}
              disabled={isLoading}
            >
              {isLoading ? 'Switching...' : 'Change to Advanced Billing'}
            </Button>
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-2">Looking a bit complex?</h3>
              <p className="text-sm text-gray-400 mb-4">
                Switch to simple billing to use your workspace's default billing profile. This will revert any advanced billing configurations.
              </p>
            </div>
            <Button
              background="Green"
              border="Light"
              onClick={onToggle}
              disabled={isLoading}
            >
              {isLoading ? 'Switching...' : 'Switch to Simple Billing'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BillingPage({ params }) {
  const resolvedParams = use(params);
  const { workspaceSlug } = resolvedParams || {};
  const { workspace, setWorkspace } = useWorkspace();
  const graphqlClient = useGraphQLClient();
  const searchParams = useSearchParams();

  const [plans, setPlans] = useState([]);
  const [billingProfile, setBillingProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState('loading'); // loading, plan_selection, add_payment, manage
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedInterval, setSelectedInterval] = useState('monthly');
  const [billingConfig, setBillingConfig] = useState(null);
  const [isTogglingMode, setIsTogglingMode] = useState(false);
  const [availableProfiles, setAvailableProfiles] = useState([]);
  const [isAttaching, setIsAttaching] = useState(false);
  const [showBillingWarning, setShowBillingWarning] = useState(false);
  const [isChangingPlan, setIsChangingPlan] = useState(false);

  const fetchData = async () => {
    if (!workspaceSlug) return;

    setIsLoading(true);

    try {
      // Refetch workspace data first to get updated billing profile IDs
      const workspaceResult = await executeQuery(
        graphqlClient,
        GET_USER_WORKSPACES,
        { workspaceSlug },
        { fetchPolicy: 'network-only' }
      );

      let updatedWorkspace = workspace;
      if (workspaceResult.data?.workspace) {
        updatedWorkspace = workspaceResult.data.workspace;
        setWorkspace(updatedWorkspace);
        console.log('Updated workspace data:', updatedWorkspace);
      }

      // Fetch plans
      const plansResult = await executeQuery(graphqlClient, GET_BILLING_PLANS);

      console.log('Billing plans result:', plansResult);

      if (plansResult.data?.billingPlans) {
        setPlans(plansResult.data.billingPlans);
      }

      // Fetch billing profile for this specific workspace
      if (updatedWorkspace?.billingProfileId) {
        const profileResult = await executeQuery(
          graphqlClient,
          GET_BILLING_PROFILES,
          { billingProfileId: updatedWorkspace.billingProfileId },
          { fetchPolicy: 'network-only' }
        );

        console.log('Billing profile result:', profileResult);

        if (profileResult.data?.billingProfiles?.[0]) {
          const profile = profileResult.data.billingProfiles[0];
          setBillingProfile(profile);

          // Determine current step based on profile state
          if (profile.hasPaymentMethod || profile.currentPlan !== 'free') {
            setCurrentStep('manage');
          } else {
            setCurrentStep('plan_selection');
          }
        } else {
          console.error('No billing profile found for workspace');
          setCurrentStep('plan_selection');
        }
      } else {
        console.error('Workspace has no billingProfileId');
        toast.error('This workspace is not linked to a billing profile');
        setCurrentStep('plan_selection');
      }

      // Fetch workspace billing config
      const configResult = await executeQuery(
        graphqlClient,
        GET_WORKSPACE_CONFIGS,
        { workspaceSlug }
      );

      if (configResult.data?.configs) {
        const config = configResult.data.configs.find(c => c.configType === 'billing');
        const finalConfig = config || { configType: 'billing', data: { advancedBilling: false } };
        console.log('Setting billing config:', finalConfig);
        setBillingConfig(finalConfig);
      }

      // Fetch all available billing profiles for user (for advanced mode)
      // Pass workspaceId to filter default profiles to only the current workspace
      const allProfilesResult = await executeQuery(
        graphqlClient,
        GET_BILLING_PROFILES,
        { workspaceId: updatedWorkspace._id }
      );

      if (allProfilesResult.data?.billingProfiles) {
        setAvailableProfiles(allProfilesResult.data.billingProfiles);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('Failed to load billing information');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [workspace?._id, graphqlClient]);

  // Check for changePlan query parameter
  useEffect(() => {
    if (searchParams?.get('changePlan') === 'true' && currentStep === 'manage') {
      setIsChangingPlan(true);
    }
  }, [searchParams, currentStep]);

  const handlePlanSelect = async (plan) => {
    if (plan.id === 'enterprise') {
      window.location.href = 'mailto:sales@getairank.com';
      return;
    }

    if (plan.id === 'free') {
      toast.info('You are already on the free plan');
      return;
    }

    setSelectedPlan(plan);
    setCurrentStep('add_payment');
  };

  const handlePaymentAdded = async (updatedProfile) => {
    setBillingProfile(updatedProfile);

    // Now create the subscription
    try {
      const result = await executeMutation(
        graphqlClient,
        CREATE_SUBSCRIPTION,
        {
          billingProfileId: updatedProfile._id,
          planId: selectedPlan.id,
          interval: selectedInterval
        }
      );

      if (result.data?.createSubscription) {
        toast.success('Subscription created successfully!');

        // Confirm subscription
        const confirmResult = await executeMutation(
          graphqlClient,
          CONFIRM_SUBSCRIPTION,
          { billingProfileId: updatedProfile._id }
        );

        if (confirmResult.data?.confirmSubscription) {
          setBillingProfile(confirmResult.data.confirmSubscription);
          setCurrentStep('manage');
          toast.success('Welcome to your new plan!');

          // Refresh data after a short delay to get updated Stripe status
          setTimeout(() => {
            fetchData();
          }, 2000);
        }
      }
    } catch (err) {
      console.error('Subscription error:', err);
      toast.error('Failed to create subscription');
    }
  };

  const handleToggleBillingMode = async () => {
    const currentMode = billingConfig?.data?.advancedBilling || false;
    const newMode = !currentMode;

    // If switching from advanced to simple and not on default profile, show warning
    if (currentMode && !newMode && workspace.billingProfileId !== workspace.defaultBillingProfileId) {
      setShowBillingWarning(true);
      return;
    }

    // Proceed with toggle
    await performBillingModeToggle(newMode);
  };

  const performBillingModeToggle = async (newMode) => {
    setIsTogglingMode(true);
    setCurrentStep('loading');

    try {
      const result = await executeMutation(
        graphqlClient,
        UPDATE_WORKSPACE_CONFIG,
        {
          workspaceSlug,
          configs: [{
            configType: 'billing',
            data: { advancedBilling: newMode }
          }]
        }
      );

      if (result.data?.updateWorkspaceConfigs) {
        const updatedConfig = result.data.updateWorkspaceConfigs.find(c => c.configType === 'billing');
        setBillingConfig(updatedConfig);
        toast.success(`Switched to ${newMode ? 'advanced' : 'simple'} billing mode`);

        // Refresh data to get updated billing profile
        await fetchData();
      }
    } catch (err) {
      console.error('Error toggling billing mode:', err);
      toast.error('Failed to update billing mode');
      // Restore previous step on error
      setCurrentStep('manage');
    } finally {
      setIsTogglingMode(false);
    }
  };

  const handleAttachProfile = async (billingProfileId) => {
    setIsAttaching(true);
    setCurrentStep('loading');

    try {
      const result = await executeMutation(
        graphqlClient,
        ATTACH_BILLING_PROFILE,
        {
          workspaceId: workspace._id,
          billingProfileId
        }
      );

      if (result.data?.attachBillingProfile) {
        toast.success('Billing profile attached successfully');

        // Refresh data to get updated billing profile
        await fetchData();
      }
    } catch (err) {
      console.error('Error attaching billing profile:', err);
      toast.error(err.message || 'Failed to attach billing profile');
      // Restore previous step on error
      setCurrentStep('manage');
    } finally {
      setIsAttaching(false);
    }
  };

  const handleCreateProfile = async (name) => {
    try {
      const result = await executeMutation(
        graphqlClient,
        CREATE_BILLING_PROFILE,
        {
          name,
          workspaceId: workspace._id
        }
      );

      if (result.data?.createBillingProfile) {
        toast.success('Billing profile created successfully');

        // Refresh data to get updated list of profiles
        setTimeout(() => {
          fetchData();
        }, 500);
      }
    } catch (err) {
      console.error('Error creating billing profile:', err);
      toast.error(err.message || 'Failed to create billing profile');
      throw err;
    }
  };

  if (isLoading || currentStep === 'loading') {
    return (
      <AccountLayout routerType="app">
        <Meta title="Billing & Subscription" />
        <Content.Title
          title="Billing & Subscription"
          subtitle="Manage your plan and payment"
        />
        <Content.Divider />
        <Content.Container>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading...</p>
            </div>
          </div>
        </Content.Container>
      </AccountLayout>
    );
  }

  return (
    <AccountLayout routerType="app">
      <Meta title="Billing & Subscription" />
      <Content.Title
        title={currentStep === 'add_payment' ? "Confirm Your Subscription" : "Billing & Subscription"}
        subtitle={currentStep === 'add_payment' ? "Review your plan details and add payment method" : "Manage your plan and payment"}
      />
      <Content.Divider />
      <Content.Container>
        {currentStep === 'plan_selection' && (
          <div>
            <div className="mb-6 text-center">
              <h3 className="text-xl font-semibold mb-2">Choose Your Plan</h3>
              <p className="text-muted-foreground">
                Select a plan to get started. You can upgrade or downgrade anytime.
              </p>
            </div>
            <PlanSelectionStep
              plans={plans}
              billingProfile={billingProfile}
              selectedInterval={selectedInterval}
              onIntervalChange={setSelectedInterval}
              onPlanSelect={handlePlanSelect}
            />
            {billingConfig?.data?.advancedBilling && (
              <AdvancedBillingSelector
                workspace={workspace}
                availableProfiles={availableProfiles}
                currentProfile={billingProfile}
                onAttachProfile={handleAttachProfile}
                onCreateProfile={handleCreateProfile}
                isLoading={isAttaching}
              />
            )}
            <BillingModeToggle
              workspaceSlug={workspaceSlug}
              isAdvanced={billingConfig?.data?.advancedBilling || false}
              onToggle={handleToggleBillingMode}
              isLoading={isTogglingMode}
            />
          </div>
        )}

        {currentStep === 'add_payment' && selectedPlan && (
          <div>
            {/* Plan Confirmation Card */}
            <div className="w-full mb-8 bg-zinc-900/50 border border-zinc-800 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-left">
                    <p className="text-sm text-gray-400">Selected Plan</p>
                    <p className="text-xl font-bold">{selectedPlan.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400">
                      {selectedInterval === 'annual' ? 'Annual' : 'Monthly'}
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {selectedInterval === 'annual'
                        ? `$${selectedPlan.annualPrice ? parseInt(selectedPlan.annualPrice.replace(/[^0-9]/g, '')).toLocaleString() : (selectedPlan.costPerMonth * 12).toLocaleString()}/year`
                        : `$${selectedPlan.costPerMonth}/month`
                      }
                    </p>
                  </div>
                </div>

                <div className="border-t border-zinc-700 pt-4 mt-4">
                  <p className="text-sm text-gray-400 mb-2">What's included:</p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                      <span>{selectedPlan.brandsLimit === -1 ? 'Unlimited brands' : `${selectedPlan.brandsLimit} brand${selectedPlan.brandsLimit !== 1 ? 's' : ''}`}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                      <span>{selectedPlan.promptsLimit === -1 ? 'Unlimited prompts/month' : `${selectedPlan.promptsLimit} prompts/month`}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                      <span>{selectedPlan.modelsLimit === -1 ? 'Unlimited AI models' : `${selectedPlan.modelsLimit} AI model${selectedPlan.modelsLimit !== 1 ? 's' : ''}`}</span>
                    </li>
                  </ul>
                  {selectedInterval === 'annual' && selectedPlan.annualPrice && (
                    <p className="text-xs text-green-600 mt-4">
                      💰 Save ${(selectedPlan.costPerMonth * 12) - parseInt(selectedPlan.annualPrice.replace(/[^0-9]/g, ''))} with annual billing
                    </p>
                  )}
                </div>
            </div>
            <Elements stripe={stripePromise}>
              <PaymentMethodStep
                billingProfile={billingProfile}
                onSuccess={handlePaymentAdded}
                onBack={() => setCurrentStep('plan_selection')}
              />
            </Elements>
          </div>
        )}

        {currentStep === 'manage' && billingProfile && (
          <div>
            <ManageBillingView
              billingProfile={billingProfile}
              plans={plans}
              onRefetch={fetchData}
              isChangingPlan={isChangingPlan}
              setIsChangingPlan={setIsChangingPlan}
            />
            {console.log('🔍 CHECK: currentStep:', currentStep, 'billingConfig:', billingConfig, 'advancedBilling:', billingConfig?.data?.advancedBilling)}
            {billingConfig?.data?.advancedBilling && (
              <>
                {/* Billing Profile Members Card */}
                <Card className="bg-zinc-900/50 border-zinc-800 mt-8">
                  <CardHeader>
                    <CardTitle>Billing Profile Members</CardTitle>
                    <CardDescription>
                      {billingProfile.members?.length || 0} {billingProfile.members?.length === 1 ? 'user has' : 'users have'} access to this billing profile
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      background="Green"
                      border="Light"
                      onClick={() => window.location.href = `/${workspaceSlug}/settings/billing-profiles`}
                    >
                      Manage Profile Members
                    </Button>
                  </CardContent>
                </Card>

                <AdvancedBillingSelector
                  workspace={workspace}
                  availableProfiles={availableProfiles}
                  currentProfile={billingProfile}
                  onAttachProfile={handleAttachProfile}
                  onCreateProfile={handleCreateProfile}
                  isLoading={isAttaching}
                />
              </>
            )}
            <BillingModeToggle
              workspaceSlug={workspaceSlug}
              isAdvanced={billingConfig?.data?.advancedBilling || false}
              onToggle={handleToggleBillingMode}
              isLoading={isTogglingMode}
            />
          </div>
        )}

        {/* Billing Mode Warning Modal */}
        {showBillingWarning && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#0a0a0a] border border-zinc-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold mb-4">Switch to Simple Billing?</h3>
              <p className="text-sm text-gray-400 mb-4">
                You are currently using a non-default billing profile for this workspace.
                Switching to simple billing will revert this workspace back to its default billing profile.
              </p>
              <p className="text-sm text-gray-400 mb-6">
                Are you sure you want to continue?
              </p>
              <div className="flex gap-3">
                <Button
                  background="Green"
                  border="Light"
                  onClick={() => setShowBillingWarning(false)}
                  disabled={isTogglingMode}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  background="Green"
                  border="Light"
                  onClick={async () => {
                    setShowBillingWarning(false);
                    await performBillingModeToggle(false);
                  }}
                  disabled={isTogglingMode}
                  className="flex-1"
                >
                  {isTogglingMode ? 'Switching...' : 'Switch to Simple'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Content.Container>
    </AccountLayout>
  );
}
