// /src/pages/api/workspace/[workspaceSlug]/sources.js
import { validateSession } from '@/config/api-validation/index';
import { PrismaClient } from '@prisma/client';
import { getWorkspace } from '@/prisma/services/workspace'; // Import the getWorkspace function
import crypto from 'crypto';

const prisma = new PrismaClient();

const handler = async (req, res) => {
  const { method } = req;
  const { workspaceSlug } = req.query;
  try {
    if (method === 'GET') {
      // Handle GET request to retrieve sources for the specified workspace
      const session = await validateSession(req, res);

      // Retrieve the workspace
      const workspace = await getWorkspace(session.user.userId, session.user.email, workspaceSlug);

      if (!workspace) {
        return res.status(404).json({ errors: { error: { msg: 'Workspace not found' } } });
      }

      // Retrieve sources associated with the workspace
      const sources = await prisma.sources.findMany({
        where: {
          workspaceId: workspace.id,
        },
      });

      res.status(200).json({ success: true, data: sources });
    } else if (method === 'POST') {
      const session = await validateSession(req, res);
      const { name, whitelistedIp, sourceType, matchingField, datalakeCollection } = req.body;

      // Ensure whitelistedIp is an array
      if (!Array.isArray(whitelistedIp)) {
        return res.status(400).json({ errors: { error: { msg: 'whitelistedIp must be an array' } } });
      }

      // Ensure whitelistedIp is an array
      if (!sourceType) {
        return res.status(400).json({ errors: { error: { msg: 'sourceType must be provided' } } });
      }

      // Ensure whitelistedIp is an array
      if (!matchingField) {
        return res.status(400).json({ errors: { error: { msg: 'matchingField must be provided' } } });
      }

      // Get workspace using getWorkspace function
      const workspace = await getWorkspace(session.user.userId, session.user.email, workspaceSlug);

      if (!workspace) {
        return res.status(404).json({ errors: { error: { msg: 'Workspace not found' } } });
      }

      // Generate a bearer token
      const bearerToken = generateBearerToken();

      // Create a new source within a transaction
      const source = await prisma.sources.create({
        data: {
          name,
          whitelistedIp,
          bearerToken,
          sourceType,
          matchingField,
          workspace: {
            connect: {
              id: workspace.id // Connect to the workspace using its id
            }
          },
          datalakeCollection
        }
      });

      res.status(200).json({ success: true, data: source });
    } else if (method === 'DELETE') {

      const session = await validateSession(req, res);
      const { id } = req.query; // Change from req.body to req.query
    
      // Check if the ID is provided
      if (!id) {
        return res.status(400).json({ errors: { error: { msg: 'Source ID must be provided' } } });
      }
    
      // Delete the source by ID
      await prisma.sources.delete({
        where: {
          id,
        },
      });
    
      res.status(200).json({ success: true, msg: 'Source deleted successfully' });
    } else {
      res.status(405).json({ errors: { error: { msg: `${method} method unsupported` } } });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ errors: { error: { msg: 'Internal server error' } } });
  }
};

export default handler;

const generateBearerToken = () => {
  return crypto.randomBytes(20).toString('hex');
};
