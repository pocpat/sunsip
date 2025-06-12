import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import axios from 'axios';
import CitySearch from '../CitySearch';
import WeatherDetails from '../WeatherDetails';
import CocktailDetails from '../CocktailDetails';
import AuthModal from '../auth/AuthModal';
import { supabase } from '../../lib/supabase';

// Mock axios to simulate network conditions
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
    },
  },
  saveCombination: vi.fn(),
  deleteSavedCombination: vi.fn(),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

const mockSupabase = vi.mocked(supabase);

// Network simulation utilities
const simulateNetworkOutage = () => {
  mockedAxios.get.mockRejectedValue(new Error('Network Error'));
  mockedAxios.post.mockRejectedValue(new Error('Network Error'));
  mockSupabase.auth.signInWithPassword.mockRejectedValue(new Error('Network Error'));
  mockSupabase.auth.signUp.mockRejectedValue(new Error('Network Error'));
};

const simulateSlowNetwork = (delay: number = 5000) => {
  mockedAxios.get.mockImplementation(
    () => new Promise((resolve, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), delay)
    )
  );
  mockSupabase.auth.signInWithPassword.mockImplementation(
    () => new Promise((resolve, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), delay)
    )
  );
};

const simulateIntermittentConnectivity = () => {
  let callCount = 0;
  mockedAxios.get.mockImplementation(() => {
    callCount++;
    if (callCount % 3 === 0) {
      return Promise.resolve({
        data: {
          results: [
            {
              city: 'TestCity',
              country: 'TestCountry',
              country_code: 'tc',
              lat: 0,
              lon: 0,
            }
          ],
        },
      });
    }
    return Promise.reject(new Error('Intermittent failure'));
  });
};

const restoreNetwork = () => {
  mockedAxios.get.mockResolvedValue({
    data: {
      results: [
        {
          city: 'Paris',
          country: 'France',
          country_code: 'fr',
          lat: 48.8566,
          lon: 2.3522,
        }
      ],
    },
  });
  mockSupabase.auth.signInWithPassword.mockResolvedValue({
    data: {
      user: { id: 'user-123', email: 'test@example.com' },
      session: { user: { id: 'user-123', email: 'test@example.com' }, access_token: 'token' },
    },
    error: null,
  } as any);
};

describe('Network Outage Simulation Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;
  let consoleErrorSpy: any;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
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

    // Set API keys to trigger actual API calls
    import.meta.env.VITE_GEOCODING_API_KEY = 'test-key';
    import.meta.env.VITE_OPENWEATHER_API_KEY = 'test-key';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    consoleErrorSpy.mockRestore();
  });

  describe('Complete Network Outage', () => {
    it('should handle complete network outage during city search', async () => {
      simulateNetworkOutage();

      render(<CitySearch />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'paris');

      // Wait for debounced search
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalled();
      }, { timeout: 1000 });

      // Should handle network error gracefully
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error searching cities:', expect.any(Error));
      });

      // Should not show any city options (fallback to empty)
      expect(screen.queryByText('France')).not.toBeInTheDocument();
      
      // App should remain functional
      expect(screen.getByText('Find Your Perfect Sip')).toBeInTheDocument();
      expect(searchInput).toBeInTheDocument();
    });

    it('should show fallback data when all APIs are down', async () => {
      simulateNetworkOutage();

      // Set up app state as if user selected a city before network went down
      useAppStore.setState({
        currentView: 'result',
        selectedCity: {
          city: 'Paris',
          country: 'France',
          countryCode: 'fr',
          latitude: 48.8566,
          longitude: 2.3522,
        },
        weatherData: {
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

      render(
        <div>
          <WeatherDetails />
          <CocktailDetails />
        </div>
      );

      // Should display cached/fallback data
      expect(screen.getByText('Weather Details')).toBeInTheDocument();
      expect(screen.getByText('20°C')).toBeInTheDocument();
      expect(screen.getByText('Partly cloudy')).toBeInTheDocument();
      
      expect(screen.getByText('Cocktail Match')).toBeInTheDocument();
      expect(screen.getByText('Classic Martini')).toBeInTheDocument();
    });

    it('should handle authentication failures during network outage', async () => {
      simulateNetworkOutage();

      useAppStore.setState({ showAuthModal: true });

      render(<AuthModal />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const loginButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(loginButton);

      // Should show network error
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });

      // Modal should remain open
      expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    });

    it('should provide offline-like experience with cached data', async () => {
      // First, simulate successful data loading
      restoreNetwork();

      render(<CitySearch />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'paris');

      await waitFor(() => {
        expect(screen.getByText('France')).toBeInTheDocument();
      });

      // Now simulate network outage
      simulateNetworkOutage();

      // User should still be able to interact with loaded data
      const parisOption = screen.getByText('France').closest('div');
      expect(parisOption).toBeInTheDocument();
      
      // App should remain responsive
      expect(screen.getByText('Find Your Perfect Sip')).toBeInTheDocument();
    });
  });

  describe('Slow Network Conditions', () => {
    it('should handle very slow API responses', async () => {
      simulateSlowNetwork(2000);

      render(<CitySearch />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'paris');

      // Should show loading indicator
      await waitFor(() => {
        expect(screen.getByRole('progressbar', { hidden: true })).toBeInTheDocument();
      });

      // Should eventually timeout and handle gracefully
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error searching cities:', expect.any(Error));
      }, { timeout: 3000 });

      // Loading indicator should disappear
      expect(screen.queryByRole('progressbar', { hidden: true })).not.toBeInTheDocument();
    });

    it('should handle slow authentication requests', async () => {
      simulateSlowNetwork(3000);

      useAppStore.setState({ showAuthModal: true });

      render(<AuthModal />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const loginButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(loginButton);

      // Should show loading state
      expect(screen.getByText('Signing in...')).toBeInTheDocument();
      expect(loginButton).toBeDisabled();

      // Should eventually timeout
      await waitFor(() => {
        expect(screen.getByText('Request timeout')).toBeInTheDocument();
      }, { timeout: 4000 });

      // Should return to normal state
      expect(screen.queryByText('Signing in...')).not.toBeInTheDocument();
      expect(loginButton).not.toBeDisabled();
    });

    it('should allow users to cancel slow operations', async () => {
      simulateSlowNetwork(10000);

      useAppStore.setState({ showAuthModal: true });

      render(<AuthModal />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const loginButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(loginButton);

      // Should show loading state
      expect(screen.getByText('Signing in...')).toBeInTheDocument();

      // User should be able to close modal during loading
      const closeButton = screen.getByRole('button', { name: '' }); // X button
      await user.click(closeButton);

      // Modal should close
      expect(useAppStore.getState().showAuthModal).toBe(false);
    });
  });

  describe('Intermittent Connectivity', () => {
    it('should handle intermittent network failures', async () => {
      simulateIntermittentConnectivity();

      render(<CitySearch />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      
      // First search (should fail)
      await user.type(searchInput, 'test1');
      
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalled();
      }, { timeout: 1000 });

      // Clear and try again (should fail)
      await user.clear(searchInput);
      await user.type(searchInput, 'test2');

      // Third attempt should succeed
      await user.clear(searchInput);
      await user.type(searchInput, 'test3');

      await waitFor(() => {
        expect(screen.getByText('TestCountry')).toBeInTheDocument();
      });

      expect(mockedAxios.get).toHaveBeenCalledTimes(3);
    });

    it('should maintain user experience during connectivity issues', async () => {
      simulateIntermittentConnectivity();

      render(<CitySearch />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      
      // Multiple rapid searches
      await user.type(searchInput, 'a');
      await user.clear(searchInput);
      await user.type(searchInput, 'b');
      await user.clear(searchInput);
      await user.type(searchInput, 'c');

      // App should remain responsive
      expect(screen.getByText('Find Your Perfect Sip')).toBeInTheDocument();
      expect(searchInput).toBeInTheDocument();
      
      // Eventually should get results
      await waitFor(() => {
        expect(screen.getByText('TestCountry')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should recover gracefully when network is restored', async () => {
      // Start with network outage
      simulateNetworkOutage();

      render(<CitySearch />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'paris');

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error searching cities:', expect.any(Error));
      });

      // Restore network
      restoreNetwork();

      // Clear and search again
      await user.clear(searchInput);
      await user.type(searchInput, 'paris');

      // Should now work
      await waitFor(() => {
        expect(screen.getByText('France')).toBeInTheDocument();
      });
    });
  });

  describe('Partial Service Outages', () => {
    it('should handle geocoding service down but weather service up', async () => {
      // Mock geocoding to fail
      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('geoapify')) {
          return Promise.reject(new Error('Geocoding service down'));
        }
        // Weather API works
        return Promise.resolve({
          data: {
            coord: { lon: 2.3522, lat: 48.8566 },
            weather: [{ id: 800, main: 'Clear', description: 'clear sky', icon: '01d' }],
            main: { temp: 22.5, humidity: 65 },
            wind: { speed: 3.2 },
            dt: 1640995200,
            sys: { sunrise: 1640934000, sunset: 1640966400 },
            timezone: 3600,
            name: 'Paris'
          },
        });
      });

      render(<CitySearch />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'paris');

      // Should handle geocoding failure gracefully
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error searching cities:', expect.any(Error));
      });

      // Should not show city options
      expect(screen.queryByText('France')).not.toBeInTheDocument();
    });

    it('should handle authentication service down but other services up', async () => {
      // Mock auth to fail but other services work
      mockSupabase.auth.signInWithPassword.mockRejectedValue(new Error('Auth service unavailable'));
      
      restoreNetwork(); // Other services work

      useAppStore.setState({ showAuthModal: true });

      render(<AuthModal />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const loginButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(loginButton);

      // Should show auth-specific error
      await waitFor(() => {
        expect(screen.getByText('Auth service unavailable')).toBeInTheDocument();
      });

      // Modal should remain open
      expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    });
  });

  describe('Network Recovery Scenarios', () => {
    it('should automatically retry failed operations when network recovers', async () => {
      // Start with network down
      simulateNetworkOutage();

      render(<CitySearch />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'paris');

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error searching cities:', expect.any(Error));
      });

      // Network recovers
      restoreNetwork();

      // User tries again
      await user.clear(searchInput);
      await user.type(searchInput, 'paris');

      // Should work now
      await waitFor(() => {
        expect(screen.getByText('France')).toBeInTheDocument();
      });
    });

    it('should handle network recovery during authentication', async () => {
      // Start with auth service down
      mockSupabase.auth.signInWithPassword.mockRejectedValue(new Error('Network error'));

      useAppStore.setState({ showAuthModal: true });

      render(<AuthModal />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      const loginButton = screen.getByRole('button', { name: /sign in/i });
      await user.click(loginButton);

      // Should show error
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });

      // Network recovers
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: 'user-123', email: 'test@example.com' },
          session: { user: { id: 'user-123', email: 'test@example.com' }, access_token: 'token' },
        },
        error: null,
      } as any);

      // User tries again
      await user.click(loginButton);

      // Should work now
      await waitFor(() => {
        expect(useAppStore.getState().showAuthModal).toBe(false);
      });
    });

    it('should maintain data consistency during network recovery', async () => {
      // Set up some initial state
      useAppStore.setState({
        currentView: 'search',
        cityOptions: [],
      });

      // Network is down
      simulateNetworkOutage();

      render(<CitySearch />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'paris');

      // Network recovers
      restoreNetwork();

      // Clear and search again
      await user.clear(searchInput);
      await user.type(searchInput, 'paris');

      await waitFor(() => {
        expect(screen.getByText('France')).toBeInTheDocument();
      });

      // App state should be consistent
      expect(useAppStore.getState().currentView).toBe('search');
      expect(useAppStore.getState().cityOptions.length).toBeGreaterThan(0);
    });
  });

  describe('User Experience During Network Issues', () => {
    it('should provide clear feedback about network status', async () => {
      simulateNetworkOutage();

      render(<CitySearch />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'paris');

      // Should handle error gracefully without crashing
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
      });

      // App should remain usable
      expect(screen.getByText('Find Your Perfect Sip')).toBeInTheDocument();
      expect(searchInput).toBeInTheDocument();
    });

    it('should maintain responsive UI during network delays', async () => {
      simulateSlowNetwork(1000);

      render(<CitySearch />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      
      // User should be able to type normally
      await user.type(searchInput, 'slow');
      expect(searchInput).toHaveValue('slow');
      
      // Should be able to clear and type again
      await user.clear(searchInput);
      await user.type(searchInput, 'response');
      expect(searchInput).toHaveValue('response');
      
      // UI should remain responsive
      expect(screen.getByText('Find Your Perfect Sip')).toBeInTheDocument();
    });

    it('should handle rapid user interactions during network issues', async () => {
      simulateIntermittentConnectivity();

      render(<CitySearch />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      
      // Rapid typing and clearing
      await user.type(searchInput, 'a');
      await user.clear(searchInput);
      await user.type(searchInput, 'b');
      await user.clear(searchInput);
      await user.type(searchInput, 'c');
      await user.clear(searchInput);
      await user.type(searchInput, 'd');

      // App should handle this gracefully
      expect(searchInput).toHaveValue('d');
      expect(screen.getByText('Find Your Perfect Sip')).toBeInTheDocument();
    });

    it('should preserve user data during network interruptions', async () => {
      // Start with working network
      restoreNetwork();

      useAppStore.setState({ showAuthModal: true });

      render(<AuthModal />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      
      // User starts filling form
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');

      // Network goes down
      simulateNetworkOutage();

      // User data should be preserved
      expect(emailInput).toHaveValue('test@example.com');
      expect(passwordInput).toHaveValue('password123');

      // User can still interact with form
      await user.clear(passwordInput);
      await user.type(passwordInput, 'newpassword');
      expect(passwordInput).toHaveValue('newpassword');
    });
  });
});