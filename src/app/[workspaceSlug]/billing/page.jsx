'use client';

import { useState, useEffect, use } from 'react';
import { useWorkspace } from '@/providers/workspace';
import { useGraphQLClient } from '@/hooks/data/index';
import { AccountLayout } from '@/layouts/index';
import Meta from '@/components/Meta/index';
import Content from '@/components/Content/index';
import { executeQuery } from '@/graphql/operations';
import { GET_BILLING_PROFILES, GET_BILLING_PLANS } from '@/graphql/billing-operations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import Button from '@/components/Button/index';
import Link from 'next/link';
import {
  CreditCardIcon,
  CheckCircleIcon,
  ClockIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { StripeProvider } from '@/providers/stripe';
import { PaymentMethodForm } from '@/components/billing/PaymentMethodForm';

export default function BillingPage({ params }) {
  const resolvedParams = use(params);
  const { workspaceSlug } = resolvedParams || {};
  const { workspace } = useWorkspace();
  const graphqlClient = useGraphQLClient();

  const [billingProfile, setBillingProfile] = useState(null);
  const [currentPlanDetails, setCurrentPlanDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  // Fetch billing profile and plan details
  useEffect(() => {
    const fetchData = async () => {
      if (!workspace?._id) return;

      setIsLoading(true);

      try {
        // Fetch billing profile
        const profileResult = await executeQuery(graphqlClient, GET_BILLING_PROFILES);
        if (profileResult.data?.billingProfiles?.[0]) {
          const profile = profileResult.data.billingProfiles[0];
          setBillingProfile(profile);

          // Fetch plan details
          const plansResult = await executeQuery(graphqlClient, GET_BILLING_PLANS);
          if (plansResult.data?.billingPlans) {
            const plan = plansResult.data.billingPlans.find(p => p.id === profile.currentPlan);
            setCurrentPlanDetails(plan);
          }
        }
      } catch (err) {
        console.error('Error fetching billing data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [workspace?._id, graphqlClient]);

  const handlePaymentMethodAdded = (updatedProfile) => {
    setBillingProfile(updatedProfile);
    setShowPaymentForm(false);
  };

  const getUsagePercentage = (used, limit) => {
    if (!limit || limit === 0) return 0;
    return Math.min((used / limit) * 100, 100);
  };

  const getUsageColor = (percentage) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (isLoading) {
    return (
      <AccountLayout routerType="app">
        <Meta title={`AI Rank - Billing`} />
        <Content.Title
          title="Billing & Usage"
          subtitle="Manage your subscription and usage"
        />
        <Content.Divider />
        <Content.Container>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading billing information...</p>
            </div>
          </div>
        </Content.Container>
      </AccountLayout>
    );
  }

  if (!billingProfile) {
    return (
      <AccountLayout routerType="app">
        <Meta title={`AI Rank - Billing`} />
        <Content.Title
          title="Billing & Usage"
          subtitle="Manage your subscription and usage"
        />
        <Content.Divider />
        <Content.Container>
          <Card>
            <CardHeader>
              <CardTitle>No Billing Profile Found</CardTitle>
              <CardDescription>
                Please contact support to set up billing for your workspace.
              </CardDescription>
            </CardHeader>
          </Card>
        </Content.Container>
      </AccountLayout>
    );
  }

  const brandsPercentage = getUsagePercentage(billingProfile.brandsUsed, billingProfile.brandsLimit);
  const promptsPercentage = getUsagePercentage(billingProfile.promptsUsed, billingProfile.promptsLimit);

  return (
    <AccountLayout routerType="app">
      <Meta title={`AI Rank - Billing`} />
      <Content.Title
        title="Billing & Usage"
        subtitle="Manage your subscription and usage"
      />
      <Content.Divider />
      <Content.Container>
        {/* Current Plan Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl capitalize">
                    {billingProfile.currentPlan} Plan
                  </CardTitle>
                  <CardDescription>
                    {billingProfile.planStatus === 'active' ? (
                      <div className="flex items-center mt-1 text-green-600">
                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                        Active
                      </div>
                    ) : (
                      <div className="flex items-center mt-1 text-yellow-600">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        {billingProfile.planStatus || 'Free'}
                      </div>
                    )}
                  </CardDescription>
                </div>
                <Link href={`/${workspaceSlug}/billing/plans`}>
                  <Button background="Pink" border="Light">
                    Change Plan
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {currentPlanDetails && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
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

              {billingProfile.currentPeriodEnd && (
                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    {billingProfile.planStatus === 'active' ? 'Renews on' : 'Period ends'}{' '}
                    <span className="font-semibold text-foreground">
                      {new Date(billingProfile.currentPeriodEnd).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Method Card */}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
                    ⚠️ You're approaching your brand limit. Consider upgrading your plan.
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
                    ⚠️ You're approaching your prompt limit. Consider upgrading your plan.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Method Form Modal */}
        {showPaymentForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="max-w-lg w-full">
              <StripeProvider>
                <div className="relative">
                  <button
                    onClick={() => setShowPaymentForm(false)}
                    className="absolute -top-2 -right-2 bg-card border border-border rounded-full p-2 z-10 hover:bg-muted"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <PaymentMethodForm
                    billingProfileId={billingProfile._id}
                    graphqlClient={graphqlClient}
                    onSuccess={handlePaymentMethodAdded}
                  />
                </div>
              </StripeProvider>
            </div>
          </div>
        )}
      </Content.Container>
    </AccountLayout>
  );
}
