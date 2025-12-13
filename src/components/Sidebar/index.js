import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';

import Actions from './actions';
import Menu from './menu';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import Image from 'next/image'

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

const Sidebar = ({ menu, routerType, isAccountPage = false }) => {
  const [showMenu, setMenuVisibility] = useState(false);

  // Memoize menu to prevent unnecessary re-renders
  const memoizedMenu = useMemo(() => menu, [menu]);

  const renderMenu = () => {
    // Don't render menu items on the account page
    if (isAccountPage) {
      return null;
    }

    // Render menu immediately if we have a workspace slug from URL
    // Don't wait for workspace context - the menu prop already has the slug
    if (!memoizedMenu || memoizedMenu.length === 0) {
      return null;
    }

    return memoizedMenu.map((item, index) => (
      <Menu
        key={index}
        data={item}
        isLoading={false}
        showMenu={true}
        routerType={routerType}
      />
    ));
  };

  const toggleMenu = () => setMenuVisibility(!showMenu);

  return (
    <div className="md:w-1/4">
      {/* Logo and Mobile Menu Button */}
      <div className="flex items-center justify-center p-4 border-b border-zinc-800/50 md:hidden bg-zinc-900/50">
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
          overflow-y-auto bg-zinc-900/50
        `}
      >
        <div className="flex flex-col h-full">
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
          <div className="flex-1 flex flex-col space-y-5 p-5">
            <Actions routerType={routerType} isAccountPage={isAccountPage} />
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
