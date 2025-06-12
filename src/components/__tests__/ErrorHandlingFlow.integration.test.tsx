import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { searchCities } from '../../services/geocodingService';
import { getWeatherData } from '../../services/weatherService';
import { getCocktailSuggestion } from '../../services/cocktailService';
import { generateCityImage } from '../../services/imageGenerationService';
import { saveCombination, deleteSavedCombination } from '../../lib/supabase';
import CitySearch from '../CitySearch';
import WeatherDetails from '../WeatherDetails';
import CocktailDetails from '../CocktailDetails';
import SavedCombinations from '../SavedCombinations';
import AuthModal from '../auth/AuthModal';
import { supabase } from '../../lib/supabase';

// Mock all external services
vi.mock('../../services/geocodingService');
vi.mock('../../services/weatherService');
vi.mock('../../services/cocktailService');
vi.mock('../../services/imageGenerationService');
vi.mock('../../lib/supabase');

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

const mockSearchCities = vi.mocked(searchCities);
const mockGetWeatherData = vi.mocked(getWeatherData);
const mockGetCocktailSuggestion = vi.mocked(getCocktailSuggestion);
const mockGenerateCityImage = vi.mocked(generateCityImage);
const mockSaveCombination = vi.mocked(saveCombination);
const mockDeleteSavedCombination = vi.mocked(deleteSavedCombination);
const mockSupabase = vi.mocked(supabase);

// Test component that includes all major components
const ErrorHandlingTestApp = () => {
  const { currentView, showAuthModal } = useAppStore();

  return (
    <div>
      {currentView === 'search' && <CitySearch />}
      {currentView === 'result' && (
        <div>
          <WeatherDetails />
          <CocktailDetails />
          <SavedCombinations />
        </div>
      )}
      {showAuthModal && <AuthModal />}
    </div>
  );
};

describe('Error Handling Flow Integration Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    
    // Spy on console methods to verify error handling
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Reset stores
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

    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      savedCombinations: [],
      userPreferences: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('City Search Error Handling', () => {
    it('should handle geocoding API failures gracefully', async () => {
      // Mock geocoding service to fail
      mockSearchCities.mockRejectedValueOnce(new Error('Geocoding API unavailable'));

      render(<ErrorHandlingTestApp />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'paris');

      // Wait for debounced search
      await waitFor(() => {
        expect(mockSearchCities).toHaveBeenCalledWith('paris');
      }, { timeout: 1000 });

      // Should handle error gracefully
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error searching cities:', expect.any(Error));
      });

      // Should not show any city options
      expect(screen.queryByText('France')).not.toBeInTheDocument();
      
      // App should remain functional
      expect(screen.getByText('Find Your Perfect Sip')).toBeInTheDocument();
    });

    it('should show user-friendly message when no cities are found', async () => {
      // Mock empty response
      mockSearchCities.mockResolvedValueOnce([]);

      render(<ErrorHandlingTestApp />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'nonexistentcity');

      await waitFor(() => {
        expect(mockSearchCities).toHaveBeenCalledWith('nonexistentcity');
      }, { timeout: 1000 });

      // Should not show any options
      expect(screen.queryByText('France')).not.toBeInTheDocument();
      
      // App should remain in search state
      expect(useAppStore.getState().currentView).toBe('search');
    });

    it('should handle network timeouts during city search', async () => {
      // Mock timeout error
      const timeoutError = new Error('timeout of 5000ms exceeded');
      timeoutError.name = 'TimeoutError';
      mockSearchCities.mockRejectedValueOnce(timeoutError);

      render(<ErrorHandlingTestApp />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'slowcity');

      await waitFor(() => {
        expect(mockSearchCities).toHaveBeenCalledWith('slowcity');
      }, { timeout: 1000 });

      // Should handle timeout gracefully
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error searching cities:', expect.any(Error));
      });

      // App should remain functional
      expect(screen.getByPlaceholderText('Enter a city name...')).toBeInTheDocument();
    });
  });

  describe('Weather Data Error Handling', () => {
    it('should handle weather API failures and show fallback data', async () => {
      // Mock successful city search
      mockSearchCities.mockResolvedValueOnce([
        {
          city: 'Paris',
          country: 'France',
          countryCode: 'fr',
          latitude: 48.8566,
          longitude: 2.3522,
        }
      ]);

      // Mock weather API failure but service provides fallback
      mockGetWeatherData.mockResolvedValueOnce({
        city: 'Paris',
        country: 'France',
        latitude: 48.8566,
        longitude: 2.3522,
        temperature: 20,
        condition: 'Partly cloudy',
        icon: '/icons/partly-cloudy.png',
        humidity: 60,
        windSpeed: 10,
        localTime: 'Jun 10, 2025, 3:00 PM',
        isDay: true,
      });

      // Mock other services to succeed
      mockGetCocktailSuggestion.mockResolvedValueOnce({
        name: 'Classic Martini',
        description: 'A timeless cocktail',
        ingredients: ['2 oz gin', '1/2 oz dry vermouth'],
        recipe: ['Stir with ice', 'Strain into glass'],
        imageUrl: 'https://images.pexels.com/photos/5379228/pexels-photo-5379228.jpeg',
        mood: 'sophisticated',
      });

      mockGenerateCityImage.mockResolvedValueOnce(
        'https://images.pexels.com/photos/532826/pexels-photo-532826.jpeg'
      );

      render(<ErrorHandlingTestApp />);

      // Search for city
      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'paris');

      await waitFor(() => {
        expect(screen.getByText('France')).toBeInTheDocument();
      });

      // Select city
      const parisOption = screen.getByText('France').closest('div');
      await user.click(parisOption!);

      // Should show weather data (even if from fallback)
      await waitFor(() => {
        expect(screen.getByText('Weather Details')).toBeInTheDocument();
        expect(screen.getByText('20°C')).toBeInTheDocument();
        expect(screen.getByText('Partly cloudy')).toBeInTheDocument();
      });

      // Should also show cocktail data
      expect(screen.getByText('Cocktail Match')).toBeInTheDocument();
      expect(screen.getByText('Classic Martini')).toBeInTheDocument();
    });

    it('should handle corrupted weather data gracefully', async () => {
      mockSearchCities.mockResolvedValueOnce([
        {
          city: 'London',
          country: 'UK',
          countryCode: 'gb',
          latitude: 51.5074,
          longitude: -0.1278,
        }
      ]);

      // Mock weather service returning incomplete data but handling it internally
      mockGetWeatherData.mockResolvedValueOnce({
        city: 'London',
        country: 'UK',
        latitude: 51.5074,
        longitude: -0.1278,
        temperature: 15,
        condition: 'Unknown',
        icon: '/icons/default.png',
        humidity: 50,
        windSpeed: 8,
        localTime: 'Jun 10, 2025, 3:00 PM',
        isDay: true,
      });

      mockGetCocktailSuggestion.mockResolvedValueOnce({
        name: 'Gin & Tonic',
        description: 'A refreshing British classic',
        ingredients: ['2 oz gin', '4 oz tonic water'],
        recipe: ['Fill glass with ice', 'Add gin', 'Top with tonic'],
        imageUrl: 'https://images.pexels.com/photos/2480828/pexels-photo-2480828.jpeg',
        mood: 'refreshing',
      });

      mockGenerateCityImage.mockResolvedValueOnce(
        'https://images.pexels.com/photos/672532/pexels-photo-672532.jpeg'
      );

      render(<ErrorHandlingTestApp />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'london');

      await waitFor(() => {
        expect(screen.getByText('UK')).toBeInTheDocument();
      });

      const londonOption = screen.getByText('UK').closest('div');
      await user.click(londonOption!);

      // Should display weather data even if some fields are unknown/default
      await waitFor(() => {
        expect(screen.getByText('Weather Details')).toBeInTheDocument();
        expect(screen.getByText('15°C')).toBeInTheDocument();
        expect(screen.getByText('London, UK')).toBeInTheDocument();
      });
    });
  });

  describe('Cocktail Service Error Handling', () => {
    it('should show fallback cocktails when TheCocktailDB is unavailable', async () => {
      mockSearchCities.mockResolvedValueOnce([
        {
          city: 'Tokyo',
          country: 'Japan',
          countryCode: 'jp',
          latitude: 35.6762,
          longitude: 139.6503,
        }
      ]);

      mockGetWeatherData.mockResolvedValueOnce({
        city: 'Tokyo',
        country: 'Japan',
        latitude: 35.6762,
        longitude: 139.6503,
        temperature: 25,
        condition: 'Sunny',
        icon: 'https://openweathermap.org/img/wn/01d@2x.png',
        humidity: 70,
        windSpeed: 15,
        localTime: 'Jun 10, 2025, 3:00 PM',
        isDay: true,
      });

      // Mock cocktail service to return fallback data
      mockGetCocktailSuggestion.mockResolvedValueOnce({
        name: 'Old Fashioned',
        description: 'A classic whiskey cocktail',
        ingredients: ['2 oz bourbon', '1 sugar cube', '2 dashes bitters'],
        recipe: ['Muddle sugar with bitters', 'Add bourbon', 'Stir with ice'],
        imageUrl: 'https://images.pexels.com/photos/5379228/pexels-photo-5379228.jpeg',
        mood: 'classic',
      });

      mockGenerateCityImage.mockResolvedValueOnce(
        'https://images.pexels.com/photos/2506923/pexels-photo-2506923.jpeg'
      );

      render(<ErrorHandlingTestApp />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'tokyo');

      await waitFor(() => {
        expect(screen.getByText('Japan')).toBeInTheDocument();
      });

      const tokyoOption = screen.getByText('Japan').closest('div');
      await user.click(tokyoOption!);

      // Should show fallback cocktail
      await waitFor(() => {
        expect(screen.getByText('Cocktail Match')).toBeInTheDocument();
        expect(screen.getByText('Old Fashioned')).toBeInTheDocument();
        expect(screen.getByText('A classic whiskey cocktail')).toBeInTheDocument();
      });
    });

    it('should handle empty cocktail responses gracefully', async () => {
      mockSearchCities.mockResolvedValueOnce([
        {
          city: 'Berlin',
          country: 'Germany',
          countryCode: 'de',
          latitude: 52.5200,
          longitude: 13.4050,
        }
      ]);

      mockGetWeatherData.mockResolvedValueOnce({
        city: 'Berlin',
        country: 'Germany',
        latitude: 52.5200,
        longitude: 13.4050,
        temperature: 18,
        condition: 'Cloudy',
        icon: 'https://openweathermap.org/img/wn/03d@2x.png',
        humidity: 75,
        windSpeed: 20,
        localTime: 'Jun 10, 2025, 3:00 PM',
        isDay: true,
      });

      // Mock cocktail service to handle empty response internally and return fallback
      mockGetCocktailSuggestion.mockResolvedValueOnce({
        name: 'Gin Fizz',
        description: 'A refreshing gin-based cocktail',
        ingredients: ['2 oz gin', '1 oz lemon juice', 'Club soda'],
        recipe: ['Shake gin and lemon with ice', 'Strain into glass', 'Top with soda'],
        imageUrl: 'https://images.pexels.com/photos/2480828/pexels-photo-2480828.jpeg',
        mood: 'refreshing',
      });

      mockGenerateCityImage.mockResolvedValueOnce(
        'https://images.pexels.com/photos/2800552/pexels-photo-2800552.jpeg'
      );

      render(<ErrorHandlingTestApp />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'berlin');

      await waitFor(() => {
        expect(screen.getByText('Germany')).toBeInTheDocument();
      });

      const berlinOption = screen.getByText('Germany').closest('div');
      await user.click(berlinOption!);

      // Should show fallback cocktail
      await waitFor(() => {
        expect(screen.getByText('Cocktail Match')).toBeInTheDocument();
        expect(screen.getByText('Gin Fizz')).toBeInTheDocument();
      });
    });
  });

  describe('Authentication Error Handling', () => {
    it('should handle authentication failures with user-friendly messages', async () => {
      // Mock authentication failure
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      } as any);

      // Set up app to show auth modal
      useAppStore.setState({ showAuthModal: true });

      render(<ErrorHandlingTestApp />);

      // Should show auth modal
      expect(screen.getByText('Welcome Back')).toBeInTheDocument();

      // Fill in login form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');

      // Submit form
      const loginButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(loginButton);

      // Should show user-friendly error message
      await waitFor(() => {
        expect(screen.getByText('The email or password you entered is incorrect. Please check your credentials and try again.')).toBeInTheDocument();
      });

      // Modal should remain open
      expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    });

    it('should handle network errors during authentication', async () => {
      // Mock network error
      mockSupabase.auth.signInWithPassword.mockRejectedValueOnce(
        new Error('Network error')
      );

      useAppStore.setState({ showAuthModal: true });

      render(<ErrorHandlingTestApp />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const loginButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(loginButton);

      // Should show network error message
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('should handle signup errors gracefully', async () => {
      // Mock signup error
      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'User already registered' },
      } as any);

      useAppStore.setState({ showAuthModal: true });

      render(<ErrorHandlingTestApp />);

      // Switch to signup form
      const signupLink = screen.getByRole('button', { name: /sign up/i });
      await user.click(signupLink);

      expect(screen.getByText('Create Account')).toBeInTheDocument();

      // Fill signup form
      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText('Password');
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      
      await user.type(emailInput, 'existing@example.com');
      await user.type(passwordInput, 'password123');
      await user.type(confirmPasswordInput, 'password123');

      // Submit form
      const createAccountButton = screen.getByRole('button', { name: /create account/i });
      await user.click(createAccountButton);

      // Should show user-friendly error message
      await waitFor(() => {
        expect(screen.getByText('An account with this email already exists. Please sign in instead.')).toBeInTheDocument();
      });
    });
  });

  describe('Database Operation Error Handling', () => {
    it('should handle save combination failures gracefully', async () => {
      // Set up authenticated user and result view
      useAuthStore.setState({
        user: { id: 'user-123', email: 'test@example.com' },
        isAuthenticated: true,
      });

      useAppStore.setState({
        currentView: 'result',
        weatherData: {
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
        },
        cocktailData: {
          name: 'Classic Martini',
          description: 'A timeless cocktail',
          ingredients: ['2 oz gin', '1/2 oz dry vermouth'],
          recipe: ['Stir with ice', 'Strain into glass'],
          imageUrl: 'https://images.pexels.com/photos/5379228/pexels-photo-5379228.jpeg',
          mood: 'sophisticated',
        },
        cityImageUrl: 'https://images.pexels.com/photos/532826/pexels-photo-532826.jpeg',
      });

      // Mock save failure
      mockSaveCombination.mockRejectedValueOnce(new Error('Database connection failed'));

      render(<ErrorHandlingTestApp />);

      // Try to save combination
      const saveButton = screen.getByRole('button', { name: 'Save Combination' });
      await user.click(saveButton);

      // Rating modal should open
      await waitFor(() => {
        expect(screen.getByText('Rate Your Combination')).toBeInTheDocument();
      });

      // Submit save
      const saveModalButton = screen.getByRole('button', { name: 'Save' });
      await user.click(saveModalButton);

      // Should handle error gracefully
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error saving combination:', expect.any(Error));
      });

      // Modal should remain open (save failed)
      expect(screen.getByText('Rate Your Combination')).toBeInTheDocument();
      
      // No combination should be added to store
      expect(useAuthStore.getState().savedCombinations).toHaveLength(0);
    });

    it('should handle delete combination failures gracefully', async () => {
      // Set up authenticated user with saved combinations
      useAuthStore.setState({
        user: { id: 'user-123', email: 'test@example.com' },
        isAuthenticated: true,
        savedCombinations: [
          {
            id: 'combo-123',
            cityName: 'Paris',
            countryName: 'France',
            cityImageUrl: 'https://images.pexels.com/photos/532826/pexels-photo-532826.jpeg',
            weatherDetails: '{"temperature": 22, "condition": "Sunny"}',
            cocktailName: 'Classic Martini',
            cocktailImageUrl: 'https://images.pexels.com/photos/5379228/pexels-photo-5379228.jpeg',
            cocktailIngredients: ['2 oz gin', '1/2 oz dry vermouth'],
            cocktailRecipe: ['Stir with ice', 'Strain into glass'],
            timesAccessed: 0,
            savedAt: '2025-01-10T10:00:00Z',
          }
        ],
      });

      useAppStore.setState({ currentView: 'result' });

      // Mock delete failure
      mockDeleteSavedCombination.mockRejectedValueOnce(new Error('Database error'));

      render(<ErrorHandlingTestApp />);

      // Expand saved combinations
      const savedCombinationsHeader = screen.getByText('Saved Combinations (1)');
      await user.click(savedCombinationsHeader);

      // Try to delete
      const deleteButton = screen.getByRole('button', { name: '' }); // X button
      await user.click(deleteButton);

      // Should handle error gracefully
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error deleting saved combination:', expect.any(Error));
      });

      // Combination should still be in the store (delete failed)
      expect(useAuthStore.getState().savedCombinations).toHaveLength(1);
      expect(screen.getByText('Classic Martini')).toBeInTheDocument();
    });
  });

  describe('Multiple Simultaneous Errors', () => {
    it('should handle multiple API failures during city selection', async () => {
      mockSearchCities.mockResolvedValueOnce([
        {
          city: 'ErrorCity',
          country: 'ErrorCountry',
          countryCode: 'ec',
          latitude: 0,
          longitude: 0,
        }
      ]);

      // Mock all subsequent APIs to fail but services provide fallbacks
      mockGetWeatherData.mockResolvedValueOnce({
        city: 'ErrorCity',
        country: 'ErrorCountry',
        latitude: 0,
        longitude: 0,
        temperature: 20,
        condition: 'Unknown',
        icon: '/icons/default.png',
        humidity: 50,
        windSpeed: 10,
        localTime: 'Jun 10, 2025, 3:00 PM',
        isDay: true,
      });

      mockGetCocktailSuggestion.mockResolvedValueOnce({
        name: 'Fallback Cocktail',
        description: 'A reliable fallback option',
        ingredients: ['2 oz spirit', '1 oz mixer'],
        recipe: ['Mix ingredients', 'Serve'],
        imageUrl: 'https://images.pexels.com/photos/5379228/pexels-photo-5379228.jpeg',
        mood: 'reliable',
      });

      mockGenerateCityImage.mockResolvedValueOnce(
        'https://images.pexels.com/photos/3551600/pexels-photo-3551600.jpeg'
      );

      render(<ErrorHandlingTestApp />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'errorcity');

      await waitFor(() => {
        expect(screen.getByText('ErrorCountry')).toBeInTheDocument();
      });

      const errorCityOption = screen.getByText('ErrorCountry').closest('div');
      await user.click(errorCityOption!);

      // Should still show results (from fallback data)
      await waitFor(() => {
        expect(screen.getByText('Weather Details')).toBeInTheDocument();
        expect(screen.getByText('Cocktail Match')).toBeInTheDocument();
        expect(screen.getByText('Fallback Cocktail')).toBeInTheDocument();
      });

      // App should be in result view despite errors
      expect(useAppStore.getState().currentView).toBe('result');
    });

    it('should maintain app stability during error cascades', async () => {
      // Simulate a cascade of errors
      mockSearchCities.mockRejectedValueOnce(new Error('Search failed'));

      render(<ErrorHandlingTestApp />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      
      // Try multiple searches that fail
      await user.type(searchInput, 'fail1');
      await user.clear(searchInput);
      await user.type(searchInput, 'fail2');
      await user.clear(searchInput);
      await user.type(searchInput, 'fail3');

      // App should remain stable
      expect(screen.getByText('Find Your Perfect Sip')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter a city name...')).toBeInTheDocument();
      
      // Should be able to continue using the app
      expect(useAppStore.getState().currentView).toBe('search');
    });

    it('should provide consistent user experience during partial failures', async () => {
      // Mock partial success scenario
      mockSearchCities.mockResolvedValueOnce([
        {
          city: 'PartialCity',
          country: 'PartialCountry',
          countryCode: 'pc',
          latitude: 10,
          longitude: 10,
        }
      ]);

      // Weather succeeds
      mockGetWeatherData.mockResolvedValueOnce({
        city: 'PartialCity',
        country: 'PartialCountry',
        latitude: 10,
        longitude: 10,
        temperature: 25,
        condition: 'Sunny',
        icon: 'https://openweathermap.org/img/wn/01d@2x.png',
        humidity: 60,
        windSpeed: 15,
        localTime: 'Jun 10, 2025, 3:00 PM',
        isDay: true,
      });

      // Cocktail fails but service provides fallback
      mockGetCocktailSuggestion.mockResolvedValueOnce({
        name: 'Emergency Cocktail',
        description: 'When all else fails',
        ingredients: ['Available ingredients'],
        recipe: ['Mix what you have'],
        imageUrl: 'https://images.pexels.com/photos/5379228/pexels-photo-5379228.jpeg',
        mood: 'adaptive',
      });

      // Image generation fails but service provides fallback
      mockGenerateCityImage.mockResolvedValueOnce(
        'https://images.pexels.com/photos/3551600/pexels-photo-3551600.jpeg'
      );

      render(<ErrorHandlingTestApp />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'partialcity');

      await waitFor(() => {
        expect(screen.getByText('PartialCountry')).toBeInTheDocument();
      });

      const partialCityOption = screen.getByText('PartialCountry').closest('div');
      await user.click(partialCityOption!);

      // Should show complete results despite some failures
      await waitFor(() => {
        expect(screen.getByText('Weather Details')).toBeInTheDocument();
        expect(screen.getByText('25°C')).toBeInTheDocument();
        expect(screen.getByText('Sunny')).toBeInTheDocument();
        
        expect(screen.getByText('Cocktail Match')).toBeInTheDocument();
        expect(screen.getByText('Emergency Cocktail')).toBeInTheDocument();
      });

      // User should not be aware of the failures
      expect(useAppStore.getState().currentView).toBe('result');
    });
  });

  describe('Recovery and Retry Mechanisms', () => {
    it('should allow users to retry failed operations', async () => {
      // First attempt fails
      mockSearchCities.mockRejectedValueOnce(new Error('Network error'));
      
      // Second attempt succeeds
      mockSearchCities.mockResolvedValueOnce([
        {
          city: 'RetryCity',
          country: 'RetryCountry',
          countryCode: 'rc',
          latitude: 20,
          longitude: 20,
        }
      ]);

      render(<ErrorHandlingTestApp />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      
      // First attempt
      await user.type(searchInput, 'retrycity');

      await waitFor(() => {
        expect(mockSearchCities).toHaveBeenCalledWith('retrycity');
      }, { timeout: 1000 });

      // Should handle error
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error searching cities:', expect.any(Error));
      });

      // Clear and retry
      await user.clear(searchInput);
      await user.type(searchInput, 'retrycity');

      // Second attempt should succeed
      await waitFor(() => {
        expect(screen.getByText('RetryCountry')).toBeInTheDocument();
      });

      expect(mockSearchCities).toHaveBeenCalledTimes(2);
    });

    it('should maintain user input during error recovery', async () => {
      mockSearchCities.mockRejectedValueOnce(new Error('Temporary failure'));

      render(<ErrorHandlingTestApp />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'persistentcity');

      await waitFor(() => {
        expect(mockSearchCities).toHaveBeenCalledWith('persistentcity');
      }, { timeout: 1000 });

      // Input value should be preserved despite error
      expect(searchInput).toHaveValue('persistentcity');
      
      // User can continue typing or modify their search
      await user.type(searchInput, ' modified');
      expect(searchInput).toHaveValue('persistentcity modified');
    });

    it('should provide clear feedback about error states', async () => {
      // Mock authentication error with specific message
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      } as any);

      useAppStore.setState({ showAuthModal: true });

      render(<ErrorHandlingTestApp />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'wrongpassword');

      const loginButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(loginButton);

      // Should show specific, helpful error message
      await waitFor(() => {
        expect(screen.getByText('The email or password you entered is incorrect. Please check your credentials and try again.')).toBeInTheDocument();
      });

      // Error should be clearly visible and actionable
      const errorElement = screen.getByText('The email or password you entered is incorrect. Please check your credentials and try again.');
      expect(errorElement).toHaveClass('text-red-700');
    });
  });
});