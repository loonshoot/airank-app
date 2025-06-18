/**
 * Salesforce OAuth callback handler for source connections
 * Handles receiving the authorization code from Salesforce and redirects back to the source setup page
 */
export default async function handler(req, res) {
  try {
    const { code, state, error, error_description } = req.query;

    // Handle errors from Salesforce
    if (error) {
      console.error(`Salesforce OAuth error: ${error}`, error_description);
      return res.redirect(`${state}?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(error_description || '')}`);
    }

    // If we have a code and state, redirect back to the source setup page with the code
    if (code && state) {
      // The state parameter contains the redirect URL passed during authorization
      const redirectUrl = state;
      
      // Redirect back to the source setup page with the code
      return res.redirect(`${redirectUrl}?code=${encodeURIComponent(code)}`);
    }

    // If we don't have a code or state, redirect to the home page
    return res.redirect('/');
  } catch (error) {
    console.error('Error handling Salesforce OAuth callback:', error);
    return res.redirect(`/?error=${encodeURIComponent('Failed to process Salesforce authorization')}`);
  }
} 