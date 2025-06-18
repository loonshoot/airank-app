import { validateSession } from '@/config/api-validation/index';
import { MongoClient, ObjectId } from 'mongodb';
import { getWorkspace } from '@/prisma/services/workspace';

const uri = process.env.MONGODB_CONNECTION_STRING;

const handler = async (req, res) => {
  const { method } = req;
  const { workspaceSlug, logSlug } = req.query;
  let client;

  try {
    if (method === 'GET') {
      const session = await validateSession(req, res);

      const workspace = await getWorkspace(session.user.userId, session.user.email, workspaceSlug);

      if (!workspace) {
        return res.status(404).json({ errors: { error: { msg: 'Workspace not found' } } });
      }

      client = new MongoClient(uri);
      await client.connect();
      const db = client.db(`workspace_${workspace.id}`);
      const logsCollection = db.collection('logging');

      const log = await logsCollection.findOne({ _id: new ObjectId(logSlug) });

      if (!log) {
        return res.status(404).json({ errors: { error: { msg: 'Log not found' } } });
      }

      res.status(200).json({ success: true, data: log });
    } else {
      res.status(405).json({ errors: { error: { msg: `${method} method unsupported` } } });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ errors: { error: { msg: 'Internal server error' } } });
  } finally {
    if (client) {
      await client.close();
    }
  }
};

export default handler;
