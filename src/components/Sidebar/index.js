import { useState, useEffect } from 'react';
import Link from 'next/link';

import Actions from './actions';
import Menu from './menu';
import sidebarMenu from '@/config/menu/sidebar-static';
import { useWorkspaces } from '@/hooks/data';
import { useWorkspace } from '@/providers/workspace';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import Image from 'next/image'

const staticMenu = sidebarMenu();

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

const Sidebar = ({ menu, routerType }) => {
  const [showMenu, setMenuVisibility] = useState(false);
  const { data, isLoading } = useWorkspaces();
  const { workspace } = useWorkspace();
  const [isAccountPage, setIsAccountPage] = useState(false);

  // Check if we're on the account page
  useEffect(() => {
    if (!isBrowser) return;
    
    const pathSegments = window.location.pathname.split('/').filter(segment => segment !== '');
    setIsAccountPage(pathSegments[0] === 'account' || pathSegments.length === 0);
  }, []);

  const renderMenu = () => {
    // Don't render menu items on the account page
    if (isAccountPage) {
      return null;
    }

    return (
      workspace &&
      menu.map((item, index) => (
        <Menu
          key={index}
          data={item}
          isLoading={isLoading}
          showMenu={data?.workspaces.length > 0 || isLoading}
          routerType={routerType}
        />
      ))
    );
  };

  const toggleMenu = () => setMenuVisibility(!showMenu);

  return (
    <div className="md:w-1/4">
      {/* Logo and Mobile Menu Button */}
      <div className="flex items-center justify-center p-4 bg-dark border-b border-b-dark md:hidden">
        <Link href="/" className="flex-grow text-2xl font-bold">
          <Image
            src="https://res.cloudinary.com/dpzlbvtpx/image/upload/v1700214339/outrun_logo_g3qtsp.svg"
            width={100}
            height={100}
            alt="Outrun logo"
            priority
          />
        </Link>
        <button className="absolute right-0 p-5" onClick={toggleMenu}>
          {showMenu ? (
            <XMarkIcon className="w-6 h-6" />
          ) : (
            <Bars3Icon className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Sidebar */}
      <aside 
        className={`
          fixed md:sticky top-[72px] md:top-0 w-full h-[calc(100vh-72px)] md:h-screen
          bg-yellow-400 dark:bg-yellow-400 
          ${showMenu ? 'block' : 'hidden md:block'}
          overflow-y-auto
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo Section (Desktop Only) */}
          <div className="relative hidden md:flex items-center justify-center p-5 bg-dark border-b border-b-dark">
            <Link href="/" className="flex-grow text-2xl font-bold">
              <Image
                src="https://res.cloudinary.com/dpzlbvtpx/image/upload/v1700214339/outrun_logo_g3qtsp.svg"
                width={100}
                height={100}
                alt="Outrun logo"
                priority
              />
            </Link>
          </div>

          {/* Menu Content */}
          <div className="flex-1 flex flex-col space-y-5 p-5">
            <Actions routerType={routerType} />
            {!isAccountPage && (
              <div className="flex flex-col space-y-10">
                {renderMenu()}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {showMenu && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={toggleMenu}
        />
      )}
    </div>
  );
};

export default Sidebar;
