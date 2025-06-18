export default async function handler(req, res) {
  const { code, state, error } = req.query;

  if (error) {
    // OAuth error, redirect with error
    const errorParams = new URLSearchParams({ error }).toString();
    return res.redirect(`/error?${errorParams}`);
  }

  try {
    // The state parameter is just the URL to redirect back to (matching old implementation)
    const redirectUrl = state || `${process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3000}`}/sources`;
    
    // Add the authorization code as a query parameter
    const finalUrl = new URL(redirectUrl);
    finalUrl.searchParams.set('code', code);

    return res.redirect(finalUrl.toString());
  } catch (err) {
    console.error('OAuth callback error:', err);
    return res.redirect('/error?error=invalid_state');
  }
}