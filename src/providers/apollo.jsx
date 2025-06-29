import { ApolloClient, InMemoryCache, ApolloProvider, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

// Create a standard http link pointing to external API Gateway
const httpLink = createHttpLink({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT_URL || 'http://localhost:4001/graphql',
});

// Add auth headers to requests
const authLink = setContext(async (_, { headers }) => {
  try {
    // Get JWE token from API endpoint
    const response = await fetch('/api/auth/token');
    
    if (!response.ok) {
      throw new Error('Failed to get authentication token');
    }
    
    const { token } = await response.json();
    
    return {
      headers: {
        ...headers,
        // Send the raw JWE token (no prefix)
        authorization: token,
      }
    };
  } catch (error) {
    console.error('Failed to get authentication token:', error);
    return { headers };
  }
});

// Initialize Apollo Client
const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
  defaultOptions: {
    query: {
      fetchPolicy: 'network-only',
    },
  },
});

export default function ApolloClientProvider({ children }) {
  return (
    <ApolloProvider client={client}>
      {children}
    </ApolloProvider>
  );
} 