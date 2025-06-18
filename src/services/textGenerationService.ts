import axios from 'axios';
import { captureError, addBreadcrumb } from '../lib/sentry';

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_TEXT_MODEL = import.meta.env.VITE_OPENROUTER_TEXT_MODEL ;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Retry configuration
const MAX_RETRIES = 3;
const BASE_DELAY = 1000; // 1 second

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeOpenRouterRequest(prompt: string, retryCount = 0): Promise<any> {
  try {
    const response = await axios.post(
      OPENROUTER_BASE_URL,
      {
        model: OPENROUTER_TEXT_MODEL,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 20,
        temperature: 0.3,
        top_p: 0.9,
        stream: false
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          //'HTTP-Referer': window.location.origin,
          //'X-Title': 'SunSip - Weather & Cocktails'
        },
        timeout: 15000 // Increased timeout to 15 seconds
      }
    );

    return response;
  } catch (error: any) {
    // Check if it's a 503 error and we haven't exceeded max retries
    if (error.response?.status === 503 && retryCount < MAX_RETRIES) {
      const delay = BASE_DELAY * Math.pow(2, retryCount); // Exponential backoff
      
      addBreadcrumb(`OpenRouter API returned 503, retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`, 'text-generation');
      
      await sleep(delay);
      return makeOpenRouterRequest(prompt, retryCount + 1);
    }
    
    // If it's not a 503 error or we've exceeded max retries, throw the error
    throw error;
  }
}

export async function getLandmarkSuggestion(city: string, country: string): Promise<string | null> {
  // If no API key is provided, return null to use fallback
  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'test-openrouter-key' || OPENROUTER_API_KEY === 'your-openrouter-api-key') {
    addBreadcrumb(`No valid OpenRouter API key found, skipping landmark suggestion for ${city}, ${country}`, 'text-generation');
    return null;
  }

  try {
    addBreadcrumb(`Getting landmark suggestion for ${city}, ${country}`, 'text-generation');

    const prompt = `Your task is to create a short, visual phrase for an image generation prompt about the city: "${city}, ${country}".

    Follow these steps in order:
    1.  **First, try to identify one single, globally famous landmark.** (e.g., "Eiffel Tower", "Statue of Liberty").
    2.  **If no single famous landmark exists, identify a well-known local feature or point of interest.** (e.g., for Slutsk, this might be "the two statues of freedom").
    3.  **If there's no specific point of interest, describe the city's typical architectural style and atmosphere in 3-5 words.** (e.g., "tree-lined streets with yellow 4-story buildings").

    The final output MUST be ONLY the short phrase. Do not add explanations.

    Examples:
    - Input: Paris, France -> Output: Eiffel Tower
    - Input: Slutsk, Belarus -> Output: Historic 4-story buildings and tree-lined streets
    - Input: Santorini, Greece -> Output: Whitewashed villages on cliffs

    Now, provide the phrase for: ${city}, ${country}`;

    const response = await makeOpenRouterRequest(prompt);

    if (response.data?.choices?.[0]?.message?.content) {
      const landmark = response.data.choices[0].message.content.trim();
      
      addBreadcrumb(`Successfully got landmark suggestion: ${landmark}`, 'text-generation', {
        city,
        country,
        landmark
      });
      
      return landmark;
    }

    addBreadcrumb('No landmark suggestion in OpenRouter response', 'text-generation');
    return null;

  } catch (error) {
    captureError(error as Error, {
      service: 'openrouter',
      action: 'get_landmark_suggestion',
      city,
      country,
      model: OPENROUTER_TEXT_MODEL
    });

    console.error('Error getting landmark suggestion:', error);
    return null;
  }
}