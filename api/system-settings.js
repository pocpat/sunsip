import { getDb } from './lib/mongo.js';
import { getAuthUserFromHeaders } from './lib/auth.js';
import { compatHandler } from './lib/compat.js';

// GET -> returns global request settings (e.g. {global_enabled: true})
async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const db = await getDb();
    const collection = db.collection('system_settings');

    const docs = await collection.find({}).toArray();

    // Build a settings object keyed by `key`
    const settings = {};
    for (const doc of docs) {
      settings[doc.key] = doc.value;
    }

    // Provide sensible defaults if nothing is configured yet
    const headers = req.headers || {};
    const authUser = getAuthUserFromHeaders(headers);

    const response = {
      global_enabled: settings.global_enabled !== undefined ? settings.global_enabled : true,
      dailyRequestLimit: settings.dailyRequestLimit !== undefined ? settings.dailyRequestLimit : 10,
      isAdmin: !!(authUser && authUser.isAdmin),
    };

    return res.status(200).json({ settings: response });
  } catch (error) {
    console.error('System-settings error:', error);
    return res.status(500).json({ error: 'Failed to fetch system settings.' });
  }
}

export default compatHandler(handler);