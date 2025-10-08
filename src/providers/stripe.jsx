'use client';

import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useMemo } from 'react';

// Initialize Stripe with publishable key from environment
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

/**
 * Stripe Provider Component
 *
 * Wraps children with Stripe Elements context for payment processing
 */
export function StripeProvider({ children }) {
  const options = useMemo(() => ({
    // Customize appearance to match your theme
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#22d35f', // Neon green from your theme
        colorBackground: '#ffffff',
        colorText: '#1a1a1a',
        colorDanger: '#ff0099', // Hot magenta from your theme
        fontFamily: 'system-ui, sans-serif',
        borderRadius: '8px',
      },
    },
  }), []);

  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    console.warn('⚠️  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set. Stripe Elements will not work.');
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      {children}
    </Elements>
  );
}
