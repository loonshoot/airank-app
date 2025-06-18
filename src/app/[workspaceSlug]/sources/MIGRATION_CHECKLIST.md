# Sources Migration Checklist: Pages Router → App Router

## Phase 1: App Router Structure ✅
- [x] Main sources index page (`/sources/page.jsx`)
- [x] Add source selection page (`/sources/add/page.jsx`)
- [x] Individual source detail page (`/sources/[sourceId]/page.jsx`)

## Phase 2: Source Setup Pages ✅
- [x] HubSpot source page (`/sources/add/hubspot/page.jsx`)
- [x] Confluence source page (`/sources/add/confluence/page.jsx`)
- [x] Google Search Console page (`/sources/add/google-search-console/page.jsx`)
- [ ] Salesforce source page (already exists)
- [ ] Zoho CRM source page (already exists)

## Phase 3: OAuth Callback Handlers
- [x] HubSpot callback example (`/pages/api/callback/sources/add/hubspot.js`)
- [ ] Confluence callback handler
- [ ] Google Search Console callback handler
- [ ] Update existing Salesforce callback
- [ ] Update existing Zoho CRM callback

## Phase 4: Common Utilities ✅
- [x] Shared GraphQL queries (`/graphql/queries/sources.js`)
- [x] Source setup hook (`/hooks/sources/useSourceSetup.js`)

## Phase 5: Migration Verification
### Per-Page Checklist
- [ ] 'use client' directive added
- [ ] Imports updated (next/navigation)
- [ ] Component signature uses `{ params }`
- [ ] Hydration handling implemented
- [ ] GraphQL client integration working
- [ ] Server-side props removed
- [ ] OAuth flows tested
- [ ] Navigation working
- [ ] Error handling working
- [ ] Loading states working

### Integration Testing
- [ ] OAuth callback redirects work
- [ ] Token refresh functionality
- [ ] Source creation and job scheduling
- [ ] Navigation between steps
- [ ] Back/forward browser navigation

## Phase 6: Cleanup
- [ ] Remove pages router files
- [ ] Update internal links
- [ ] Update navigation components
- [ ] Update documentation

## Additional Tasks
- [ ] Create/verify `useGraphQLClient` hook exists
- [ ] Create/verify i18n initialization file exists
- [ ] Implement proper error pages
- [ ] Add proper TypeScript types (if using TS)
- [ ] Add unit tests for new components
- [ ] Add integration tests for OAuth flows

## Notes
- All source pages follow the same pattern with hydration handling
- OAuth callbacks redirect to app router pages with query params
- GraphQL queries are centralized for reusability
- The `useSourceSetup` hook can simplify OAuth flow implementation