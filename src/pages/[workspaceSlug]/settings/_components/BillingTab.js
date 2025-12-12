import Card from '@/components/Card/index';

const BillingTab = () => {
  return (
    <Card>
      <Card.Body
        title="Billing"
        subtitle="Manage your billing and subscription"
      >
        <div className="text-gray-400">
          Billing information will be displayed here.
        </div>
      </Card.Body>
    </Card>
  );
};

export default BillingTab;
