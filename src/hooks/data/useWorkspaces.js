import { useState, useEffect, useRef } from 'react';
import { useGraphQLClient } from '@/hooks/data/index';
import { GET_ALL_WORKSPACES, executeQuery } from '@/graphql/operations';
import useGlobalLoading from '@/hooks/useGlobalLoading';

const CACHE_KEY = 'airank_workspaces_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Helper to get cached workspaces from sessionStorage
const getCachedWorkspaces = () => {
  if (typeof window === 'undefined') return null;
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const { workspaces, timestamp } = JSON.parse(cached);
    // Check if cache is still valid
    if (Date.now() - timestamp < CACHE_TTL) {
      return workspaces;
    }
    return null;
  } catch {
    return null;
  }
};

// Helper to set cached workspaces
const setCachedWorkspaces = (workspaces) => {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({
      workspaces,
      timestamp: Date.now()
    }));
  } catch {
    // Ignore storage errors
  }
};

const useWorkspaces = () => {
  // Always start with empty/loading state to match SSR
  // Cache is applied after hydration to avoid mismatch
  const [workspaces, setWorkspaces] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(null);
  const [hasHydrated, setHasHydrated] = useState(false);
  const hasFetchedRef = useRef(false);
  const hasAppliedCacheRef = useRef(false);

  // Get the shared GraphQL client
  const graphqlClient = useGraphQLClient();

  // Connect to global loading state - only when truly loading (no cache)
  useGlobalLoading(isLoading && workspaces.length === 0, 'workspaces');

  // Apply cache after hydration to avoid SSR mismatch
  useEffect(() => {
    if (!hasAppliedCacheRef.current) {
      hasAppliedCacheRef.current = true;
      const cached = getCachedWorkspaces();
      if (cached && cached.length > 0) {
        setWorkspaces(cached);
        setIsLoading(false);
      }
    }
    setHasHydrated(true);
  }, []);

  // Fetch workspaces data on mount
  useEffect(() => {
    const fetchWorkspaces = async (isBackgroundRefresh = false) => {
      if (!hasHydrated || !graphqlClient) {
        return;
      }

      // Don't show loading state for background refreshes if we have cached data
      if (!isBackgroundRefresh || workspaces.length === 0) {
        setIsLoading(true);
      }

      try {
        const workspacesResult = await executeQuery(
          graphqlClient,
          GET_ALL_WORKSPACES
        );

        if (workspacesResult.data) {
          const newWorkspaces = workspacesResult.data.workspaces || [];
          setWorkspaces(newWorkspaces);
          setCachedWorkspaces(newWorkspaces);
          setIsError(null);
        } else if (workspacesResult.error) {
          console.error("Error fetching workspaces:", workspacesResult.error);
          setIsError(workspacesResult.error);
        }
      } catch (error) {
        console.error("GraphQL workspaces query failure:", error);
        setIsError(error);
      } finally {
        setIsLoading(false);
        hasFetchedRef.current = true;
      }
    };

    // Initial fetch
    if (!hasFetchedRef.current) {
      fetchWorkspaces(false);
    }

    // Set up a background refresh interval (every 60 seconds)
    const intervalId = setInterval(() => fetchWorkspaces(true), 60000);

    return () => clearInterval(intervalId);
  }, [hasHydrated, graphqlClient]);

  // For debugging - only in development
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.log('Workspaces data in hook:', { workspaces, isLoading, isError });
    }
  }, [workspaces, isLoading, isError]);

  // Create a response that matches the previous format for compatibility
  const safeData = {
    workspaces,
    data: { workspaces },
  };
  
  return {
    ...safeData,
    workspaces,
    isLoading,
    isError,
    refetch: async () => {
      setIsLoading(true);
      try {
        console.log("Manually refetching workspaces...");
        const result = await executeQuery(graphqlClient, GET_ALL_WORKSPACES, {}, { fetchPolicy: 'network-only' });
        console.log("Refetch result:", result);
        
        if (result.data) {
          setWorkspaces(result.data.workspaces || []);
          setIsError(null);
        } else if (result.error) {
          console.error("Error refetching workspaces:", result.error);
          setIsError(result.error);
        }
      } catch (error) {
        console.error("GraphQL refetch failure:", error);
        setIsError(error);
      } finally {
        setIsLoading(false);
      }
    }
  };
};

export default useWorkspaces;
