import Item from './item';
import { useTranslation } from "react-i18next";

const Menu = ({ data, isLoading = false, showMenu = false }) => {
  const { t } = useTranslation();
  return showMenu ? (
    <div className="space-y-2">
      <h5 className="text-xl font-bold text-white">{t(data.name)}</h5>
      <ul className="leading-10">
        {data.menuItems.map((entry, index) => (
          <Item key={index} data={entry} isLoading={isLoading} />
        ))}
      </ul>
    </div>
  ) : null;
};



export default Menu;
