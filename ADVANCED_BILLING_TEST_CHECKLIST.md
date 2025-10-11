# Advanced Billing System - Test Checklist

## ✅ Pre-Test Setup
- [ ] Backend running on port 4002
- [ ] Frontend running on port 4000
- [ ] Logged in as a user with workspace access
- [ ] Have a workspace created

## 📋 Test Scenarios

### 1. Simple Billing Mode (Default)
- [ ] Visit billing page - should show plan selection
- [ ] Verify "Complex billing needs? Change to Advanced Billing" appears at bottom
- [ ] Can select and subscribe to a plan (if not already subscribed)
- [ ] Billing profile shows correctly in manage view

### 2. Switch to Advanced Billing
- [ ] Click "Change to Advanced Billing" button
- [ ] Should see success toast
- [ ] Page should refresh automatically
- [ ] Should now see "Billing Profile" dropdown selector
- [ ] Should see "Looking a bit complex? Switch to Simple Billing" at bottom

### 3. Advanced Billing - Profile Selector
- [ ] Dropdown shows all available billing profiles
- [ ] Default profile has "(Default)" indicator
- [ ] Can select a different profile from dropdown
- [ ] Click "Attach" button
- [ ] Should see success toast
- [ ] Page refreshes and shows attached profile's plan

### 4. Advanced Billing - Create New Profile
- [ ] Click "+ Create New Billing Profile" button
- [ ] Modal appears with name input
- [ ] Enter a profile name (e.g., "Agency Billing")
- [ ] Click "Create"
- [ ] Should see success toast
- [ ] Page refreshes
- [ ] New profile appears in dropdown
- [ ] New profile starts on free tier

### 5. Switch Back to Simple Billing

#### Case A: Currently on Default Profile
- [ ] Select default billing profile in dropdown
- [ ] Click "Switch to Simple Billing"
- [ ] No warning dialog should appear
- [ ] Should see success toast
- [ ] Advanced selector should disappear
- [ ] Still on default billing profile

#### Case B: Currently on Non-Default Profile
- [ ] Attach a non-default profile
- [ ] Click "Switch to Simple Billing"
- [ ] **WARNING DIALOG should appear** with message about reverting
- [ ] Click "Cancel" - nothing changes
- [ ] Click "Switch to Simple Billing" again
- [ ] Click "OK" in dialog
- [ ] Should see success toast
- [ ] Page refreshes
- [ ] Reverted to default billing profile
- [ ] Advanced selector disappears

### 6. GraphQL Query Tests

Open browser DevTools Network tab and verify:

- [ ] `GET_WORKSPACE_CONFIGS` returns billing config
- [ ] `GET_BILLING_PROFILES` returns all user's profiles
- [ ] `UPDATE_WORKSPACE_CONFIG` mutation works
- [ ] `ATTACH_BILLING_PROFILE` mutation works
- [ ] `CREATE_BILLING_PROFILE` mutation works

### 7. Error Handling

- [ ] Try attaching profile without permission - should show error
- [ ] Try creating profile with empty name - should show error
- [ ] Try attaching same profile twice - button should be disabled
- [ ] Backend down - should show error toast

### 8. UI/UX Checks

- [ ] All buttons have loading states
- [ ] No console errors in browser
- [ ] Dark theme consistent throughout
- [ ] Green CTAs match design system
- [ ] Modal styling matches billing modals
- [ ] Responsive on mobile/tablet

## 🐛 Known Issues to Watch For

1. **Profile not refreshing** - Check if auto-refresh setTimeout is working
2. **Dropdown not updating** - Verify availableProfiles state updates after create
3. **Warning dialog on default profile** - Should NOT show warning when already on default
4. **Permission errors** - User needs `mutation:updateConfig` permission
5. **Stripe connection** - If testing without internet, Stripe calls may fail

## 📝 Notes

- Default billing profile CANNOT be deleted (backend prevents this)
- Default billing profile CANNOT be shared with other workspaces
- New profiles always start on free tier
- Switching to simple mode always reverts to default profile
- All billing profile changes auto-refresh the page

## ✅ Sign-off

- [ ] All tests passed
- [ ] No console errors
- [ ] Ready for production

---

**Testing Date:** _____________

**Tester:** _____________

**Issues Found:** _____________
