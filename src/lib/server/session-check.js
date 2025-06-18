import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/lib/server/auth';

const validateMiddleware = () => {
  return async (req, res, next) => {
    const session = await getServerSession(req, res, authOptions);
    console.log("Session in API request:", JSON.stringify(session, null, 2));
    
    const errors = [];

    if (!session) {
      errors.push({ param: 'session', msg: 'Unauthorized access' });
    } else {
      // Make sure userId is available in the session
      if (!session.user.userId) {
        console.log("Finding userId from available sources...");
        
        // Try to use other id fields as fallbacks in this order
        if (session.user.id) {
          session.user.userId = session.user.id;
          console.log("Set userId from user.id:", session.user.id);
        } else if (session.token?.sub) {
          session.user.userId = session.token.sub;
          console.log("Set userId from token.sub:", session.token.sub);
        } else if (session.token?.userId) {
          session.user.userId = session.token.userId;
          console.log("Set userId from token.userId:", session.token.userId);
        } else {
          console.error("No userId sources available in session:", {
            hasUser: !!session.user,
            hasToken: !!session.token,
            userKeys: session.user ? Object.keys(session.user) : [],
            tokenKeys: session.token ? Object.keys(session.token) : []
          });
        }
      }
      
      // Continue even if userId is still not available - let the endpoint decide what to do
      return next(session);
    }

    const errorObject = {};
    errors.forEach((error) => (errorObject[error.param] = error));
    res.status(401).json({ errors: errorObject });
  };
};

export default validateMiddleware;
