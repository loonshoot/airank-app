import { unstable_getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/server/auth';
import { getToken } from 'next-auth/jwt';
import { connectToDatabase } from '@/lib/server/mongodb';

export default async function handler(req, res) {
  const session = await unstable_getServerSession(req, res, authOptions);
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET, raw: true });

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ message: 'Missing entity ID' });
  }

  try {
    // Connect to the database
    const { db } = await connectToDatabase();

    // Retrieve the entity from the database
    const entity = await db.collection('entities').findOne({ 
      _id: id,
      type: { $in: ['confluence_page', 'confluence_blog_post'] } 
    });

    if (!entity) {
      return res.status(404).json({ message: 'Entity not found' });
    }

    // Format the response data
    const formattedEntity = {
      id: entity._id,
      title: entity.title || 'Untitled',
      content: entity.content || '',
      spaceKey: entity.spaceKey || '',
      spaceName: entity.spaceName || '',
      webUrl: entity.webUrl || '',
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt || entity.createdAt,
      author: entity.author || {
        email: '',
        displayName: 'Unknown Author'
      },
      type: entity.type,
      labels: entity.labels || [],
      version: entity.version || { number: 1 }
    };

    // Return the formatted entity
    return res.status(200).json(formattedEntity);
  } catch (error) {
    console.error('Error fetching Confluence entity:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
} 