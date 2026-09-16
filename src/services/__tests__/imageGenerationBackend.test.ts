//
// Tests for the Dipsy-style backend image-generation flow in
// src/services/imageGenerationService.ts
//
// The FE service now POSTs the prompt to /api/generate-image (a Netlify
// function holding the ImageRouter key + provider chain) and falls back to
// Pexels (city-specific via API, then generic stock) when the backend can't
// serve an image.
//

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { generateCityImage } from '../imageGenerationService';
import { useAppStore } from '../../store/appStore';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

const BACKEND_IMAGE_URL = 'https://cdn.example.com/generated-city.png';

/** Route mocked axios calls by endpoint. Landmark + Pexels calls fail (no
 *  backend/API in unit tests); generate-image returns the configured result. */
function routeCalls(opts: { generateImage?: { data: unknown } } = {}) {
  mockedAxios.post.mockImplementation(async (url: string) => {
    if (String(url).includes('generate-landmark')) {
      throw new Error('no landmark backend in unit tests');
    }
    if (String(url).includes('generate-image')) {
      if (!opts.generateImage) throw new Error('generation unavailable');
      return opts.generateImage as unknown as { data: unknown };
    }
    throw new Error(`unexpected POST in test: ${url}`);
  });
  mockedAxios.get.mockImplementation(async (url: string) => {
    if (String(url).includes('api.pexels.com')) {
      throw new Error('no pexels API in unit tests');
    }
    throw new Error(`unexpected GET in test: ${url}`);
  });
}

describe('generateCityImage (backend flow)', () => {
  beforeEach(() => {
    useAppStore.setState({ isPortfolioMode: false });
  });

  afterEach(() => {
    // Vitest config defines VITE_PORTFOLIO_MODE_ENABLED='true'; restore it so
    // other suites keep their portfolio-mode default.
    useAppStore.setState({ isPortfolioMode: true });
    mockedAxios.post.mockReset();
    mockedAxios.get.mockReset();
  });

  it('returns the backend imageUrl when generation succeeds', async () => {
    routeCalls({
      generateImage: {
        data: { imageUrl: BACKEND_IMAGE_URL, provider: 'imagerouter:stabilityai/sdxl-turbo:free' },
      },
    });

    const result = await generateCityImage('Testville', 'Testland', 'Sunny', true);

    expect(result).toBe(BACKEND_IMAGE_URL);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      '/api/generate-image',
      expect.objectContaining({ prompt: expect.stringContaining('Testville, Testland') }),
      expect.objectContaining({ timeout: expect.any(Number) })
    );
  });

  it('falls back to Pexels when the backend call fails', async () => {
    routeCalls(); // generate-image throws

    const result = await generateCityImage('Testville', 'Testland', 'Rain', true);

    expect(result).toMatch(/^https:\/\/images\.pexels\.com\//);
  });

  it('falls back to Pexels when the backend returns no imageUrl', async () => {
    routeCalls({ generateImage: { data: { imageUrl: null, provider: null } } });

    const result = await generateCityImage('Testville', 'Testland', 'Cloudy', false);

    expect(result).toMatch(/^https:\/\/images\.pexels\.com\//);
  });

  it('uses Pexels directly in portfolio mode without calling the backend', async () => {
    useAppStore.setState({ isPortfolioMode: true });
    routeCalls({
      generateImage: { data: { imageUrl: BACKEND_IMAGE_URL, provider: 'cloudflare' } },
    });

    const result = await generateCityImage('Testville', 'Testland', 'Sunny', true);

    expect(result).toMatch(/^https:\/\/images\.pexels\.com\//);
    const generateCalls = mockedAxios.post.mock.calls.filter(
      (call) => String(call[0]).includes('generate-image')
    );
    expect(generateCalls.length).toBe(0);
  });
});