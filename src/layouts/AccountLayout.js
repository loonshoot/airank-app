import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';

import Content from '@/components/Content/index';
import Header from '@/components/Header/index';
import Sidebar from '@/components/Sidebar/index';
import SetupBanner from '@/components/SetupBanner/index';
import menu, { noWorkspaceMenu } from '@/config/menu/index';
import { useWorkspace } from '@/providers/workspace';
import { useRouterContext } from '@/providers/router';

const AccountLayout = ({ children, routerType, isAccountPage = false }) => {
  const { status } = useSession();
  const { router } = useRouterContext();
  const { workspace } = useWorkspace();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth/login');
    }
  }, [status, router]);

  // On account pages, only show User menu (Account, Logout)
  // On workspace pages, show full menu if workspace selected, otherwise just User menu
  const sidebarMenu = isAccountPage
    ? noWorkspaceMenu()
    : (workspace?.slug ? menu(workspace.slug) : noWorkspaceMenu());

  if (status === 'loading') return <></>;
  return (
    <main className="flex flex-col w-screen h-screen text-light dark:text-light md:flex-row">
      <Sidebar menu={sidebarMenu} routerType={routerType} isAccountPage={isAccountPage} />
      <div className="flex flex-col h-full md:w-3/4 bg-[#0a0a0a] overflow-hidden">
        <SetupBanner />
        <Content>
          <Header routerType={routerType} />
          {children}
        </Content>
      </div>
      <Toaster position="bottom-left" toastOptions={{ duration: 10000 }} />
    </main>
  );
};

export default AccountLayout;
