'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter as useAppRouter } from 'next/navigation';

import { useWorkspace } from '@/providers/workspace';

const AppRouterGridLayout = ({ children }) => {
  const { status } = useSession();
  const router = useAppRouter();
  const { workspace } = useWorkspace();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth/login');
    }
  }, [status, router]);

  if (status === 'loading') return null;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
      {children}
    </div>
  );
};

export default AppRouterGridLayout; 