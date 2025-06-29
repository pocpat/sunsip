import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import MainScroller from '../MainScroller';
import type { WeatherData, CocktailData } from '../../store/appStore';

// Mock the child components
vi.mock('../LandingPage', () => ({
  default: ({ setNavSource }: any) => (
    <div data-testid="landing-page">
      Landing Page Content
      <button onClick={() => setNavSource('input')}>Search</button>
    </div>
  ),
}));

vi.mock('../ResultsPage', () => ({
  default: () => <div data-testid="results-page">Results Page Content</div>,
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

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
  description: 'A timeless cocktail',
  ingredients: ['2 oz gin', '1/2 oz dry vermouth'],
  recipe: ['Stir with ice', 'Strain into glass'],
  imageUrl: 'https://images.pexels.com/photos/5379228/pexels-photo-5379228.jpeg',
  mood: 'sophisticated',
};

describe('MainScroller', () => {
  let user: ReturnType<typeof userEvent.setup>;
  let mockSetNavSource: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    user = userEvent.setup();
    mockSetNavSource = vi.fn();
    
    // Reset stores to initial state
    useAppStore.setState({
      isLoading: false,
      currentView: 'main',
      weatherData: undefined,
      cocktailData: undefined,
    });

    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
    });

    // Mock window.innerHeight for viewport calculations
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 1000,
    });

    // Mock scrollTo method
    Element.prototype.scrollTo = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial Render and Layout', () => {
    it('should render landing and results sections with correct heights', () => {
      render(<MainScroller setNavSource={mockSetNavSource} />);

      expect(screen.getByTestId('landing-page')).toBeInTheDocument();
      expect(screen.getByTestId('results-page')).toBeInTheDocument();

      // Landing section should be 75vh
      const landingSection = screen.getByTestId('landing-page').closest('div');
      expect(landingSection).toHaveClass('h-[75vh]');

      // Results section should have min-h-screen
      const resultsSection = screen.getByTestId('results-page').closest('div');
      expect(resultsSection).toHaveClass('min-h-screen');
    });

    it('should have smooth scroll behavior', () => {
      render(<MainScroller setNavSource={mockSetNavSource} />);

      const scrollContainer = screen.getByTestId('landing-page').closest('[style*="scroll-behavior"]');
      expect(scrollContainer).toHaveStyle('scroll-behavior: smooth');
    });

    it('should show results page immediately after landing (no gap)', () => {
      render(<MainScroller setNavSource={mockSetNavSource} />);

      // Landing should be 75vh
      const landingSection = screen.getByTestId('landing-page').closest('div');
      expect(landingSection).toHaveClass('h-[75vh]');

      // Results should start immediately after (no separate preview section)
      const resultsSection = screen.getByTestId('results-page').closest('div');
      expect(resultsSection).toHaveClass('min-h-screen');
    });
  });

  describe('Auto-scroll to Results', () => {
    it('should auto-scroll to 75vh when data is loaded', async () => {
      const { rerender } = render(<MainScroller setNavSource={mockSetNavSource} />);

      // Initially no scroll should happen
      expect(Element.prototype.scrollTo).not.toHaveBeenCalled();

      // Set weather and cocktail data
      useAppStore.setState({
        weatherData: mockWeatherData,
        cocktailData: mockCocktailData,
        isLoading: false,
      });

      rerender(<MainScroller setNavSource={mockSetNavSource} />);

      // Wait for the scroll timeout
      await waitFor(() => {
        expect(Element.prototype.scrollTo).toHaveBeenCalledWith({
          top: 750, // 75% of 1000px viewport
          behavior: 'smooth',
        });
      }, { timeout: 200 });
    });

    it('should calculate scroll position based on 75% of viewport height', async () => {
      // Test with different viewport height
      Object.defineProperty(window, 'innerHeight', {
        value: 1200,
      });

      const { rerender } = render(<MainScroller setNavSource={mockSetNavSource} />);

      useAppStore.setState({
        weatherData: mockWeatherData,
        cocktailData: mockCocktailData,
        isLoading: false,
      });

      rerender(<MainScroller setNavSource={mockSetNavSource} />);

      await waitFor(() => {
        expect(Element.prototype.scrollTo).toHaveBeenCalledWith({
          top: 900, // 75% of 1200px viewport
          behavior: 'smooth',
        });
      });
    });

    it('should not auto-scroll when still loading', async () => {
      render(<MainScroller setNavSource={mockSetNavSource} />);

      useAppStore.setState({
        weatherData: mockWeatherData,
        cocktailData: mockCocktailData,
        isLoading: true, // Still loading
      });

      // Wait a bit to ensure no scroll happens
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(Element.prototype.scrollTo).not.toHaveBeenCalled();
    });

    it('should not auto-scroll when only partial data is available', async () => {
      render(<MainScroller setNavSource={mockSetNavSource} />);

      // Only weather data
      useAppStore.setState({
        weatherData: mockWeatherData,
        cocktailData: undefined,
        isLoading: false,
      });

      await new Promise(resolve => setTimeout(resolve, 150));
      expect(Element.prototype.scrollTo).not.toHaveBeenCalled();

      // Only cocktail data
      useAppStore.setState({
        weatherData: undefined,
        cocktailData: mockCocktailData,
        isLoading: false,
      });

      await new Promise(resolve => setTimeout(resolve, 150));
      expect(Element.prototype.scrollTo).not.toHaveBeenCalled();
    });
  });

  describe('Reset Scroll to Landing', () => {
    it('should scroll to top when app resets', async () => {
      const { rerender } = render(<MainScroller setNavSource={mockSetNavSource} />);

      // First set some data
      useAppStore.setState({
        weatherData: mockWeatherData,
        cocktailData: mockCocktailData,
        currentView: 'main',
      });

      rerender(<MainScroller setNavSource={mockSetNavSource} />);

      // Clear the previous calls
      vi.clearAllMocks();

      // Reset the app
      useAppStore.setState({
        weatherData: undefined,
        cocktailData: undefined,
        currentView: 'main',
      });

      rerender(<MainScroller setNavSource={mockSetNavSource} />);

      await waitFor(() => {
        expect(Element.prototype.scrollTo).toHaveBeenCalledWith({
          top: 0,
          behavior: 'smooth',
        });
      });
    });

    it('should not scroll to top when view is not main', async () => {
      const { rerender } = render(<MainScroller setNavSource={mockSetNavSource} />);

      useAppStore.setState({
        weatherData: undefined,
        cocktailData: undefined,
        currentView: 'dashboard', // Different view
      });

      rerender(<MainScroller setNavSource={mockSetNavSource} />);

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(Element.prototype.scrollTo).not.toHaveBeenCalled();
    });
  });

  describe('Scroll Lock Behavior', () => {
    let mockScrollContainer: HTMLElement;
    let scrollEventHandler: (event: Event) => void;

    beforeEach(() => {
      // Create a mock scroll container
      mockScrollContainer = document.createElement('div');
      mockScrollContainer.scrollTo = vi.fn();
      
      // Mock the ref to return our mock container
      vi.spyOn(React, 'useRef').mockReturnValue({ current: mockScrollContainer });
      
      // Capture the scroll event handler
      const originalAddEventListener = mockScrollContainer.addEventListener;
      mockScrollContainer.addEventListener = vi.fn((event, handler) => {
        if (event === 'scroll') {
          scrollEventHandler = handler as (event: Event) => void;
        }
        return originalAddEventListener.call(mockScrollContainer, event, handler);
      });
    });

    it('should prevent scrolling above results when data is loaded', () => {
      render(<MainScroller setNavSource={mockSetNavSource} />);

      // Set data to enable scroll lock
      useAppStore.setState({
        weatherData: mockWeatherData,
        cocktailData: mockCocktailData,
        isLoading: false,
      });

      // Simulate scrolling above the lock position (75vh)
      Object.defineProperty(mockScrollContainer, 'scrollTop', {
        value: 500, // Below 75vh (750px)
        writable: true,
      });

      // Trigger scroll event
      if (scrollEventHandler) {
        scrollEventHandler(new Event('scroll'));
      }

      // Should force scroll to lock position
      expect(mockScrollContainer.scrollTo).toHaveBeenCalledWith({
        top: 750, // 75vh lock position
        behavior: 'auto',
      });
    });

    it('should allow scrolling below results when data is loaded', () => {
      render(<MainScroller setNavSource={mockSetNavSource} />);

      useAppStore.setState({
        weatherData: mockWeatherData,
        cocktailData: mockCocktailData,
        isLoading: false,
      });

      // Simulate scrolling below the lock position
      Object.defineProperty(mockScrollContainer, 'scrollTop', {
        value: 1200, // Above 75vh (750px)
        writable: true,
      });

      // Trigger scroll event
      if (scrollEventHandler) {
        scrollEventHandler(new Event('scroll'));
      }

      // Should not force any scroll correction
      expect(mockScrollContainer.scrollTo).not.toHaveBeenCalled();
    });

    it('should prevent scrolling past 25vh when no data is loaded', () => {
      render(<MainScroller setNavSource={mockSetNavSource} />);

      // No data loaded
      useAppStore.setState({
        weatherData: undefined,
        cocktailData: undefined,
        isLoading: false,
      });

      // Simulate scrolling past 25vh (preview limit)
      Object.defineProperty(mockScrollContainer, 'scrollTop', {
        value: 300, // Above 25vh (250px)
        writable: true,
      });

      // Trigger scroll event
      if (scrollEventHandler) {
        scrollEventHandler(new Event('scroll'));
      }

      // Should force scroll back to 25vh limit
      expect(mockScrollContainer.scrollTo).toHaveBeenCalledWith({
        top: 250, // 25vh limit
        behavior: 'auto',
      });
    });

    it('should allow scrolling within preview area when no data', () => {
      render(<MainScroller setNavSource={mockSetNavSource} />);

      useAppStore.setState({
        weatherData: undefined,
        cocktailData: undefined,
        isLoading: false,
      });

      // Simulate scrolling within the allowed preview area
      Object.defineProperty(mockScrollContainer, 'scrollTop', {
        value: 200, // Within 25vh (250px)
        writable: true,
      });

      if (scrollEventHandler) {
        scrollEventHandler(new Event('scroll'));
      }

      // Should not force any scroll correction
      expect(mockScrollContainer.scrollTo).not.toHaveBeenCalled();
    });
  });

  describe('Viewport Height Calculations', () => {
    it('should adapt to different viewport heights', async () => {
      const viewportHeights = [600, 800, 1200, 1600];

      for (const height of viewportHeights) {
        Object.defineProperty(window, 'innerHeight', {
          value: height,
        });

        const { rerender, unmount } = render(<MainScroller setNavSource={mockSetNavSource} />);

        useAppStore.setState({
          weatherData: mockWeatherData,
          cocktailData: mockCocktailData,
          isLoading: false,
        });

        rerender(<MainScroller setNavSource={mockSetNavSource} />);

        await waitFor(() => {
          expect(Element.prototype.scrollTo).toHaveBeenCalledWith({
            top: height * 0.75, // 75% of viewport height
            behavior: 'smooth',
          });
        });

        unmount();
        vi.clearAllMocks();
      }
    });
  });

  describe('Component Integration', () => {
    it('should pass setNavSource to LandingPage', async () => {
      render(<MainScroller setNavSource={mockSetNavSource} />);

      const searchButton = screen.getByText('Search');
      await user.click(searchButton);

      expect(mockSetNavSource).toHaveBeenCalledWith('input');
    });

    it('should handle rapid state changes without issues', async () => {
      const { rerender } = render(<MainScroller setNavSource={mockSetNavSource} />);

      // Rapid state changes
      useAppStore.setState({
        weatherData: mockWeatherData,
        isLoading: true,
      });
      rerender(<MainScroller setNavSource={mockSetNavSource} />);

      useAppStore.setState({
        cocktailData: mockCocktailData,
        isLoading: false,
      });
      rerender(<MainScroller setNavSource={mockSetNavSource} />);

      useAppStore.setState({
        weatherData: undefined,
        cocktailData: undefined,
      });
      rerender(<MainScroller setNavSource={mockSetNavSource} />);

      // Should handle all changes gracefully
      expect(screen.getByTestId('landing-page')).toBeInTheDocument();
      expect(screen.getByTestId('results-page')).toBeInTheDocument();
    });
  });
});