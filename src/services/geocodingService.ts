import axios from 'axios';
import type { CityOption } from '../store/appStore';

const API_KEY = import.meta.env.VITE_GEOCODING_API_KEY || 'your-geocoding-api-key';

export async function searchCities(query: string): Promise<CityOption[]> {
  // If no valid API key is provided, use mock data directly
  if (!API_KEY || API_KEY === 'your-geocoding-api-key') {
    return getMockCityResults(query);
  }

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
      latitude: result.lat,
      longitude: result.lon,
    }));
  } catch (error) {
    // Only log errors that aren't related to authentication/API key issues
    if (axios.isAxiosError(error) && error.response?.status !== 401 && error.response?.status !== 403) {
      console.error('Error searching cities:', error);
    }
    // Gracefully fall back to mock data
    return getMockCityResults(query);
  }
}

// For MVP, use this function to get mock city data when API key is not available
export function getMockCityResults(query: string): CityOption[] {
  // Handle empty query first
  const lowercaseQuery = query.toLowerCase().trim();
  
  if (lowercaseQuery === '') {
    return [{ 
      city: '', 
      country: 'Unknown', 
      countryCode: 'xx',
      latitude: 0,
      longitude: 0
    }];
  }

  const mockCities: Record<string, CityOption[]> = {
    'paris': [
      { city: 'Paris', country: 'France', countryCode: 'fr', latitude: 48.8566, longitude: 2.3522 },
      { city: 'Paris', country: 'United States', countryCode: 'us', latitude: 33.6617, longitude: -95.5555 },
      { city: 'Paris', country: 'Canada', countryCode: 'ca', latitude: 43.2, longitude: -80.3833 },
    ],
    'london': [
      { city: 'London', country: 'United Kingdom', countryCode: 'gb', latitude: 51.5074, longitude: -0.1278 },
      { city: 'London', country: 'Canada', countryCode: 'ca', latitude: 42.9849, longitude: -81.2453 },
    ],
    'new york': [
      { city: 'New York', country: 'United States', countryCode: 'us', latitude: 40.7128, longitude: -74.0060 },
    ],
    'tokyo': [
      { city: 'Tokyo', country: 'Japan', countryCode: 'jp', latitude: 35.6762, longitude: 139.6503 },
    ],
    'sydney': [
      { city: 'Sydney', country: 'Australia', countryCode: 'au', latitude: -33.8688, longitude: 151.2093 },
      { city: 'Sydney', country: 'Canada', countryCode: 'ca', latitude: 46.1368, longitude: -60.1942 },
    ],
    'auckland': [
      { city: 'Auckland', country: 'New Zealand', countryCode: 'nz', latitude: -36.8485, longitude: 174.763 },
    ],
    'wellington': [
      { city: 'Wellington', country: 'New Zealand', countryCode: 'nz', latitude: -41.2865, longitude: 174.7762 },
    ],
    'christchurch': [
      { city: 'Christchurch', country: 'New Zealand', countryCode: 'nz', latitude: -43.5321, longitude: 172.6362 },
    ],
    'rome': [
      { city: 'Rome', country: 'Italy', countryCode: 'it', latitude: 41.9028, longitude: 12.4964 },
    ],
    'barcelona': [
      { city: 'Barcelona', country: 'Spain', countryCode: 'es', latitude: 41.3851, longitude: 2.1734 },
    ],
    'berlin': [
      { city: 'Berlin', country: 'Germany', countryCode: 'de', latitude: 52.5200, longitude: 13.4050 },
    ],
    'amsterdam': [
      { city: 'Amsterdam', country: 'Netherlands', countryCode: 'nl', latitude: 52.3676, longitude: 4.9041 },
    ],
    'moscow': [
      { city: 'Moscow', country: 'Russia', countryCode: 'ru', latitude: 55.7558, longitude: 37.6176 },
    ],
    'dubai': [
      { city: 'Dubai', country: 'United Arab Emirates', countryCode: 'ae', latitude: 25.2048, longitude: 55.2708 },
    ],
    'singapore': [
      { city: 'Singapore', country: 'Singapore', countryCode: 'sg', latitude: 1.3521, longitude: 103.8198 },
    ],
    'mumbai': [
      { city: 'Mumbai', country: 'India', countryCode: 'in', latitude: 19.0760, longitude: 72.8777 },
    ],
    'bangkok': [
      { city: 'Bangkok', country: 'Thailand', countryCode: 'th', latitude: 13.7563, longitude: 100.5018 },
    ],
    'seoul': [
      { city: 'Seoul', country: 'South Korea', countryCode: 'kr', latitude: 37.5665, longitude: 126.9780 },
    ],
    'beijing': [
      { city: 'Beijing', country: 'China', countryCode: 'cn', latitude: 39.9042, longitude: 116.4074 },
    ],
    'los angeles': [
      { city: 'Los Angeles', country: 'United States', countryCode: 'us', latitude: 34.0522, longitude: -118.2437 },
    ],
    'chicago': [
      { city: 'Chicago', country: 'United States', countryCode: 'us', latitude: 41.8781, longitude: -87.6298 },
    ],
    'toronto': [
      { city: 'Toronto', country: 'Canada', countryCode: 'ca', latitude: 43.6532, longitude: -79.3832 },
    ],
    'vancouver': [
      { city: 'Vancouver', country: 'Canada', countryCode: 'ca', latitude: 49.2827, longitude: -123.1207 },
    ],
    'mexico city': [
      { city: 'Mexico City', country: 'Mexico', countryCode: 'mx', latitude: 19.4326, longitude: -99.1332 },
    ],
    'rio de janeiro': [
      { city: 'Rio de Janeiro', country: 'Brazil', countryCode: 'br', latitude: -22.9068, longitude: -43.1729 },
    ],
    'buenos aires': [
      { city: 'Buenos Aires', country: 'Argentina', countryCode: 'ar', latitude: -34.6118, longitude: -58.3960 },
    ],
    'cape town': [
      { city: 'Cape Town', country: 'South Africa', countryCode: 'za', latitude: -33.9249, longitude: 18.4241 },
    ],
    'cairo': [
      { city: 'Cairo', country: 'Egypt', countryCode: 'eg', latitude: 30.0444, longitude: 31.2357 },
    ],
    'istanbul': [
      { city: 'Istanbul', country: 'Turkey', countryCode: 'tr', latitude: 41.0082, longitude: 28.9784 },
    ],
  };

  // Find cities that include the query (case insensitive)
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

  // If we have no matches, return a default city with mock coordinates
  if (matchingCities.length === 0) {
    return [{ 
      city: query.charAt(0).toUpperCase() + query.slice(1), 
      country: 'Unknown', 
      countryCode: 'xx',
      latitude: 0,
      longitude: 0
    }];
  }

  return matchingCities;
}