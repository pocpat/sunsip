// The bug: check-pw shows NEITHER password matches the stored hash, yet the
// reset doc was marked used. Reproduce the exact production behavior locally:
// bundled auth-reset with the real token (unused, fresh) -> does updateOne work?
import { build } from 'esbuild';
import { pathToFileURL } from 'url';
import { rmSync } from 'fs';
import { createHash } from 'crypto';
import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db(process.env.MONGODB_DB || 'sunsip');
const users = db.collection('users');

// Inspect ALL hashes for this email — maybe two docs exist (one from the
// earlier "Failed to create user" signup attempt timeline).
const docs = await users.find({ email: 'pocpat@gmail.com' }).toArray();
console.log('docs with this email:', docs.length);
for (const d of docs) {
  const bcrypt = (await import('bcryptjs'));
  const b = bcrypt.default ?? bcrypt;
  const m1 = await b.compare('brandnew-test-9', d.passwordHash);
  const m2 = await b.compare('sunsip-test-1', d.passwordHash);
  console.log('_id:', d._id, '| brandnew:', m1, '| sunsip-test-1:', m2);
}
await client.close();