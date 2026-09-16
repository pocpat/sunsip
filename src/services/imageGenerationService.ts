import axios from 'axios';
import { useAppStore } from '../store/appStore';
import { getLandmarkSuggestion } from './LandmarkService';
import { captureError, addBreadcrumb } from '../lib/sentry';

// Image generation moved server-side (Dipsy-style, 2026-09): the prompt is
// POSTed to the /api/generate-image Netlify function, which holds the
// ImageRouter key and a provider chain (ImageRouter -> Cloudflare
// flux-1-schnell -> Pollinations turbo). The browser never touches provider
// keys, and there are no more retry storms on ImageRouter's 3/day free pool.
const GENERATE_IMAGE_TIMEOUT_MS = 45000;

// Cache for landmark suggestions to reduce OpenRouter API calls
const landmarkCache = new Map<string, { value: string, expiry: number }>();

export async function generateCityImage(
  city: string,
  country: string,
  weatherCondition: string,
  isDay: boolean
): Promise<string> {
  // Get portfolio mode state
  const isPortfolioMode = useAppStore.getState().isPortfolioMode;

  // If in portfolio mode, immediately return fallback Pexels images
  if (isPortfolioMode) {
    addBreadcrumb(`Portfolio mode enabled, using fallback images for ${city}, ${country}`, 'image-generation');
    return getFallbackCityImage(weatherCondition, isDay);
  }

  try {
    addBreadcrumb(`Generating AI image for ${city}, ${country} with ${weatherCondition} weather`, 'image-generation');

    // Step 1: Get landmark suggestion from text model with caching
    const cacheKey = `${city}-${country}`;
    const cached = landmarkCache.get(cacheKey);

    let landmark: string | null = null;

    if (cached && Date.now() < cached.expiry) {
      landmark = cached.value;
      addBreadcrumb(`Using cached landmark suggestion for ${city}, ${country}`, 'image-generation');
    } else {
      landmark = await getLandmarkSuggestion(city, country);
      if (landmark) {
        // Cache for 24 hours
        landmarkCache.set(cacheKey, { value: landmark, expiry: Date.now() + 24 * 60 * 60 * 1000 });
      }
    }
    
    // Step 2: Construct the image generation prompt
    const timeOfDay = isDay ? 'daytime' : 'nighttime';
    const weatherType = getWeatherType(weatherCondition);
    
    let prompt = `A beautiful, high-quality photograph of ${city}, ${country}`;
    
    if (landmark) {
      prompt += ` featuring ${landmark}`;
    }
    
    prompt += ` during ${timeOfDay} with ${weatherType} weather. `;
    prompt += `Professional photography, vibrant colors, detailed architecture, atmospheric lighting, `;
    prompt += `travel photography style, 4K quality, cinematic composition, no text or watermarks.`;

    addBreadcrumb(`Using prompt: ${prompt}`, 'image-generation');

    // Step 3: Ask the backend function to generate the image
    const response = await axios.post(
      '/api/generate-image',
      { prompt },
      { timeout: GENERATE_IMAGE_TIMEOUT_MS }
    );
    const imageUrl = response.data?.imageUrl;
    const provider = response.data?.provider;

    if (imageUrl) {
      addBreadcrumb(`Image served by ${provider ?? 'unknown provider'}`, 'image-generation', {
        city,
        country,
        landmark,
        weatherCondition,
        isDay,
        provider,
      });
      return imageUrl;
    }

    // Backend answered but has no image → Pexels fallback chain
    addBreadcrumb('Backend returned no image, using Pexels fallback', 'image-generation');
    const pexelsImage = await getPexelsCityImage(city, weatherCondition, isDay);
    if (pexelsImage) {
      addBreadcrumb(`Using Pexels city-specific image for ${city}`, 'image-generation');
      return pexelsImage;
    }
    return getFallbackCityImage(weatherCondition, isDay);

  } catch (error) {
    captureError(error as Error, {
      service: 'backend-image-generation',
      action: 'generate_image_failed',
      city,
      country,
      weatherCondition,
      isDay
    });

    console.error('Error generating AI image via backend, falling back to Pexels:', error);
    
    // Try to get a city-specific image from Pexels API first
    const pexelsImage = await getPexelsCityImage(city, weatherCondition, isDay);
    if (pexelsImage) {
      addBreadcrumb(`Using Pexels city-specific image for ${city}`, 'image-generation');
      return pexelsImage;
    }
    
    // Final fallback to generic weather-based Pexels images
    return getFallbackCityImage(weatherCondition, isDay);
  }
}

function getWeatherType(weatherCondition: string): string {
  const condition = weatherCondition.toLowerCase();
  
  if (condition.includes('rain') || condition.includes('drizzle')) {
    return 'rainy';
  } else if (condition.includes('snow')) {
    return 'snowy';
  } else if (condition.includes('cloud')) {
    return 'cloudy';
  } else if (condition.includes('fog') || condition.includes('mist')) {
    return 'foggy';
  } else if (condition.includes('storm') || condition.includes('thunder')) {
    return 'stormy';
  } else {
    return 'clear';
  }
}

type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'foggy';
type TimeOfDay = 'day' | 'night';

// Default fallback images for each weather type and time of day
const defaultImages: Record<WeatherType, Record<TimeOfDay, string>> = {
  sunny: {
    day: 'https://images.pexels.com/photos/532826/pexels-photo-532826.jpeg',
    night: 'https://images.pexels.com/photos/460740/pexels-photo-460740.jpeg',
  },
  cloudy: {
    day: 'https://images.pexels.com/photos/158607/cairn-fog-mystical-background-158607.jpeg',
    night: 'https://images.pexels.com/photos/417173/pexels-photo-417173.jpeg',
  },
  rainy: {
    day: 'https://images.pexels.com/photos/110874/pexels-photo-110874.jpeg',
    night: 'https://images.pexels.com/photos/1553/glass-rainy-car-rain.jpg',
  },
  snowy: {
    day: 'https://images.pexels.com/photos/417173/pexels-photo-417173.jpeg',
    night: 'https://images.pexels.com/photos/417142/pexels-photo-417142.jpeg',
  },
  foggy: {
    day: 'https://images.pexels.com/photos/167684/pexels-photo-167684.jpeg',
    night: 'https://images.pexels.com/photos/417142/pexels-photo-417142.jpeg',
  },
};

function getFallbackCityImage(
  weatherCondition: string,
  isDay: boolean
): string {
  // Determine weather type
  let weatherType: WeatherType;
  const condition = weatherCondition.toLowerCase();
  if (condition.includes('rain') || condition.includes('drizzle')) {
    weatherType = 'rainy';
  } else if (condition.includes('snow')) {
    weatherType = 'snowy';
  } else if (condition.includes('cloud')) {
    weatherType = 'cloudy';
  } else if (condition.includes('fog') || condition.includes('mist')) {
    weatherType = 'foggy';
  } else {
    weatherType = 'sunny';
  }

  const timeOfDay: TimeOfDay = isDay ? 'day' : 'night';

  return defaultImages[weatherType][timeOfDay];
}

// Try to get a city-specific image from Pexels API (kept from the previous
// frontend flow — uses VITE_PEXELS_API_KEY, a public-CDN key)
async function getPexelsCityImage(city: string, weatherCondition: string, isDay: boolean): Promise<string | null> {
  try {
    const PEXELS_API_KEY = import.meta.env.VITE_PEXELS_API_KEY;
    
    // If no Pexels API key, return null to use generic fallback
    if (!PEXELS_API_KEY || PEXELS_API_KEY === 'test-pexels-key') {
      return null;
    }
    
    const query = `${city} city ${weatherCondition} ${isDay ? 'day' : 'night'}`;
    const response = await axios.get(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`, {
      headers: {
        'Authorization': PEXELS_API_KEY,
      },
      timeout: 10000,
    });
    
    if (response.data?.photos?.[0]?.src?.large) {
      return response.data.photos[0].src.large;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching Pexels city image:', error);
    return null;
  }
}