/**
 * Frontend Entitlement Utilities
 *
 * Provides functions to check subscription limits and display upgrade prompts
 */

import toast from 'react-hot-toast';

/**
 * Check if user can create a new brand based on billing limits
 * @param {Object} billingProfile - The billing profile object
 * @param {number} currentBrandCount - Current number of brands
 * @returns {Object} - { allowed: boolean, message?: string }
 */
export function canCreateBrand(billingProfile, currentBrandCount) {
  if (!billingProfile) {
    return {
      allowed: false,
      message: 'No billing profile found. Please contact support.'
    };
  }

  const { brandsLimit, brandsUsed } = billingProfile;

  if (brandsUsed >= brandsLimit) {
    return {
      allowed: false,
      message: `Brand limit reached. Your ${billingProfile.currentPlan} plan allows ${brandsLimit} brand${brandsLimit > 1 ? 's' : ''}. Upgrade to add more brands.`,
      limit: brandsLimit,
      used: brandsUsed
    };
  }

  return { allowed: true, limit: brandsLimit, used: brandsUsed };
}

/**
 * Check if user can create a new prompt based on billing limits
 * @param {Object} billingProfile - The billing profile object
 * @param {number} currentPromptCount - Current number of prompts
 * @returns {Object} - { allowed: boolean, message?: string }
 */
export function canCreatePrompt(billingProfile, currentPromptCount) {
  if (!billingProfile) {
    return {
      allowed: false,
      message: 'No billing profile found. Please contact support.'
    };
  }

  const { promptsLimit, promptsUsed, promptsResetDate } = billingProfile;

  if (promptsUsed >= promptsLimit) {
    const resetText = promptsResetDate
      ? ` (resets ${new Date(promptsResetDate).toLocaleDateString()})`
      : '';

    return {
      allowed: false,
      message: `Prompt limit reached. Your ${billingProfile.currentPlan} plan allows ${promptsLimit} prompt${promptsLimit > 1 ? 's' : ''} per month${resetText}. Upgrade for more prompts.`,
      limit: promptsLimit,
      used: promptsUsed,
      resetDate: promptsResetDate
    };
  }

  return {
    allowed: true,
    limit: promptsLimit,
    used: promptsUsed,
    resetDate: promptsResetDate
  };
}

/**
 * Check if user can use a specific AI model based on plan
 * @param {Object} billingProfile - The billing profile object
 * @param {string} modelName - The model name to check
 * @param {Array} allowedModels - Array of allowed models for the plan
 * @returns {Object} - { allowed: boolean, message?: string }
 */
export function canUseModel(billingProfile, modelName, allowedModels = []) {
  if (!billingProfile) {
    return {
      allowed: false,
      message: 'No billing profile found. Please contact support.'
    };
  }

  // Enterprise plan has access to all models
  if (billingProfile.currentPlan === 'enterprise' || allowedModels.includes('all')) {
    return { allowed: true };
  }

  if (!allowedModels.includes(modelName)) {
    return {
      allowed: false,
      message: `Model '${modelName}' is not available on your ${billingProfile.currentPlan} plan. Upgrade to access more models.`,
      allowedModels
    };
  }

  return { allowed: true, allowedModels };
}

/**
 * Show upgrade prompt as a toast notification
 * @param {string} feature - The feature that requires upgrade (e.g., 'brands', 'prompts')
 * @param {string} workspaceSlug - The workspace slug for navigation
 */
export function showUpgradePrompt(feature, workspaceSlug) {
  const upgradeToast = toast.custom(
    (t) => (
      <div
        className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
      >
        <div className="flex-1 w-0 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              <svg
                className="h-10 w-10 text-yellow-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Upgrade Required
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                You've reached your {feature} limit. Upgrade to add more.
              </p>
            </div>
          </div>
        </div>
        <div className="flex border-l border-gray-200 dark:border-gray-700">
          <button
            onClick={() => {
              toast.dismiss(upgradeToast);
              window.location.href = `/${workspaceSlug}/billing/plans`;
            }}
            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-green-600 hover:text-green-500 focus:outline-none"
          >
            Upgrade
          </button>
        </div>
        <div className="flex border-l border-gray-200 dark:border-gray-700">
          <button
            onClick={() => toast.dismiss(upgradeToast)}
            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-500 focus:outline-none"
          >
            Close
          </button>
        </div>
      </div>
    ),
    {
      duration: 8000,
      position: 'top-center',
    }
  );

  return upgradeToast;
}

/**
 * Get usage percentage and color coding
 * @param {number} used - Current usage
 * @param {number} limit - Maximum limit
 * @returns {Object} - { percentage: number, color: string, warning: boolean }
 */
export function getUsageStatus(used, limit) {
  if (!limit || limit === 0 || limit === 999999) {
    return { percentage: 0, color: 'green', warning: false };
  }

  const percentage = Math.min((used / limit) * 100, 100);

  let color = 'green';
  let warning = false;

  if (percentage >= 90) {
    color = 'red';
    warning = true;
  } else if (percentage >= 70) {
    color = 'yellow';
    warning = true;
  }

  return { percentage, color, warning };
}

/**
 * Format limit display (handles unlimited)
 * @param {number} limit - The limit value
 * @returns {string} - Formatted limit string
 */
export function formatLimit(limit) {
  if (limit === 999999) {
    return '∞';
  }
  return limit.toString();
}

/**
 * Check all limits and return a summary
 * @param {Object} billingProfile - The billing profile object
 * @returns {Object} - Summary of all limits and usage
 */
export function getUsageSummary(billingProfile) {
  if (!billingProfile) {
    return null;
  }

  return {
    brands: {
      used: billingProfile.brandsUsed,
      limit: billingProfile.brandsLimit,
      status: getUsageStatus(billingProfile.brandsUsed, billingProfile.brandsLimit)
    },
    prompts: {
      used: billingProfile.promptsUsed,
      limit: billingProfile.promptsLimit,
      resetDate: billingProfile.promptsResetDate,
      status: getUsageStatus(billingProfile.promptsUsed, billingProfile.promptsLimit)
    },
    models: {
      limit: billingProfile.modelsLimit
    },
    plan: billingProfile.currentPlan,
    planStatus: billingProfile.planStatus
  };
}
