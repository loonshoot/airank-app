export default async function handler(req, res) {
    // Correctly create a URL object with req.url
    const url = new URL(req.url, process.env.APP_URL);  // Or your actual development domain
    const { searchParams } = url; // Access searchParams from the URL object
  
    const state = searchParams.get('state');
  
    // Ensure the state is a valid URL
    if (!state || !state.startsWith('http')) {
      return res.status(400).json({ error: 'Invalid state parameter.' });
    }
  
    // Construct the full redirect URL
    const redirectUrl = new URL(state);
  
    // Get query parameters from the request
    searchParams.forEach((value, key) => {
      if (key !== 'state') {
        redirectUrl.searchParams.set(key, value); 
      }
    });
  
    // Redirect using res.redirect()
    res.redirect(redirectUrl.toString());
  }