'use client';

import { useEntitlements } from '@/hooks/useEntitlements';
import Link from 'next/link';
import { AlertCircle, CreditCard, X } from 'lucide-react';
import { useState } from 'react';

/**
 * Banner that displays payment failure warnings during grace period
 *
 * Shows:
 * - Payment failed message
 * - Days remaining in grace period
 * - Link to update payment method
 * - Dismissible (per session)
 */
export function PaymentFailureBanner() {
  const { entitlements, isLoading } = useEntitlements();
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show if loading, dismissed, or no payment issues
  if (isLoading || isDismissed || !entitlements) return null;
  if (!entitlements.isInGracePeriod && !entitlements.paymentExpired) return null;

  // Calculate days remaining
  const daysRemaining = entitlements.gracePeriodEndsAt
    ? Math.ceil((new Date(entitlements.gracePeriodEndsAt) - new Date()) / (1000 * 60 * 60 * 24))
    : 0;

  // Determine banner style based on urgency
  const isUrgent = daysRemaining <= 7;
  const isExpired = entitlements.paymentExpired;

  const bgColor = isExpired
    ? 'bg-red-50 dark:bg-red-950/20'
    : isUrgent
    ? 'bg-orange-50 dark:bg-orange-950/20'
    : 'bg-yellow-50 dark:bg-yellow-950/20';

  const borderColor = isExpired
    ? 'border-red-200 dark:border-red-900'
    : isUrgent
    ? 'border-orange-200 dark:border-orange-900'
    : 'border-yellow-200 dark:border-yellow-900';

  const textColor = isExpired
    ? 'text-red-900 dark:text-red-100'
    : isUrgent
    ? 'text-orange-900 dark:text-orange-100'
    : 'text-yellow-900 dark:text-yellow-100';

  const iconColor = isExpired
    ? 'text-red-600 dark:text-red-400'
    : isUrgent
    ? 'text-orange-600 dark:text-orange-400'
    : 'text-yellow-600 dark:text-yellow-400';

  return (
    <div
      className={`${bgColor} ${borderColor} ${textColor} border rounded-lg p-4 mb-6 relative`}
      role="alert"
    >
      <button
        onClick={() => setIsDismissed(true)}
        className="absolute top-3 right-3 text-current opacity-50 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <X size={18} />
      </button>

      <div className="flex items-start gap-3 pr-8">
        <AlertCircle className={`${iconColor} flex-shrink-0 mt-0.5`} size={20} />

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm mb-1">
            {isExpired ? 'Payment Method Expired' : 'Payment Failed'}
          </h3>

          <p className="text-sm mb-3">
            {isExpired ? (
              <>
                Your payment method has expired. Your account has been downgraded to the free tier. Update your payment method to restore your subscription.
              </>
            ) : (
              <>
                We couldn't process your payment. You have {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining to update your payment method before your account is downgraded to the free tier.
              </>
            )}
          </p>

          <Link
            href="/settings/billing"
            className={`inline-flex items-center gap-2 text-sm font-medium underline hover:no-underline ${textColor}`}
          >
            <CreditCard size={16} />
            Update Payment Method
          </Link>
        </div>
      </div>
    </div>
  );
}
