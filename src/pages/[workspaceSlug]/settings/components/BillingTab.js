import Card from '@/components/Card/index';
import { useTranslation } from "react-i18next";

const BillingTab = () => {
  const { t } = useTranslation();

  return (
    <Card>
      <Card.Body title={t("settings.workspace.billing")}>
        <div className="text-center py-4">
          <p className="text-gray-500">Billing settings coming soon</p>
        </div>
      </Card.Body>
    </Card>
  );
};

export default BillingTab; 