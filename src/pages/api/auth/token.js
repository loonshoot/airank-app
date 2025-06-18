import { getToken } from 'next-auth/jwt';

const secret = process.env.NEXTAUTH_SECRET;

export default async function handler(req, res) {
  const token = await getToken({ req, secret, raw: true });
  if (token) {
    res.status(200).json({ token });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
}