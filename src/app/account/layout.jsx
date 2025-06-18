'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';
import { useRouterContext } from '@/providers/router';
import '../i18n'; // Import i18n initialization

export default function AccountLayoutWrapper({ children }) {
  const { status } = useSession();
  const { router } = useRouterContext();
  const [hasHydrated, setHasHydrated] = useState(false);

  // Mark component as hydrated
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  // Only redirect after hydration
  useEffect(() => {
    if (!hasHydrated) return;
    
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router, hasHydrated]);

  if (status === 'loading') return null;

  // We're not rendering the AccountLayout here because it's already used in the page component
  // This wrapper just handles the authentication check
  return (
    <>
      {children}
      <Toaster position="bottom-left" toastOptions={{ duration: 10000 }} />
    </>
  );
} 