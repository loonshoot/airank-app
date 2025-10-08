import { useState, useEffect } from 'react';
import { useGraphQLClient } from '@/hooks/data/index';
import { executeQuery } from '@/graphql/operations';
import { GET_BILLING_PROFILES } from '@/graphql/billing-operations';

/**
 * Custom hook to fetch and manage billing profile data
 * @returns {Object} - { billingProfile, isLoading, error, refetch }
 */
export function useBillingProfile() {
  const graphqlClient = useGraphQLClient();
  const [billingProfile, setBillingProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBillingProfile = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await executeQuery(graphqlClient, GET_BILLING_PROFILES);

      if (result.data?.billingProfiles?.[0]) {
        setBillingProfile(result.data.billingProfiles[0]);
      } else if (result.error) {
        setError(result.error.message);
      }
    } catch (err) {
      console.error('Error fetching billing profile:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (graphqlClient) {
      fetchBillingProfile();
    }
  }, [graphqlClient]);

  return {
    billingProfile,
    isLoading,
    error,
    refetch: fetchBillingProfile
  };
}
