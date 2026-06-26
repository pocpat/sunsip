import { getDb } from './lib/mongo.js';
import {
  signToken,
  hashPassword,
  setAuthCookie,
} from './lib/auth.js';
import { randomUUID } from 'crypto';

// POST {email, password} -> creates user in MongoDB users collection, returns JWT in cookie
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

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const db = await getDb();
    const users = db.collection('users');

    // Check for existing user
    const existing = await users.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }

    const passwordHash = await hashPassword(password);
    const now = new Date();
    const userId = randomUUID();

    await users.insertOne({
      _id: userId,
      email: normalizedEmail,
      passwordHash,
      isAdmin: false,
      createdAt: now,
    });

    // Create default preferences document
    await db.collection('user_preferences').insertOne({
      _id: randomUUID(),
      userId,
      preferredSpirits: [],
      dietaryRestrictions: [],
      favoriteWeatherMoods: {},
      dailyRequestCount: 0,
      lastRequestDate: null,
      createdAt: now,
      updatedAt: now,
    });

    const token = signToken({ id: userId, email: normalizedEmail, isAdmin: false });
    res.setHeader('Set-Cookie', setAuthCookie(token));

    return res.status(201).json({
      user: { id: userId, email: normalizedEmail, isAdmin: false },
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Failed to create user.' });
  }
}