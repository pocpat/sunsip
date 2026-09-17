// Bundled-runner wrapper: esbuild resolves the api/*.js -> lib/*.ts imports
// the same way Netlify does, then we execute the flow check.
import { build } from 'esbuild';
import { pathToFileURL } from 'url';
import { rmSync } from 'fs';

const outfile = 'api/__tests__/.reset-check-bundle.mjs';

await build({
  entryPoints: ['api/__tests__/reset-flow-check.mjs'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: outfile.replace('.mjs', '.cjs'),
  external: ['mongodb', 'axios'],
  logLevel: 'silent',
});

await import(pathToFileURL(outfile.replace('.mjs', '.cjs')).href);
rmSync(outfile.replace('.mjs', '.cjs'), { force: true });