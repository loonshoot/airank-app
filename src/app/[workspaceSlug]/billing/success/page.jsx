'use client';

import { useState, useEffect, use } from 'react';
import { useWorkspace } from '@/providers/workspace';
import { useGraphQLClient } from '@/hooks/data/index';
import { AccountLayout } from '@/layouts/index';
import Meta from '@/components/Meta/index';
import Content from '@/components/Content/index';
import { executeMutation, executeQuery } from '@/graphql/operations';
import { CONFIRM_SUBSCRIPTION, GET_BILLING_PROFILES } from '@/graphql/billing-operations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Button from '@/components/Button/index';
import Link from 'next/link';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

export default function BillingSuccessPage({ params }) {
  const resolvedParams = use(params);
  const { workspaceSlug } = resolvedParams || {};
  const { workspace } = useWorkspace();
  const graphqlClient = useGraphQLClient();

  const [isConfirming, setIsConfirming] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const confirmSubscription = async () => {
      if (!workspace?._id) return;

      try {
        // Get billing profile
        const profileResult = await executeQuery(graphqlClient, GET_BILLING_PROFILES);
        if (!profileResult.data?.billingProfiles?.[0]) {
          throw new Error('No billing profile found');
        }

        const billingProfile = profileResult.data.billingProfiles[0];

        // Confirm subscription
        const result = await executeMutation(
          graphqlClient,
          CONFIRM_SUBSCRIPTION,
          { billingProfileId: billingProfile._id }
        );

        if (result.data?.confirmSubscription) {
          setSubscription(result.data.confirmSubscription);
          toast.success('Subscription activated successfully!');
        } else if (result.error) {
          throw new Error(result.error.message);
        }
      } catch (err) {
        console.error('Confirmation error:', err);
        setError(err.message);
        toast.error('Failed to confirm subscription');
      } finally {
        setIsConfirming(false);
      }
    };

    confirmSubscription();
  }, [workspace?._id, graphqlClient]);

  if (isConfirming) {
    return (
      <AccountLayout routerType="app">
        <Meta title={`AI Rank - Payment Successful`} />
        <Content.Container>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
              <p className="mt-4 text-lg">Confirming your subscription...</p>
            </div>
          </div>
        </Content.Container>
      </AccountLayout>
    );
  }

  if (error) {
    return (
      <AccountLayout routerType="app">
        <Meta title={`AI Rank - Payment Error`} />
        <Content.Container>
          <Card className="max-w-2xl mx-auto mt-8">
            <CardHeader>
              <CardTitle className="text-red-600">Payment Confirmation Failed</CardTitle>
              <CardDescription>
                There was an issue confirming your payment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{error}</p>
              <div className="flex space-x-4">
                <Link href={`/${workspaceSlug}/billing`}>
                  <Button background="Pink" border="Light">
                    Go to Billing
                  </Button>
                </Link>
                <Link href={`/${workspaceSlug}`}>
                  <Button background="Green" border="Light">
                    Go to Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </Content.Container>
      </AccountLayout>
    );
  }

  return (
    <AccountLayout routerType="app">
      <Meta title={`AI Rank - Payment Successful`} />
      <Content.Container>
        <Card className="max-w-2xl mx-auto mt-8">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircleIcon className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-3xl">Payment Successful!</CardTitle>
            <CardDescription className="text-lg mt-2">
              Your subscription has been activated
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {subscription && (
              <div className="bg-muted rounded-lg p-6 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-semibold capitalize text-green-600">
                    {subscription.planStatus}
                  </span>
                </div>
                {subscription.currentPeriodStart && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Started</span>
                    <span className="font-semibold">
                      {new Date(subscription.currentPeriodStart).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {subscription.currentPeriodEnd && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Next Billing Date</span>
                    <span className="font-semibold">
                      {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="pt-4">
              <h4 className="font-semibold mb-2">What's Next?</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Your new plan limits are now active</li>
                <li>You can start adding more brands and prompts</li>
                <li>Check your billing dashboard for usage details</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Link href={`/${workspaceSlug}/billing`} className="flex-1">
                <Button background="Green" border="Light" className="w-full">
                  View Billing Dashboard
                </Button>
              </Link>
              <Link href={`/${workspaceSlug}`} className="flex-1">
                <Button background="Pink" border="Light" className="w-full">
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </Content.Container>
    </AccountLayout>
  );
}
