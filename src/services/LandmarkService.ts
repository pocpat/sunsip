import axios from 'axios';
import { useAppStore } from '../store/appStore';
import { captureError, addBreadcrumb } from '../lib/sentry';

// This function now calls YOUR backend, not OpenRouter's.
async function getLandmarkSuggestionFromBackend(city: string, country: string): Promise<string | null> {
  try {
    const response = await axios.post('/api/generate-landmark', { city, country });
    return response.data.landmark;
  } catch (error) {
    // The backend will handle the errors, but we can log it here too.
    console.error('Error fetching landmark from backend:', error);
    captureError(error as Error, {
      service: 'frontend-landmark-service',
      action: 'get_landmark_suggestion',
      city,
      country,
    });
    return null;
  }
}

export async function getLandmarkSuggestion(city: string, country: string): Promise<string | null> {
  const isPortfolioMode = useAppStore.getState().isPortfolioMode;
  if (isPortfolioMode) {
    addBreadcrumb(`Demo mode enabled, skipping landmark suggestion for ${city}, ${country}`, 'text-generation');
    return null;
  }
  
  addBreadcrumb(`Getting landmark suggestion for ${city}, ${country}`, 'text-generation');

  const landmark = await getLandmarkSuggestionFromBackend(city, country);

  if (landmark) {
    addBreadcrumb(`Successfully got landmark suggestion: ${landmark}`, 'text-generation');
  } else {
    addBreadcrumb('No landmark suggestion returned from backend', 'text-generation');
  }
  
  return landmark;
}