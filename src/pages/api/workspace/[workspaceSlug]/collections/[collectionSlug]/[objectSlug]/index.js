// /src/pages/api/workspace/[workspaceSlug]/collections/[collectionSlug]/index.js
import { validateSession } from '@/config/api-validation/index';
import { MongoClient, ObjectId } from 'mongodb'; // Added ObjectId import
import { getWorkspace } from '@/prisma/services/workspace'; // Import the getWorkspace function;

const uri = process.env.MONGODB_CONNECTION_STRING;

const handler = async (req, res) => {
  const { method } = req;
  const { workspaceSlug, collectionSlug, objectSlug } = req.query;
  let client; // Define client variable outside try block

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
      const collection = db.collection(collectionSlug);
      console.log(objectSlug)
      const object = await collection.findOne({ _id: new ObjectId(objectSlug) }); // Convert objectSlug to ObjectId

      if (!object) {
        return res.status(404).json({ errors: { error: { msg: 'Object not found' } } });
      }

      res.status(200).json({ success: true, data: object });
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
