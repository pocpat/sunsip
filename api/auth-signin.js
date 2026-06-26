import { getDb } from './lib/mongo.js';
import {
  signToken,
  comparePassword,
  setAuthCookie,
} from './lib/auth.js';

// POST {email, password} -> verifies against MongoDB, returns JWT in cookie
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    const db = await getDb();
    const users = db.collection('users');

    const user = await users.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = signToken({
      id: user._id,
      email: user.email,
      isAdmin: !!user.isAdmin,
    });
    res.setHeader('Set-Cookie', setAuthCookie(token));

    return res.status(200).json({
      user: { id: user._id, email: user.email, isAdmin: !!user.isAdmin },
    });
  } catch (error) {
    console.error('Signin error:', error);
    return res.status(500).json({ error: 'Failed to sign in.' });
  }
}