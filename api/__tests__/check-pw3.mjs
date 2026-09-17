// THE REAL REPRODUCTION: run the PRODUCTION-bundled auth-reset against the
// LOCAL mongo using a fresh controlled token for her user, then check the
// stored hash directly. If updateOne writes a NON-bcrypt hash (e.g. "[object
// Promise]"), we'll see it immediately in the doc.
import { build } from 'esbuild';
import { pathToFileURL } from 'url';
import { rmSync } from 'fs';
import { createHash } from 'crypto';
import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db(process.env.MONGODB_DB || 'sunsip');
const users = db.collection('users');
const her = await users.findOne({ email: 'pocpat@gmail.com' });

const token = createHash('sha256').update('pw2-' + Date.now()).digest('hex');
await db.collection('password_resets').insertOne({
  _id: createHash('sha256').update(token).digest('hex'),
  userId: her._id,
  expiresAt: new Date(Date.now() + 3600_000),
  usedAt: null,
  createdAt: new Date(),
});
await client.close();

await build({
  entryPoints: ['api/auth-reset.js'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: 'api/__tests__/.auth-reset-bundle.cjs',
  external: ['mongodb', 'axios'],
  logLevel: 'silent',
});

const mod = await import(pathToFileURL('api/__tests__/.auth-reset-bundle.cjs').href);
const handler = mod.default.default;

const req = new Request('http://localhost/.netlify/functions/auth-reset', {
  method: 'POST',
  headers: { 'content-type': 'application/json', origin: 'https://sunsip.netlify.app' },
  body: JSON.stringify({ token, password: 'verify-pw-777' }),
});
const res = await handler(req);
console.log('bundled reset status:', res.status, '|', (await res.text()).slice(0, 120));

// Now inspect what got written:
const c2 = new MongoClient(process.env.MONGODB_URI);
await c2.connect();
const db2 = c2.db(process.env.MONGODB_DB || 'sunsip');
const after = await db2.collection('users').findOne({ email: 'pocpat@gmail.com' });
console.log('hash after reset:', String(after.passwordHash).slice(0, 20));
const bcrypt = await import('bcryptjs');
const b = bcrypt.default ?? bcrypt;
console.log('"verify-pw-777" matches:', await b.compare('verify-pw-777', after.passwordHash));
console.log('"verify-pw-777" (typo check) matches:', await b.compare('verify-pw-777', after.passwordHash));
console.log('raw hash looks bcrypt?', String(after.passwordHash).startsWith('$2'));
console.log('hash length:', String(after.passwordHash).length);
await c2.close();
rmSync('api/__tests__/.auth-reset-bundle.cjs', { force: true });