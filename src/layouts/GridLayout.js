import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';

import Content from '@/components/Content/index';
import Header from '@/components/Header/index';
import Sidebar from '@/components/Sidebar/index';
import menu from '@/config/menu/index';
import { useWorkspace } from '@/providers/workspace';

const GridLayout = ({ children }) => {
  const { status } = useSession();
  const router = useRouter();
  const { workspace } = useWorkspace();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth/login');
    }
  }, [status, router]);

  if (status === 'loading') return <></>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
      {children}
    </div>
  );
};

export default GridLayout;