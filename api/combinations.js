import { getDb } from './lib/mongo.js';
import { getAuthUserFromHeaders } from './lib/auth.js';
import { randomUUID } from 'crypto';

// GET  -> list user's saved combinations
// POST -> save a new combination
export default async function handler(req, res) {
  const headers = req.headers || {};
  const authUser = getAuthUserFromHeaders(headers);

  if (!authUser) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }

  try {
    const db = await getDb();
    const collection = db.collection('saved_combinations');

    if (req.method === 'GET') {
      const combinations = await collection
        .find({ userId: authUser.id })
        .sort({ createdAt: -1 })
        .toArray();

      return res.status(200).json({ combinations });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const now = new Date();

      const doc = {
        _id: randomUUID(),
        userId: authUser.id,
        cityName: body.cityName || null,
        countryName: body.countryName || null,
        cityImageUrl: body.cityImageUrl || null,
        weatherDetails: body.weatherDetails || null,
        cocktailName: body.cocktailName || null,
        cocktailImageUrl: body.cocktailImageUrl || null,
        cocktailIngredients: Array.isArray(body.cocktailIngredients) ? body.cocktailIngredients : [],
        cocktailRecipe: Array.isArray(body.cocktailRecipe) ? body.cocktailRecipe : [],
        rating: typeof body.rating === 'number' ? body.rating : null,
        notes: body.notes || '',
        timesAccessed: 0,
        lastAccessedAt: null,
        createdAt: now,
      };

      const result = await collection.insertOne(doc);

      return res.status(201).json({
        combination: { ...doc, _id: result.insertedId },
      });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    console.error('Combinations error:', error);
    return res.status(500).json({ error: 'Failed to handle combinations request.' });
  }
}