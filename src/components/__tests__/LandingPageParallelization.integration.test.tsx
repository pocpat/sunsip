import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAppStore } from '../../store/appStore';
import { searchCities } from '../../services/geocodingService';
import { getWeatherData } from '../../services/weatherService';
import { getCocktailSuggestion } from '../../services/cocktailService';
import { generateCityImage } from '../../services/imageGenerationService';
import LandingPage from '../LandingPage';
import type { CityOption, WeatherData, CocktailData } from '../../store/appStore';

// Mock external services
vi.mock('../../services/geocodingService');
vi.mock('../../services/weatherService');
vi.mock('../../services/cocktailService');
vi.mock('../../services/imageGenerationService');

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock auth store to avoid authentication dependencies
vi.mock('../../store/authStore', () => ({
  useAuthStore: () => ({
    user: null,
    isAuthenticated: false,
    addSavedCombination: vi.fn(),
  }),
}));

const mockSearchCities = vi.mocked(searchCities);
const mockGetWeatherData = vi.mocked(getWeatherData);
const mockGetCocktailSuggestion = vi.mocked(getCocktailSuggestion);
const mockGenerateCityImage = vi.mocked(generateCityImage);

// Mock data
const mockCityOptions: CityOption[] = [
  {
    city: 'Paris',
    country: 'France',
    countryCode: 'fr',
    latitude: 48.8566,
    longitude: 2.3522,
  },
];

const mockWeatherData: WeatherData = {
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

const mockCocktailData: CocktailData = {
  name: 'Classic Martini',
  description: 'A timeless cocktail with gin and vermouth, perfect for sophisticated occasions.',
  ingredients: ['2 oz gin', '1/2 oz dry vermouth', 'Lemon twist for garnish'],
  recipe: [
    'Add gin and vermouth to mixing glass with ice',
    'Stir until well chilled',
    'Strain into chilled martini glass',
    'Garnish with lemon twist'
  ],
  imageUrl: 'https://images.pexels.com/photos/5379228/pexels-photo-5379228.jpeg',
  mood: 'sophisticated',
};

const mockCityImageUrl = 'https://images.pexels.com/photos/532826/pexels-photo-532826.jpeg';

describe('LandingPage Parallelization Integration Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    
    // Reset app store to initial state
    useAppStore.setState({
      isLoading: false,
      currentView: 'search',
      cityOptions: [],
      selectedCity: undefined,
      weatherData: undefined,
      cocktailData: undefined,
      cityImageUrl: undefined,
      showAuthModal: false,
    });

    // Use fake timers to control timing
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Parallel API Calls Performance', () => {
    it('should call image generation and cocktail suggestion in parallel after weather data', async () => {
      // Mock API responses with delays to test parallelization
      mockSearchCities.mockResolvedValueOnce(mockCityOptions);
      
      // Weather API - should be called first
      mockGetWeatherData.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve(mockWeatherData), 100))
      );
      
      // These should be called in parallel after weather data is available
      mockGenerateCityImage.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve(mockCityImageUrl), 200))
      );
      
      mockGetCocktailSuggestion.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve(mockCocktailData), 300))
      );

      render(<LandingPage />);

      // Search for a city
      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'paris');

      // Wait for debounced search
      await vi.advanceTimersByTimeAsync(500);

      // City options should appear
      await waitFor(() => {
        expect(screen.getByText('France')).toBeInTheDocument();
      });

      // Click on city option
      const parisOption = screen.getByText('France').closest('div');
      await user.click(parisOption!);

      // Verify weather API is called first
      expect(mockGetWeatherData).toHaveBeenCalledWith(
        48.8566,
        2.3522,
        'Paris',
        'France'
      );

      // Advance time to complete weather API call
      await vi.advanceTimersByTimeAsync(100);

      // Now image and cocktail APIs should be called in parallel
      expect(mockGenerateCityImage).toHaveBeenCalledWith(
        'Paris',
        'France',
        'Sunny',
        true
      );
      
      expect(mockGetCocktailSuggestion).toHaveBeenCalledWith(
        'fr',
        'Sunny',
        22
      );

      // Advance time to complete all parallel calls
      await vi.advanceTimersByTimeAsync(300);

      // Verify view switches to result
      await waitFor(() => {
        expect(useAppStore.getState().currentView).toBe('result');
      });
    });

    it('should handle parallel API calls with different completion times', async () => {
      mockSearchCities.mockResolvedValueOnce(mockCityOptions);
      mockGetWeatherData.mockResolvedValueOnce(mockWeatherData);
      
      // Image generation completes faster than cocktail suggestion
      mockGenerateCityImage.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve(mockCityImageUrl), 50))
      );
      
      mockGetCocktailSuggestion.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve(mockCocktailData), 200))
      );

      render(<LandingPage />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'paris');

      await vi.advanceTimersByTimeAsync(500);

      const parisOption = screen.getByText('France').closest('div');
      await user.click(parisOption!);

      // Both parallel calls should complete, waiting for the slower one
      await vi.advanceTimersByTimeAsync(200);

      await waitFor(() => {
        expect(useAppStore.getState().currentView).toBe('result');
        expect(useAppStore.getState().cityImageUrl).toBe(mockCityImageUrl);
        expect(useAppStore.getState().cocktailData).toEqual(mockCocktailData);
      });
    });

    it('should handle one parallel API call failing while the other succeeds', async () => {
      mockSearchCities.mockResolvedValueOnce(mockCityOptions);
      mockGetWeatherData.mockResolvedValueOnce(mockWeatherData);
      
      // Image generation succeeds
      mockGenerateCityImage.mockResolvedValueOnce(mockCityImageUrl);
      
      // Cocktail suggestion fails
      mockGetCocktailSuggestion.mockRejectedValueOnce(new Error('Cocktail API failed'));

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<LandingPage />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'paris');

      await vi.advanceTimersByTimeAsync(500);

      const parisOption = screen.getByText('France').closest('div');
      await user.click(parisOption!);

      await vi.advanceTimersByTimeAsync(100);

      // Should handle the error gracefully
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error processing city selection:', expect.any(Error));
      });

      // Loading should stop even with partial failure
      expect(useAppStore.getState().isLoading).toBe(false);

      consoleErrorSpy.mockRestore();
    });

    it('should handle both parallel API calls failing', async () => {
      mockSearchCities.mockResolvedValueOnce(mockCityOptions);
      mockGetWeatherData.mockResolvedValueOnce(mockWeatherData);
      
      // Both parallel calls fail
      mockGenerateCityImage.mockRejectedValueOnce(new Error('Image generation failed'));
      mockGetCocktailSuggestion.mockRejectedValueOnce(new Error('Cocktail API failed'));

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<LandingPage />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'paris');

      await vi.advanceTimersByTimeAsync(500);

      const parisOption = screen.getByText('France').closest('div');
      await user.click(parisOption!);

      await vi.advanceTimersByTimeAsync(100);

      // Should handle both errors gracefully
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error processing city selection:', expect.any(Error));
      });

      expect(useAppStore.getState().isLoading).toBe(false);

      consoleErrorSpy.mockRestore();
    });

    it('should maintain correct API call order despite parallelization', async () => {
      const callOrder: string[] = [];

      mockSearchCities.mockResolvedValueOnce(mockCityOptions);
      
      mockGetWeatherData.mockImplementationOnce(async (...args) => {
        callOrder.push('weather');
        return mockWeatherData;
      });
      
      mockGenerateCityImage.mockImplementationOnce(async (...args) => {
        callOrder.push('image');
        return mockCityImageUrl;
      });
      
      mockGetCocktailSuggestion.mockImplementationOnce(async (...args) => {
        callOrder.push('cocktail');
        return mockCocktailData;
      });

      render(<LandingPage />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'paris');

      await vi.advanceTimersByTimeAsync(500);

      const parisOption = screen.getByText('France').closest('div');
      await user.click(parisOption!);

      await vi.advanceTimersByTimeAsync(100);

      await waitFor(() => {
        expect(useAppStore.getState().currentView).toBe('result');
      });

      // Weather should be called first, then image and cocktail in parallel
      expect(callOrder[0]).toBe('weather');
      expect(callOrder.slice(1)).toContain('image');
      expect(callOrder.slice(1)).toContain('cocktail');
      expect(callOrder).toHaveLength(3);
    });

    it('should pass correct parameters to parallel API calls', async () => {
      mockSearchCities.mockResolvedValueOnce(mockCityOptions);
      mockGetWeatherData.mockResolvedValueOnce(mockWeatherData);
      mockGenerateCityImage.mockResolvedValueOnce(mockCityImageUrl);
      mockGetCocktailSuggestion.mockResolvedValueOnce(mockCocktailData);

      render(<LandingPage />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'paris');

      await vi.advanceTimersByTimeAsync(500);

      const parisOption = screen.getByText('France').closest('div');
      await user.click(parisOption!);

      await vi.advanceTimersByTimeAsync(100);

      await waitFor(() => {
        expect(useAppStore.getState().currentView).toBe('result');
      });

      // Verify image generation received correct parameters from weather data
      expect(mockGenerateCityImage).toHaveBeenCalledWith(
        'Paris',
        'France',
        'Sunny',
        true
      );

      // Verify cocktail suggestion received correct parameters from weather data
      expect(mockGetCocktailSuggestion).toHaveBeenCalledWith(
        'fr',
        'Sunny',
        22
      );
    });

    it('should handle rapid successive city selections correctly', async () => {
      const city1Options: CityOption[] = [{
        city: 'London',
        country: 'UK',
        countryCode: 'gb',
        latitude: 51.5074,
        longitude: -0.1278,
      }];

      const city2Options: CityOption[] = [{
        city: 'Tokyo',
        country: 'Japan',
        countryCode: 'jp',
        latitude: 35.6762,
        longitude: 139.6503,
      }];

      mockSearchCities
        .mockResolvedValueOnce(city1Options)
        .mockResolvedValueOnce(city2Options);

      mockGetWeatherData
        .mockResolvedValueOnce({ ...mockWeatherData, city: 'London', country: 'UK' })
        .mockResolvedValueOnce({ ...mockWeatherData, city: 'Tokyo', country: 'Japan' });

      mockGenerateCityImage.mockResolvedValue(mockCityImageUrl);
      mockGetCocktailSuggestion.mockResolvedValue(mockCocktailData);

      render(<LandingPage />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');

      // First search
      await user.type(searchInput, 'london');
      await vi.advanceTimersByTimeAsync(500);

      const londonOption = screen.getByText('UK').closest('div');
      await user.click(londonOption!);

      // Immediately search for another city
      await user.clear(searchInput);
      await user.type(searchInput, 'tokyo');
      await vi.advanceTimersByTimeAsync(500);

      const tokyoOption = screen.getByText('Japan').closest('div');
      await user.click(tokyoOption!);

      await vi.advanceTimersByTimeAsync(100);

      await waitFor(() => {
        expect(useAppStore.getState().currentView).toBe('result');
      });

      // Should end up with Tokyo data (most recent selection)
      expect(useAppStore.getState().weatherData?.city).toBe('Tokyo');
    });
  });

  describe('Performance Improvements', () => {
    it('should complete faster with parallelization than sequential calls', async () => {
      mockSearchCities.mockResolvedValueOnce(mockCityOptions);
      
      // Mock APIs with realistic delays
      mockGetWeatherData.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve(mockWeatherData), 100))
      );
      
      mockGenerateCityImage.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve(mockCityImageUrl), 150))
      );
      
      mockGetCocktailSuggestion.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve(mockCocktailData), 120))
      );

      render(<LandingPage />);

      const startTime = Date.now();

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'paris');

      await vi.advanceTimersByTimeAsync(500);

      const parisOption = screen.getByText('France').closest('div');
      await user.click(parisOption!);

      // Total time should be weather (100ms) + max(image: 150ms, cocktail: 120ms) = 250ms
      // Instead of sequential: 100ms + 150ms + 120ms = 370ms
      await vi.advanceTimersByTimeAsync(250);

      await waitFor(() => {
        expect(useAppStore.getState().currentView).toBe('result');
      });

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // With parallelization, total time should be closer to 250ms than 370ms
      expect(totalTime).toBeLessThan(300);
    });

    it('should handle concurrent requests without race conditions', async () => {
      mockSearchCities.mockResolvedValue(mockCityOptions);
      mockGetWeatherData.mockResolvedValue(mockWeatherData);
      mockGenerateCityImage.mockResolvedValue(mockCityImageUrl);
      mockGetCocktailSuggestion.mockResolvedValue(mockCocktailData);

      render(<LandingPage />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');

      // Trigger multiple rapid selections
      await user.type(searchInput, 'paris');
      await vi.advanceTimersByTimeAsync(500);

      const parisOption = screen.getByText('France').closest('div');
      
      // Click multiple times rapidly
      await user.click(parisOption!);
      await user.click(parisOption!);
      await user.click(parisOption!);

      await vi.advanceTimersByTimeAsync(100);

      await waitFor(() => {
        expect(useAppStore.getState().currentView).toBe('result');
      });

      // Should handle concurrent requests gracefully
      expect(useAppStore.getState().weatherData).toEqual(mockWeatherData);
      expect(useAppStore.getState().cityImageUrl).toBe(mockCityImageUrl);
      expect(useAppStore.getState().cocktailData).toEqual(mockCocktailData);
    });

    it('should maintain loading state correctly during parallel operations', async () => {
      mockSearchCities.mockResolvedValueOnce(mockCityOptions);
      mockGetWeatherData.mockResolvedValueOnce(mockWeatherData);
      
      // Mock longer delays for parallel operations
      mockGenerateCityImage.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve(mockCityImageUrl), 200))
      );
      
      mockGetCocktailSuggestion.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve(mockCocktailData), 300))
      );

      render(<LandingPage />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'paris');

      await vi.advanceTimersByTimeAsync(500);

      const parisOption = screen.getByText('France').closest('div');
      await user.click(parisOption!);

      // Loading should be true during parallel operations
      expect(useAppStore.getState().isLoading).toBe(true);

      // Advance time partially
      await vi.advanceTimersByTimeAsync(200);

      // Should still be loading (waiting for cocktail API)
      expect(useAppStore.getState().isLoading).toBe(true);

      // Complete all operations
      await vi.advanceTimersByTimeAsync(100);

      await waitFor(() => {
        expect(useAppStore.getState().isLoading).toBe(false);
        expect(useAppStore.getState().currentView).toBe('result');
      });
    });
  });

  describe('Error Recovery in Parallel Operations', () => {
    it('should continue with successful operations when one parallel call fails', async () => {
      mockSearchCities.mockResolvedValueOnce(mockCityOptions);
      mockGetWeatherData.mockResolvedValueOnce(mockWeatherData);
      
      // Image generation succeeds
      mockGenerateCityImage.mockResolvedValueOnce(mockCityImageUrl);
      
      // Cocktail suggestion fails
      mockGetCocktailSuggestion.mockRejectedValueOnce(new Error('Service unavailable'));

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<LandingPage />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'paris');

      await vi.advanceTimersByTimeAsync(500);

      const parisOption = screen.getByText('France').closest('div');
      await user.click(parisOption!);

      await vi.advanceTimersByTimeAsync(100);

      // Should have weather data and image, but handle cocktail error gracefully
      expect(useAppStore.getState().weatherData).toEqual(mockWeatherData);
      expect(useAppStore.getState().cityImageUrl).toBe(mockCityImageUrl);
      expect(useAppStore.getState().cocktailData).toBeUndefined();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error processing city selection:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });

    it('should handle timeout errors in parallel operations', async () => {
      mockSearchCities.mockResolvedValueOnce(mockCityOptions);
      mockGetWeatherData.mockResolvedValueOnce(mockWeatherData);
      
      // Image generation times out
      mockGenerateCityImage.mockImplementationOnce(
        () => new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 1000)
        )
      );
      
      // Cocktail suggestion succeeds quickly
      mockGetCocktailSuggestion.mockResolvedValueOnce(mockCocktailData);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<LandingPage />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'paris');

      await vi.advanceTimersByTimeAsync(500);

      const parisOption = screen.getByText('France').closest('div');
      await user.click(parisOption!);

      // Wait for timeout
      await vi.advanceTimersByTimeAsync(1000);

      // Should handle timeout gracefully
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error processing city selection:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });
});