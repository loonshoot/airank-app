import { useState, useEffect } from 'react';
import { useGraphQLClient } from '@/hooks/data/index';
import { GET_ALL_WORKSPACES, executeQuery } from '@/graphql/operations';
import useGlobalLoading from '@/hooks/useGlobalLoading';

const useWorkspaces = () => {
  const [workspaces, setWorkspaces] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(null);
  const [hasHydrated, setHasHydrated] = useState(false);
  
  // Get the shared GraphQL client
  const graphqlClient = useGraphQLClient();

  // Connect to global loading state
  useGlobalLoading(isLoading, 'workspaces');

  // Mark component as hydrated
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  // Fetch workspaces data on mount
  useEffect(() => {
    const fetchWorkspaces = async () => {
      if (!hasHydrated || !graphqlClient) {
        console.log("Skipping fetch: not hydrated or no client", { hasHydrated, hasClient: !!graphqlClient });
        return;
      }
      
      console.log("Fetching workspaces...");
      setIsLoading(true);
      
      try {
        // Execute the GraphQL query
        console.log("Executing GraphQL query for workspaces...");
        const workspacesResult = await executeQuery(
          graphqlClient, 
          GET_ALL_WORKSPACES
        );
        
        console.log("GraphQL result:", workspacesResult);
        
        if (workspacesResult.data) {
          console.log("Workspaces data received:", workspacesResult.data.workspaces);
          setWorkspaces(workspacesResult.data.workspaces || []);
          setIsError(null);
        } else if (workspacesResult.error) {
          console.error("Error fetching workspaces:", workspacesResult.error);
          console.error("Error details:", JSON.stringify(workspacesResult.error, null, 2));
          setIsError(workspacesResult.error);
        }
      } catch (error) {
        console.error("GraphQL workspaces query failure:", error);
        console.error("Error stack:", error.stack);
        setIsError(error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchWorkspaces();
    
    // Set up a refresh interval (every 60 seconds)
    const intervalId = setInterval(fetchWorkspaces, 60000);
    
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
