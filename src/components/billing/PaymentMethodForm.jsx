'use client';

import { useState } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Button from '@/components/Button/index';
import toast from 'react-hot-toast';
import { executeMutation } from '@/graphql/operations';
import { CREATE_SETUP_INTENT, SAVE_PAYMENT_METHOD } from '@/graphql/billing-operations';

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

export function PaymentMethodForm({ billingProfileId, graphqlClient, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      toast.error('Stripe has not loaded yet');
      return;
    }

    if (!billingProfileId) {
      toast.error('No billing profile selected');
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: Create setup intent
      const setupIntentResult = await executeMutation(
        graphqlClient,
        CREATE_SETUP_INTENT,
        { billingProfileId }
      );

      if (!setupIntentResult.data?.createSetupIntent?.clientSecret) {
        throw new Error('Failed to create setup intent');
      }

      const { clientSecret } = setupIntentResult.data.createSetupIntent;

      // Step 2: Confirm card setup with Stripe
      const { error, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
        },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      // Step 3: Save payment method to our backend
      const saveResult = await executeMutation(
        graphqlClient,
        SAVE_PAYMENT_METHOD,
        {
          billingProfileId,
          paymentMethodId: setupIntent.payment_method,
        }
      );

      if (saveResult.data?.savePaymentMethod) {
        toast.success('Payment method saved successfully!');
        if (onSuccess) {
          onSuccess(saveResult.data.savePaymentMethod);
        }
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
    <Card>
      <CardHeader>
        <CardTitle>Add Payment Method</CardTitle>
        <CardDescription>
          Enter your card details to add a payment method
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Card Information
            </label>
            <div className="p-3 border border-border rounded-lg bg-card">
              <CardElement options={CARD_ELEMENT_OPTIONS} />
            </div>
          </div>

          <Button
            background="Pink"
            border="Light"
            type="submit"
            disabled={!stripe || isProcessing}
            className="w-full"
          >
            {isProcessing ? 'Processing...' : 'Add Payment Method'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
