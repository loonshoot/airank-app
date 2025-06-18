/**
 * Zoho CRM OAuth callback handler for source connections
 * Handles receiving the authorization code from Zoho, processes it via GraphQL, then redirects to the source setup page
 */
export default async function handler(req, res) {
  // Ensure we only handle GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      code, 
      state, 
      error, 
      error_description, 
      location,
      'accounts-server': accountsServer 
    } = req.query;

    console.log('Zoho OAuth callback received:', { 
      code: code ? 'present' : 'missing', 
      state, 
      error, 
      location, 
      accountsServer 
    });

    // Parse state parameter to extract returnTo URL
    let redirectPath = '/outrun-dev/sources/add/zohocrm'; // default fallback
    let workspaceSlug = 'outrun-dev';
    
    if (state) {
      try {
        const stateParams = new URLSearchParams(state);
        const returnTo = stateParams.get('returnTo');
        if (returnTo) {
          redirectPath = decodeURIComponent(returnTo);
          // Extract workspace slug from the returnTo URL
          const pathParts = redirectPath.split('/');
          if (pathParts.length > 1) {
            workspaceSlug = pathParts[1];
          }
        }
      } catch (e) {
        console.warn('Failed to parse state parameter:', e);
      }
    }

    // Handle errors from Zoho
    if (error) {
      console.error(`Zoho OAuth error: ${error}`, error_description);
      const finalRedirectUrl = new URL(redirectPath, process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
      finalRedirectUrl.searchParams.set('error', error);
      if (error_description) {
        finalRedirectUrl.searchParams.set('error_description', error_description);
      }
      res.writeHead(302, { Location: finalRedirectUrl.toString() });
      res.end();
      return;
    }

    // If we have a code, redirect back to the source setup page with the code and additional Zoho parameters
    if (code) {
      // Build redirect URL with all necessary parameters
      const finalRedirectUrl = new URL(redirectPath, process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
      finalRedirectUrl.searchParams.set('code', code);
      
      // Add Zoho-specific parameters if they exist
      if (location) {
        finalRedirectUrl.searchParams.set('location', location);
      }
      if (accountsServer) {
        finalRedirectUrl.searchParams.set('accountsServer', accountsServer);
      }
      
      console.log(`Zoho OAuth callback - redirecting to: ${finalRedirectUrl.toString()}`);
      
      // Use 302 redirect to ensure it's not cached
      res.writeHead(302, { Location: finalRedirectUrl.toString() });
      res.end();
      return;
    }

    // If we don't have a code, redirect to the home page
    console.warn('Zoho OAuth callback received without code parameter');
    return res.redirect('/');
  } catch (error) {
    console.error('Error handling Zoho OAuth callback:', error);
    const defaultRedirectUrl = `/${req.query.workspaceSlug || 'outrun-dev'}/sources/add/zohocrm`;
    return res.redirect(`${defaultRedirectUrl}?error=${encodeURIComponent('Failed to process Zoho authorization')}`);
  }
} 