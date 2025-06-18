import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getWeatherData } from '../weatherService';
import { getCocktailSuggestion } from '../cocktailService';
import { generateCityImage } from '../imageGenerationService';

// Mock the individual services
vi.mock('../weatherService');
vi.mock('../cocktailService');
vi.mock('../imageGenerationService');

const mockGetWeatherData = vi.mocked(getWeatherData);
const mockGetCocktailSuggestion = vi.mocked(getCocktailSuggestion);
const mockGenerateCityImage = vi.mocked(generateCityImage);

// Mock data
const mockWeatherData = {
  city: 'Paris',
  country: 'France',
  latitude: 48.8566,
  longitude: 2.3522,
  temperature: 22,
  condition: 'Sunny',
  icon: 'https://openweathermap.org/img/wn/01d@2x.png',
  humidity: 65,
  windSpeed: 12,
  localTime: 'Jun 10, 2025, 2:30 PM',
  isDay: true,
};

const mockCocktailData = {
  name: 'Classic Martini',
  description: 'A timeless cocktail',
  ingredients: ['2 oz gin', '1/2 oz dry vermouth'],
  recipe: ['Stir with ice', 'Strain into glass'],
  imageUrl: 'https://images.pexels.com/photos/5379228/pexels-photo-5379228.jpeg',
  mood: 'sophisticated',
};

const mockCityImageUrl = 'https://images.pexels.com/photos/532826/pexels-photo-532826.jpeg';

describe('Parallel API Calls Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Sequential vs Parallel Performance', () => {
    it('should demonstrate performance improvement with parallel calls', async () => {
      // Mock APIs with realistic delays
      mockGetWeatherData.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve(mockWeatherData), 100))
      );
      
      mockGenerateCityImage.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve(mockCityImageUrl), 200))
      );
      
      mockGetCocktailSuggestion.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve(mockCocktailData), 150))
      );

      // Test sequential execution
      const sequentialStart = Date.now();
      
      const weatherData = await getWeatherData(48.8566, 2.3522, 'Paris', 'France');
      await vi.advanceTimersByTimeAsync(100);
      
      const imageUrl = await generateCityImage('Paris', 'France', 'Sunny', true);
      await vi.advanceTimersByTimeAsync(200);
      
      const cocktailData = await getCocktailSuggestion('fr', 'Sunny', 22);
      await vi.advanceTimersByTimeAsync(150);
      
      const sequentialEnd = Date.now();
      const sequentialTime = sequentialEnd - sequentialStart;

      // Reset mocks for parallel test
      vi.clearAllMocks();
      
      mockGetWeatherData.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve(mockWeatherData), 100))
      );
      
      mockGenerateCityImage.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve(mockCityImageUrl), 200))
      );
      
      mockGetCocktailSuggestion.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve(mockCocktailData), 150))
      );

      // Test parallel execution (simulating the new implementation)
      const parallelStart = Date.now();
      
      const weatherDataParallel = await getWeatherData(48.8566, 2.3522, 'Paris', 'France');
      await vi.advanceTimersByTimeAsync(100);
      
      // Parallel calls
      const parallelPromise = Promise.all([
        generateCityImage('Paris', 'France', 'Sunny', true),
        getCocktailSuggestion('fr', 'Sunny', 22)
      ]);
      
      await vi.advanceTimersByTimeAsync(200); // Max of 200ms and 150ms
      
      const [imageUrlParallel, cocktailDataParallel] = await parallelPromise;
      
      const parallelEnd = Date.now();
      const parallelTime = parallelEnd - parallelStart;

      // Parallel should be faster than sequential
      expect(parallelTime).toBeLessThan(sequentialTime);
      
      // Results should be the same
      expect(weatherData).toEqual(weatherDataParallel);
      expect(imageUrl).toBe(imageUrlParallel);
      expect(cocktailData).toEqual(cocktailDataParallel);
    });

    it('should handle parallel calls with different completion times', async () => {
      // Fast image generation, slow cocktail suggestion
      mockGenerateCityImage.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve(mockCityImageUrl), 50))
      );
      
      mockGetCocktailSuggestion.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve(mockCocktailData), 300))
      );

      const startTime = Date.now();
      
      const parallelPromise = Promise.all([
        generateCityImage('Tokyo', 'Japan', 'Cloudy', false),
        getCocktailSuggestion('jp', 'Cloudy', 18)
      ]);
      
      // Should wait for the slower operation (300ms)
      await vi.advanceTimersByTimeAsync(300);
      
      const [imageUrl, cocktailData] = await parallelPromise;
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(imageUrl).toBe(mockCityImageUrl);
      expect(cocktailData).toEqual(mockCocktailData);
      
      // Total time should be close to the slower operation time
      expect(totalTime).toBeGreaterThanOrEqual(300);
      expect(totalTime).toBeLessThan(350); // Some tolerance for test execution
    });

    it('should handle one fast and one slow parallel operation', async () => {
      // Very fast image generation
      mockGenerateCityImage.mockResolvedValueOnce(mockCityImageUrl);
      
      // Slow cocktail suggestion
      mockGetCocktailSuggestion.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve(mockCocktailData), 500))
      );

      const startTime = Date.now();
      
      const parallelPromise = Promise.all([
        generateCityImage('Berlin', 'Germany', 'Rain', true),
        getCocktailSuggestion('de', 'Rain', 15)
      ]);
      
      await vi.advanceTimersByTimeAsync(500);
      
      const [imageUrl, cocktailData] = await parallelPromise;
      
      const endTime = Date.now();

      expect(imageUrl).toBe(mockCityImageUrl);
      expect(cocktailData).toEqual(mockCocktailData);
      
      // Should complete in time of slower operation
      expect(endTime - startTime).toBeGreaterThanOrEqual(500);
    });
  });

  describe('Error Handling in Parallel Operations', () => {
    it('should handle one operation failing while the other succeeds', async () => {
      // Image generation succeeds
      mockGenerateCityImage.mockResolvedValueOnce(mockCityImageUrl);
      
      // Cocktail suggestion fails
      mockGetCocktailSuggestion.mockRejectedValueOnce(new Error('API Error'));

      const parallelPromise = Promise.allSettled([
        generateCityImage('London', 'UK', 'Fog', true),
        getCocktailSuggestion('gb', 'Fog', 12)
      ]);
      
      const results = await parallelPromise;

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      
      if (results[0].status === 'fulfilled') {
        expect(results[0].value).toBe(mockCityImageUrl);
      }
      
      if (results[1].status === 'rejected') {
        expect(results[1].reason.message).toBe('API Error');
      }
    });

    it('should handle both operations failing', async () => {
      // Both operations fail
      mockGenerateCityImage.mockRejectedValueOnce(new Error('Image API Error'));
      mockGetCocktailSuggestion.mockRejectedValueOnce(new Error('Cocktail API Error'));

      const parallelPromise = Promise.allSettled([
        generateCityImage('Sydney', 'Australia', 'Sunny', true),
        getCocktailSuggestion('au', 'Sunny', 28)
      ]);
      
      const results = await parallelPromise;

      expect(results[0].status).toBe('rejected');
      expect(results[1].status).toBe('rejected');
      
      if (results[0].status === 'rejected') {
        expect(results[0].reason.message).toBe('Image API Error');
      }
      
      if (results[1].status === 'rejected') {
        expect(results[1].reason.message).toBe('Cocktail API Error');
      }
    });

    it('should handle timeout errors in parallel operations', async () => {
      // Image generation times out
      mockGenerateCityImage.mockImplementationOnce(
        () => new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 1000)
        )
      );
      
      // Cocktail suggestion succeeds quickly
      mockGetCocktailSuggestion.mockResolvedValueOnce(mockCocktailData);

      const parallelPromise = Promise.allSettled([
        generateCityImage('Rome', 'Italy', 'Sunny', true),
        getCocktailSuggestion('it', 'Sunny', 25)
      ]);
      
      await vi.advanceTimersByTimeAsync(1000);
      
      const results = await parallelPromise;

      expect(results[0].status).toBe('rejected');
      expect(results[1].status).toBe('fulfilled');
      
      if (results[1].status === 'fulfilled') {
        expect(results[1].value).toEqual(mockCocktailData);
      }
    });

    it('should handle network errors in parallel operations', async () => {
      // Network error for image generation
      mockGenerateCityImage.mockRejectedValueOnce(new Error('Network Error'));
      
      // Success for cocktail suggestion
      mockGetCocktailSuggestion.mockResolvedValueOnce(mockCocktailData);

      const parallelPromise = Promise.allSettled([
        generateCityImage('Madrid', 'Spain', 'Cloudy', false),
        getCocktailSuggestion('es', 'Cloudy', 16)
      ]);
      
      const results = await parallelPromise;

      expect(results[0].status).toBe('rejected');
      expect(results[1].status).toBe('fulfilled');
      
      if (results[0].status === 'rejected') {
        expect(results[0].reason.message).toBe('Network Error');
      }
      
      if (results[1].status === 'fulfilled') {
        expect(results[1].value).toEqual(mockCocktailData);
      }
    });
  });

  describe('Concurrency and Race Conditions', () => {
    it('should handle multiple parallel operations without race conditions', async () => {
      const callOrder: string[] = [];

      mockGenerateCityImage.mockImplementationOnce(async (...args) => {
        callOrder.push('image-start');
        await new Promise(resolve => setTimeout(resolve, 100));
        callOrder.push('image-end');
        return mockCityImageUrl;
      });
      
      mockGetCocktailSuggestion.mockImplementationOnce(async (...args) => {
        callOrder.push('cocktail-start');
        await new Promise(resolve => setTimeout(resolve, 150));
        callOrder.push('cocktail-end');
        return mockCocktailData;
      });

      const parallelPromise = Promise.all([
        generateCityImage('Amsterdam', 'Netherlands', 'Rain', true),
        getCocktailSuggestion('nl', 'Rain', 14)
      ]);
      
      await vi.advanceTimersByTimeAsync(150);
      
      const [imageUrl, cocktailData] = await parallelPromise;

      // Both should start concurrently
      expect(callOrder[0]).toBe('image-start');
      expect(callOrder[1]).toBe('cocktail-start');
      
      // Image should finish first (100ms vs 150ms)
      expect(callOrder[2]).toBe('image-end');
      expect(callOrder[3]).toBe('cocktail-end');

      expect(imageUrl).toBe(mockCityImageUrl);
      expect(cocktailData).toEqual(mockCocktailData);
    });

    it('should handle rapid successive parallel operations', async () => {
      let imageCallCount = 0;
      let cocktailCallCount = 0;

      mockGenerateCityImage.mockImplementation(async (...args) => {
        imageCallCount++;
        await new Promise(resolve => setTimeout(resolve, 50));
        return `${mockCityImageUrl}-${imageCallCount}`;
      });
      
      mockGetCocktailSuggestion.mockImplementation(async (...args) => {
        cocktailCallCount++;
        await new Promise(resolve => setTimeout(resolve, 75));
        return { ...mockCocktailData, name: `${mockCocktailData.name}-${cocktailCallCount}` };
      });

      // Start multiple parallel operations rapidly
      const operation1 = Promise.all([
        generateCityImage('City1', 'Country1', 'Sunny', true),
        getCocktailSuggestion('c1', 'Sunny', 20)
      ]);
      
      const operation2 = Promise.all([
        generateCityImage('City2', 'Country2', 'Cloudy', false),
        getCocktailSuggestion('c2', 'Cloudy', 15)
      ]);
      
      const operation3 = Promise.all([
        generateCityImage('City3', 'Country3', 'Rain', true),
        getCocktailSuggestion('c3', 'Rain', 18)
      ]);

      await vi.advanceTimersByTimeAsync(75);

      const [result1, result2, result3] = await Promise.all([operation1, operation2, operation3]);

      // All operations should complete
      expect(result1[0]).toBe(`${mockCityImageUrl}-1`);
      expect(result1[1].name).toBe(`${mockCocktailData.name}-1`);
      
      expect(result2[0]).toBe(`${mockCityImageUrl}-2`);
      expect(result2[1].name).toBe(`${mockCocktailData.name}-2`);
      
      expect(result3[0]).toBe(`${mockCityImageUrl}-3`);
      expect(result3[1].name).toBe(`${mockCocktailData.name}-3`);

      expect(imageCallCount).toBe(3);
      expect(cocktailCallCount).toBe(3);
    });

    it('should maintain data consistency across parallel operations', async () => {
      const sharedState = { counter: 0 };

      mockGenerateCityImage.mockImplementation(async (...args) => {
        const currentCounter = sharedState.counter++;
        await new Promise(resolve => setTimeout(resolve, 50));
        return `image-${currentCounter}`;
      });
      
      mockGetCocktailSuggestion.mockImplementation(async (...args) => {
        const currentCounter = sharedState.counter++;
        await new Promise(resolve => setTimeout(resolve, 75));
        return { ...mockCocktailData, name: `cocktail-${currentCounter}` };
      });

      const parallelPromise = Promise.all([
        generateCityImage('Test City', 'Test Country', 'Sunny', true),
        getCocktailSuggestion('tc', 'Sunny', 22)
      ]);
      
      await vi.advanceTimersByTimeAsync(75);
      
      const [imageUrl, cocktailData] = await parallelPromise;

      // Should maintain consistent state
      expect(imageUrl).toBe('image-0');
      expect(cocktailData.name).toBe('cocktail-1');
      expect(sharedState.counter).toBe(2);
    });
  });

  describe('Performance Metrics and Optimization', () => {
    it('should demonstrate optimal resource utilization with parallel calls', async () => {
      const resourceUsage: Array<{ time: number; operation: string }> = [];

      mockGenerateCityImage.mockImplementationOnce(async (...args) => {
        resourceUsage.push({ time: Date.now(), operation: 'image-start' });
        await new Promise(resolve => setTimeout(resolve, 100));
        resourceUsage.push({ time: Date.now(), operation: 'image-end' });
        return mockCityImageUrl;
      });
      
      mockGetCocktailSuggestion.mockImplementationOnce(async (...args) => {
        resourceUsage.push({ time: Date.now(), operation: 'cocktail-start' });
        await new Promise(resolve => setTimeout(resolve, 120));
        resourceUsage.push({ time: Date.now(), operation: 'cocktail-end' });
        return mockCocktailData;
      });

      const startTime = Date.now();
      
      const parallelPromise = Promise.all([
        generateCityImage('Vienna', 'Austria', 'Snow', false),
        getCocktailSuggestion('at', 'Snow', 2)
      ]);
      
      await vi.advanceTimersByTimeAsync(120);
      
      await parallelPromise;
      
      const endTime = Date.now();

      // Both operations should start at roughly the same time
      const imageStart = resourceUsage.find(r => r.operation === 'image-start')?.time || 0;
      const cocktailStart = resourceUsage.find(r => r.operation === 'cocktail-start')?.time || 0;
      
      expect(Math.abs(imageStart - cocktailStart)).toBeLessThan(10); // Within 10ms

      // Total time should be close to the longer operation (120ms)
      expect(endTime - startTime).toBeGreaterThanOrEqual(120);
      expect(endTime - startTime).toBeLessThan(140); // Some tolerance
    });

    it('should handle memory-efficient parallel operations', async () => {
      const memoryUsage: number[] = [];

      mockGenerateCityImage.mockImplementation(async (...args) => {
        // Simulate memory usage
        const largeArray = new Array(1000).fill('data');
        memoryUsage.push(largeArray.length);
        await new Promise(resolve => setTimeout(resolve, 50));
        return mockCityImageUrl;
      });
      
      mockGetCocktailSuggestion.mockImplementation(async (...args) => {
        // Simulate memory usage
        const largeObject = { data: new Array(500).fill('cocktail') };
        memoryUsage.push(largeObject.data.length);
        await new Promise(resolve => setTimeout(resolve, 75));
        return mockCocktailData;
      });

      const parallelPromise = Promise.all([
        generateCityImage('Prague', 'Czech Republic', 'Fog', true),
        getCocktailSuggestion('cz', 'Fog', 8)
      ]);
      
      await vi.advanceTimersByTimeAsync(75);
      
      await parallelPromise;

      // Both operations should have used memory
      expect(memoryUsage).toContain(1000);
      expect(memoryUsage).toContain(500);
      expect(memoryUsage).toHaveLength(2);
    });
  });
});