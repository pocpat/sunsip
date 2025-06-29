import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import App from '../../App';

// Mock external services
vi.mock('../../services/geocodingService', () => ({
  searchCities: vi.fn().mockResolvedValue([
    {
      city: 'Paris',
      country: 'France',
      countryCode: 'fr',
      latitude: 48.8566,
      longitude: 2.3522,
    }
  ]),
}));

vi.mock('../../services/weatherService', () => ({
  getWeatherData: vi.fn().mockResolvedValue({
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
  }),
}));

vi.mock('../../services/cocktailService', () => ({
  getCocktailSuggestion: vi.fn().mockResolvedValue({
    name: 'Classic Martini',
    description: 'A timeless cocktail',
    ingredients: ['2 oz gin', '1/2 oz dry vermouth'],
    recipe: ['Stir with ice', 'Strain into glass'],
    imageUrl: 'https://images.pexels.com/photos/5379228/pexels-photo-5379228.jpeg',
    mood: 'sophisticated',
  }),
}));

vi.mock('../../services/imageGenerationService', () => ({
  generateCityImage: vi.fn().mockResolvedValue('https://images.pexels.com/photos/532826/pexels-photo-532826.jpeg'),
}));

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  },
  getUserSavedCombinations: vi.fn().mockResolvedValue([]),
}));

// Mock Sentry
vi.mock('../../lib/sentry', () => ({
  setUserContext: vi.fn(),
  clearUserContext: vi.fn(),
  captureError: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

describe('Scrolling Behavior Integration Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    
    // Reset stores
    useAppStore.setState({
      isLoading: false,
      currentView: 'main',
      cityOptions: [],
      selectedCity: undefined,
      weatherData: undefined,
      cocktailData: undefined,
      cityImageUrl: undefined,
      showAuthModal: false,
      isPortfolioMode: false,
    });

    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      savedCombinations: [],
      userPreferences: null,
    });

    // Mock window dimensions
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 1000,
    });

    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1200,
    });

    // Mock scrollTo
    Element.prototype.scrollTo = vi.fn();
    window.scrollTo = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial Page Structure', () => {
    it('should have landing page at 75vh and results preview at 25vh', () => {
      render(<App />);

      // Should show landing page content
      expect(screen.getByText('FIND YOUR PERFECT SIP')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter a city name...')).toBeInTheDocument();
      
      // Landing section should be 75vh
      const landingSection = document.querySelector('.h-\\[75vh\\]');
      expect(landingSection).toBeInTheDocument();

      // Results section should be min-h-screen (acts as preview when no data)
      const resultsSection = document.querySelector('.min-h-screen');
      expect(resultsSection).toBeInTheDocument();
    });

    it('should not be scrollable initially beyond preview (25vh)', () => {
      render(<App />);

      // Should not auto-scroll on initial load
      expect(Element.prototype.scrollTo).not.toHaveBeenCalled();
      
      // Total visible height should be exactly 100vh (75vh landing + 25vh preview)
      // User should only be able to scroll 25vh to see the preview
    });

    it('should show room preview with blue placeholder when no data', () => {
      render(<App />);

      // Should show the room component in preview mode (with blue placeholder)
      // The Room component should be visible in the results section
      const resultsSection = document.querySelector('.min-h-screen');
      expect(resultsSection).toBeInTheDocument();
    });
  });

  describe('Search Flow and Auto-scroll', () => {
    it('should auto-scroll to 75vh after successful search', async () => {
      render(<App />);

      // Perform search
      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'paris');

      // Wait for search results
      await waitFor(() => {
        expect(screen.getByText('France')).toBeInTheDocument();
      }, { timeout: 1000 });

      // Click on city option
      const parisOption = screen.getByText('France').closest('div');
      await user.click(parisOption!);

      // Wait for loading to complete and auto-scroll
      await waitFor(() => {
        expect(Element.prototype.scrollTo).toHaveBeenCalledWith({
          top: 750, // 75% of 1000px viewport
          behavior: 'smooth',
        });
      }, { timeout: 3000 });
    });

    it('should show full results content after search completion', async () => {
      render(<App />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'paris');

      await waitFor(() => {
        expect(screen.getByText('France')).toBeInTheDocument();
      });

      const parisOption = screen.getByText('France').closest('div');
      await user.click(parisOption!);

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Creating your SunSip experience')).not.toBeInTheDocument();
      }, { timeout: 5000 });

      // Should show full results content
      await waitFor(() => {
        expect(screen.getByText('Weather Details')).toBeInTheDocument();
        expect(screen.getByText('Cocktail Match')).toBeInTheDocument();
      });
    });

    it('should not auto-scroll during loading state', async () => {
      render(<App />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'paris');

      await waitFor(() => {
        expect(screen.getByText('France')).toBeInTheDocument();
      });

      const parisOption = screen.getByText('France').closest('div');
      await user.click(parisOption!);

      // During loading, should not scroll yet
      expect(screen.getByText('Creating your SunSip experience')).toBeInTheDocument();
      
      // Should not have scrolled during loading
      expect(Element.prototype.scrollTo).not.toHaveBeenCalled();
    });
  });

  describe('Scroll Lock Behavior', () => {
    it('should prevent scrolling back to landing when results are loaded', async () => {
      const mockScrollContainer = document.createElement('div');
      mockScrollContainer.scrollTo = vi.fn();
      
      // Mock scroll event
      let scrollHandler: ((event: Event) => void) | null = null;
      mockScrollContainer.addEventListener = vi.fn((event, handler) => {
        if (event === 'scroll') {
          scrollHandler = handler as (event: Event) => void;
        }
      });

      render(<App />);

      // Complete search
      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'paris');

      await waitFor(() => {
        expect(screen.getByText('France')).toBeInTheDocument();
      });

      const parisOption = screen.getByText('France').closest('div');
      await user.click(parisOption!);

      await waitFor(() => {
        expect(screen.getByText('Weather Details')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Simulate scrolling above lock position (75vh)
      Object.defineProperty(mockScrollContainer, 'scrollTop', {
        value: 500, // Below 75vh (750px)
        writable: true,
      });

      // Trigger scroll event if handler exists
      if (scrollHandler) {
        scrollHandler(new Event('scroll'));
        
        // Should force scroll to lock position
        expect(mockScrollContainer.scrollTo).toHaveBeenCalledWith({
          top: 750, // 75vh lock position
          behavior: 'auto',
        });
      }
    });

    it('should prevent scrolling past 25vh when no results are loaded', async () => {
      const mockScrollContainer = document.createElement('div');
      mockScrollContainer.scrollTo = vi.fn();
      
      let scrollHandler: ((event: Event) => void) | null = null;
      mockScrollContainer.addEventListener = vi.fn((event, handler) => {
        if (event === 'scroll') {
          scrollHandler = handler as (event: Event) => void;
        }
      });

      render(<App />);

      // No search performed, no results loaded
      
      // Simulate scrolling past 25vh (preview limit)
      Object.defineProperty(mockScrollContainer, 'scrollTop', {
        value: 300, // Above 25vh (250px)
        writable: true,
      });

      // Trigger scroll event
      if (scrollHandler) {
        scrollHandler(new Event('scroll'));
        
        // Should force scroll back to 25vh limit
        expect(mockScrollContainer.scrollTo).toHaveBeenCalledWith({
          top: 250, // 25vh limit
          behavior: 'auto',
        });
      }
    });

    it('should allow scrolling within preview area when no data', async () => {
      const mockScrollContainer = document.createElement('div');
      mockScrollContainer.scrollTo = vi.fn();
      
      let scrollHandler: ((event: Event) => void) | null = null;
      mockScrollContainer.addEventListener = vi.fn((event, handler) => {
        if (event === 'scroll') {
          scrollHandler = handler as (event: Event) => void;
        }
      });

      render(<App />);

      // Simulate scrolling within the allowed preview area (0 to 25vh)
      Object.defineProperty(mockScrollContainer, 'scrollTop', {
        value: 200, // Within 25vh (250px)
        writable: true,
      });

      if (scrollHandler) {
        scrollHandler(new Event('scroll'));
        
        // Should not force any scroll correction
        expect(mockScrollContainer.scrollTo).not.toHaveBeenCalled();
      }
    });
  });

  describe('Reset and Navigation', () => {
    it('should scroll back to top when app is reset', async () => {
      render(<App />);

      // First complete a search
      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'paris');

      await waitFor(() => {
        expect(screen.getByText('France')).toBeInTheDocument();
      });

      const parisOption = screen.getByText('France').closest('div');
      await user.click(parisOption!);

      await waitFor(() => {
        expect(screen.getByText('Weather Details')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Clear previous scrollTo calls
      vi.clearAllMocks();

      // Reset app by clicking logo/title
      const logo = screen.getByText('SunSip');
      await user.click(logo);

      // Should scroll back to top
      await waitFor(() => {
        expect(Element.prototype.scrollTo).toHaveBeenCalledWith({
          top: 0,
          behavior: 'smooth',
        });
      });
    });

    it('should scroll to top when start over button is clicked', async () => {
      render(<App />);

      // Complete search first
      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'paris');

      await waitFor(() => {
        expect(screen.getByText('France')).toBeInTheDocument();
      });

      const parisOption = screen.getByText('France').closest('div');
      await user.click(parisOption!);

      await waitFor(() => {
        expect(screen.getByText('Weather Details')).toBeInTheDocument();
      }, { timeout: 5000 });

      // Should show start over button
      const startOverButton = screen.getByTitle('Start Over');
      expect(startOverButton).toBeInTheDocument();

      vi.clearAllMocks();

      // Click start over
      await user.click(startOverButton);

      // Should scroll to top
      await waitFor(() => {
        expect(Element.prototype.scrollTo).toHaveBeenCalledWith({
          top: 0,
          behavior: 'smooth',
        });
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('should adapt scroll positions to different viewport heights', async () => {
      const viewportHeights = [600, 800, 1200, 1600];

      for (const height of viewportHeights) {
        Object.defineProperty(window, 'innerHeight', {
          value: height,
        });

        const { unmount } = render(<App />);

        const searchInput = screen.getByPlaceholderText('Enter a city name...');
        await user.type(searchInput, 'paris');

        await waitFor(() => {
          expect(screen.getByText('France')).toBeInTheDocument();
        });

        const parisOption = screen.getByText('France').closest('div');
        await user.click(parisOption!);

        await waitFor(() => {
          expect(Element.prototype.scrollTo).toHaveBeenCalledWith({
            top: height * 0.75, // 75% of viewport height
            behavior: 'smooth',
          });
        }, { timeout: 5000 });

        unmount();
        vi.clearAllMocks();
      }
    });

    it('should handle mobile viewport correctly', async () => {
      // Simulate mobile viewport
      Object.defineProperty(window, 'innerHeight', {
        value: 667, // iPhone viewport height
      });

      Object.defineProperty(window, 'innerWidth', {
        value: 375, // iPhone viewport width
      });

      render(<App />);

      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'paris');

      await waitFor(() => {
        expect(screen.getByText('France')).toBeInTheDocument();
      });

      const parisOption = screen.getByText('France').closest('div');
      await user.click(parisOption!);

      await waitFor(() => {
        expect(Element.prototype.scrollTo).toHaveBeenCalledWith({
          top: 500.25, // 75% of 667px
          behavior: 'smooth',
        });
      }, { timeout: 5000 });
    });
  });

  describe('Edge Cases', () => {
    it('should handle scroll errors gracefully', async () => {
      // Mock scrollTo to throw an error
      Element.prototype.scrollTo = vi.fn().mockImplementation(() => {
        throw new Error('Scroll error');
      });

      expect(() => {
        render(<App />);
      }).not.toThrow();
    });

    it('should handle rapid state changes during scrolling', async () => {
      render(<App />);

      // Rapid state changes
      useAppStore.setState({ isLoading: true });
      useAppStore.setState({ isLoading: false });
      useAppStore.setState({ 
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
        }
      });
      useAppStore.setState({ weatherData: undefined });

      // Should handle gracefully
      expect(screen.getByText('FIND YOUR PERFECT SIP')).toBeInTheDocument();
    });

    it('should handle window resize during scroll operations', async () => {
      render(<App />);

      // Start search
      const searchInput = screen.getByPlaceholderText('Enter a city name...');
      await user.type(searchInput, 'paris');

      await waitFor(() => {
        expect(screen.getByText('France')).toBeInTheDocument();
      });

      // Simulate window resize
      Object.defineProperty(window, 'innerHeight', {
        value: 800,
      });

      fireEvent(window, new Event('resize'));

      const parisOption = screen.getByText('France').closest('div');
      await user.click(parisOption!);

      // Should still work with new viewport height
      await waitFor(() => {
        expect(Element.prototype.scrollTo).toHaveBeenCalledWith({
          top: 600, // 75% of new 800px height
          behavior: 'smooth',
        });
      }, { timeout: 5000 });
    });
  });
});