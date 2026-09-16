// Local end-to-end check for api/generate-image.js
// Real keys are injected by the caller via process.env — never printed.
// Run: node api/__tests__/e2e-check.mjs ["optional prompt"]

import handler from '../generate-image.js';

const prompt =
  process.argv[2] ??
  'A beautiful, high-quality photograph of Paris, France featuring the Eiffel Tower during daytime with clear weather. Professional photography, vibrant colors, detailed architecture, atmospheric lighting, travel photography style, 4K quality, cinematic composition, no text or watermarks.';

const req = new Request('http://localhost/.netlify/functions/generate-image', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ prompt }),
});

const started = Date.now();
const res = await handler(req);
const body = await res.json();
const elapsed = ((Date.now() - started) / 1000).toFixed(1);

const url = String(body.imageUrl ?? '');
const summary = {
  status: res.status,
  provider: body.provider ?? null,
  seconds: elapsed,
  urlKind: url.startsWith('data:image/')
    ? `data-url ${(url.length / 1024).toFixed(0)}KB`
    : url.startsWith('https://')
      ? 'https-url'
      : url === '' || url === 'null'
        ? 'none'
        : 'other',
  error: body.error ?? null,
};

console.log(JSON.stringify(summary, null, 2));

if (url.startsWith('data:image/')) {
  const fs = await import('fs');
  const b64 = url.split(',')[1];
  const out = process.env.SUNSIP_IMG_OUT ?? 'C:/Users/Elena/AppData/Local/Temp/sunsip-e2e-image.jpg';
  fs.writeFileSync(out, Buffer.from(b64, 'base64'));
  console.log('saved-image:', out);
} else if (url.startsWith('https://')) {
  console.log('image-url:', url.slice(0, 120) + (url.length > 120 ? '…' : ''));
}