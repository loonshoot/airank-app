'use client';

import { SessionProvider } from 'next-auth/react';
import WorkspaceProvider from '@/providers/workspace';
import { RouterProvider } from '@/providers/router';
import LoadingProvider from '@/providers/loading';
import { SWRConfig } from 'swr';
import ApolloClientProvider from '@/providers/apollo';
import './i18n'; // Import i18n initialization

// Global fetcher for SWR
const fetcher = (url) => fetch(url).then(res => res.json());

// A simplified component hierarchy to avoid provider nesting issues
export function Providers({ children, session }) {
  return (
    <SessionProvider session={session}>
      <SWRConfig 
        value={{
          fetcher,
          revalidateOnFocus: false,
          dedupingInterval: 2000,
          shouldRetryOnError: true,
          errorRetryCount: 3
        }}
      >
        <ClientSideProviders>
          {children}
        </ClientSideProviders>
      </SWRConfig>
    </SessionProvider>
  );
}

// This component only renders on the client side after hydration
function ClientSideProviders({ children }) {
  return (
    <RouterProvider routerType="app">
      <WorkspaceProvider>
        <ApolloClientProvider>
          <LoadingProvider>
            {children}
          </LoadingProvider>
        </ApolloClientProvider>
      </WorkspaceProvider>
    </RouterProvider>
  );
} 