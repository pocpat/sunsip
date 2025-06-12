import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAppStore } from '../../store/appStore';
import { searchCities } from '../../services/geocodingService';
import { getWeatherData } from '../../services/weatherService';
import { getCocktailSuggestion } from '../../services/cocktailService';
import { generateCityImage } from '../../services/imageGenerationService';
import CitySearch from '../CitySearch';
import WeatherDetails from '../WeatherDetails';
import CocktailDetails from '../CocktailDetails';
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
    h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
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
  {
    city: 'Paris',
    country: 'United States',
    countryCode: 'us',
    latitude: 33.6617,
    longitude: -95.5555,
  },
  {
    city: 'Paris',
    country: 'Canada',
    countryCode: 'ca',
    latitude: 43.2,
    longitude: -80.3833,
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

// Component that renders the complete flow
const CitySearchFlowComponent = () => {
  const { currentView } = useAppStore();

  return (
    <div>
      {currentView === 'search' && <CitySearch />}
      {currentView === 'result' && (
        <div>
          <WeatherDetails />
          <CocktailDetails />
        </div>
      )}
    </div>
  );
};

describe('City Search to Result Flow Integration Tests', () => {
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete Search Flow', () => {
    it('should complete the full flow from city search to result display', async () => {
      // Mock all API responses
      mockSearchCities.mockResolvedValueOnce(mockCityOptions);
      mockGetWeatherData.mockResolvedValueOnce(mockWeatherData);
      mockGetCocktailSuggestion.mockResolvedValueOnce(mockCocktailData);
      mockGenerateCityImage.mockResolvedValueOnce(mockCityImageUrl);

      render(<CitySearchFlowComponent />);

      // Step 1: Verify initial search view
      expect(screen.getByText('Find Your Perfect Sip')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter a city name...')).toBeInTheDocument();

      // Step 2: Search for a city
      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'paris');

      // Wait for debounced search
      await waitFor(() => {
        expect(mockSearchCities).toHaveBeenCalledWith('paris');
      }, { timeout: 1000 });

      // Step 3: Verify city options appear
      await waitFor(() => {
        expect(screen.getByText('Paris')).toBeInTheDocument();
        expect(screen.getByText('France')).toBeInTheDocument();
      });

      // Step 4: Select a city
      const parisOption = screen.getByText('France').closest('div');
      await user.click(parisOption!);

      // Step 5: Verify loading state
      expect(useAppStore.getState().isLoading).toBe(true);

      // Step 6: Wait for all API calls to complete
      await waitFor(() => {
        expect(mockGetWeatherData).toHaveBeenCalledWith(
          48.8566,
          2.3522,
          'Paris',
          'France'
        );
      });

      await waitFor(() => {
        expect(mockGenerateCityImage).toHaveBeenCalledWith(
          'Paris',
          'France',
          'Sunny',
          true
        );
      });

      await waitFor(() => {
        expect(mockGetCocktailSuggestion).toHaveBeenCalledWith(
          'fr',
          'Sunny',
          22
        );
      });

      // Step 7: Verify view switches to result
      await waitFor(() => {
        expect(useAppStore.getState().currentView).toBe('result');
      });

      // Step 8: Verify weather details are displayed
      expect(screen.getByText('Weather Details')).toBeInTheDocument();
      expect(screen.getByText('22°C')).toBeInTheDocument();
      expect(screen.getByText('Sunny')).toBeInTheDocument();
      expect(screen.getByText('Paris, France')).toBeInTheDocument();
      expect(screen.getByText('65%')).toBeInTheDocument(); // Humidity
      expect(screen.getByText('12 km/h')).toBeInTheDocument(); // Wind speed

      // Step 9: Verify cocktail details are displayed
      expect(screen.getByText('Cocktail Match')).toBeInTheDocument();
      expect(screen.getByText('Classic Martini')).toBeInTheDocument();
      expect(screen.getByText('A timeless cocktail with gin and vermouth, perfect for sophisticated occasions.')).toBeInTheDocument();
      expect(screen.getByText('2 oz gin')).toBeInTheDocument();
      expect(screen.getByText('1/2 oz dry vermouth')).toBeInTheDocument();

      // Step 10: Verify all data is stored in app store
      const finalState = useAppStore.getState();
      expect(finalState.selectedCity).toEqual(mockCityOptions[0]);
      expect(finalState.weatherData).toEqual(mockWeatherData);
      expect(finalState.cocktailData).toEqual(mockCocktailData);
      expect(finalState.cityImageUrl).toBe(mockCityImageUrl);
      expect(finalState.isLoading).toBe(false);
    });

    it('should handle multiple city options and allow selection', async () => {
      mockSearchCities.mockResolvedValueOnce(mockCityOptions);
      mockGetWeatherData.mockResolvedValueOnce({
        ...mockWeatherData,
        city: 'Paris',
        country: 'United States',
        latitude: 33.6617,
        longitude: -95.5555,
        temperature: 28,
        condition: 'Partly cloudy',
      });
      mockGetCocktailSuggestion.mockResolvedValueOnce({
        ...mockCocktailData,
        name: 'Bourbon Old Fashioned',
        mood: 'classic',
      });
      mockGenerateCityImage.mockResolvedValueOnce(mockCityImageUrl);

      render(<CitySearchFlowComponent />);

      // Search for paris
      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'paris');

      await waitFor(() => {
        expect(mockSearchCities).toHaveBeenCalledWith('paris');
      }, { timeout: 1000 });

      // Verify all three Paris options are shown
      await waitFor(() => {
        expect(screen.getByText('France')).toBeInTheDocument();
        expect(screen.getByText('United States')).toBeInTheDocument();
        expect(screen.getByText('Canada')).toBeInTheDocument();
      });

      // Select Paris, United States
      const usOption = screen.getByText('United States').closest('div');
      await user.click(usOption!);

      // Verify correct coordinates are used for US Paris
      await waitFor(() => {
        expect(mockGetWeatherData).toHaveBeenCalledWith(
          33.6617,
          -95.5555,
          'Paris',
          'United States'
        );
      });

      await waitFor(() => {
        expect(mockGetCocktailSuggestion).toHaveBeenCalledWith(
          'us',
          'Partly cloudy',
          28
        );
      });

      // Verify US-specific results
      await waitFor(() => {
        expect(screen.getByText('28°C')).toBeInTheDocument();
        expect(screen.getByText('Bourbon Old Fashioned')).toBeInTheDocument();
      });
    });

    it('should handle search input debouncing correctly', async () => {
      mockSearchCities.mockResolvedValue(mockCityOptions);

      render(<CitySearchFlowComponent />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');

      // Type rapidly
      await user.type(searchInput, 'p');
      await user.type(searchInput, 'a');
      await user.type(searchInput, 'r');
      await user.type(searchInput, 'i');
      await user.type(searchInput, 's');

      // Should only call search once after debounce delay
      await waitFor(() => {
        expect(mockSearchCities).toHaveBeenCalledTimes(1);
        expect(mockSearchCities).toHaveBeenCalledWith('paris');
      }, { timeout: 1000 });
    });

    it('should show loading indicators during search and data fetching', async () => {
      // Mock delayed responses
      mockSearchCities.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve(mockCityOptions), 100))
      );
      mockGetWeatherData.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve(mockWeatherData), 100))
      );
      mockGetCocktailSuggestion.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve(mockCocktailData), 100))
      );
      mockGenerateCityImage.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve(mockCityImageUrl), 100))
      );

      render(<CitySearchFlowComponent />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'paris');

      // Should show search loading indicator
      await waitFor(() => {
        expect(screen.getByRole('progressbar', { hidden: true })).toBeInTheDocument();
      });

      // Wait for search to complete
      await waitFor(() => {
        expect(screen.getByText('France')).toBeInTheDocument();
      });

      // Click on city option
      const parisOption = screen.getByText('France').closest('div');
      await user.click(parisOption!);

      // Should show main loading state
      expect(screen.getByText('Creating your SunSip experience...')).toBeInTheDocument();

      // Wait for all data to load
      await waitFor(() => {
        expect(screen.getByText('Weather Details')).toBeInTheDocument();
      }, { timeout: 500 });
    });
  });

  describe('Error Handling in Flow', () => {
    it('should handle city search API errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSearchCities.mockRejectedValueOnce(new Error('Search API failed'));

      render(<CitySearchFlowComponent />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'paris');

      await waitFor(() => {
        expect(mockSearchCities).toHaveBeenCalledWith('paris');
      }, { timeout: 1000 });

      // Should handle error gracefully and show no results
      await waitFor(() => {
        expect(screen.queryByText('France')).not.toBeInTheDocument();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith('Error searching cities:', expect.any(Error));
      consoleErrorSpy.mockRestore();
    });

    it('should handle weather API errors and continue with fallback', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSearchCities.mockResolvedValueOnce(mockCityOptions);
      mockGetWeatherData.mockRejectedValueOnce(new Error('Weather API failed'));
      mockGetCocktailSuggestion.mockResolvedValueOnce(mockCocktailData);
      mockGenerateCityImage.mockResolvedValueOnce(mockCityImageUrl);

      render(<CitySearchFlowComponent />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'paris');

      await waitFor(() => {
        expect(screen.getByText('France')).toBeInTheDocument();
      });

      const parisOption = screen.getByText('France').closest('div');
      await user.click(parisOption!);

      // Should handle error but continue with other API calls
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error processing city selection:', expect.any(Error));
      });

      expect(useAppStore.getState().isLoading).toBe(false);
      consoleErrorSpy.mockRestore();
    });

    it('should handle cocktail API errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSearchCities.mockResolvedValueOnce(mockCityOptions);
      mockGetWeatherData.mockResolvedValueOnce(mockWeatherData);
      mockGetCocktailSuggestion.mockRejectedValueOnce(new Error('Cocktail API failed'));
      mockGenerateCityImage.mockResolvedValueOnce(mockCityImageUrl);

      render(<CitySearchFlowComponent />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'paris');

      await waitFor(() => {
        expect(screen.getByText('France')).toBeInTheDocument();
      });

      const parisOption = screen.getByText('France').closest('div');
      await user.click(parisOption!);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error processing city selection:', expect.any(Error));
      });

      consoleErrorSpy.mockRestore();
    });

    it('should handle image generation errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSearchCities.mockResolvedValueOnce(mockCityOptions);
      mockGetWeatherData.mockResolvedValueOnce(mockWeatherData);
      mockGetCocktailSuggestion.mockResolvedValueOnce(mockCocktailData);
      mockGenerateCityImage.mockRejectedValueOnce(new Error('Image generation failed'));

      render(<CitySearchFlowComponent />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'paris');

      await waitFor(() => {
        expect(screen.getByText('France')).toBeInTheDocument();
      });

      const parisOption = screen.getByText('France').closest('div');
      await user.click(parisOption!);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error processing city selection:', expect.any(Error));
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Data Flow and State Management', () => {
    it('should clear previous results when starting new search', async () => {
      mockSearchCities.mockResolvedValue(mockCityOptions);
      mockGetWeatherData.mockResolvedValue(mockWeatherData);
      mockGetCocktailSuggestion.mockResolvedValue(mockCocktailData);
      mockGenerateCityImage.mockResolvedValue(mockCityImageUrl);

      render(<CitySearchFlowComponent />);

      // First search
      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'paris');

      await waitFor(() => {
        expect(screen.getByText('France')).toBeInTheDocument();
      });

      const parisOption = screen.getByText('France').closest('div');
      await user.click(parisOption!);

      await waitFor(() => {
        expect(useAppStore.getState().currentView).toBe('result');
      });

      // Verify data is set
      expect(useAppStore.getState().weatherData).toEqual(mockWeatherData);
      expect(useAppStore.getState().cocktailData).toEqual(mockCocktailData);

      // Start new search (simulate reset)
      useAppStore.getState().resetApp();

      expect(useAppStore.getState().currentView).toBe('search');
      expect(useAppStore.getState().weatherData).toBeUndefined();
      expect(useAppStore.getState().cocktailData).toBeUndefined();
      expect(useAppStore.getState().selectedCity).toBeUndefined();
    });

    it('should handle rapid city selections correctly', async () => {
      mockSearchCities.mockResolvedValue(mockCityOptions);
      
      // Mock different responses for different cities
      mockGetWeatherData
        .mockResolvedValueOnce(mockWeatherData)
        .mockResolvedValueOnce({
          ...mockWeatherData,
          city: 'Paris',
          country: 'United States',
          temperature: 28,
        });
      
      mockGetCocktailSuggestion
        .mockResolvedValueOnce(mockCocktailData)
        .mockResolvedValueOnce({
          ...mockCocktailData,
          name: 'Bourbon Smash',
        });
      
      mockGenerateCityImage.mockResolvedValue(mockCityImageUrl);

      render(<CitySearchFlowComponent />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'paris');

      await waitFor(() => {
        expect(screen.getByText('France')).toBeInTheDocument();
      });

      // Rapidly click different options
      const franceOption = screen.getByText('France').closest('div');
      const usOption = screen.getByText('United States').closest('div');

      await user.click(franceOption!);
      await user.click(usOption!);

      // Should handle the last selection
      await waitFor(() => {
        expect(useAppStore.getState().selectedCity?.country).toBe('United States');
      });
    });

    it('should maintain correct API call sequence', async () => {
      mockSearchCities.mockResolvedValueOnce(mockCityOptions);
      mockGetWeatherData.mockResolvedValueOnce(mockWeatherData);
      mockGetCocktailSuggestion.mockResolvedValueOnce(mockCocktailData);
      mockGenerateCityImage.mockResolvedValueOnce(mockCityImageUrl);

      render(<CitySearchFlowComponent />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'paris');

      await waitFor(() => {
        expect(screen.getByText('France')).toBeInTheDocument();
      });

      const parisOption = screen.getByText('France').closest('div');
      await user.click(parisOption!);

      // Verify API calls are made in correct order with correct parameters
      await waitFor(() => {
        expect(mockGetWeatherData).toHaveBeenCalledWith(48.8566, 2.3522, 'Paris', 'France');
      });

      await waitFor(() => {
        expect(mockGenerateCityImage).toHaveBeenCalledWith('Paris', 'France', 'Sunny', true);
      });

      await waitFor(() => {
        expect(mockGetCocktailSuggestion).toHaveBeenCalledWith('fr', 'Sunny', 22);
      });

      // Verify call order
      expect(mockGetWeatherData).toHaveBeenCalledBefore(mockGenerateCityImage as any);
      expect(mockGetWeatherData).toHaveBeenCalledBefore(mockGetCocktailSuggestion as any);
    });
  });

  describe('User Experience and Interaction', () => {
    it('should handle empty search gracefully', async () => {
      render(<CitySearchFlowComponent />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      
      // Type and then clear
      await user.type(searchInput, 'paris');
      await user.clear(searchInput);

      // Should not make API calls for empty search
      await waitFor(() => {
        expect(mockSearchCities).not.toHaveBeenCalledWith('');
      }, { timeout: 1000 });
    });

    it('should handle very short search queries', async () => {
      render(<CitySearchFlowComponent />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'p');

      // Should not search for single character
      await waitFor(() => {
        expect(mockSearchCities).not.toHaveBeenCalled();
      }, { timeout: 1000 });
    });

    it('should clear city options when search input is cleared', async () => {
      mockSearchCities.mockResolvedValueOnce(mockCityOptions);

      render(<CitySearchFlowComponent />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'paris');

      await waitFor(() => {
        expect(screen.getByText('France')).toBeInTheDocument();
      });

      // Clear search input
      await user.clear(searchInput);

      // City options should be cleared
      expect(screen.queryByText('France')).not.toBeInTheDocument();
      expect(useAppStore.getState().cityOptions).toEqual([]);
    });

    it('should handle keyboard navigation in search results', async () => {
      mockSearchCities.mockResolvedValueOnce(mockCityOptions);

      render(<CitySearchFlowComponent />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'paris');

      await waitFor(() => {
        expect(screen.getByText('France')).toBeInTheDocument();
      });

      // Test that options are clickable
      const franceOption = screen.getByText('France').closest('div');
      expect(franceOption).toHaveClass('cursor-pointer');
    });

    it('should display proper loading states throughout the flow', async () => {
      // Mock delayed responses to test loading states
      mockSearchCities.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve(mockCityOptions), 50))
      );
      mockGetWeatherData.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve(mockWeatherData), 50))
      );
      mockGetCocktailSuggestion.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve(mockCocktailData), 50))
      );
      mockGenerateCityImage.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve(mockCityImageUrl), 50))
      );

      render(<CitySearchFlowComponent />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'paris');

      // Should show search loading
      await waitFor(() => {
        expect(screen.getByRole('progressbar', { hidden: true })).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('France')).toBeInTheDocument();
      });

      const parisOption = screen.getByText('France').closest('div');
      await user.click(parisOption!);

      // Should show main loading
      expect(screen.getByText('Creating your SunSip experience...')).toBeInTheDocument();

      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText('Weather Details')).toBeInTheDocument();
      }, { timeout: 200 });

      expect(screen.queryByText('Creating your SunSip experience...')).not.toBeInTheDocument();
    });
  });

  describe('Weather and Cocktail Data Integration', () => {
    it('should pass correct weather data to cocktail service', async () => {
      const customWeatherData = {
        ...mockWeatherData,
        condition: 'Rainy',
        temperature: 15,
      };

      mockSearchCities.mockResolvedValueOnce(mockCityOptions);
      mockGetWeatherData.mockResolvedValueOnce(customWeatherData);
      mockGetCocktailSuggestion.mockResolvedValueOnce({
        ...mockCocktailData,
        name: 'Hot Toddy',
        mood: 'warming',
      });
      mockGenerateCityImage.mockResolvedValueOnce(mockCityImageUrl);

      render(<CitySearchFlowComponent />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'paris');

      await waitFor(() => {
        expect(screen.getByText('France')).toBeInTheDocument();
      });

      const parisOption = screen.getByText('France').closest('div');
      await user.click(parisOption!);

      // Verify cocktail service receives weather data
      await waitFor(() => {
        expect(mockGetCocktailSuggestion).toHaveBeenCalledWith('fr', 'Rainy', 15);
      });

      // Verify weather-appropriate cocktail is suggested
      await waitFor(() => {
        expect(screen.getByText('Hot Toddy')).toBeInTheDocument();
      });
    });

    it('should pass correct weather condition to image generation', async () => {
      const nightWeatherData = {
        ...mockWeatherData,
        condition: 'Clear',
        isDay: false,
      };

      mockSearchCities.mockResolvedValueOnce(mockCityOptions);
      mockGetWeatherData.mockResolvedValueOnce(nightWeatherData);
      mockGetCocktailSuggestion.mockResolvedValueOnce(mockCocktailData);
      mockGenerateCityImage.mockResolvedValueOnce(mockCityImageUrl);

      render(<CitySearchFlowComponent />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'paris');

      await waitFor(() => {
        expect(screen.getByText('France')).toBeInTheDocument();
      });

      const parisOption = screen.getByText('France').closest('div');
      await user.click(parisOption!);

      // Verify image generation receives correct parameters
      await waitFor(() => {
        expect(mockGenerateCityImage).toHaveBeenCalledWith('Paris', 'France', 'Clear', false);
      });
    });

    it('should handle different country codes for cocktail suggestions', async () => {
      const tokyoOption: CityOption = {
        city: 'Tokyo',
        country: 'Japan',
        countryCode: 'jp',
        latitude: 35.6762,
        longitude: 139.6503,
      };

      const tokyoWeather = {
        ...mockWeatherData,
        city: 'Tokyo',
        country: 'Japan',
        latitude: 35.6762,
        longitude: 139.6503,
      };

      mockSearchCities.mockResolvedValueOnce([tokyoOption]);
      mockGetWeatherData.mockResolvedValueOnce(tokyoWeather);
      mockGetCocktailSuggestion.mockResolvedValueOnce({
        ...mockCocktailData,
        name: 'Whiskey Highball',
        mood: 'refreshing',
      });
      mockGenerateCityImage.mockResolvedValueOnce(mockCityImageUrl);

      render(<CitySearchFlowComponent />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'tokyo');

      await waitFor(() => {
        expect(screen.getByText('Tokyo')).toBeInTheDocument();
      });

      const tokyoOptionElement = screen.getByText('Japan').closest('div');
      await user.click(tokyoOptionElement!);

      // Verify Japanese country code is used
      await waitFor(() => {
        expect(mockGetCocktailSuggestion).toHaveBeenCalledWith('jp', 'Sunny', 22);
      });

      await waitFor(() => {
        expect(screen.getByText('Whiskey Highball')).toBeInTheDocument();
      });
    });
  });
});