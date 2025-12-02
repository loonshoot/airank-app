'use client';

import { useMemo } from 'react';
import { ApolloClient, InMemoryCache, ApolloProvider, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

// Token caching to prevent redundant auth requests
let cachedToken = null;
let tokenExpiry = 0;
const TOKEN_TTL = 300000; // 5 minutes

// Helper function to get token with caching
const getAuthToken = async () => {
  const now = Date.now();

  // Return cached token if still valid
  if (cachedToken && now < tokenExpiry) {
    return cachedToken;
  }

  try {
    const response = await fetch('/api/auth/token');

    if (!response.ok) {
      throw new Error('Failed to get authentication token');
    }

    const { token } = await response.json();

    // Cache the token
    cachedToken = token;
    tokenExpiry = now + TOKEN_TTL;

    return token;
  } catch (error) {
    console.error('Failed to get authentication token:', error);
    cachedToken = null;
    tokenExpiry = 0;
    return null;
  }
};

// Create Apollo Client instance
const createApolloClient = () => {
  const httpLink = createHttpLink({
    uri: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT_URL || 'http://localhost:4001/graphql',
  });

  const authLink = setContext(async (_, { headers }) => {
    const token = await getAuthToken();

    return {
      headers: {
        ...headers,
        authorization: token || '',
      }
    };
  });

  return new ApolloClient({
    link: authLink.concat(httpLink),
    cache: new InMemoryCache({
      typePolicies: {
        Query: {
          fields: {
            // Cache analytics queries by workspace and date range
            analytics: {
              keyArgs: ['workspaceId', 'startDate', 'endDate'],
            },
            brands: {
              keyArgs: ['workspaceId'],
            },
            models: {
              keyArgs: ['workspaceId'],
            },
            prompts: {
              keyArgs: ['workspaceId'],
            },
          },
        },
      },
    }),
    defaultOptions: {
      query: {
        // Use cache-first: return cached data immediately, fetch in background
        fetchPolicy: 'cache-first',
        // Show errors alongside partial data
        errorPolicy: 'all',
      },
      watchQuery: {
        // For subscriptions, use cache and network
        fetchPolicy: 'cache-and-network',
        errorPolicy: 'all',
      },
    },
  });
};

export default function ApolloClientProvider({ children }) {
  // Create client once and memoize
  const client = useMemo(() => createApolloClient(), []);

  return (
    <ApolloProvider client={client}>
      {children}
    </ApolloProvider>
  );
} 