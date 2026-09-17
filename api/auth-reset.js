import { getDb } from './lib/mongo.js';
import {
  hashPassword,
  setAuthCookie,
  signToken,
} from './lib/auth.js';
import { createHash } from 'crypto';
import { compatHandler } from './lib/compat.js';

// POST {token, password} -> validates a password-reset token (single use,
// 1h expiry) and sets the new password. Signs the user in on success.

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { token, password } = req.body || {};

    if (!token || !password) {
      return res.status(400).json({ error: 'Reset link and new password are required.' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const db = await getDb();
    const resets = db.collection('password_resets');

    const doc = await resets.findOne({ _id: sha256(String(token)) });

    if (!doc || doc.usedAt || new Date(doc.expiresAt).getTime() < Date.now()) {
      return res.status(400).json({
        error: 'This reset link is invalid, already used, or expired. Please request a new one.',
      });
    }

    const passwordHash = await hashPassword(String(password));

    const result = await db.collection('users').updateOne(
      { _id: doc.userId },
      { $set: { passwordHash } }
    );

    if (result.matchedCount === 0) {
      return res.status(400).json({ error: 'Account not found. Please sign up instead.' });
    }

    // Burn the token: single use.
    await resets.updateOne({ _id: doc._id }, { $set: { usedAt: new Date() } });

    // Sign the user in with the new password.
    const user = await db.collection('users').findOne({ _id: doc.userId });
    const jwt = signToken({
      id: doc.userId,
      email: user?.email ?? '',
      isAdmin: !!user?.isAdmin,
    });
    res.setHeader('Set-Cookie', setAuthCookie(jwt));

    return res.status(200).json({
      user: { id: doc.userId, email: user?.email ?? '', isAdmin: !!user?.isAdmin },
    });
  } catch (error) {
    console.error('Reset-password error:', error);
    return res.status(500).json({ error: 'Failed to reset password.' });
  }
}

export default compatHandler(handler);