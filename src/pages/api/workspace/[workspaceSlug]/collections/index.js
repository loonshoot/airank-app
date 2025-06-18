// /src/pages/api/workspace/[workspaceSlug]/collections/index.js
import { validateSession } from '@/config/api-validation/index';
import { MongoClient } from 'mongodb';
import { getWorkspace } from '@/prisma/services/workspace'; // Import the getWorkspace function;

const uri = process.env.MONGODB_CONNECTION_STRING;
const client = new MongoClient(uri);

const handler = async (req, res) => {
  const { method } = req;
  const { workspaceSlug, limit, page } = req.query;
  const defaultLimit = 20;
  const maxLimit = 100;
  const validLimits = [20, 50, 100];
  const validPages = [1, 2];

  try {
    if (method === 'GET') {
      const session = await validateSession(req, res);

      const workspace = await getWorkspace(session.user.userId, session.user.email, workspaceSlug);

      if (!workspace) {
        return res.status(404).json({ errors: { error: { msg: 'Workspace not found' } } } );
      }

      await client.connect();
      const db = client.db(`workspace_${workspace.id}`);
      const collections = await db.listCollections().toArray();

      const collectionData = await Promise.all(collections
        .filter(collection => collection.name !== 'logging' && collection.name !== 'transformations')
        .map(async collection => {
          const stats = await db.command({ collStats: collection.name });
          const count = await db.collection(collection.name).countDocuments();
          return { name: collection.name, sizeMB: Math.round(stats.size / (1024 * 1024)), objectCount: count };
        }));

      let limitedData = collectionData.slice(0, defaultLimit);
      if (validLimits.includes(parseInt(limit))) {
        limitedData = collectionData.slice(0, parseInt(limit));
      }

      if (validPages.includes(parseInt(page))) {
        const startIndex = (parseInt(page) - 1) * parseInt(limit);
        const endIndex = startIndex + parseInt(limit);
        limitedData = collectionData.slice(startIndex, endIndex);
      }

      res.status(200).json({ success: true, data: limitedData });
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
