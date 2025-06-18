import { getToken } from "next-auth/jwt";

export default async function handler(req, res) {
  try {
    // Get the code and state from the query parameters
    const { code, state } = req.query;

    if (!code) {
      console.error('No code received from Atlassian');
      return res.redirect(`${state}?error=No code received from Atlassian`);
    }

    // Get the session token
    const token = await getToken({ 
      req, 
      secret: process.env.NEXTAUTH_SECRET,
      raw: true 
    });

    if (!token) {
      console.error('No session token found');
      return res.redirect(`${state}?error=No session token found`);
    }

    // Redirect back to the frontend with the code
    // The frontend will handle the token exchange via GraphQL
    res.redirect(`${state}?code=${code}`);
  } catch (error) {
    console.error('Error in Atlassian callback:', error);
    res.redirect(`${state}?error=${encodeURIComponent(error.message)}`);
  }
} 