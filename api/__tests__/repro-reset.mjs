// Reproduce the production auth-reset call EXACTLY (bundled like Netlify,
// real Mongo, the same controlled token) to surface the real error message.
import { build } from 'esbuild';
import { pathToFileURL } from 'url';
import { rmSync } from 'fs';

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

const req = new Request('http://localhost/.netlify/functions/auth-reset', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    origin: 'https://sunsip.netlify.app',
  },
  body: JSON.stringify({
    token: process.env.TEST_TOKEN,
    password: 'brandnew-test-9',
  }),
});

console.log('module keys:', Object.keys(mod));
console.log('typeof default:', typeof mod.default, '| keys of default:', Object.keys(mod.default ?? {}));
const handler = typeof mod.default === 'function' ? mod.default : mod.default.default;
const res = await handler(req);
console.log('status:', res.status);
console.log('body:', await res.text());
rmSync('api/__tests__/.auth-reset-bundle.cjs', { force: true });