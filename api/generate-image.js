// generate-image — SunSip's serverless image-generation function (Netlify).
//
// Same setup as the Dipsy app's generation backend, adapted to this repo's
// v1-style functions + compat shim (see api/lib/compat.js):
//
//   1. ImageRouter (primary): free models are discovered from ImageRouter's
//      PUBLIC model catalog (GET /v1/models — no auth, no quota burned), using
//      the same usability rules as Dipsy's model-check agent. Candidates are
//      tried ONE request each — retrying on 429 only stalls the app because
//      the 3/day free pool resets at UTC midnight.
//   2. Cloudflare Workers AI (backup): @cf/black-forest-labs/flux-1-schnell
//      with { prompt, steps: 4 } ONLY — sending width/height yields a 400
//      (Dipsy lesson). Returns base64 → data URL.
//   3. Pollinations (backup, keyless): model=turbo pinned (default/flux models
//      render abstract garbage). Returns raw bytes → data URL.
//
// The FE keeps its Pexels fallback chain (city-specific, then generic), so a
// 502 here degrades exactly like the old "all models failed" path.

import axios from 'axios';
import { compatHandler } from './lib/compat.js';

const IR_BASE = 'https://api.imagerouter.io';
const IR_GENERATE_URL = `${IR_BASE}/v1/openai/images/generations`;

// Mirrors Dipsy's modelCheckAgent.ts CANDIDATE_MODELS (validated free models).
const CANDIDATE_MODELS = [
  'stabilityai/sdxl-turbo:free',
  'black-forest-labs/FLUX-1-schnell:free',
  'HiDream-ai/HiDream-I1-Fast:free',
  'Tongyi-MAI/Z-Image-Turbo:free',
];

// Used when the catalog itself is unreachable — better than nothing.
const STATIC_FALLBACK_MODELS = [
  'stabilityai/sdxl-turbo:free',
  'black-forest-labs/FLUX-1-schnell:free',
];

const MAX_PRIMARY_ATTEMPTS = 2; // distinct models tried, one request each
const CATALOG_CACHE_MS = 6 * 60 * 60 * 1000; // 6h, per warm instance
const REQUEST_DEADLINE_MS = 25000; // stays under gateway limits
const PROVIDER_TIMEOUT_MS = 20000;

// ---------------------------------------------------------------------------
// Dipsy model-check rules
// ---------------------------------------------------------------------------

/** Dipsy's usability filter (modelCheckAgent.ts), verbatim in intent:
 *  listed :free model, image output, text params supported, every provider
 *  that serves it prices the request at 0. */
export function isUsableTextToImageFreeModel(name, entry) {
  if (!name.endsWith(':free')) return false;
  const output = entry?.output;
  const params = entry?.supported_params;
  if (!Array.isArray(output) || !output.includes('image')) return false;
  if (!params?.text) return false;
  const providers = Array.isArray(entry?.providers) ? entry.providers : [];
  if (providers.length === 0) return false;
  return providers.every((p) => p?.pricing?.type === 'fixed' && p?.pricing?.value === 0);
}

// ---------------------------------------------------------------------------
// Caches (module-level, per warm serverless instance)
// ---------------------------------------------------------------------------

const catalogCache = { at: 0, catalog: null };
// ImageRouter's free pool is 3/day SHARED across all :free models. Once a 429
// is seen, stop spending requests on ImageRouter until the instance recycles
// (quota only resets at UTC midnight — in-memory flag, best effort).
let irQuotaExhausted = false;

export function __resetCaches() {
  catalogCache.at = 0;
  catalogCache.catalog = null;
  irQuotaExhausted = false;
}

function deadlineRemaining(startedAt) {
  return Math.max(1000, REQUEST_DEADLINE_MS - (Date.now() - startedAt));
}

async function getCatalog(startedAt) {
  if (catalogCache.catalog && Date.now() - catalogCache.at < CATALOG_CACHE_MS) {
    return catalogCache.catalog;
  }
  try {
    // Public catalog: no Authorization header, no quota consumed.
    const response = await axios.get(`${IR_BASE}/v1/models`, {
      timeout: Math.min(15000, deadlineRemaining(startedAt)),
    });
    const catalog = response.data;
    if (catalog && typeof catalog === 'object') {
      catalogCache.catalog = catalog;
      catalogCache.at = Date.now();
    }
    return catalogCache.catalog;
  } catch {
    return catalogCache.catalog; // stale cache beats nothing
  }
}

async function healthyModels(startedAt, max = MAX_PRIMARY_ATTEMPTS) {
  const catalog = await getCatalog(startedAt);
  if (catalog) {
    const fresh = CANDIDATE_MODELS.filter(
      (name) => name in catalog && isUsableTextToImageFreeModel(name, catalog[name])
    );
    if (fresh.length > 0) return fresh.slice(0, max);
  }
  return STATIC_FALLBACK_MODELS.slice(0, max); // catalog unavailable → static list
}

// ---------------------------------------------------------------------------
// Provider 1: ImageRouter (primary)
// ---------------------------------------------------------------------------

async function generateImageRouter(prompt, startedAt) {
  const apiKey = process.env.IMAGEROUTER_API_KEY;
  if (!apiKey || irQuotaExhausted) return null;

  const models = await healthyModels(startedAt);
  for (const model of models) {
    const remaining = deadlineRemaining(startedAt);
    if (remaining <= 1500) break;
    try {
      const response = await axios.post(
        IR_GENERATE_URL,
        { model, prompt, n: 1, size: '1024x1024' },
        {
          timeout: Math.min(PROVIDER_TIMEOUT_MS, remaining),
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );
      const url = response.data?.data?.[0]?.url;
      if (url) return { url, provider: `imagerouter:${model}` };
      // malformed success body — try next model
    } catch (err) {
      const status = err?.response?.status;
      if (status === 429) {
        // Daily free pool empty → further ImageRouter attempts are wasted time.
        irQuotaExhausted = true;
        break;
      }
      // 4xx/5xx (dead/renamed model, transient error) → next candidate, once.
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Provider 2: Cloudflare Workers AI (backup)
// ---------------------------------------------------------------------------

async function generateCloudflare(prompt, startedAt) {
  const apiKey = process.env.CLOUDFLARE_API_KEY;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!apiKey || !accountId) return null;

  const remaining = deadlineRemaining(startedAt);
  if (remaining <= 1500) return null;
  try {
    const response = await axios.post(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
      // { prompt, steps } ONLY — width/height produce a 400 (Dipsy lesson).
      { prompt, steps: 4 },
      {
        timeout: Math.min(PROVIDER_TIMEOUT_MS, remaining),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );
    const base64 = response.data?.result?.image ?? response.data?.result?.images?.[0];
    if (typeof base64 === 'string' && base64.length > 100) {
      return { url: `data:image/jpeg;base64,${base64}`, provider: 'cloudflare' };
    }
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Provider 3: Pollinations (backup, keyless)
// ---------------------------------------------------------------------------

async function generatePollinations(prompt, startedAt) {
  const remaining = deadlineRemaining(startedAt);
  if (remaining <= 1500) return null;
  try {
    const seed = Math.floor(Math.random() * 1000000);
    const response = await axios.get(
      `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=turbo&nologo=true&seed=${seed}`,
      {
        timeout: Math.min(PROVIDER_TIMEOUT_MS, remaining),
        responseType: 'arraybuffer',
      }
    );
    const buffer = Buffer.from(response.data);
    if (buffer.length < 1000) return null; // error stub, not an image
    const contentType = response.headers?.['content-type'] ?? 'image/jpeg';
    return {
      url: `data:${contentType};base64,${buffer.toString('base64')}`,
      provider: 'pollinations',
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Handler (v1-style, wrapped for the Netlify Functions v2 runtime)
// ---------------------------------------------------------------------------

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const prompt = String(req.body?.prompt ?? '').trim().slice(0, 900);
  if (!prompt) {
    return res.status(400).json({ error: 'prompt is required' });
  }

  const startedAt = Date.now();
  const result =
    (await generateImageRouter(prompt, startedAt)) ??
    (await generateCloudflare(prompt, startedAt)) ??
    (await generatePollinations(prompt, startedAt));

  if (!result) {
    console.error('generate-image: all providers failed');
    return res.status(502).json({ imageUrl: null, provider: null, error: 'all providers failed' });
  }

  console.log(`generate-image: served by ${result.provider}`);
  return res.status(200).json({ imageUrl: result.url, provider: result.provider });
}

export default compatHandler(handler);