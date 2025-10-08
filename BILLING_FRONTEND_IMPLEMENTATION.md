# Stripe Billing Frontend Implementation

Complete frontend implementation for Stripe billing in airank-app, matching the backend billing infrastructure from airank-core.

## Overview

This implementation provides a full-featured billing UI with subscription management, usage tracking, and payment method handling.

## Implemented Components

### 1. GraphQL Operations

**File**: `/src/graphql/billing-operations.js`

All billing queries and mutations:
- `GET_BILLING_PROFILES` - Fetch user's billing profiles
- `GET_BILLING_PLANS` - Fetch available plans from Stripe
- `CREATE_BILLING_PROFILE` - Create new billing account
- `ATTACH_BILLING_PROFILE` - Link workspace to billing profile
- `CREATE_SUBSCRIPTION` - Start paid subscription
- `CONFIRM_SUBSCRIPTION` - Confirm payment completed
- `CHANGE_PLAN` - Upgrade/downgrade plans
- `CREATE_SETUP_INTENT` - Collect payment method
- `SAVE_PAYMENT_METHOD` - Store payment details

### 2. Stripe Provider

**File**: `/src/providers/stripe.jsx`

Wraps app with Stripe Elements context for payment processing.

**Usage**:
```jsx
import { StripeProvider } from '@/providers/stripe';

<StripeProvider>
  <YourComponent />
</StripeProvider>
```

### 3. Billing Pages

#### Billing Dashboard
**Route**: `/[workspaceSlug]/billing`
**File**: `/src/app/[workspaceSlug]/billing/page.jsx`

Features:
- Current plan display with limits
- Usage progress bars (brands, prompts)
- Payment method display
- Visual warnings when approaching limits
- Quick links to change plan or update payment method

#### Plans Page
**Route**: `/[workspaceSlug]/billing/plans`
**File**: `/src/app/[workspaceSlug]/billing/plans/page.jsx`

Features:
- Display all available plans from Stripe
- Monthly/annual toggle with savings indicator
- Current plan highlighting
- One-click subscription with Stripe checkout
- Popular plan badging

#### Success Page
**Route**: `/[workspaceSlug]/billing/success`
**File**: `/src/app/[workspaceSlug]/billing/success/page.jsx`

Features:
- Automatic subscription confirmation
- Display subscription details
- Links to billing dashboard and workspace

### 4. Payment Method Form

**File**: `/src/components/billing/PaymentMethodForm.jsx`

Features:
- Stripe CardElement integration
- Setup intent creation
- Card validation
- Success/error handling
- Modal-compatible

### 5. Entitlement Utilities

**File**: `/src/utils/entitlements.js`

Frontend validation functions:
```javascript
// Check if user can create brand
canCreateBrand(billingProfile, currentBrandCount)

// Check if user can create prompt
canCreatePrompt(billingProfile, currentPromptCount)

// Check if user can use AI model
canUseModel(billingProfile, modelName, allowedModels)

// Show upgrade prompt toast
showUpgradePrompt(feature, workspaceSlug)

// Get usage status with color coding
getUsageStatus(used, limit)

// Format limit display (handles unlimited)
formatLimit(limit)

// Get complete usage summary
getUsageSummary(billingProfile)
```

### 6. Custom Hook

**File**: `/src/hooks/useBillingProfile.js`

Easy access to billing profile data:
```javascript
const { billingProfile, isLoading, error, refetch } = useBillingProfile();
```

## Usage Examples

### Add Entitlement Check to Brand Creation

```javascript
import { useBillingProfile } from '@/hooks/useBillingProfile';
import { canCreateBrand, showUpgradePrompt } from '@/utils/entitlements';

function BrandsPage() {
  const { billingProfile } = useBillingProfile();
  const { workspaceSlug } = useWorkspace();

  const handleCreateBrand = async (brandName) => {
    // Check entitlement
    const check = canCreateBrand(billingProfile, currentBrandCount);

    if (!check.allowed) {
      toast.error(check.message);
      showUpgradePrompt('brands', workspaceSlug);
      return;
    }

    // Proceed with creation
    const result = await executeMutation(graphqlClient, CREATE_BRAND, {
      workspaceSlug,
      name: brandName
    });

    // Handle result...
  };
}
```

### Display Usage Warning

```javascript
import { getUsageStatus, formatLimit } from '@/utils/entitlements';

function UsageDisplay({ billingProfile }) {
  const brandsStatus = getUsageStatus(
    billingProfile.brandsUsed,
    billingProfile.brandsLimit
  );

  return (
    <div>
      <p>Brands: {billingProfile.brandsUsed} / {formatLimit(billingProfile.brandsLimit)}</p>

      {brandsStatus.warning && (
        <div className="text-yellow-600">
          ⚠️ You're at {brandsStatus.percentage.toFixed(0)}% of your brand limit
        </div>
      )}

      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`bg-${brandsStatus.color}-500 h-2 rounded-full`}
          style={{ width: `${brandsStatus.percentage}%` }}
        />
      </div>
    </div>
  );
}
```

## UI Design Patterns

All components follow airank-app's existing design system:

### Colors
- **Primary Green**: `#22d35f` - Success states, primary actions
- **Hot Magenta**: `#ff0099` - Call-to-action, popular badges
- **Electric Cyan**: `#00d9ff` - Accents
- **Neon Colors**: Used throughout for vibrant UI

### Components
- **Cards**: Using shadcn/ui Card components
- **Buttons**: Custom Button component with `background` and `border` props
- **Forms**: Stripe Elements with theme matching
- **Progress Bars**: Color-coded (green/yellow/red) based on usage

### Layout
- **AccountLayout**: Consistent wrapper for all billing pages
- **Content.Title**: Page headers with title and subtitle
- **Content.Divider**: Visual separation
- **Content.Container**: Main content wrapper

## Navigation

Add billing links to your navigation:

```jsx
// In sidebar or navigation component
<Link href={`/${workspaceSlug}/billing`}>
  <CreditCardIcon className="h-5 w-5" />
  <span>Billing</span>
</Link>

<Link href={`/${workspaceSlug}/billing/plans`}>
  <SparklesIcon className="h-5 w-5" />
  <span>Upgrade</span>
</Link>
```

## Environment Variables

Already configured in `.env`:
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

For production, replace with live keys:
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
```

## Integration Checklist

### Pages Created
- ✅ `/[workspaceSlug]/billing` - Main billing dashboard
- ✅ `/[workspaceSlug]/billing/plans` - Plan selection
- ✅ `/[workspaceSlug]/billing/success` - Payment success

### Components Created
- ✅ `PaymentMethodForm` - Card input form
- ✅ `StripeProvider` - Stripe Elements wrapper

### Utilities Created
- ✅ GraphQL operations for all billing mutations/queries
- ✅ Frontend entitlement checking functions
- ✅ `useBillingProfile` custom hook

### Integration Points (TODO)
- [ ] Add entitlement checks to brand creation
- [ ] Add entitlement checks to prompt creation
- [ ] Add model access checks
- [ ] Add navigation links to billing pages
- [ ] Display usage warnings in workspace dashboard
- [ ] Add upgrade prompts when limits reached

## Testing Flow

### 1. View Plans
1. Navigate to `/[workspaceSlug]/billing/plans`
2. Toggle between monthly/annual
3. View plan features and pricing

### 2. Subscribe to Plan
1. Click "Subscribe" on a paid plan
2. Enter test card: `4242 4242 4242 4242`
3. Use any future expiry date and any CVC
4. Confirm payment
5. Redirected to success page
6. Subscription confirmed automatically

### 3. Add Payment Method
1. Navigate to `/[workspaceSlug]/billing`
2. Click "Add Payment Method"
3. Enter card details in modal
4. Save payment method
5. Card details displayed in billing dashboard

### 4. Check Usage
1. Navigate to `/[workspaceSlug]/billing`
2. View usage progress bars
3. See warnings if approaching limits

### 5. Change Plan
1. Click "Change Plan" button
2. Select new plan
3. Confirm upgrade/downgrade
4. Prorated charges applied automatically

## Stripe Test Cards

```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
3D Secure: 4000 0025 0000 3155
```

Use any future expiry and any 3-digit CVC.

## Next Steps

### Backend
1. **Stripe Webhook Handler** - Handle subscription events
2. **Product Setup Script** - Populate Stripe with plans
3. **Usage Tracking** - Implement increment/decrement on mutations

### Frontend
1. **Add Entitlement Checks** - Integrate checks into existing mutations
2. **Navigation Updates** - Add billing links to sidebar
3. **Dashboard Widgets** - Show usage summary on main dashboard
4. **Upgrade Prompts** - Display contextual upgrade messages

## Architecture Decisions

### Why Client-Side Checking?
- **UX**: Immediate feedback before API calls
- **Performance**: Reduces failed API requests
- **Security**: Backend still enforces all limits

### Why Separate Billing Profile?
- **Agency Model**: Multiple workspaces share one billing account
- **Flexibility**: Easy to switch billing between workspaces
- **Scalability**: Clean separation of concerns

### Why Stripe Products API?
- **Agility**: Create/modify plans without code changes
- **Accuracy**: Single source of truth for pricing
- **Maintenance**: No database sync needed

## File Structure

```
src/
├── app/
│   └── [workspaceSlug]/
│       └── billing/
│           ├── page.jsx              # Main billing dashboard
│           ├── plans/
│           │   └── page.jsx          # Plan selection
│           └── success/
│               └── page.jsx          # Payment success
├── components/
│   └── billing/
│       └── PaymentMethodForm.jsx    # Payment form
├── graphql/
│   └── billing-operations.js        # All GraphQL operations
├── hooks/
│   └── useBillingProfile.js         # Billing profile hook
├── providers/
│   └── stripe.jsx                   # Stripe Elements provider
└── utils/
    └── entitlements.js              # Frontend validation
```

## Styling

All components use Tailwind CSS with airank-app's theme:
- Dark mode support
- Responsive design (mobile-first)
- Consistent spacing and typography
- Vibrant neon color scheme
- Smooth transitions and animations

## Support

For issues or questions:
- Check browser console for errors
- Verify Stripe keys in `.env`
- Check network tab for GraphQL errors
- Ensure backend is running on port 4002

---

**Implementation Status**: Frontend Complete ✅
**Test Coverage**: Manual testing required
**Production Ready**: After integration testing
