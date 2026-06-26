import { getAuthUserFromHeaders } from './lib/auth.js';
import { getDb } from './lib/mongo.js';

// GET -> returns current user from JWT in cookie
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const headers = req.headers || {};
    const authUser = getAuthUserFromHeaders(headers);

    if (!authUser) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    const db = await getDb();
    const user = await db.collection('users').findOne({ _id: authUser.id });

    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    return res.status(200).json({
      user: {
        id: user._id,
        email: user.email,
        isAdmin: !!user.isAdmin,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('Auth-me error:', error);
    return res.status(500).json({ error: 'Failed to fetch user.' });
  }
}