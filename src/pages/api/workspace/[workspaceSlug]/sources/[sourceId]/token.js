import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const handler = async (req, res) => {
  const { method } = req;
  const { sourceId } = req.query;
  try {
    if (method === 'GET') {
      // Retrieve the bearer token for the specified source
      const source = await prisma.sources.findUnique({
        where: {
          id: sourceId
        },
        select: {
          bearerToken: true
        }
      });

      if (!source) {
        return res.status(404).json({ errors: { error: { msg: 'Source not found' } } });
      }

      res.status(200).json({ success: true, data: source.bearerToken });
    } else {
      res.status(405).json({ errors: { error: { msg: `${method} method unsupported` } } });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ errors: { error: { msg: 'Internal server error' } } });
  }
};

export default handler;
