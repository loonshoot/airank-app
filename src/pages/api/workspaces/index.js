import { validateSession } from '@/config/api-validation';
import { getWorkspaces } from '@/prisma/services/workspace';

const handler = async (req, res) => {
  const { method } = req;

  if (method === 'GET') {
    try {
      const session = await validateSession(req, res);
      console.log("Session user in workspaces API:", session.user);
      
      // Ensure userId is available, try multiple fallbacks
      const userId = session.user.userId || session.user.id || session.token?.sub || session.token?.userId;
      const userEmail = session.user.email;
      
      if (!userId && !userEmail) {
        console.error("No user identifiers available in session");
        return res.status(400).json({ 
          error: "No user identifiers available",
          session: {
            hasUserId: !!session.user.userId,
            hasId: !!session.user.id,
            hasEmail: !!session.user.email,
            userKeys: Object.keys(session.user || {})
          }
        });
      }
      
      // Even if userId is missing, try to proceed with email
      console.log(`Fetching workspaces with userId: ${userId || 'N/A'}, email: ${userEmail || 'N/A'}`);
      const workspaces = await getWorkspaces(userId, userEmail);
      console.log("Found workspaces:", workspaces?.length || 0);
      
      return res.status(200).json({ data: { workspaces } });
    } catch (error) {
      console.error("Error in workspaces API:", error);
      return res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: `${method} method unsupported` });
  }
};

export default handler;
