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
    <div className="h-6 mb-3 bg-gray-600 animate-pulse" />
  ) : (
    <li>
      {data.onClick ? (
        <a onClick={handleClick} className="text-dark hover:text-dark cursor-pointer">
          {t(data.name)}
        </a>
      ) : (
        <Link href={data.path} className="text-dark hover:text-dark">
          {t(data.name)}
        </Link>
      )}
    </li>
  );
};



export default Item;
