// Check whether the controlled reset's password update actually persisted,
// and what the current passwordHash is (prefix only).
import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db(process.env.MONGODB_DB || 'sunsip');

const u = await db.collection('users').findOne({ email: 'pocpat@gmail.com' });
console.log('hash prefix:', String(u.passwordHash).slice(0, 10));
console.log('hash updated at? fields:', Object.keys(u));

// Compare with a fresh hash of 'brandnew-test-9'
const bcrypt = (await import('bcryptjs')).default ?? (await import('bcryptjs'));
const matches = await bcrypt.compare('brandnew-test-9', u.passwordHash);
console.log('password "brandnew-test-9" matches stored hash:', matches);
const matchesOld = await bcrypt.compare('sunsip-test-1', u.passwordHash);
console.log('password "sunsip-test-1" matches:', matches);

// And re-verify the reset doc was used
const r = await db.collection('password_resets').findOne({ userId: u._id }, { sort: { createdAt: -1 } });
console.log('latest reset doc usedAt:', r?.usedAt?.toISOString?.());

await client.close();