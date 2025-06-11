import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { getWeatherData, getMockWeatherData } from '../weatherService';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

// Mock Sentry functions
vi.mock('../../lib/sentry', () => ({
  captureError: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

describe('weatherService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getWeatherData', () => {
    it('should return mock data when API key is not provided', async () => {
      // Mock environment to not have API key
      import.meta.env.VITE_WEATHER_API_KEY = undefined;

      const result = await getWeatherData(48.8566, 2.3522, 'Paris', 'France');

      expect(result.city).toBe('Paris');
      expect(result.country).toBe('France');
      expect(result.latitude).toBe(48.8566);
      expect(result.longitude).toBe(2.3522);
      expect(typeof result.temperature).toBe('number');
      expect(typeof result.condition).toBe('string');
      expect(typeof result.isDay).toBe('boolean');
    });

    it('should return mock data when API key is placeholder', async () => {
      import.meta.env.VITE_WEATHER_API_KEY = 'your-weather-api-key';

      const result = await getWeatherData(51.5074, -0.1278, 'London', 'UK');

      expect(result.city).toBe('London');
      expect(result.country).toBe('UK');
      expect(result.latitude).toBe(51.5074);
      expect(result.longitude).toBe(-0.1278);
    });

    it('should call Meteoblue API when valid API key is provided', async () => {
      const mockResponse = {
        data: {
          metadata: {
            utc_timeoffset: 1,
          },
          data_1h: {
            time: ['2025-06-10 12:00'],
            temperature: [22.5],
            relativehumidity: [65],
            windspeed: [3.2],
            pictocode: [1],
            isdaylight: [1],
          },
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);
      import.meta.env.VITE_WEATHER_API_KEY = 'test-weather-key';

      const result = await getWeatherData(48.8566, 2.3522, 'Paris', 'France');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://my.meteoblue.com/packages/basic-1h_basic-day',
        {
          params: {
            apikey: 'test-weather-key',
            lat: 48.8566,
            lon: 2.3522,
            format: 'json',
          },
        }
      );

      expect(result).toEqual({
        city: 'Paris',
        country: 'France',
        latitude: 48.8566,
        longitude: 2.3522,
        temperature: 23, // Rounded from 22.5
        condition: 'Sunny',
        icon: '/icons/meteoblue-1.png',
        humidity: 65,
        windSpeed: 12, // Converted from m/s to km/h and rounded
        localTime: expect.any(String),
        isDay: true,
      });
    });

    it('should fallback to mock data when API call fails', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));
      import.meta.env.VITE_WEATHER_API_KEY = 'test-weather-key';

      const result = await getWeatherData(35.6762, 139.6503, 'Tokyo', 'Japan');

      expect(result.city).toBe('Tokyo');
      expect(result.country).toBe('Japan');
      expect(result.latitude).toBe(35.6762);
      expect(result.longitude).toBe(139.6503);
    });

    it('should handle different weather conditions correctly', async () => {
      const mockResponse = {
        data: {
          metadata: { utc_timeoffset: 0 },
          data_1h: {
            time: ['2025-06-10 20:00'],
            temperature: [5.2],
            relativehumidity: [85],
            windspeed: [5.5],
            pictocode: [14], // Snow
            isdaylight: [0], // Night
          },
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);
      import.meta.env.VITE_WEATHER_API_KEY = 'test-weather-key';

      const result = await getWeatherData(60.1699, 24.9384, 'Helsinki', 'Finland');

      expect(result.temperature).toBe(5);
      expect(result.condition).toBe('Snow');
      expect(result.isDay).toBe(false);
      expect(result.windSpeed).toBe(20); // 5.5 m/s * 3.6 = 19.8, rounded to 20
    });
  });

  describe('getMockWeatherData', () => {
    it('should return consistent structure', () => {
      const result = getMockWeatherData(40.7128, -74.0060, 'New York', 'USA');

      expect(result).toHaveProperty('city', 'New York');
      expect(result).toHaveProperty('country', 'USA');
      expect(result).toHaveProperty('latitude', 40.7128);
      expect(result).toHaveProperty('longitude', -74.0060);
      expect(result).toHaveProperty('temperature');
      expect(result).toHaveProperty('condition');
      expect(result).toHaveProperty('icon');
      expect(result).toHaveProperty('humidity');
      expect(result).toHaveProperty('windSpeed');
      expect(result).toHaveProperty('localTime');
      expect(result).toHaveProperty('isDay');
    });

    it('should return valid temperature ranges for different conditions', () => {
      // Test multiple times to check randomness
      for (let i = 0; i < 10; i++) {
        const result = getMockWeatherData(0, 0, 'Test City', 'Test Country');
        
        expect(result.temperature).toBeGreaterThanOrEqual(-10);
        expect(result.temperature).toBeLessThanOrEqual(35);
        expect(typeof result.temperature).toBe('number');
      }
    });

    it('should return valid weather conditions', () => {
      const validConditions = [
        'Sunny', 'Partly cloudy', 'Cloudy', 'Overcast', 
        'Fog', 'Light rain', 'Rain', 'Light snow', 'Snow'
      ];

      const result = getMockWeatherData(0, 0, 'Test City', 'Test Country');
      
      expect(validConditions).toContain(result.condition);
    });

    it('should return humidity between 0 and 100', () => {
      const result = getMockWeatherData(0, 0, 'Test City', 'Test Country');
      
      expect(result.humidity).toBeGreaterThanOrEqual(0);
      expect(result.humidity).toBeLessThanOrEqual(100);
    });

    it('should return wind speed between 0 and 30', () => {
      const result = getMockWeatherData(0, 0, 'Test City', 'Test Country');
      
      expect(result.windSpeed).toBeGreaterThanOrEqual(0);
      expect(result.windSpeed).toBeLessThanOrEqual(30);
    });

    it('should return boolean for isDay', () => {
      const result = getMockWeatherData(0, 0, 'Test City', 'Test Country');
      
      expect(typeof result.isDay).toBe('boolean');
    });

    it('should return formatted local time', () => {
      const result = getMockWeatherData(0, 0, 'Test City', 'Test Country');
      
      expect(typeof result.localTime).toBe('string');
      expect(result.localTime.length).toBeGreaterThan(0);
    });
  });
});