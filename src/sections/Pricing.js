import { CheckIcon } from '@heroicons/react/24/outline';

const plans = [
  {
    name: 'Always Free',
    price: 0,
    period: 'forever',
    description: 'Perfect for trying out AI Rank',
    features: [
      'Monitor your brand',
      'Monitor ChatGPT',
      '4 prompts/month',
      'Monthly monitoring',
      '30-day data retention'
    ],
    cta: 'Get Started',
    popular: false
  },
  {
    name: 'Small',
    price: 29,
    period: 'month',
    yearlyPrice: 290,
    description: 'For small businesses & freelancers',
    features: [
      'Monitor your brand',
      'Monitor 3 competitors',
      'Monitor Standard Models',
      '10 prompts/month',
      'Daily monitoring',
      '90-day data retention'
    ],
    cta: 'Get Started',
    popular: false
  },
  {
    name: 'Medium',
    price: 149,
    period: 'month',
    yearlyPrice: 1490,
    description: 'For growing businesses & agencies',
    features: [
      'Monitor your brand',
      'Monitor 9 competitors',
      'Monitor Advanced Models',
      '20 prompts/month',
      'Daily monitoring',
      '180-day data retention'
    ],
    cta: 'Get Started',
    popular: true
  },
  {
    name: 'Enterprise',
    price: '$1,000+',
    period: '',
    setupFee: 'Setup fee: $2,500 (waived annual)',
    description: 'For large organizations',
    features: [
      'Monitor your brand',
      'Monitor unlimited competitors',
      'Monitor ANY Model',
      'Unlimited prompts',
      'Custom monitoring frequency',
      'Custom integrations',
      'Dedicated account manager',
      'SLA guarantee'
    ],
    cta: 'Contact Sales',
    popular: false
  }
];

const Pricing = () => {
  return (
    <div className="w-full py-10">
      <div className="relative flex flex-col px-5 mx-auto space-y-5 md:w-3/4">
        <div className="flex flex-col items-center">
          <h6 className="font-bold text-center text-blue-600 uppercase">
            Pricing
          </h6>
          <h2 className="text-4xl font-bold text-center">
            <span className="block">
              Simple, Transparent Pricing
            </span>
          </h2>
          <p className="text-center text-gray-600">
            Choose the perfect plan for your brand monitoring needs
          </p>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4 p-10">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`flex flex-col items-start overflow-hidden bg-white border rounded-lg ${
                plan.popular ? 'border-blue-600 border-2 shadow-lg' : 'border-gray-200'
              }`}
            >
              {plan.popular && (
                <div className="w-full bg-blue-600 text-white text-center py-1 text-sm font-semibold">
                  POPULAR
                </div>
              )}
              <div className="w-full p-6 space-y-4">
                <h3 className="text-2xl font-bold">{plan.name}</h3>
                <div className="flex items-baseline gap-2">
                  {typeof plan.price === 'number' ? (
                    <>
                      <span className="text-4xl font-extrabold">${plan.price}</span>
                      {plan.period && <span className="text-gray-600">/{plan.period}</span>}
                    </>
                  ) : (
                    <span className="text-4xl font-extrabold">{plan.price}</span>
                  )}
                </div>
                {plan.yearlyPrice && (
                  <p className="text-sm text-green-600">
                    ${plan.yearlyPrice}/year (save 2 months)
                  </p>
                )}
                {plan.setupFee && (
                  <p className="text-sm text-gray-500">
                    {plan.setupFee}
                  </p>
                )}
                <p className="text-gray-600 text-sm">{plan.description}</p>
              </div>
              <div className="flex flex-col w-full h-full p-6 space-y-5 bg-gray-50 border-t">
                <a
                  className={`px-6 py-3 text-center font-medium rounded transition-colors ${
                    plan.popular
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-800 text-white hover:bg-gray-900'
                  }`}
                  href={plan.cta === 'Contact Sales' ? '/contact' : 'https://app.getairank.com'}
                >
                  {plan.cta}
                </a>
                <div className="space-y-3">
                  <h6 className="font-semibold text-sm uppercase text-gray-600">
                    What&apos;s Included
                  </h6>
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckIcon className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Pricing;
