// Inspect SunSip user doc SHAPES (no password hashes printed) + insert a
// controlled reset token for the live-endpoint test.
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
await client.connect();
const db = client.db(process.env.MONGODB_DB || 'sunsip');
const users = db.collection('users');

const her = await users.findOne({ email: 'pocpat@gmail.com' });
if (her) {
  console.log('her user _id type:', her._id?.constructor?.name ?? typeof her._id, '| value shape ok:', !!her._id);
  console.log('doc fields:', Object.keys(her));
  console.log('passwordHash prefix:', String(her.passwordHash).slice(0, 7));
} else {
  console.log('no user for pocpat@gmail.com');
}

const all = await users.find({}, { projection: { email: 1 } }).limit(10).toArray();
console.log('total users listed:', all.length, all.map(u => u.email.slice(0, 3) + '***').join(','));

// Insert a controlled token for the production endpoint test
const { createHash } = await import('crypto');
const token = createHash('sha256').update('ctrl-' + Date.now()).digest('hex');
const herDoc = her ?? (await users.findOne({ email: /reset-check/ }));
await db.collection('password_resets').insertOne({
  _id: createHash('sha256').update(token).digest('hex'),
  userId: herDoc_id(her),
  expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  usedAt: null,
  createdAt: new Date(),
});
console.log('INSERTED_TOKEN=' + token);

function herDoc_id() {
  return her._id;
}
await client.close();