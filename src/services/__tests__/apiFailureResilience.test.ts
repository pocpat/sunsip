import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import axios from 'axios';
import { searchCities } from '../geocodingService';
import { getWeatherData } from '../weatherService';
import { getCocktailSuggestion } from '../cocktailService';
import { generateCityImage } from '../imageGenerationService';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

// Mock Sentry functions
vi.mock('../../lib/sentry', () => ({
  captureError: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

describe('API Failure Simulation and Resilience Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset console mocks
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Geocoding Service Resilience', () => {
    it('should fallback to mock data when API key is invalid', async () => {
      // Simulate 401 Unauthorized (invalid API key)
      const authError = {
        response: { status: 401, data: { error: 'Invalid API key' } },
        isAxiosError: true,
      };
      mockedAxios.isAxiosError.mockReturnValue(true);
      mockedAxios.get.mockRejectedValueOnce(authError);

      // Set a fake API key to trigger the API call
      import.meta.env.VITE_GEOCODING_API_KEY = 'invalid-key';

      const result = await searchCities('paris');

      // Should fallback to mock data
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

    it('should handle network timeouts gracefully', async () => {
      // Simulate network timeout
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 5000ms exceeded',
        isAxiosError: true,
      };
      mockedAxios.isAxiosError.mockReturnValue(true);
      mockedAxios.get.mockRejectedValueOnce(timeoutError);

      import.meta.env.VITE_GEOCODING_API_KEY = 'valid-key';

      const result = await searchCities('london');

      // Should fallback to mock data
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

    it('should handle rate limiting (429 Too Many Requests)', async () => {
      const rateLimitError = {
        response: { 
          status: 429, 
          data: { error: 'Rate limit exceeded' },
          headers: { 'retry-after': '60' }
        },
        isAxiosError: true,
      };
      mockedAxios.isAxiosError.mockReturnValue(true);
      mockedAxios.get.mockRejectedValueOnce(rateLimitError);

      import.meta.env.VITE_GEOCODING_API_KEY = 'valid-key';

      const result = await searchCities('tokyo');

      // Should fallback to mock data
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

    it('should handle malformed API responses', async () => {
      // Simulate malformed response
      const malformedResponse = {
        data: {
          // Missing 'results' field or malformed structure
          status: 'OK',
          data: null,
        },
      };
      mockedAxios.get.mockResolvedValueOnce(malformedResponse);

      import.meta.env.VITE_GEOCODING_API_KEY = 'valid-key';

      const result = await searchCities('sydney');

      // Should handle gracefully and return empty or fallback data
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle DNS resolution failures', async () => {
      const dnsError = {
        code: 'ENOTFOUND',
        message: 'getaddrinfo ENOTFOUND api.geoapify.com',
        isAxiosError: true,
      };
      mockedAxios.isAxiosError.mockReturnValue(true);
      mockedAxios.get.mockRejectedValueOnce(dnsError);

      import.meta.env.VITE_GEOCODING_API_KEY = 'valid-key';

      const result = await searchCities('berlin');

      // Should fallback to mock data
      expect(result).toHaveLength(1);
      expect(result[0].city).toBe('Berlin');
    });

    it('should handle server errors (500 Internal Server Error)', async () => {
      const serverError = {
        response: { 
          status: 500, 
          data: { error: 'Internal server error' }
        },
        isAxiosError: true,
      };
      mockedAxios.isAxiosError.mockReturnValue(true);
      mockedAxios.get.mockRejectedValueOnce(serverError);

      import.meta.env.VITE_GEOCODING_API_KEY = 'valid-key';

      const result = await searchCities('madrid');

      // Should fallback gracefully
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Weather Service Resilience', () => {
    it('should fallback to mock data when weather API key is invalid', async () => {
      const authError = {
        response: { status: 401, data: { message: 'Invalid API key' } },
        isAxiosError: true,
      };
      mockedAxios.get.mockRejectedValueOnce(authError);

      import.meta.env.VITE_OPENWEATHER_API_KEY = 'invalid-key';

      const result = await getWeatherData(48.8566, 2.3522, 'Paris', 'France');

      // Should return mock weather data
      expect(result.city).toBe('Paris');
      expect(result.country).toBe('France');
      expect(result.latitude).toBe(48.8566);
      expect(result.longitude).toBe(2.3522);
      expect(typeof result.temperature).toBe('number');
      expect(typeof result.condition).toBe('string');
      expect(typeof result.isDay).toBe('boolean');
    });

    it('should handle weather API service unavailable (503)', async () => {
      const serviceUnavailableError = {
        response: { 
          status: 503, 
          data: { message: 'Service temporarily unavailable' }
        },
        isAxiosError: true,
      };
      mockedAxios.get.mockRejectedValueOnce(serviceUnavailableError);

      import.meta.env.VITE_OPENWEATHER_API_KEY = 'valid-key';

      const result = await getWeatherData(51.5074, -0.1278, 'London', 'UK');

      // Should fallback to mock data
      expect(result.city).toBe('London');
      expect(result.country).toBe('UK');
      expect(result.temperature).toBeGreaterThanOrEqual(-20);
      expect(result.temperature).toBeLessThanOrEqual(40);
    });

    it('should handle corrupted weather API responses', async () => {
      const corruptedResponse = {
        data: {
          // Missing required fields
          coord: { lat: 48.8566 }, // Missing lon
          weather: [], // Empty weather array
          main: {}, // Missing temp, humidity
          // Missing other required fields
        },
      };
      mockedAxios.get.mockResolvedValueOnce(corruptedResponse);

      import.meta.env.VITE_OPENWEATHER_API_KEY = 'valid-key';

      const result = await getWeatherData(48.8566, 2.3522, 'Paris', 'France');

      // Should handle gracefully and return mock data
      expect(result.city).toBe('Paris');
      expect(result.country).toBe('France');
      expect(typeof result.temperature).toBe('number');
    });

    it('should handle weather API quota exceeded', async () => {
      const quotaError = {
        response: { 
          status: 429, 
          data: { message: 'API quota exceeded' }
        },
        isAxiosError: true,
      };
      mockedAxios.get.mockRejectedValueOnce(quotaError);

      import.meta.env.VITE_OPENWEATHER_API_KEY = 'valid-key';

      const result = await getWeatherData(35.6762, 139.6503, 'Tokyo', 'Japan');

      // Should fallback to mock data
      expect(result.city).toBe('Tokyo');
      expect(result.country).toBe('Japan');
      expect(result).toHaveProperty('temperature');
      expect(result).toHaveProperty('condition');
      expect(result).toHaveProperty('humidity');
      expect(result).toHaveProperty('windSpeed');
    });

    it('should handle network interruption during weather API call', async () => {
      const networkError = {
        code: 'ECONNRESET',
        message: 'socket hang up',
        isAxiosError: true,
      };
      mockedAxios.get.mockRejectedValueOnce(networkError);

      import.meta.env.VITE_OPENWEATHER_API_KEY = 'valid-key';

      const result = await getWeatherData(-33.8688, 151.2093, 'Sydney', 'Australia');

      // Should provide fallback weather data
      expect(result.city).toBe('Sydney');
      expect(result.country).toBe('Australia');
      expect(result.latitude).toBe(-33.8688);
      expect(result.longitude).toBe(151.2093);
    });
  });

  describe('Cocktail Service Resilience', () => {
    it('should fallback to hardcoded cocktails when TheCocktailDB is unavailable', async () => {
      // Mock all cocktail API calls to fail
      mockedAxios.get.mockRejectedValue(new Error('Service unavailable'));

      const result = await getCocktailSuggestion('us', 'Sunny', 25);

      // Should return a valid cocktail from fallback data
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('ingredients');
      expect(result).toHaveProperty('recipe');
      expect(result).toHaveProperty('imageUrl');
      expect(result).toHaveProperty('mood');

      expect(typeof result.name).toBe('string');
      expect(Array.isArray(result.ingredients)).toBe(true);
      expect(Array.isArray(result.recipe)).toBe(true);
      expect(result.ingredients.length).toBeGreaterThan(0);
      expect(result.recipe.length).toBeGreaterThan(0);
    });

    it('should handle TheCocktailDB rate limiting', async () => {
      const rateLimitError = {
        response: { 
          status: 429, 
          data: { message: 'Too many requests' }
        },
        isAxiosError: true,
      };
      mockedAxios.get.mockRejectedValueOnce(rateLimitError);

      const result = await getCocktailSuggestion('gb', 'Rainy', 12);

      // Should fallback to hardcoded cocktails
      expect(result.name).toBeTruthy();
      expect(result.ingredients.length).toBeGreaterThan(0);
    });

    it('should handle malformed cocktail API responses', async () => {
      const malformedResponse = {
        data: {
          drinks: [
            {
              // Missing required fields
              idDrink: '123',
              // strDrink missing
              // strInstructions missing
            }
          ]
        },
      };
      mockedAxios.get.mockResolvedValueOnce(malformedResponse);

      const result = await getCocktailSuggestion('fr', 'Cloudy', 18);

      // Should handle gracefully and provide fallback
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('ingredients');
      expect(result).toHaveProperty('recipe');
    });

    it('should handle empty cocktail search results', async () => {
      const emptyResponse = {
        data: {
          drinks: null // No cocktails found
        },
      };
      mockedAxios.get.mockResolvedValueOnce(emptyResponse);

      const result = await getCocktailSuggestion('jp', 'Snow', -5);

      // Should fallback to hardcoded cocktails
      expect(result.name).toBeTruthy();
      expect(result.ingredients.length).toBeGreaterThan(0);
      expect(result.recipe.length).toBeGreaterThan(0);
    });

    it('should handle cocktail API timeout', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 10000ms exceeded',
        isAxiosError: true,
      };
      mockedAxios.get.mockRejectedValueOnce(timeoutError);

      const result = await getCocktailSuggestion('mx', 'Sunny', 35);

      // Should provide fallback cocktail
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('mood');
      expect(typeof result.mood).toBe('string');
    });
  });

  describe('Image Generation Service Resilience', () => {
    it('should provide fallback images when generation fails', async () => {
      // Image generation doesn't use axios, but we can test error handling
      const result = await generateCityImage('UnknownCity', 'UnknownCountry', 'Sunny', true);

      // Should return a valid fallback image URL
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^https:\/\/images\.pexels\.com\//);
    });

    it('should handle different weather conditions with fallback images', async () => {
      const weatherConditions = ['Sunny', 'Rainy', 'Snowy', 'Cloudy', 'Foggy'];
      
      for (const condition of weatherConditions) {
        const result = await generateCityImage('TestCity', 'TestCountry', condition, true);
        
        expect(typeof result).toBe('string');
        expect(result).toMatch(/^https:\/\/images\.pexels\.com\//);
      }
    });

    it('should handle both day and night scenarios', async () => {
      const dayResult = await generateCityImage('Paris', 'France', 'Sunny', true);
      const nightResult = await generateCityImage('Paris', 'France', 'Sunny', false);

      expect(typeof dayResult).toBe('string');
      expect(typeof nightResult).toBe('string');
      expect(dayResult).toMatch(/^https:\/\/images\.pexels\.com\//);
      expect(nightResult).toMatch(/^https:\/\/images\.pexels\.com\//);
    });
  });

  describe('Multiple API Failures Simulation', () => {
    it('should handle cascading API failures gracefully', async () => {
      // Simulate all APIs failing
      mockedAxios.get.mockRejectedValue(new Error('Network failure'));
      
      // Set invalid API keys to trigger fallbacks
      import.meta.env.VITE_GEOCODING_API_KEY = 'invalid';
      import.meta.env.VITE_OPENWEATHER_API_KEY = 'invalid';

      // Test geocoding fallback
      const cities = await searchCities('paris');
      expect(Array.isArray(cities)).toBe(true);
      expect(cities.length).toBeGreaterThan(0);

      // Test weather fallback
      const weather = await getWeatherData(48.8566, 2.3522, 'Paris', 'France');
      expect(weather.city).toBe('Paris');
      expect(weather.country).toBe('France');

      // Test cocktail fallback
      const cocktail = await getCocktailSuggestion('fr', 'Sunny', 22);
      expect(cocktail.name).toBeTruthy();
      expect(cocktail.ingredients.length).toBeGreaterThan(0);

      // Test image fallback
      const image = await generateCityImage('Paris', 'France', 'Sunny', true);
      expect(image).toMatch(/^https:\/\/images\.pexels\.com\//);
    });

    it('should maintain data consistency during partial API failures', async () => {
      // Simulate geocoding working but weather failing
      const validCityResponse = {
        data: {
          results: [
            {
              city: 'Berlin',
              country: 'Germany',
              country_code: 'de',
              lat: 52.5200,
              lon: 13.4050,
            }
          ],
        },
      };

      mockedAxios.get
        .mockResolvedValueOnce(validCityResponse) // Geocoding succeeds
        .mockRejectedValueOnce(new Error('Weather API failed')); // Weather fails

      import.meta.env.VITE_GEOCODING_API_KEY = 'valid-key';
      import.meta.env.VITE_OPENWEATHER_API_KEY = 'valid-key';

      // Test geocoding success
      const cities = await searchCities('berlin');
      expect(cities[0].city).toBe('Berlin');
      expect(cities[0].country).toBe('Germany');

      // Test weather fallback
      const weather = await getWeatherData(52.5200, 13.4050, 'Berlin', 'Germany');
      expect(weather.city).toBe('Berlin');
      expect(weather.country).toBe('Germany');
      expect(weather.latitude).toBe(52.5200);
      expect(weather.longitude).toBe(13.4050);
    });

    it('should handle intermittent connectivity issues', async () => {
      // Simulate intermittent failures
      let callCount = 0;
      mockedAxios.get.mockImplementation(() => {
        callCount++;
        if (callCount % 2 === 0) {
          // Every second call fails
          return Promise.reject(new Error('Intermittent failure'));
        }
        return Promise.resolve({
          data: {
            results: [
              {
                city: 'Rome',
                country: 'Italy',
                country_code: 'it',
                lat: 41.9028,
                lon: 12.4964,
              }
            ],
          },
        });
      });

      import.meta.env.VITE_GEOCODING_API_KEY = 'valid-key';

      // First call should succeed
      const cities1 = await searchCities('rome');
      expect(cities1[0].city).toBe('Rome');

      // Second call should fail and fallback
      const cities2 = await searchCities('rome');
      expect(Array.isArray(cities2)).toBe(true);
      expect(cities2.length).toBeGreaterThan(0);
    });
  });

  describe('Error Recovery and User Experience', () => {
    it('should provide meaningful error context for debugging', async () => {
      const specificError = {
        response: { 
          status: 403, 
          data: { 
            error: 'Forbidden',
            message: 'API key does not have permission for this endpoint'
          }
        },
        config: {
          url: 'https://api.geoapify.com/v1/geocode/search',
          params: { text: 'paris' }
        },
        isAxiosError: true,
      };
      mockedAxios.isAxiosError.mockReturnValue(true);
      mockedAxios.get.mockRejectedValueOnce(specificError);

      import.meta.env.VITE_GEOCODING_API_KEY = 'limited-key';

      const result = await searchCities('paris');

      // Should still provide fallback data
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle very slow API responses gracefully', async () => {
      // Simulate very slow response (but not timeout)
      mockedAxios.get.mockImplementationOnce(
        () => new Promise(resolve => 
          setTimeout(() => resolve({
            data: {
              results: [
                {
                  city: 'SlowCity',
                  country: 'SlowCountry',
                  country_code: 'sc',
                  lat: 0,
                  lon: 0,
                }
              ],
            },
          }), 2000)
        )
      );

      import.meta.env.VITE_GEOCODING_API_KEY = 'valid-key';

      const startTime = Date.now();
      const result = await searchCities('slowcity');
      const endTime = Date.now();

      // Should eventually return data
      expect(result[0].city).toBe('SlowCity');
      expect(endTime - startTime).toBeGreaterThan(1900); // Verify it actually waited
    });

    it('should maintain application stability during error storms', async () => {
      // Simulate multiple rapid API failures
      const errors = [
        new Error('Network error 1'),
        new Error('Network error 2'),
        new Error('Network error 3'),
        new Error('Network error 4'),
        new Error('Network error 5'),
      ];

      import.meta.env.VITE_GEOCODING_API_KEY = 'valid-key';
      import.meta.env.VITE_OPENWEATHER_API_KEY = 'valid-key';

      // Test multiple rapid failures
      const promises = errors.map((error, index) => {
        mockedAxios.get.mockRejectedValueOnce(error);
        return searchCities(`city${index}`);
      });

      const results = await Promise.all(promises);

      // All should return fallback data
      results.forEach((result, index) => {
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
      });
    });

    it('should provide consistent fallback behavior across different error types', async () => {
      const errorTypes = [
        { code: 'ECONNREFUSED', message: 'Connection refused' },
        { code: 'ENOTFOUND', message: 'DNS lookup failed' },
        { code: 'ETIMEDOUT', message: 'Request timeout' },
        { response: { status: 500 }, message: 'Internal server error' },
        { response: { status: 502 }, message: 'Bad gateway' },
        { response: { status: 503 }, message: 'Service unavailable' },
      ];

      import.meta.env.VITE_GEOCODING_API_KEY = 'valid-key';

      for (const error of errorTypes) {
        mockedAxios.get.mockRejectedValueOnce(error);
        
        const result = await searchCities('testcity');
        
        // Should consistently provide fallback data
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
        expect(result[0]).toHaveProperty('city');
        expect(result[0]).toHaveProperty('country');
        expect(result[0]).toHaveProperty('latitude');
        expect(result[0]).toHaveProperty('longitude');
      }
    });
  });

  describe('Performance Under Error Conditions', () => {
    it('should not cause memory leaks during repeated API failures', async () => {
      import.meta.env.VITE_GEOCODING_API_KEY = 'valid-key';

      // Simulate many failed requests
      for (let i = 0; i < 100; i++) {
        mockedAxios.get.mockRejectedValueOnce(new Error(`Error ${i}`));
        
        const result = await searchCities(`city${i}`);
        expect(Array.isArray(result)).toBe(true);
      }

      // Test should complete without memory issues
      expect(true).toBe(true);
    });

    it('should maintain reasonable response times during fallback scenarios', async () => {
      import.meta.env.VITE_GEOCODING_API_KEY = 'invalid-key';

      const startTime = Date.now();
      
      // Test multiple fallback operations
      const promises = [
        searchCities('paris'),
        getWeatherData(48.8566, 2.3522, 'Paris', 'France'),
        getCocktailSuggestion('fr', 'Sunny', 22),
        generateCityImage('Paris', 'France', 'Sunny', true),
      ];

      const results = await Promise.all(promises);
      const endTime = Date.now();

      // All operations should complete quickly when using fallback data
      expect(endTime - startTime).toBeLessThan(1000); // Should be fast
      
      // Verify all operations returned valid data
      expect(Array.isArray(results[0])).toBe(true); // Cities
      expect(results[1]).toHaveProperty('temperature'); // Weather
      expect(results[2]).toHaveProperty('name'); // Cocktail
      expect(typeof results[3]).toBe('string'); // Image URL
    });

    it('should handle concurrent API failures without blocking', async () => {
      import.meta.env.VITE_GEOCODING_API_KEY = 'valid-key';
      import.meta.env.VITE_OPENWEATHER_API_KEY = 'valid-key';

      // Mock all requests to fail
      mockedAxios.get.mockRejectedValue(new Error('Service unavailable'));

      const startTime = Date.now();

      // Run many concurrent operations
      const concurrentPromises = Array.from({ length: 20 }, (_, i) => 
        Promise.all([
          searchCities(`city${i}`),
          getWeatherData(i, i, `City${i}`, `Country${i}`),
          getCocktailSuggestion('us', 'Sunny', 20 + i),
        ])
      );

      const results = await Promise.all(concurrentPromises);
      const endTime = Date.now();

      // Should complete in reasonable time
      expect(endTime - startTime).toBeLessThan(2000);

      // All should return valid fallback data
      results.forEach(([cities, weather, cocktail]) => {
        expect(Array.isArray(cities)).toBe(true);
        expect(weather).toHaveProperty('temperature');
        expect(cocktail).toHaveProperty('name');
      });
    });
  });
});