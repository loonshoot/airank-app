import { useState, useEffect } from 'react';
import { useWorkspace } from '@/providers/workspace';
import { useGraphQLClient } from '@/hooks/data/index';
import { executeQuery, executeMutation } from '@/graphql/operations';
import { GET_ENTITLEMENTS, REFRESH_ENTITLEMENTS } from '@/graphql/entitlements-operations';

/**
 * Custom hook to fetch and manage workspace entitlements
 *
 * @returns {Object} - { entitlements, isLoading, error, refresh }
 *
 * Usage:
 * const { entitlements, isLoading, refresh } = useEntitlements();
 *
 * // Check if user can create a brand
 * if (!entitlements?.canCreateBrand) {
 *   return <UpgradePrompt />;
 * }
 *
 * // After billing change
 * await refresh();
 */
export function useEntitlements() {
  const graphqlClient = useGraphQLClient();
  const { workspace } = useWorkspace();
  const [entitlements, setEntitlements] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEntitlements = async () => {
    if (!workspace?._id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await executeQuery(graphqlClient, GET_ENTITLEMENTS, {
        workspaceId: workspace._id
      });

      if (result.data?.entitlements) {
        setEntitlements(result.data.entitlements);
      } else if (result.error) {
        setError(result.error.message);
      }
    } catch (err) {
      console.error('Error fetching entitlements:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const refresh = async () => {
    if (!workspace?._id) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await executeMutation(graphqlClient, REFRESH_ENTITLEMENTS, {
        workspaceId: workspace._id
      });

      if (result.data?.refreshEntitlements) {
        setEntitlements(result.data.refreshEntitlements);
      } else if (result.error) {
        setError(result.error.message);
      }
    } catch (err) {
      console.error('Error refreshing entitlements:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (graphqlClient && workspace?._id) {
      fetchEntitlements();
    }
  }, [graphqlClient, workspace?._id]);

  return {
    entitlements,
    isLoading,
    error,
    refresh
  };
}
