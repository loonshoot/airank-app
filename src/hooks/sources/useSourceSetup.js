import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useGraphQLClient } from '../useGraphQLClient';
import { CREATE_OAUTH_URL, CREATE_SOURCE, SCHEDULE_SYNC_JOB } from '../../graphql/queries/sources';

export function useSourceSetup({
  service,
  workspaceSlug,
  defaultScopes,
  defaultSourceName,
  onSuccess,
  onError
}) {
  const searchParams = useSearchParams();
  const graphQLClient = useGraphQLClient();
  
  // State management
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sourceName, setSourceName] = useState(defaultSourceName);
  const [authToken, setAuthToken] = useState(null);
  const [additionalConfig, setAdditionalConfig] = useState({});
  
  // OAuth parameters from URL
  const authCode = searchParams.get('code');
  const authError = searchParams.get('error');
  const state = searchParams.get('state');

  // Handle OAuth callback
  useEffect(() => {
    if (!graphQLClient) return;

    if (authCode && state) {
      handleOAuthCallback();
    } else if (authError) {
      const errorMessage = `Authentication failed: ${authError}`;
      setError(errorMessage);
      onError?.(errorMessage);
    }
  }, [graphQLClient, authCode, state, authError]);

  const handleOAuthCallback = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Parse and validate state
      const stateData = JSON.parse(atob(state));
      
      if (stateData.workspaceSlug !== workspaceSlug) {
        throw new Error('Invalid state parameter');
      }

      setAuthToken(authCode);
      
      // Additional processing can be done here
      return { authCode, stateData };
    } catch (err) {
      const errorMessage = err.message || 'OAuth callback failed';
      setError(errorMessage);
      onError?.(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [state, workspaceSlug, authCode, onError]);

  const startOAuthFlow = useCallback(async (additionalParams = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data } = await graphQLClient.query({
        query: CREATE_OAUTH_URL,
        variables: {
          service,
          workspaceSlug,
          redirectUri: `${window.location.origin}/api/callback/sources/add/${service}`,
          scopes: defaultScopes,
          additionalParams: {
            ...additionalParams,
            sourceName
          }
        }
      });

      // Redirect to OAuth URL
      window.location.href = data.createOAuthUrl.url;
    } catch (err) {
      const errorMessage = err.message || 'Failed to start OAuth flow';
      setError(errorMessage);
      onError?.(errorMessage);
      setLoading(false);
    }
  }, [graphQLClient, service, workspaceSlug, defaultScopes, sourceName, onError]);

  const createSource = useCallback(async (config) => {
    try {
      setLoading(true);
      setError(null);
      
      // Create the source
      const { data } = await graphQLClient.mutate({
        mutation: CREATE_SOURCE,
        variables: {
          workspaceSlug,
          input: {
            name: sourceName,
            type: service,
            config: {
              accessToken: authToken,
              ...additionalConfig,
              ...config
            }
          }
        }
      });

      // Schedule initial sync
      await graphQLClient.mutate({
        mutation: SCHEDULE_SYNC_JOB,
        variables: {
          sourceId: data.createSource.id
        }
      });

      onSuccess?.(data.createSource);
      
      return data.createSource;
    } catch (err) {
      const errorMessage = err.message || 'Failed to create source';
      setError(errorMessage);
      onError?.(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [graphQLClient, workspaceSlug, sourceName, service, authToken, additionalConfig, onSuccess, onError]);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    loading,
    error,
    sourceName,
    authToken,
    authCode,
    authError,
    
    // Actions
    setSourceName,
    setAdditionalConfig,
    startOAuthFlow,
    createSource,
    handleOAuthCallback,
    resetError,
    
    // Utilities
    isAuthenticated: !!authToken,
    hasError: !!error
  };
}