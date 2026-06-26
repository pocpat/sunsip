import { getDb } from './lib/mongo.js';
import { getAuthUserFromHeaders } from './lib/auth.js';
import { compatHandler } from './lib/compat.js';

// DELETE -> delete combination by id (query param ?id=)
// PATCH  -> update rating/notes for combination by id (query param ?id=)
async function handler(req, res) {
  const headers = req.headers || {};
  const authUser = getAuthUserFromHeaders(headers);

  if (!authUser) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }

  try {
    const db = await getDb();
    const collection = db.collection('saved_combinations');

    // Parse id from query string
    const query = req.query || {};
    const id = query.id || (req.url ? new URL(req.url, 'http://localhost').searchParams.get('id') : null);

    if (!id) {
      return res.status(400).json({ error: 'Combination id is required.' });
    }

    if (req.method === 'DELETE') {
      const result = await collection.deleteOne({ _id: id, userId: authUser.id });

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Combination not found.' });
      }

      return res.status(200).json({ message: 'Combination deleted.' });
    }

    if (req.method === 'PATCH') {
      const body = req.body || {};
      const update = { updatedAt: new Date() };

      if (typeof body.rating === 'number') update.rating = body.rating;
      if (typeof body.notes === 'string') update.notes = body.notes;

      const result = await collection.findOneAndUpdate(
        { _id: id, userId: authUser.id },
        { $set: update },
        { returnDocument: 'after' }
      );

      if (!result || !result.value) {
        return res.status(404).json({ error: 'Combination not found.' });
      }

      return res.status(200).json({ combination: result.value });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    console.error('Combination error:', error);
    return res.status(500).json({ error: 'Failed to handle combination request.' });
  }
}

export default compatHandler(handler);