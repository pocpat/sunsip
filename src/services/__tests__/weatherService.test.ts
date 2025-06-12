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
      import.meta.env.VITE_OPENWEATHER_API_KEY = undefined;

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
      import.meta.env.VITE_OPENWEATHER_API_KEY = 'your-weather-api-key';

      const result = await getWeatherData(51.5074, -0.1278, 'London', 'UK');

      expect(result.city).toBe('London');
      expect(result.country).toBe('UK');
      expect(result.latitude).toBe(51.5074);
      expect(result.longitude).toBe(-0.1278);
    });

    it('should call OpenWeatherMap API when valid API key is provided', async () => {
      const mockResponse = {
        data: {
          coord: { lon: 2.3522, lat: 48.8566 },
          weather: [
            {
              id: 800,
              main: 'Clear',
              description: 'clear sky',
              icon: '01d'
            }
          ],
          main: {
            temp: 22.5,
            humidity: 65,
            pressure: 1013
          },
          wind: {
            speed: 3.2
          },
          dt: 1640995200, // Unix timestamp
          sys: {
            sunrise: 1640934000,
            sunset: 1640966400
          },
          timezone: 3600, // UTC offset in seconds
          name: 'Paris'
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);
      import.meta.env.VITE_OPENWEATHER_API_KEY = 'test-weather-key';

      const result = await getWeatherData(48.8566, 2.3522, 'Paris', 'France');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.openweathermap.org/data/2.5/weather',
        {
          params: {
            lat: 48.8566,
            lon: 2.3522,
            appid: 'test-weather-key',
            units: 'metric',
          },
        }
      );

      expect(result).toEqual({
        city: 'Paris',
        country: 'France',
        latitude: 48.8566,
        longitude: 2.3522,
        temperature: 23, // Rounded from 22.5
        condition: 'Sunny', // Mapped from 'Clear'
        icon: 'https://openweathermap.org/img/wn/01d@2x.png',
        humidity: 65,
        windSpeed: 12, // Converted from m/s to km/h and rounded (3.2 * 3.6 = 11.52)
        localTime: expect.any(String),
        isDay: true, // dt is between sunrise and sunset
      });
    });

    it('should fallback to mock data when API call fails', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));
      import.meta.env.VITE_OPENWEATHER_API_KEY = 'test-weather-key';

      const result = await getWeatherData(35.6762, 139.6503, 'Tokyo', 'Japan');

      expect(result.city).toBe('Tokyo');
      expect(result.country).toBe('Japan');
      expect(result.latitude).toBe(35.6762);
      expect(result.longitude).toBe(139.6503);
    });

    it('should handle different weather conditions correctly', async () => {
      const mockResponse = {
        data: {
          coord: { lon: 24.9384, lat: 60.1699 },
          weather: [
            {
              id: 600,
              main: 'Snow',
              description: 'light snow',
              icon: '13n'
            }
          ],
          main: {
            temp: -2.1,
            humidity: 85,
            pressure: 1020
          },
          wind: {
            speed: 5.5
          },
          dt: 1640995200,
          sys: {
            sunrise: 1640934000,
            sunset: 1640940000 // Early sunset (winter)
          },
          timezone: 7200,
          name: 'Helsinki'
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);
      import.meta.env.VITE_OPENWEATHER_API_KEY = 'test-weather-key';

      const result = await getWeatherData(60.1699, 24.9384, 'Helsinki', 'Finland');

      expect(result.temperature).toBe(-2);
      expect(result.condition).toBe('Snow');
      expect(result.isDay).toBe(false); // dt is after sunset
      expect(result.windSpeed).toBe(20); // 5.5 m/s * 3.6 = 19.8, rounded to 20
    });

    it('should correctly determine day/night based on sunrise/sunset', async () => {
      const mockResponse = {
        data: {
          coord: { lon: -74.0060, lat: 40.7128 },
          weather: [
            {
              id: 801,
              main: 'Clouds',
              description: 'few clouds',
              icon: '02d'
            }
          ],
          main: {
            temp: 15.0,
            humidity: 70,
            pressure: 1015
          },
          wind: {
            speed: 2.1
          },
          dt: 1640950000, // Between sunrise and sunset
          sys: {
            sunrise: 1640940000,
            sunset: 1640970000
          },
          timezone: -18000, // EST
          name: 'New York'
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);
      import.meta.env.VITE_OPENWEATHER_API_KEY = 'test-weather-key';

      const result = await getWeatherData(40.7128, -74.0060, 'New York', 'USA');

      expect(result.isDay).toBe(true);
      expect(result.condition).toBe('Cloudy');
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

    it('should return realistic temperature ranges for snow conditions', () => {
      // Test multiple times to check that snow conditions have appropriate temperatures
      for (let i = 0; i < 50; i++) {
        const result = getMockWeatherData(0, 0, 'Test City', 'Test Country');
        
        if (result.condition.toLowerCase().includes('snow')) {
          expect(result.temperature).toBeLessThanOrEqual(2);
          expect(result.temperature).toBeGreaterThanOrEqual(-15);
        }
      }
    });

    it('should return realistic temperature ranges for rain conditions', () => {
      // Test multiple times to check that rain conditions have appropriate temperatures
      for (let i = 0; i < 50; i++) {
        const result = getMockWeatherData(0, 0, 'Test City', 'Test Country');
        
        if (result.condition.toLowerCase().includes('rain')) {
          expect(result.temperature).toBeGreaterThanOrEqual(5);
          expect(result.temperature).toBeLessThanOrEqual(20);
        }
      }
    });

    it('should return realistic temperature ranges for sunny conditions', () => {
      // Test multiple times to check that sunny conditions have appropriate temperatures
      for (let i = 0; i < 50; i++) {
        const result = getMockWeatherData(0, 0, 'Test City', 'Test Country');
        
        if (result.condition === 'Sunny') {
          expect(result.temperature).toBeGreaterThanOrEqual(18);
          expect(result.temperature).toBeLessThanOrEqual(35);
        }
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

    it('should return appropriate humidity for weather conditions', () => {
      for (let i = 0; i < 20; i++) {
        const result = getMockWeatherData(0, 0, 'Test City', 'Test Country');
        
        expect(result.humidity).toBeGreaterThanOrEqual(0);
        expect(result.humidity).toBeLessThanOrEqual(100);
        
        // Check humidity ranges for specific conditions
        if (result.condition.includes('Rain') || result.condition === 'Fog') {
          expect(result.humidity).toBeGreaterThanOrEqual(80);
        } else if (result.condition === 'Sunny') {
          expect(result.humidity).toBeLessThanOrEqual(70);
        }
      }
    });

    it('should return realistic wind speeds', () => {
      const result = getMockWeatherData(0, 0, 'Test City', 'Test Country');
      
      expect(result.windSpeed).toBeGreaterThanOrEqual(2);
      expect(result.windSpeed).toBeLessThanOrEqual(40);
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

    it('should never return snow with temperatures above 2°C', () => {
      // Test many iterations to ensure this rule is never violated
      for (let i = 0; i < 100; i++) {
        const result = getMockWeatherData(0, 0, 'Test City', 'Test Country');
        
        if (result.condition.toLowerCase().includes('snow')) {
          expect(result.temperature).toBeLessThanOrEqual(2);
        }
      }
    });

    it('should return appropriate conditions for extreme temperatures', () => {
      // Test that very cold temperatures don't get sunny weather
      for (let i = 0; i < 50; i++) {
        const result = getMockWeatherData(0, 0, 'Arctic City', 'Arctic Country');
        
        if (result.temperature < -10) {
          expect(result.condition).not.toBe('Sunny');
        }
      }
    });
  });
});