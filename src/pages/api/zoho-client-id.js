export default function handler(req, res) {
  // Get the client ID from the server environment variable
  const clientId = process.env.NEXT_PUBLIC_ZOHO_CLIENT_ID;
  
  if (!clientId) {
    return res.status(500).json({ error: 'Zoho client ID is not configured' });
  }
  
  // Return the client ID to the client
  res.status(200).json({ clientId });
} 