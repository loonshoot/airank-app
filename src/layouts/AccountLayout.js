import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';

import Content from '@/components/Content/index';
import Header from '@/components/Header/index';
import Sidebar from '@/components/Sidebar/index';
import menu from '@/config/menu/index';
import { useWorkspace } from '@/providers/workspace';
import { useRouterContext } from '@/providers/router';

const AccountLayout = ({ children, routerType }) => {
  const { status } = useSession();
  const { router } = useRouterContext();
  const { workspace } = useWorkspace();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth/login');
    }
  }, [status, router]);

  if (status === 'loading') return <></>;
  return (
    <main className="flex flex-col w-screen h-screen text-light dark:text-light md:flex-row bg-dark dark:bg-dark">
      <Sidebar menu={menu(workspace?.slug)} routerType={routerType} />
      <Content>
        <Header routerType={routerType} />
        {children}
      </Content>
      <Toaster position="bottom-left" toastOptions={{ duration: 10000 }} />
    </main>
  );
};

export default AccountLayout;
