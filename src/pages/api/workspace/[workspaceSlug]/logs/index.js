import { validateSession } from '@/config/api-validation/index';
import { MongoClient } from 'mongodb';
import { getWorkspace } from '@/prisma/services/workspace';

const uri = process.env.MONGODB_CONNECTION_STRING;
const client = new MongoClient(uri);

const handler = async (req, res) => {
  const { method } = req;
  const { workspaceSlug } = req.query;
  const { startDate, endDate, type, requestingIp, responseMessage, limit, page } = req.query;
  const defaultLimit = 20;
  const maxLimit = 100;

  try {
    if (method === 'GET') {
      const session = await validateSession(req, res);

      const workspace = await getWorkspace(session.user.userId, session.user.email, workspaceSlug);

      if (!workspace) {
        return res.status(404).json({ errors: { error: { msg: 'Workspace not found' } } });
      }

      await client.connect();
      const db = client.db(`workspace_${workspace.id}`);
      const logsCollection = db.collection('logging');

      let query = {};
      if (startDate && endDate) {
        query.dateTime = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }
      if (type) {
        query.type = type;
      }
      if (requestingIp) {
        query.requestingIp = requestingIp;
      }
      if (responseMessage) {
        query.responseMessage = { $regex: responseMessage, $options: 'i' };
      }

      const logsCursor = logsCollection.find(query).sort({ dateTime: -1 }); // Sort logs from newest to oldest
      const totalLogs = await logsCursor.count();
      const validLimit = Math.min(limit ? parseInt(limit, 10) : defaultLimit, maxLimit);
      const validPage = page ? parseInt(page, 10) : 1;
      const logs = await logsCursor.skip((validPage - 1) * validLimit).limit(validLimit).toArray();

      res.status(200).json({ success: true, data: logs, totalLogs: totalLogs });
    } else {
      res.status(405).json({ errors: { error: { msg: `${method} method unsupported` } } });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ errors: { error: { msg: 'Internal server error' } } });
  } finally {
    await client.close();
  }
};

export default handler;
