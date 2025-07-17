
import axios from 'axios';

// 1. THE CACHE: A simple in-memory map. It's free!
const cache = new Map();

const OPENROUTER_API_KEY = process.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_TEXT_MODEL = "moonshotai/kimi-dev-72b:free"; // Keep the :free model
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

// This is the function Vercel/Netlify will run
export default async function handler(req, res) {
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

  const prompt = `Your task is to create a short, visual phrase for an image generation prompt about the city: "${city}, ${country}". ... (rest of your prompt)`;

  try {
    const response = await axios.post(
      OPENROUTER_BASE_URL,
      {
        model: OPENROUTER_TEXT_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 20,
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

    const landmark = response.data?.choices?.[0]?.message?.content.trim() || null;

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