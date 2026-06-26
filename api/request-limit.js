import { getDb } from './lib/mongo.js';
import { getAuthUserFromHeaders } from './lib/auth.js';
import { compatHandler } from './lib/compat.js';

const DAILY_LIMIT = 10;

// Helper: returns midnight UTC Date for the next reset
function getNextMidnightUTC(now = new Date()) {
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  return next;
}

// Helper: returns YYYY-MM-DD (UTC) key for the given date
function getUTCDateKey(date) {
  return date.toISOString().slice(0, 10);
}

// POST {userId} or {clientId} -> check and update daily request limit (10/day)
// Returns {canProceed, count, remaining, resetDate}
async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const db = await getDb();

    // Check system_settings for global_enabled flag
    const settingsDoc = await db.collection('system_settings').findOne({ key: 'global_enabled' });
    const globalEnabled = settingsDoc ? settingsDoc.value : true;

    const headers = req.headers || {};
    const authUser = getAuthUserFromHeaders(headers);

    const body = req.body || {};
    const userId = body.userId || (authUser ? authUser.id : null);
    const clientId = body.clientId || null;

    // Admin users get unlimited requests
    if (authUser && authUser.isAdmin) {
      return res.status(200).json({
        canProceed: true,
        count: 0,
        remaining: Infinity,
        resetDate: getNextMidnightUTC(),
        unlimited: true,
      });
    }

    // If global_enabled is false, deny all non-admin requests
    if (!globalEnabled) {
      return res.status(200).json({
        canProceed: false,
        count: 0,
        remaining: 0,
        resetDate: getNextMidnightUTC(),
        reason: 'global_disabled',
      });
    }

    const now = new Date();
    const todayKey = getUTCDateKey(now);

    // Prefer authenticated user tracking via user_preferences; fall back to anonymous limits
    if (userId) {
      const prefs = db.collection('user_preferences');
      const existing = await prefs.findOne({ userId });

      // Determine if the stored count should reset
      const lastDateKey = existing ? getUTCDateKey(new Date(existing.lastRequestDate)) : null;
      const shouldReset = !existing || !existing.lastRequestDate || lastDateKey !== todayKey;
      const currentCount = shouldReset ? 0 : existing.dailyRequestCount || 0;

      if (currentCount >= DAILY_LIMIT) {
        return res.status(200).json({
          canProceed: false,
          count: currentCount,
          remaining: 0,
          resetDate: getNextMidnightUTC(now),
        });
      }

      const newCount = currentCount + 1;
      await prefs.updateOne(
        { userId },
        {
          $set: {
            dailyRequestCount: newCount,
            lastRequestDate: now,
            updatedAt: now,
          },
        },
        { upsert: true }
      );

      return res.status(200).json({
        canProceed: true,
        count: newCount,
        remaining: DAILY_LIMIT - newCount,
        resetDate: getNextMidnightUTC(now),
      });
    }

    // Anonymous client tracking
    if (!clientId) {
      return res.status(400).json({ error: 'Either userId or clientId is required.' });
    }

    const anon = db.collection('anonymous_request_limits');
    const existing = await anon.findOne({ clientId });

    const lastDateKey = existing ? getUTCDateKey(new Date(existing.lastRequestDate)) : null;
    const shouldReset = !existing || !existing.lastRequestDate || lastDateKey !== todayKey;
    const currentCount = shouldReset ? 0 : existing.dailyRequestCount || 0;

    if (currentCount >= DAILY_LIMIT) {
      return res.status(200).json({
        canProceed: false,
        count: currentCount,
        remaining: 0,
        resetDate: getNextMidnightUTC(now),
      });
    }

    const newCount = currentCount + 1;
    await anon.updateOne(
      { clientId },
      {
        $set: {
          dailyRequestCount: newCount,
          lastRequestDate: now,
        },
      },
      { upsert: true }
    );

    return res.status(200).json({
      canProceed: true,
      count: newCount,
      remaining: DAILY_LIMIT - newCount,
      resetDate: getNextMidnightUTC(now),
    });
  } catch (error) {
    console.error('Request-limit error:', error);
    return res.status(500).json({ error: 'Failed to check request limit.' });
  }
}

export default compatHandler(handler);