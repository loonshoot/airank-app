import { useMemo } from 'react';
import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from "@apollo/client/link/error";

// Token caching to avoid redundant requests
let cachedToken = null;
let tokenExpiry = 0;
const TOKEN_TTL = 300000; // 5 minutes

// Helper function to get token with caching
const getAuthToken = async () => {
  const now = Date.now();
  
  // Return cached token if it's still valid
  if (cachedToken && now < tokenExpiry) {
    return cachedToken;
  }
  
  try {
    // Get fresh token from API endpoint
    console.log("Fetching fresh auth token...");
    const response = await fetch('/api/auth/token');
    
    if (!response.ok) {
      throw new Error(`Failed to get authentication token: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.token) {
      throw new Error('No token returned from auth endpoint');
    }
    
    console.log("New token received successfully");
    
    // Cache the token with expiry
    cachedToken = data.token;
    tokenExpiry = now + TOKEN_TTL;
    
    return data.token;
  } catch (error) {
    console.error('Failed to get authentication token:', error);
    // Invalidate cache on error
    cachedToken = null;
    tokenExpiry = 0;
    return null;
  }
};

export default function useGraphQLClient() {
  const client = useMemo(() => {
    // Create HTTP link to external GraphQL API
    const httpLink = new HttpLink({
      uri: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT_URL || 'http://localhost:3001/graphql',
    });

    // Create error handling link
    const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
      if (graphQLErrors) {
        console.error('GraphQL Errors:', graphQLErrors);
        
        // Check for auth errors and invalidate token
        const hasAuthError = graphQLErrors.some(
          error => error.message.toLowerCase().includes('auth') || 
                  error.message.toLowerCase().includes('unauthorized') ||
                  error.extensions?.code === 'UNAUTHENTICATED'
        );
        
        if (hasAuthError) {
          console.log("Auth error detected, invalidating token cache");
          cachedToken = null;
          tokenExpiry = 0;
        }
      }
      
      if (networkError) {
        console.error('Network Error:', networkError);
        
        // Invalidate token on certain network errors
        if (networkError.statusCode === 401 || networkError.statusCode === 403) {
          console.log("Auth network error detected, invalidating token cache");
          cachedToken = null;
          tokenExpiry = 0;
        }
      }
    });

    // Add auth context to include properly formatted JWE token
    const authLink = setContext(async (_, { headers }) => {
      // Get token with caching
      const token = await getAuthToken();
      
      if (!token) {
        console.warn("No authentication token available");
      }
      
      return {
        headers: {
          ...headers,
          // Send the raw JWE token (no prefix)
          authorization: token || '',
        }
      };
    });

    // Initialize and return Apollo Client
    return new ApolloClient({
      link: errorLink.concat(authLink.concat(httpLink)),
      cache: new InMemoryCache(),
      defaultOptions: {
        query: {
          fetchPolicy: 'cache-and-network', // Use cache but always refetch
          errorPolicy: 'all' // Return errors alongside any available data
        },
      },
    });
  }, []);

  return client;
} 