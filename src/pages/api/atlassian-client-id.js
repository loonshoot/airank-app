export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const clientId = process.env.ATLASSIAN_CLIENT_ID;
  
  if (!clientId) {
    return res.status(500).json({ error: 'Atlassian client ID not configured' });
  }

  res.status(200).json({ clientId });
} 