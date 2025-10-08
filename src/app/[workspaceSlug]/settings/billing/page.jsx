'use client';

import { useState, useEffect, use } from 'react';
import { useWorkspace } from '@/providers/workspace';
import { useGraphQLClient } from '@/hooks/data/index';
import { AccountLayout } from '@/layouts/index';
import Meta from '@/components/Meta/index';
import Content from '@/components/Content/index';
import { executeQuery, executeMutation } from '@/graphql/operations';
import {
  GET_BILLING_PROFILES,
  GET_BILLING_PLANS,
  CREATE_SUBSCRIPTION,
  CONFIRM_SUBSCRIPTION,
  CREATE_SETUP_INTENT,
  SAVE_PAYMENT_METHOD
} from '@/graphql/billing-operations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import Button from '@/components/Button/index';
import toast from 'react-hot-toast';
import { CheckIcon, CreditCardIcon, ChartBarIcon } from '@heroicons/react/24/solid';
import { useStripe, useElements, CardElement, Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: '#1a1a1a',
      fontFamily: 'system-ui, sans-serif',
      fontSmoothing: 'antialiased',
      fontSize: '16px',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
    invalid: {
      color: '#ff0099',
      iconColor: '#ff0099',
    },
  },
};

function PaymentMethodStep({ billingProfile, onSuccess, onBack }) {
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
        toast.success('Payment method added successfully!');
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
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Add Payment Method</CardTitle>
        <CardDescription>
          Enter your card details to complete your subscription setup
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
              background="Pink"
              border="Light"
              type="submit"
              disabled={!stripe || isProcessing}
              className="flex-1"
            >
              {isProcessing ? 'Processing...' : 'Add Payment Method'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function PlanSelectionStep({ plans, billingProfile, selectedInterval, onIntervalChange, onPlanSelect }) {
  const getPlanPrice = (plan) => {
    if (plan.isFree || plan.id === 'free') {
      return { display: '$0', subtext: 'forever' };
    }

    if (plan.isEnterprise || plan.id === 'enterprise') {
      return { display: 'Custom', subtext: 'contact sales' };
    }

    // Use price (monthly) or annualPrice
    if (selectedInterval === 'annual' && plan.annualPrice) {
      // annualPrice is already formatted like "$290"
      const annualAmount = parseInt(plan.annualPrice.replace(/[^0-9]/g, ''));
      const monthly = (annualAmount / 12).toFixed(0);
      return {
        display: `$${monthly}`,
        subtext: '/month (billed annually)'
      };
    }

    // Use costPerMonth or parse from price
    const monthlyAmount = plan.costPerMonth || parseInt((plan.price || '$0').replace(/[^0-9]/g, ''));
    return {
      display: `$${monthlyAmount}`,
      subtext: '/month'
    };
  };

  const getPlanFeatures = (plan) => {
    // Features are already built by the backend, just return them
    return plan.features || [];
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const price = getPlanPrice(plan);
          const features = getPlanFeatures(plan);
          const isCurrent = isCurrentPlan(plan.id);
          const isPopular = plan.id === 'small';

          return (
            <Card
              key={plan.id}
              className={`relative flex flex-col ${
                isPopular ? 'border-primary shadow-lg scale-105' : ''
              }`}
            >
              {isPopular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold">
                    MOST POPULAR
                  </span>
                </div>
              )}

              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription className="min-h-[40px]">
                  {plan.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1">
                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold">{price.display}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{price.subtext}</p>
                </div>

                <ul className="space-y-3">
                  {features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <CheckIcon className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                {isCurrent ? (
                  <Button
                    background="Pink"
                    border="Light"
                    className="w-full"
                    disabled
                  >
                    Current Plan
                  </Button>
                ) : (
                  <Button
                    background={isPopular ? 'Pink' : 'Green'}
                    border="Light"
                    className="w-full"
                    onClick={() => onPlanSelect(plan)}
                  >
                    {plan.id === 'free' ? 'Select' : plan.id === 'enterprise' ? 'Contact Sales' : 'Subscribe'}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function ManageBillingView({ billingProfile, plans, onRefetch }) {
  const graphqlClient = useGraphQLClient();
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedInterval, setSelectedInterval] = useState('annual');
  const [isChangingPlan, setIsChangingPlan] = useState(false);

  const currentPlanDetails = plans.find(p => p.id === billingProfile.currentPlan);

  const getUsagePercentage = (used, limit) => {
    if (!limit || limit === 0 || limit === 999999) return 0;
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
            <CardDescription>
              {billingProfile.planStatus === 'active' ? (
                <span className="text-green-600">● Active</span>
              ) : (
                <span className="text-gray-600">● {billingProfile.planStatus || 'Free'}</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentPlanDetails && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Brands</p>
                  <p className="text-2xl font-bold">
                    {billingProfile.brandsLimit === 999999 ? '∞' : billingProfile.brandsLimit}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Prompts/Month</p>
                  <p className="text-2xl font-bold">
                    {billingProfile.promptsLimit === 999999 ? '∞' : billingProfile.promptsLimit}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">AI Models</p>
                  <p className="text-2xl font-bold">
                    {billingProfile.modelsLimit === 999999 ? '∞' : billingProfile.modelsLimit}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data Retention</p>
                  <p className="text-2xl font-bold">
                    {billingProfile.dataRetentionDays === 999999 ? '∞' : `${billingProfile.dataRetentionDays}d`}
                  </p>
                </div>
              </div>
            )}

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
              <CreditCardIcon className="h-5 w-5 mr-2" />
              Payment Method
            </CardTitle>
          </CardHeader>
          <CardContent>
            {billingProfile.hasPaymentMethod ? (
              <div className="space-y-2">
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
                  className="w-full mt-2"
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
                  background="Pink"
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
              {billingProfile.brandsUsed} of {billingProfile.brandsLimit === 999999 ? '∞' : billingProfile.brandsLimit} brands used
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
              {billingProfile.promptsUsed} of {billingProfile.promptsLimit === 999999 ? '∞' : billingProfile.promptsLimit} prompts used
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-lg w-full relative">
            <button
              onClick={() => setShowPaymentForm(false)}
              className="absolute -top-2 -right-2 bg-card border border-border rounded-full p-2 z-10 hover:bg-muted"
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
              />
            </Elements>
          </div>
        </div>
      )}

      {/* Plan Change Modal */}
      {isChangingPlan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="max-w-6xl w-full my-8">
            <div className="bg-card rounded-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Change Plan</h2>
                <button
                  onClick={() => setIsChangingPlan(false)}
                  className="text-muted-foreground hover:text-foreground"
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

export default function BillingPage({ params }) {
  const resolvedParams = use(params);
  const { workspaceSlug } = resolvedParams || {};
  const { workspace } = useWorkspace();
  const graphqlClient = useGraphQLClient();

  const [plans, setPlans] = useState([]);
  const [billingProfile, setBillingProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState('loading'); // loading, plan_selection, add_payment, manage
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedInterval, setSelectedInterval] = useState('annual');

  const fetchData = async () => {
    if (!workspace?._id) return;

    setIsLoading(true);

    try {
      // Fetch plans and billing profile
      const [plansResult, profileResult] = await Promise.all([
        executeQuery(graphqlClient, GET_BILLING_PLANS),
        executeQuery(graphqlClient, GET_BILLING_PROFILES)
      ]);

      if (plansResult.data?.billingPlans) {
        setPlans(plansResult.data.billingPlans);
      }

      if (profileResult.data?.billingProfiles?.[0]) {
        const profile = profileResult.data.billingProfiles[0];
        setBillingProfile(profile);

        // Determine current step based on profile state
        if (profile.hasPaymentMethod || profile.currentPlan !== 'free') {
          setCurrentStep('manage');
        } else {
          setCurrentStep('plan_selection');
        }
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
        }
      }
    } catch (err) {
      console.error('Subscription error:', err);
      toast.error('Failed to create subscription');
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
        title="Billing & Subscription"
        subtitle="Manage your plan and payment"
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
          </div>
        )}

        {currentStep === 'add_payment' && selectedPlan && (
          <div>
            <div className="mb-6 text-center">
              <h3 className="text-xl font-semibold mb-2">
                Almost there! Add your payment method
              </h3>
              <p className="text-muted-foreground">
                You selected: <span className="font-semibold">{selectedPlan.name}</span> plan
              </p>
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
          <ManageBillingView
            billingProfile={billingProfile}
            plans={plans}
            onRefetch={fetchData}
          />
        )}
      </Content.Container>
    </AccountLayout>
  );
}
