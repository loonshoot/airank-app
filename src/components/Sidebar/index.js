import { useState, useMemo } from 'react';
import Link from 'next/link';

import Actions from './actions';
import Menu from './menu';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

const Sidebar = ({ menu, routerType, isAccountPage = false }) => {
  const [showMenu, setMenuVisibility] = useState(false);

  // Memoize menu to prevent unnecessary re-renders
  const memoizedMenu = useMemo(() => menu, [menu]);

  // Separate User menu from other menus so we can pin it to the bottom
  const getMenuSections = () => {
    // Use the menu prop passed from the layout - it already handles workspace state
    const menuItems = memoizedMenu;

    if (!menuItems || menuItems.length === 0) {
      return { mainMenus: [], userMenu: null };
    }

    // Find and separate the User menu
    const userMenu = menuItems.find(item => item.name === 'User');
    const mainMenus = menuItems.filter(item => item.name !== 'User');

    return { mainMenus, userMenu };
  };

  const { mainMenus, userMenu } = getMenuSections();

  const toggleMenu = () => setMenuVisibility(!showMenu);

  return (
    <div className="md:w-1/4 bg-zinc-900 border-r border-zinc-800">
      {/* Logo and Mobile Menu Button */}
      <div className="flex items-center justify-center p-4 border-b border-zinc-800/50 md:hidden bg-zinc-900">
        <Link href="/" className="flex-grow text-2xl font-bold">
          <Image
            src="/images/logo-light.svg"
            width={105}
            height={40}
            alt="AI Rank logo"
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
          ${showMenu ? 'block' : 'hidden md:block'}
          overflow-y-auto bg-zinc-900 z-40
        `}
      >
        <div className="flex flex-col h-full bg-zinc-900">
          {/* Logo Section (Desktop Only) */}
          <div className="relative hidden md:flex items-center justify-center p-5 border-b border-zinc-800/50">
            <Link href="/" className="flex-grow text-2xl font-bold">
              <Image
                src="/images/logo-light.svg"
                width={105}
                height={40}
                alt="AI Rank logo"
                priority
              />
            </Link>
          </div>

          {/* Menu Content */}
          <div className="flex-1 flex flex-col p-5">
            <div className="space-y-5">
              <Actions routerType={routerType} isAccountPage={isAccountPage} />
              {/* Main menu sections */}
              <div className="flex flex-col space-y-10">
                {mainMenus.map((item, index) => (
                  <Menu
                    key={index}
                    data={item}
                    isLoading={false}
                    showMenu={true}
                    routerType={routerType}
                  />
                ))}
              </div>
            </div>
            {/* User menu pinned to bottom */}
            {userMenu && (
              <div className="mt-auto pt-5">
                <Menu
                  data={userMenu}
                  isLoading={false}
                  showMenu={true}
                  routerType={routerType}
                />
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};

export default Sidebar;
