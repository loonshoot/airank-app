import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/server/auth";
import { getToken } from 'next-auth/jwt';

export default async function handler(req, res) {
  try {
    // Get both the session and the raw JWT token
    const session = await getServerSession(req, res, authOptions);
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    
    // Get a raw copy of the user object for debugging
    const rawUser = session?.user ? { ...session.user } : null;
    
    // Check what token info is available
    const tokenInfo = session?.token ? { 
      present: true,
      hasUserId: !!session.token.userId,
      hasSub: !!session.token.sub,
      tokenKeys: Object.keys(session.token)
    } : { 
      present: false 
    };
    
    // Also check the raw JWT token
    const rawToken = token ? {
      present: true,
      hasUserId: !!token.userId,
      hasSub: !!token.sub,
      hasEmail: !!token.email,
      tokenKeys: Object.keys(token)
    } : {
      present: false
    };
    
    // Sanitize the session for security but include more debug info
    const safeSession = {
      isAuthenticated: !!session,
      user: session?.user ? {
        id: session.user.id,
        userId: session.user.userId,
        email: session.user.email,
        name: session.user.name,
        hasToken: !!session.token,
        userKeys: Object.keys(session.user)
      } : null,
      tokenInfo: tokenInfo,
      rawToken: rawToken,
      sessionKeys: session ? Object.keys(session) : []
    };
    
    // For dev only - show full session structure
    const fullSession = JSON.parse(JSON.stringify(session));
    const fullToken = JSON.parse(JSON.stringify(token));
    
    // Check various parts of the request that might contain auth info
    const requestInfo = {
      headers: {
        authorization: req.headers.authorization ? 'present' : 'absent',
        cookie: req.headers.cookie ? 'present' : 'absent'
      },
      cookies: Object.keys(req.cookies || {})
    };
    
    return res.status(200).json({ 
      session: safeSession,
      rawUser,
      fullSession,
      fullToken,
      requestInfo,
      authType: "next-auth",
    });
  } catch (error) {
    console.error("Error in debug-session API:", error);
    return res.status(500).json({ error: error.message, stack: error.stack });
  }
} 