import axios from 'axios';
import { useAppStore } from '../store/appStore';
import { getLandmarkSuggestion } from './textGenerationService';
import { captureError, addBreadcrumb } from '../lib/sentry';

const IMAGEROUTER_API_KEY = import.meta.env.VITE_IMAGEROUTER_API_KEY;
const IMAGEROUTER_BASE_URL = 'https://api.imagerouter.io/v1/openai/images/generations';

// Array of image generation models to try in order
const IMAGE_GENERATION_MODELS = [
  'stabilityai/sdxl-turbo:free',
  'google/gemini-2.0-flash-exp:free',
  'black-forest-labs/FLUX-1-schnell:free'
];

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

  // If no API key is provided, use fallback images
  if (!IMAGEROUTER_API_KEY || IMAGEROUTER_API_KEY === 'test-imagerouter-key' || IMAGEROUTER_API_KEY === 'your-imagerouter-api-key') {
    addBreadcrumb(`No valid ImageRouter API key found, using fallback images for ${city}, ${country}`, 'image-generation');
    return getFallbackCityImage(weatherCondition, isDay);
  }

  try {
    addBreadcrumb(`Generating AI image for ${city}, ${country} with ${weatherCondition} weather`, 'image-generation');

    // Step 1: Get landmark suggestion from text model
    const landmark = await getLandmarkSuggestion(city, country);
    
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

    // Step 3: Try each model in sequence until one succeeds
    for (let i = 0; i < IMAGE_GENERATION_MODELS.length; i++) {
      const model = IMAGE_GENERATION_MODELS[i];
      
      try {
        addBreadcrumb(`Attempting image generation with model: ${model}`, 'image-generation');
        
        const response = await axios.post(
          IMAGEROUTER_BASE_URL,
          {
            model: model,
            prompt: prompt,
            n: 1,
            size: '1024x1024'
          },
          {
            headers: {
              'Authorization': `Bearer ${IMAGEROUTER_API_KEY}`,
              'Content-Type': 'application/json'
            },
            timeout: 30000 // 30 second timeout for image generation
          }
        );

        if (response.data?.data?.[0]?.url) {
          const generatedImageUrl = response.data.data[0].url;
          
          addBreadcrumb(`Successfully generated AI image with ${model}: ${generatedImageUrl}`, 'image-generation', {
            city,
            country,
            landmark,
            weatherCondition,
            isDay,
            model,
            attemptNumber: i + 1
          });
          
          return generatedImageUrl;
        }

        addBreadcrumb(`No image URL in response from ${model}`, 'image-generation');
        
      } catch (modelError) {
        captureError(modelError as Error, {
          service: 'imagerouter',
          action: 'generate_image_attempt',
          model,
          attemptNumber: i + 1,
          city,
          country,
          weatherCondition,
          isDay
        });

        console.error(`Error with model ${model} (attempt ${i + 1}/${IMAGE_GENERATION_MODELS.length}):`, modelError);
        
        // If this is not the last model, continue to the next one
        if (i < IMAGE_GENERATION_MODELS.length - 1) {
          addBreadcrumb(`Model ${model} failed, trying next model`, 'image-generation');
          continue;
        }
      }
    }

    // If we reach here, all models failed
    addBreadcrumb('All image generation models failed', 'image-generation');
    throw new Error('All image generation models failed');

  } catch (error) {
    captureError(error as Error, {
      service: 'imagerouter',
      action: 'generate_image_all_models_failed',
      city,
      country,
      weatherCondition,
      isDay,
      modelsAttempted: IMAGE_GENERATION_MODELS
    });

    console.error('Error generating AI image with all models, falling back to Pexels:', error);
    
    // Fallback to Pexels images on error
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

export { getFallbackCityImage };