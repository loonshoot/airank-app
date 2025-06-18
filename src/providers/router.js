'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter as usePageRouter } from 'next/router';
import { useRouter as useAppRouter } from 'next/navigation';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Create a context to share router info
export const RouterContext = createContext({
  router: null,
  routerType: 'unknown' // 'app' or 'page'
});

// Custom hook to access the router context
export const useRouterContext = () => useContext(RouterContext);

// Detect which router environment is available
export const detectRouterType = () => {
  try {
    // This will throw an error in App Router
    require('next/router');
    return 'page';
  } catch (e) {
    return 'app';
  }
};

// Get the current URL path safely (works on server and client)
const getPathname = () => {
  if (isBrowser) {
    return window.location.pathname;
  }
  return '/';
};

// Parse URL query parameters safely
const getQueryParams = () => {
  if (isBrowser) {
    return Object.fromEntries(new URLSearchParams(window.location.search));
  }
  return {};
};

// Combined router that works across both environments
export const useCompatRouter = (forceType) => {
  const type = forceType || detectRouterType();
  
  if (type === 'page') {
    try {
      const router = usePageRouter();
      return {
        ...router,
        routerType: 'page',
        push: router.push,
        replace: router.replace,
        back: router.back,
        pathname: router.pathname,
        query: router.query,
        asPath: router.asPath
      };
    } catch (e) {
      // Fallback if Page Router hook fails
      console.warn('Page router detection failed, using App Router');
      const router = useAppRouter();
      return {
        ...router,
        routerType: 'app',
        push: router.push,
        replace: router.push,
        back: router.back,
        pathname: getPathname(),
        query: getQueryParams(),
        asPath: isBrowser ? window.location.pathname + window.location.search : '/'
      };
    }
  } else {
    // App Router
    const router = useAppRouter();
    return {
      ...router,
      routerType: 'app',
      push: router.push,
      replace: router.push, // App Router doesn't have replace
      back: router.back,
      pathname: getPathname(),
      query: getQueryParams(),
      asPath: isBrowser ? window.location.pathname + window.location.search : '/'
    };
  }
};

// Router Provider component
export function RouterProvider({ children, routerType }) {
  const router = useCompatRouter(routerType);
  
  return (
    <RouterContext.Provider value={{ router, routerType: router.routerType }}>
      {children}
    </RouterContext.Provider>
  );
} 