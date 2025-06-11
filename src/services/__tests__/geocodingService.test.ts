import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { searchCities, getMockCityResults } from '../geocodingService';
import type { CityOption } from '../../store/appStore';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('geocodingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('searchCities', () => {
    it('should return mock data when API key is not provided', async () => {
      // Mock environment to not have API key
      const originalEnv = import.meta.env.VITE_GEOCODING_API_KEY;
      import.meta.env.VITE_GEOCODING_API_KEY = 'your-geocoding-api-key';

      const result = await searchCities('paris');

      expect(result).toEqual([
        { 
          city: 'Paris', 
          country: 'France', 
          countryCode: 'fr', 
          latitude: 48.8566, 
          longitude: 2.3522 
        },
        { 
          city: 'Paris', 
          country: 'United States', 
          countryCode: 'us', 
          latitude: 33.6617, 
          longitude: -95.5555 
        },
        { 
          city: 'Paris', 
          country: 'Canada', 
          countryCode: 'ca', 
          latitude: 43.2, 
          longitude: -80.3833 
        },
      ]);

      // Restore original environment
      import.meta.env.VITE_GEOCODING_API_KEY = originalEnv;
    });

    it('should call Geoapify API when valid API key is provided', async () => {
      // Mock successful API response
      const mockResponse = {
        data: {
          results: [
            {
              city: 'Paris',
              country: 'France',
              country_code: 'fr',
              lat: 48.8566,
              lon: 2.3522,
            },
            {
              city: 'Paris',
              country: 'United States',
              country_code: 'us',
              lat: 33.6617,
              lon: -95.5555,
            },
          ],
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      // Set valid API key
      import.meta.env.VITE_GEOCODING_API_KEY = 'test-api-key';

      const result = await searchCities('paris');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.geoapify.com/v1/geocode/search',
        {
          params: {
            text: 'paris',
            type: 'city',
            format: 'json',
            apiKey: 'test-api-key',
            limit: 5,
          },
        }
      );

      expect(result).toEqual([
        {
          city: 'Paris',
          country: 'France',
          countryCode: 'fr',
          latitude: 48.8566,
          longitude: 2.3522,
        },
        {
          city: 'Paris',
          country: 'United States',
          countryCode: 'us',
          latitude: 33.6617,
          longitude: -95.5555,
        },
      ]);
    });

    it('should fallback to mock data when API call fails', async () => {
      // Mock API error
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      // Set valid API key
      import.meta.env.VITE_GEOCODING_API_KEY = 'test-api-key';

      const result = await searchCities('london');

      expect(result).toEqual([
        { 
          city: 'London', 
          country: 'United Kingdom', 
          countryCode: 'gb', 
          latitude: 51.5074, 
          longitude: -0.1278 
        },
        { 
          city: 'London', 
          country: 'Canada', 
          countryCode: 'ca', 
          latitude: 42.9849, 
          longitude: -81.2453 
        },
      ]);
    });

    it('should handle API authentication errors gracefully', async () => {
      // Mock 401 error (authentication failure)
      const authError = {
        response: { status: 401 },
        isAxiosError: true,
      };
      mockedAxios.isAxiosError.mockReturnValue(true);
      mockedAxios.get.mockRejectedValueOnce(authError);

      // Set valid API key
      import.meta.env.VITE_GEOCODING_API_KEY = 'invalid-api-key';

      const result = await searchCities('tokyo');

      expect(result).toEqual([
        { 
          city: 'Tokyo', 
          country: 'Japan', 
          countryCode: 'jp', 
          latitude: 35.6762, 
          longitude: 139.6503 
        },
      ]);
    });

    it('should handle empty query gracefully', async () => {
      const result = await searchCities('');

      expect(result).toEqual([
        { 
          city: '', 
          country: 'Unknown', 
          countryCode: 'xx',
          latitude: 0,
          longitude: 0
        }
      ]);
    });

    it('should handle API response with missing city field', async () => {
      const mockResponse = {
        data: {
          results: [
            {
              name: 'Sydney',
              country: 'Australia',
              country_code: 'au',
              lat: -33.8688,
              lon: 151.2093,
            },
          ],
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);
      import.meta.env.VITE_GEOCODING_API_KEY = 'test-api-key';

      const result = await searchCities('sydney');

      expect(result).toEqual([
        {
          city: 'Sydney',
          country: 'Australia',
          countryCode: 'au',
          latitude: -33.8688,
          longitude: 151.2093,
        },
      ]);
    });
  });

  describe('getMockCityResults', () => {
    it('should return exact matches for known cities', () => {
      const result = getMockCityResults('paris');

      expect(result).toEqual([
        { 
          city: 'Paris', 
          country: 'France', 
          countryCode: 'fr', 
          latitude: 48.8566, 
          longitude: 2.3522 
        },
        { 
          city: 'Paris', 
          country: 'United States', 
          countryCode: 'us', 
          latitude: 33.6617, 
          longitude: -95.5555 
        },
        { 
          city: 'Paris', 
          country: 'Canada', 
          countryCode: 'ca', 
          latitude: 43.2, 
          longitude: -80.3833 
        },
      ]);
    });

    it('should return partial matches for city names', () => {
      const result = getMockCityResults('new');

      expect(result.length).toBeGreaterThan(0);
      expect(result.some(city => city.city.toLowerCase().includes('new'))).toBe(true);
    });

    it('should return default city for unknown queries', () => {
      const result = getMockCityResults('unknowncity');

      expect(result).toEqual([
        { 
          city: 'Unknowncity', 
          country: 'Unknown', 
          countryCode: 'xx',
          latitude: 0,
          longitude: 0
        }
      ]);
    });

    it('should handle case insensitive searches', () => {
      const lowerResult = getMockCityResults('london');
      const upperResult = getMockCityResults('LONDON');
      const mixedResult = getMockCityResults('LoNdOn');

      expect(lowerResult).toEqual(upperResult);
      expect(upperResult).toEqual(mixedResult);
    });

    it('should return multiple cities for common names', () => {
      const result = getMockCityResults('paris');

      expect(result.length).toBeGreaterThan(1);
      expect(result.every(city => city.city === 'Paris')).toBe(true);
      expect(result.map(city => city.country)).toEqual(['France', 'United States', 'Canada']);
    });

    it('should include coordinates for all cities', () => {
      const result = getMockCityResults('tokyo');

      result.forEach(city => {
        expect(typeof city.latitude).toBe('number');
        expect(typeof city.longitude).toBe('number');
        expect(city.latitude).not.toBe(0);
        expect(city.longitude).not.toBe(0);
      });
    });
  });
});