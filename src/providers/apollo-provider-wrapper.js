import { useMemo } from 'react';
import { ApolloClient, ApolloProvider, HttpLink, InMemoryCache, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

const httpLink = new HttpLink({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT_URL,
});

const isProduction = process.env.NODE_ENV === 'production';

export const ApolloProviderWrapper = ({ children }) => {
    const client = useMemo(() => {
        const authMiddleware = setContext(async (operation, { headers }) => {
          const { token } = await fetch('/api/auth/token').then(res => res.json())
          if (!isProduction) {
            console.log("Testing JWE: " + token)
          }
          return {
            headers: {
              ...headers,
              Authorization: `${token}`,
            },
        }
    })

    return new ApolloClient({
      link: from([authMiddleware, httpLink]),
      cache: new InMemoryCache(),
    });
  }, []);

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
};