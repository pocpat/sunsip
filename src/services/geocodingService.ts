import axios from 'axios';
import type { CityOption } from '../store/appStore';
import { useAppStore } from '../store/appStore';

const API_KEY = import.meta.env.VITE_GEOCODING_API_KEY || 'your-geocoding-api-key';

// Optimized city database for faster search - using the countries from our drink preferences
const optimizedCityDatabase: Record<string, CityOption[]> = {
  // Major cities by country (using country codes from our drink preferences)
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
  'madrid': [
    { city: 'Madrid', country: 'Spain', countryCode: 'es', latitude: 40.4168, longitude: -3.7038 },
  ],
  'dublin': [
    { city: 'Dublin', country: 'Ireland', countryCode: 'ie', latitude: 53.3498, longitude: -6.2603 },
  ],
  'rio de janeiro': [
    { city: 'Rio de Janeiro', country: 'Brazil', countryCode: 'br', latitude: -22.9068, longitude: -43.1729 },
  ],
  'são paulo': [
    { city: 'São Paulo', country: 'Brazil', countryCode: 'br', latitude: -23.5505, longitude: -46.6333 },
  ],
  'beijing': [
    { city: 'Beijing', country: 'China', countryCode: 'cn', latitude: 39.9042, longitude: 116.4074 },
  ],
  'shanghai': [
    { city: 'Shanghai', country: 'China', countryCode: 'cn', latitude: 31.2304, longitude: 121.4737 },
  ],
  'seoul': [
    { city: 'Seoul', country: 'South Korea', countryCode: 'kr', latitude: 37.5665, longitude: 126.9780 },
  ],
  'mumbai': [
    { city: 'Mumbai', country: 'India', countryCode: 'in', latitude: 19.0760, longitude: 72.8777 },
  ],
  'delhi': [
    { city: 'Delhi', country: 'India', countryCode: 'in', latitude: 28.7041, longitude: 77.1025 },
  ],
  'amsterdam': [
    { city: 'Amsterdam', country: 'Netherlands', countryCode: 'nl', latitude: 52.3676, longitude: 4.9041 },
  ],
  'athens': [
    { city: 'Athens', country: 'Greece', countryCode: 'gr', latitude: 37.9838, longitude: 23.7275 },
  ],
  'stockholm': [
    { city: 'Stockholm', country: 'Sweden', countryCode: 'se', latitude: 59.3293, longitude: 18.0686 },
  ],
  'warsaw': [
    { city: 'Warsaw', country: 'Poland', countryCode: 'pl', latitude: 52.2297, longitude: 21.0122 },
  ],
  'buenos aires': [
    { city: 'Buenos Aires', country: 'Argentina', countryCode: 'ar', latitude: -34.6118, longitude: -58.3960 },
  ],
  'cape town': [
    { city: 'Cape Town', country: 'South Africa', countryCode: 'za', latitude: -33.9249, longitude: 18.4241 },
  ],
  'lima': [
    { city: 'Lima', country: 'Peru', countryCode: 'pe', latitude: -12.0464, longitude: -77.0428 },
  ],
  'istanbul': [
    { city: 'Istanbul', country: 'Turkey', countryCode: 'tr', latitude: 41.0082, longitude: 28.9784 },
  ],
  'havana': [
    { city: 'Havana', country: 'Cuba', countryCode: 'cu', latitude: 23.1136, longitude: -82.3666 },
  ],
  'tel aviv': [
    { city: 'Tel Aviv', country: 'Israel', countryCode: 'il', latitude: 32.0853, longitude: 34.7818 },
  ],
  'jerusalem': [
    { city: 'Jerusalem', country: 'Israel', countryCode: 'il', latitude: 31.7683, longitude: 35.2137 },
  ],
  'kyiv': [
    { city: 'Kyiv', country: 'Ukraine', countryCode: 'ua', latitude: 50.4501, longitude: 30.5234 },
  ],
  'kiev': [
    { city: 'Kyiv', country: 'Ukraine', countryCode: 'ua', latitude: 50.4501, longitude: 30.5234 },
  ],
  'minsk': [
    { city: 'Minsk', country: 'Belarus', countryCode: 'by', latitude: 53.9045, longitude: 27.5615 },
  ],
  'vilnius': [
    { city: 'Vilnius', country: 'Lithuania', countryCode: 'lt', latitude: 54.6872, longitude: 25.2797 },
  ],
  'riga': [
    { city: 'Riga', country: 'Latvia', countryCode: 'lv', latitude: 56.9496, longitude: 24.1052 },
  ],
  'sofia': [
    { city: 'Sofia', country: 'Bulgaria', countryCode: 'bg', latitude: 42.6977, longitude: 23.3219 },
  ],
  'berlin': [
    { city: 'Berlin', country: 'Germany', countryCode: 'de', latitude: 52.5200, longitude: 13.4050 },
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
  'bangkok': [
    { city: 'Bangkok', country: 'Thailand', countryCode: 'th', latitude: 13.7563, longitude: 100.5018 },
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
  'cairo': [
    { city: 'Cairo', country: 'Egypt', countryCode: 'eg', latitude: 30.0444, longitude: 31.2357 },
  ],
};

export async function searchCities(query: string): Promise<CityOption[]> {
  // Check for demo mode first
  const isPortfolioMode = useAppStore.getState().isPortfolioMode;
  if (isPortfolioMode) {
    return getOptimizedCityResults(query);
  }

  // If no valid API key is provided, use optimized mock data directly
  if (!API_KEY || API_KEY === 'your-geocoding-api-key') {
    return getOptimizedCityResults(query);
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
    // Gracefully fall back to optimized mock data
    return getOptimizedCityResults(query);
  }
}

// Optimized function using our curated city database for faster search
function getOptimizedCityResults(query: string): CityOption[] {
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

  const matchingCities: CityOption[] = [];

  // Check for exact matches in our optimized database
  if (optimizedCityDatabase[lowercaseQuery]) {
    return optimizedCityDatabase[lowercaseQuery];
  }

  // Check for partial matches
  Object.keys(optimizedCityDatabase).forEach(key => {
    if (key.includes(lowercaseQuery)) {
      matchingCities.push(...optimizedCityDatabase[key]);
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

// Legacy function for backward compatibility
export function getMockCityResults(query: string): CityOption[] {
  return getOptimizedCityResults(query);
}