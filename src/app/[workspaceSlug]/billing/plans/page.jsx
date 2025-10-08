'use client';

import { useState, useEffect, use } from 'react';
import { useWorkspace } from '@/providers/workspace';
import { useGraphQLClient } from '@/hooks/data/index';
import { AccountLayout } from '@/layouts/index';
import Meta from '@/components/Meta/index';
import Content from '@/components/Content/index';
import { executeQuery, executeMutation } from '@/graphql/operations';
import { GET_BILLING_PLANS, GET_BILLING_PROFILES, CREATE_SUBSCRIPTION } from '@/graphql/billing-operations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import Button from '@/components/Button/index';
import toast from 'react-hot-toast';
import { CheckIcon } from '@heroicons/react/24/solid';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

export default function BillingPlansPage({ params }) {
  const resolvedParams = use(params);
  const { workspaceSlug } = resolvedParams || {};
  const { workspace } = useWorkspace();
  const graphqlClient = useGraphQLClient();

  const [plans, setPlans] = useState([]);
  const [billingProfile, setBillingProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [selectedInterval, setSelectedInterval] = useState('annual'); // 'monthly' or 'annual'

  // Fetch plans and billing profile
  useEffect(() => {
    const fetchData = async () => {
      if (!workspace?._id) return;

      setIsLoading(true);

      try {
        // Fetch plans
        const plansResult = await executeQuery(graphqlClient, GET_BILLING_PLANS);
        if (plansResult.data?.billingPlans) {
          setPlans(plansResult.data.billingPlans);
        }

        // Fetch billing profile
        const profileResult = await executeQuery(graphqlClient, GET_BILLING_PROFILES);
        if (profileResult.data?.billingProfiles?.[0]) {
          setBillingProfile(profileResult.data.billingProfiles[0]);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        toast.error('Failed to load plans');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [workspace?._id, graphqlClient]);

  const handleSubscribe = async (planId) => {
    if (!billingProfile) {
      toast.error('No billing profile found. Please contact support.');
      return;
    }

    if (planId === 'free') {
      toast.error('You are already on the free plan');
      return;
    }

    if (planId === 'enterprise') {
      toast.success('Please contact sales@airank.ai for enterprise pricing');
      return;
    }

    setIsSubscribing(true);

    try {
      // Create subscription
      const result = await executeMutation(
        graphqlClient,
        CREATE_SUBSCRIPTION,
        {
          billingProfileId: billingProfile._id,
          planId,
          interval: selectedInterval
        }
      );

      if (result.data?.createSubscription) {
        const { clientSecret } = result.data.createSubscription;

        // Redirect to Stripe checkout
        const stripe = await stripePromise;
        if (!stripe) {
          throw new Error('Stripe failed to load');
        }

        // Confirm the payment with Stripe
        const { error } = await stripe.confirmPayment({
          clientSecret,
          confirmParams: {
            return_url: `${window.location.origin}/${workspaceSlug}/billing/success`,
          },
        });

        if (error) {
          toast.error(error.message);
        }
      } else if (result.error) {
        toast.error(result.error.message);
      }
    } catch (err) {
      console.error('Subscription error:', err);
      toast.error('Failed to create subscription');
    } finally {
      setIsSubscribing(false);
    }
  };

  const getPlanFeatures = (plan) => {
    const features = [];

    if (plan.brandsLimit === 'unlimited') {
      features.push('Unlimited brands');
    } else {
      features.push(`${plan.brandsLimit} brand${plan.brandsLimit > 1 ? 's' : ''}`);
    }

    if (plan.promptsLimit === 'unlimited') {
      features.push('Unlimited prompts');
    } else {
      features.push(`${plan.promptsLimit} prompts per month`);
    }

    if (plan.modelsLimit === 'unlimited') {
      features.push('All AI models');
    } else {
      features.push(`${plan.modelsLimit} AI model${plan.modelsLimit > 1 ? 's' : ''}`);
    }

    features.push(`${plan.batchFrequency === 'custom' ? 'Custom' : plan.batchFrequency.charAt(0).toUpperCase() + plan.batchFrequency.slice(1)} checks`);

    if (plan.dataRetentionDays === 'unlimited') {
      features.push('Unlimited data retention');
    } else {
      features.push(`${plan.dataRetentionDays} days data retention`);
    }

    // Add any additional features from the plan
    if (plan.features) {
      features.push(...plan.features);
    }

    return features;
  };

  const getPlanPrice = (plan) => {
    if (plan.id === 'free') {
      return { display: '$0', subtext: 'forever' };
    }

    if (plan.id === 'enterprise') {
      return { display: 'Custom', subtext: 'contact sales' };
    }

    const price = selectedInterval === 'annual' ? plan.annualPrice : plan.monthlyPrice;
    const monthly = selectedInterval === 'annual' ? (price / 12).toFixed(0) : price;

    return {
      display: `$${monthly}`,
      subtext: selectedInterval === 'annual' ? '/month (billed annually)' : '/month'
    };
  };

  const isCurrentPlan = (planId) => {
    return billingProfile?.currentPlan === planId;
  };

  if (isLoading) {
    return (
      <AccountLayout routerType="app">
        <Meta title={`AI Rank - Billing Plans`} />
        <Content.Title
          title="Billing Plans"
          subtitle="Choose the perfect plan for your needs"
        />
        <Content.Divider />
        <Content.Container>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading plans...</p>
            </div>
          </div>
        </Content.Container>
      </AccountLayout>
    );
  }

  return (
    <AccountLayout routerType="app">
      <Meta title={`AI Rank - Billing Plans`} />
      <Content.Title
        title="Billing Plans"
        subtitle="Choose the perfect plan for your needs"
      />
      <Content.Divider />
      <Content.Container>
        {/* Interval Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-lg border border-border p-1 bg-card">
            <button
              onClick={() => setSelectedInterval('monthly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedInterval === 'monthly'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setSelectedInterval('annual')}
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
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={isSubscribing}
                    >
                      {isSubscribing ? 'Processing...' : 'Subscribe'}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Current Plan Info */}
        {billingProfile && (
          <div className="mt-8 text-center text-sm text-muted-foreground">
            Current plan: <span className="font-semibold">{billingProfile.currentPlan}</span>
            {billingProfile.currentPeriodEnd && (
              <span> • Renews on {new Date(billingProfile.currentPeriodEnd).toLocaleDateString()}</span>
            )}
          </div>
        )}
      </Content.Container>
    </AccountLayout>
  );
}
