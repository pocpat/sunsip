import { getDb } from './lib/mongo.js';
import { getAuthUserFromHeaders } from './lib/auth.js';
import { randomUUID } from 'crypto';
import { compatHandler } from './lib/compat.js';

// GET -> get user preferences
// PUT -> update user preferences
async function handler(req, res) {
  const headers = req.headers || {};
  const authUser = getAuthUserFromHeaders(headers);

  if (!authUser) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }

  try {
    const db = await getDb();
    const collection = db.collection('user_preferences');

    if (req.method === 'GET') {
      let prefs = await collection.findOne({ userId: authUser.id });

      if (!prefs) {
        // Create default preferences if missing
        const now = new Date();
        prefs = {
          _id: randomUUID(),
          userId: authUser.id,
          preferredSpirits: [],
          dietaryRestrictions: [],
          favoriteWeatherMoods: {},
          dailyRequestCount: 0,
          lastRequestDate: null,
          createdAt: now,
          updatedAt: now,
        };
        await collection.insertOne(prefs);
      }

      return res.status(200).json({ preferences: prefs });
    }

    if (req.method === 'PUT') {
      const body = req.body || {};
      const now = new Date();

      const update = {
        preferredSpirits: Array.isArray(body.preferredSpirits) ? body.preferredSpirits : [],
        dietaryRestrictions: Array.isArray(body.dietaryRestrictions) ? body.dietaryRestrictions : [],
        favoriteWeatherMoods:
          body.favoriteWeatherMoods && typeof body.favoriteWeatherMoods === 'object'
            ? body.favoriteWeatherMoods
            : {},
        updatedAt: now,
      };

      const result = await collection.findOneAndUpdate(
        { userId: authUser.id },
        {
          $set: update,
          $setOnInsert: {
            _id: randomUUID(),
            userId: authUser.id,
            dailyRequestCount: 0,
            lastRequestDate: null,
            createdAt: now,
          },
        },
        { upsert: true, returnDocument: 'after' }
      );

      return res.status(200).json({ preferences: result.value });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    console.error('Preferences error:', error);
    return res.status(500).json({ error: 'Failed to handle preferences request.' });
  }
}

export default compatHandler(handler);