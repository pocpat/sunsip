
import axios from 'axios';
import { compatHandler } from './lib/compat.js';

// 1. THE CACHE
const cache = new Map();

const OPENROUTER_API_KEY = process.env.VITE_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
// Verified against OpenRouter's live catalog 2026-09-17 (kimi-dev-72b:free was
// retired; this one answered a landmark probe with a clean short answer).
const OPENROUTER_TEXT_MODEL = process.env.VITE_OPENROUTER_TEXT_MODEL
       || "inclusionai/ling-3.0-flash-sante:free";
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

// This is the function Vercel/Netlify will run
async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { city, country } = req.body;

  if (!city || !country) {
    return res.status(400).json({ error: 'City and country are required.' });
  }

  const cacheKey = `${city.toLowerCase()}-${country.toLowerCase()}`;

  // 2. CHECK THE CACHE FIRST
  if (cache.has(cacheKey)) {
    console.log(`Serving "${cacheKey}" from CACHE`);
    const cachedLandmark = cache.get(cacheKey);
    return res.status(200).json({ landmark: cachedLandmark });
  }

  // 3. IF NOT IN CACHE, CALL THE API
  // This part will run very infrequently thanks to the cache!
  console.log(`Cache miss for "${cacheKey}". Calling OpenRouter API.`);

  // If no key is configured, stop here.
  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'test-openrouter-key') {
      return res.status(200).json({ landmark: null });
  }

  const prompt = `Your task is to create a short, visual phrase for an image generation prompt about the city: "${city}, ${country}". Name ONE famous, visually distinctive landmark or iconic feature of that city. Answer with the landmark phrase ONLY, at most 5 words, no punctuation, no explanation.`;

  try {
    const response = await axios.post(
      OPENROUTER_BASE_URL,
      {
        model: OPENROUTER_TEXT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.3,
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 20000 // 20-second timeout
      }
    );

    const rawContent = response.data?.choices?.[0]?.message?.content;
    // Null-safe: some models return null content (or reasoning only) — never
    // crash on that, just degrade to no landmark.
    let landmark = null;
    if (typeof rawContent === 'string' && rawContent.trim()) {
      landmark = rawContent
        .replace(/<think>[\s\S]*?<\/think>/g, '') // strip reasoning blocks if present
        .trim()
        .split('\n')[0]
        .slice(0, 60) || null;
    }

    // 4. STORE THE RESULT IN THE CACHE before sending it back
    if (landmark) {
        cache.set(cacheKey, landmark);
    }

    return res.status(200).json({ landmark });

  } catch (error) {
    // If the API call fails (e.g., even with caching you hit a rate limit),
    // we just return null gracefully. The app won't crash.
    console.error(`Error calling OpenRouter for "${cacheKey}":`, error.response?.data || error.message);
    return res.status(500).json({ landmark: null, error: "Failed to contact the AI service." });
  }
}

export default compatHandler(handler);