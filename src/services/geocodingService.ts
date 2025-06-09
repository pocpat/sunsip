import axios from 'axios';
import type { CityOption } from '../store/appStore';

const API_KEY = import.meta.env.VITE_GEOCODING_API_KEY || 'your-geocoding-api-key';

export async function searchCities(query: string): Promise<CityOption[]> {
  try {
    const response = await axios.get(
      `https://api.geoapify.com/v1/geocode/search`,
      {
        params: {
          text: query,
          type: 'city',
          format: 'json',
          apiKey: API_KEY,
          limit: 5,
        },
      }
    );

    return response.data.results.map((result: any) => ({
      city: result.city || result.name,
      country: result.country,
      countryCode: result.country_code,
    }));
  } catch (error) {
    console.error('Error searching cities:', error);
    return getMockCityResults(query);
  }
}

// For MVP, use this function to get mock city data when API key is not available
export function getMockCityResults(query: string): CityOption[] {
  const mockCities: Record<string, CityOption[]> = {
    'paris': [
      { city: 'Paris', country: 'France', countryCode: 'fr' },
      { city: 'Paris', country: 'United States', countryCode: 'us' },
      { city: 'Paris', country: 'Canada', countryCode: 'ca' },
    ],
    'london': [
      { city: 'London', country: 'United Kingdom', countryCode: 'gb' },
      { city: 'London', country: 'Canada', countryCode: 'ca' },
    ],
    'new york': [
      { city: 'New York', country: 'United States', countryCode: 'us' },
    ],
    'tokyo': [
      { city: 'Tokyo', country: 'Japan', countryCode: 'jp' },
    ],
    'sydney': [
      { city: 'Sydney', country: 'Australia', countryCode: 'au' },
      { city: 'Sydney', country: 'Canada', countryCode: 'ca' },
    ],
  };

  // Find cities that include the query (case insensitive)
  const lowercaseQuery = query.toLowerCase();
  const matchingCities: CityOption[] = [];

  // Check for exact matches in our mock data
  if (mockCities[lowercaseQuery]) {
    return mockCities[lowercaseQuery];
  }

  // Check for partial matches
  Object.keys(mockCities).forEach(key => {
    if (key.includes(lowercaseQuery)) {
      matchingCities.push(...mockCities[key]);
    }
  });

  // If we have no matches, return a default city
  if (matchingCities.length === 0) {
    return [{ 
      city: query.charAt(0).toUpperCase() + query.slice(1), 
      country: 'Unknown', 
      countryCode: 'xx' 
    }];
  }

  return matchingCities;
}