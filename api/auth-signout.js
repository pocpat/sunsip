import { clearAuthCookie } from './lib/auth.js';
import { compatHandler } from './lib/compat.js';

// POST -> clears auth cookie
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    res.setHeader('Set-Cookie', clearAuthCookie());
    return res.status(200).json({ message: 'Signed out successfully.' });
  } catch (error) {
    console.error('Signout error:', error);
    return res.status(500).json({ error: 'Failed to sign out.' });
  }
}

export default compatHandler(handler);