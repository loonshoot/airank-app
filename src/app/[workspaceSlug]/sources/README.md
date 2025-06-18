# Sources App Router Migration

This directory contains the migrated App Router implementation for the Sources feature.

## Structure

```
sources/
├── page.jsx                        # Main sources listing
├── add/
│   ├── page.jsx                   # Source type selection
│   ├── hubspot/page.jsx           # HubSpot integration
│   ├── confluence/page.jsx        # Confluence integration
│   ├── google-search-console/page.jsx  # GSC integration
│   ├── salesforce/page.jsx        # (existing)
│   └── zohocrm/page.jsx           # (existing)
└── [sourceId]/
    └── page.jsx                   # Individual source details
```

## Key Features Implemented

### 1. Client-Side Rendering
All pages use the `'use client'` directive and handle hydration properly:
```jsx
const [hasHydrated, setHasHydrated] = useState(false);
useEffect(() => setHasHydrated(true), []);
```

### 2. OAuth Flow Integration
Each source page handles OAuth authentication:
- Initiates OAuth flow with provider
- Handles callback with auth code
- Creates source with access token
- Schedules initial sync job

### 3. GraphQL Integration
Uses centralized queries from `/graphql/queries/sources.js`:
- `GET_WORKSPACE_SOURCES`
- `CREATE_OAUTH_URL`
- `CREATE_SOURCE`
- `SCHEDULE_SYNC_JOB`

### 4. Shared Hook
The `useSourceSetup` hook provides common OAuth functionality:
- State management
- OAuth flow handling
- Source creation
- Error handling

## Next Steps

### 1. Missing Dependencies
You'll need to create these files if they don't exist:

**`src/hooks/useGraphQLClient.js`**:
```jsx
import { useApolloClient } from '@apollo/client';

export function useGraphQLClient() {
  return useApolloClient();
}
```

**`src/i18n.js`**:
```jsx
// Your i18n initialization
import i18n from 'i18next';
// ... configuration
```

### 2. OAuth Callback Handlers
Create callback handlers for remaining sources:
- `/pages/api/callback/sources/add/confluence.js`
- `/pages/api/callback/sources/add/google-search-console.js`

### 3. Environment Variables
Ensure these are set:
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
HUBSPOT_CLIENT_ID=xxx
HUBSPOT_CLIENT_SECRET=xxx
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
ATLASSIAN_CLIENT_ID=xxx
ATLASSIAN_CLIENT_SECRET=xxx
```

### 4. Testing
1. Test OAuth flows for each provider
2. Verify source creation and data syncing
3. Test navigation and error handling
4. Check hydration behavior

### 5. Cleanup
Once verified working:
1. Remove old pages router files
2. Update any navigation links
3. Update documentation

## Usage Example

To use the shared hook in a new source page:

```jsx
import { useSourceSetup } from '@/hooks/sources/useSourceSetup';

export default function NewSourcePage({ params }) {
  const { workspaceSlug } = params;
  const router = useRouter();
  
  const {
    loading,
    error,
    sourceName,
    setSourceName,
    startOAuthFlow,
    isAuthenticated
  } = useSourceSetup({
    service: 'new-service',
    workspaceSlug,
    defaultScopes: ['read', 'write'],
    defaultSourceName: 'New Service',
    onSuccess: (source) => {
      router.push(`/${workspaceSlug}/sources`);
    }
  });
  
  // ... rest of component
}
```

## Troubleshooting

### Hydration Errors
If you see hydration mismatches:
1. Ensure `hasHydrated` check before rendering dynamic content
2. Use `useEffect` for client-only operations
3. Check for server/client inconsistencies

### OAuth Errors
1. Verify redirect URIs match OAuth app settings
2. Check state parameter encoding/decoding
3. Ensure tokens are properly stored/retrieved

### GraphQL Errors
1. Verify GraphQL endpoint configuration
2. Check query/mutation syntax matches API
3. Ensure proper error handling in components