import Link from 'next/link';
import { useTranslation } from "react-i18next";
import { signOut } from 'next-auth/react';

const Item = ({ data = null, isLoading = false }) => {
  const { t } = useTranslation();

  const handleClick = () => {
    if (data.onClick === 'logOut') {
      const result = confirm('Are you sure you want to logout?');
      if (result) {
        signOut({ callbackUrl: '/' });
      }
    }
  };

  return isLoading ? (
    <div className="h-6 mb-3 bg-zinc-700 animate-pulse" />
  ) : (
    <li>
      {data.onClick ? (
        <a onClick={handleClick} className="text-white hover:text-gray-400 cursor-pointer transition-colors">
          {t(data.name)}
        </a>
      ) : (
        <Link href={data.path} className="text-white hover:text-gray-400 transition-colors">
          {t(data.name)}
        </Link>
      )}
    </li>
  );
};



export default Item;
