//
// Unit tests for the api/generate-image.js serverless function
// (Dipsy-style image generation for SunSip).
//
// These tests mock axios — no real provider requests are made, so no
// ImageRouter free-quota is consumed by the test suite.
//

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import handler, {
  isUsableTextToImageFreeModel,
  __resetCaches,
} from '../generate-image.js';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** A catalog entry that passes every Dipsy model-check rule. */
const VALID_ENTRY = {
  output: ['image'],
  supported_params: { text: true },
  providers: [{ pricing: { type: 'fixed', value: 0 } }],
};

const CATALOG = {
  'stabilityai/sdxl-turbo:free': VALID_ENTRY,
  'black-forest-labs/FLUX-1-schnell:free': VALID_ENTRY,
  'HiDream-ai/HiDream-I1-Fast:free': VALID_ENTRY,
  'Tongyi-MAI/Z-Image-Turbo:free': VALID_ENTRY,
};

const makeRequest = (body?: unknown, method = 'POST') =>
  new Request('http://localhost/.netlify/functions/generate-image', {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const mockCatalog = () => {
  mockedAxios.get.mockImplementation(async (url: string) => {
    if (String(url).includes('api.imagerouter.io/v1/models')) {
      return { data: { ...CATALOG } } as never;
    }
    throw new Error(`Unexpected GET in test: ${url}`);
  });
};

/** Route mocked axios.post by endpoint. handlers map: url-fragment → responder */
function routePosts(handlers: Record<string, (config?: { data?: unknown }) => unknown>) {
  mockedAxios.post.mockImplementation(async (url: string, data?: unknown) => {
    for (const [fragment, respond] of Object.entries(handlers)) {
      if (String(url).includes(fragment)) return respond({ data }) as never;
    }
    throw new Error(`Unexpected POST in test: ${url}`);
  });
}

const generationCalls = () =>
  mockedAxios.post.mock.calls.filter((call) =>
    String(call[0]).includes('/openai/images/generations')
  );

// ---------------------------------------------------------------------------
// Model-filter rules (mirrors Dipsy's modelCheckAgent.ts)
// ---------------------------------------------------------------------------

describe('isUsableTextToImageFreeModel', () => {
  it('accepts a usable free text-to-image model', () => {
    expect(isUsableTextToImageFreeModel('a/model:free', VALID_ENTRY)).toBe(true);
  });

  it('rejects models without the :free suffix', () => {
    const paid = { ...VALID_ENTRY, providers: [{ pricing: { type: 'fixed', value: 0.02 } }] };
    expect(isUsableTextToImageFreeModel('a/model', paid)).toBe(false);
    expect(isUsableTextToImageFreeModel('a/model', VALID_ENTRY)).toBe(false);
  });

  it('rejects models that do not output images', () => {
    const entry = { ...VALID_ENTRY, output: ['text'] };
    expect(isUsableTextToImageFreeModel('a/model:free', entry)).toBe(false);
  });

  it('rejects models without text parameter support', () => {
    const entry = { ...VALID_ENTRY, supported_params: {} };
    expect(isUsableTextToImageFreeModel('a/model:free', entry)).toBe(false);
  });

  it('rejects models where any provider charges for the request', () => {
    const entry = {
      ...VALID_ENTRY,
      providers: [
        { pricing: { type: 'fixed', value: 0 } },
        { pricing: { type: 'fixed', value: 0.01 } },
      ],
    };
    expect(isUsableTextToImageFreeModel('a/model:free', entry)).toBe(false);
  });

  it('rejects entries with no providers at all', () => {
    const entry = { ...VALID_ENTRY, providers: [] };
    expect(isUsableTextToImageFreeModel('a/model:free', entry)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Handler behavior
// ---------------------------------------------------------------------------

describe('generate-image handler', () => {
  beforeEach(() => {
    __resetCaches();
    mockedAxios.get.mockReset();
    mockedAxios.post.mockReset();
    vi.stubEnv('IMAGEROUTER_API_KEY', 'test-ir-key');
    vi.stubEnv('CLOUDFLARE_API_KEY', 'test-cf-key');
    vi.stubEnv('CLOUDFLARE_ACCOUNT_ID', 'test-account');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns 405 for non-POST requests', async () => {
    const res = await handler(makeRequest(undefined, 'GET'));
    expect(res.status).toBe(405);
  });

  it('returns 400 when the prompt is missing or blank', async () => {
    const resEmpty = await handler(makeRequest({}));
    expect(resEmpty.status).toBe(400);
    const resBlank = await handler(makeRequest({ prompt: '   ' }));
    expect(resBlank.status).toBe(400);
  });

  it('serves an ImageRouter image on the happy path', async () => {
    mockCatalog();
    routePosts({
      '/openai/images/generations': () => ({ data: { data: [{ url: 'https://img.example/paris.png' }] } }),
    });

    const res = await handler(makeRequest({ prompt: 'photo of Paris, happy path' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.imageUrl).toBe('https://img.example/paris.png');
    expect(String(body.provider)).toMatch(/^imagerouter/);
    // Exactly one generation request — no 5x retry storms on the free pool.
    expect(generationCalls().length).toBe(1);
  });

  it('tries the next candidate model once when the first returns 400 (dead model)', async () => {
    mockCatalog();
    routePosts({
      '/openai/images/generations': (config) => {
        const body = (config?.data ?? {}) as { model?: string };
        if (body.model === 'stabilityai/sdxl-turbo:free') {
          const err = new Error('unknown model') as Error & { response?: { status: number } };
          err.response = { status: 400 };
          throw err;
        }
        return { data: { data: [{ url: 'https://img.example/paris-2.png' }] } };
      },
    });

    const res = await handler(makeRequest({ prompt: 'photo of Paris, second model' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.imageUrl).toBe('https://img.example/paris-2.png');
    // 400 is a dead-model error, so the second candidate was tried — once.
    expect(generationCalls().length).toBe(2);
  });

  it('falls back to Cloudflare when ImageRouter quota is exhausted (429)', async () => {
    mockCatalog();
    routePosts({
      '/openai/images/generations': () => {
        const err = new Error('rate limited') as Error & { response?: { status: number } };
        err.response = { status: 429 };
        throw err;
      },
      'api.cloudflare.com': () => ({ data: { result: { image: 'A'.repeat(300) } } }),
    });

    const res = await handler(makeRequest({ prompt: 'photo of Paris, quota gone' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.provider).toBe('cloudflare');
    expect(String(body.imageUrl).startsWith('data:image/')).toBe(true);
    // 429 = daily pool empty → do NOT retry ImageRouter; go straight to the chain.
    expect(generationCalls().length).toBe(1);
  });

  it('falls back to Pollinations when every keyed provider fails', async () => {
    mockCatalog();
    routePosts({
      '/openai/images/generations': () => {
        const err = new Error('rate limited') as Error & { response?: { status: number } };
        err.response = { status: 429 };
        throw err;
      },
      'api.cloudflare.com': () => {
        throw new Error('cloudflare down');
      },
    });
    mockedAxios.get.mockImplementation(async (url: string) => {
      if (String(url).includes('api.imagerouter.io/v1/models')) {
        return { data: { ...CATALOG } } as never;
      }
      if (String(url).includes('pollinations')) {
        return {
          data: Buffer.from('x'.repeat(5000)),
          headers: { 'content-type': 'image/jpeg' },
        } as never;
      }
      throw new Error(`Unexpected GET in test: ${url}`);
    });

    const res = await handler(makeRequest({ prompt: 'photo of Paris, pollinations path' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.provider).toBe('pollinations');
    expect(String(body.imageUrl).startsWith('data:image/')).toBe(true);
 expect(generationCalls().length).toBe(1);
  });

  it('drops candidates the catalog does not list, but still tries the primary path', async () => {
    mockedAxios.get.mockResolvedValue({ data: {} } as never); // empty catalog
    routePosts({
      '/openai/images/generations': () => ({ data: { data: [{ url: 'https://img.example/fallback-model.png' }] } }),
    });

    const res = await handler(makeRequest({ prompt: 'photo of Paris, empty catalog' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.imageUrl).toBe('https://img.example/fallback-model.png');
    expect(generationCalls().length).toBe(1);
  });

  it('returns 502 with imageUrl null when every provider fails', async () => {
    mockCatalog();
    routePosts({
      '/openai/images/generations': () => {
        const err = new Error('rate limited') as Error & { response?: { status: number } };
        err.response = { status: 429 };
        throw err;
      },
      'api.cloudflare.com': () => {
        throw new Error('cloudflare down');
      },
    });
    mockedAxios.get.mockImplementation(async (url: string) => {
      if (String(url).includes('api.imagerouter.io/v1/models')) {
        return { data: { ...CATALOG } } as never;
      }
      if (String(url).includes('pollinations')) {
        throw new Error('pollinations down');
      }
      throw new Error(`Unexpected GET in test: ${url}`);
    });

    const res = await handler(makeRequest({ prompt: 'photo of Paris, total failure' }));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.imageUrl).toBeNull();
  });
});