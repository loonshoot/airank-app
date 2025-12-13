import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import {
  ArrowRightOnRectangleIcon,
  CogIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { useTranslation } from "react-i18next";
import { useTheme } from 'next-themes';

const Header = () => {
  const { data } = useSession();
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  const logOut = () => {
    signOut({ callbackUrl: '/' });
  };

  return (
    <div className="flex flex-row items-center justify-between">
      <div>
      </div>
    </div>
  );
};

export default Header;
