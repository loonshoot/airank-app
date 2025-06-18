/**
 * Unified Salesforce OAuth callback handler for both source and destination connections
 * Handles receiving the authorization code from Salesforce and redirects back to the appropriate setup page
 * Distinguishes between source and destination flows via the state parameter
 */
export default async function handler(req, res) {
  try {
    const { code, state, error, error_description } = req.query;

    // Handle errors from Salesforce
    if (error) {
      console.error(`Salesforce OAuth error: ${error}`, error_description);
      let redirectUrl = '/';
      
      // Try to extract the returnTo URL from state if it exists
      if (state && state.includes('returnTo=')) {
        const stateParams = new URLSearchParams(state);
        redirectUrl = decodeURIComponent(stateParams.get('returnTo') || '/');
      }
      
      return res.redirect(`${redirectUrl}?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(error_description || '')}`);
    }

    // If we have a code and state, redirect back to the appropriate setup page with the code
    if (code && state) {
      let redirectUrl = '/';
      
      try {
        // Parse the state parameter to get the type and returnTo URL
        // State format: "type=source&returnTo=https://..."
        const stateParams = new URLSearchParams(state);
        redirectUrl = decodeURIComponent(stateParams.get('returnTo') || '/');
      } catch (parseError) {
        console.error('Error parsing state parameter:', parseError);
        // Fallback to using the state as the redirect URL (for backward compatibility)
        redirectUrl = state;
      }
      
      // Redirect back to the setup page with the code
      return res.redirect(`${redirectUrl}?code=${encodeURIComponent(code)}`);
    }

    // If we don't have a code or state, redirect to the home page
    return res.redirect('/');
  } catch (error) {
    console.error('Error handling Salesforce OAuth callback:', error);
    return res.redirect(`/?error=${encodeURIComponent('Failed to process Salesforce authorization')}`);
  }
} 