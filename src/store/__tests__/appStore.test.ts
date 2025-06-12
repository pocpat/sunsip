import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../appStore';
import type { WeatherData, CocktailData, CityOption } from '../appStore';

// Mock data for testing
const mockCityOption: CityOption = {
  city: 'Paris',
  country: 'France',
  countryCode: 'fr',
  latitude: 48.8566,
  longitude: 2.3522,
};

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
  description: 'A timeless cocktail with gin and vermouth.',
  ingredients: ['2 oz gin', '1/2 oz dry vermouth', 'Lemon twist'],
  recipe: ['Add gin and vermouth to mixing glass with ice', 'Stir until chilled', 'Strain into chilled martini glass', 'Garnish with lemon twist'],
  imageUrl: 'https://images.pexels.com/photos/5379228/pexels-photo-5379228.jpeg',
  mood: 'sophisticated',
};

const mockCityOptions: CityOption[] = [
  mockCityOption,
  {
    city: 'London',
    country: 'United Kingdom',
    countryCode: 'gb',
    latitude: 51.5074,
    longitude: -0.1278,
  },
  {
    city: 'New York',
    country: 'United States',
    countryCode: 'us',
    latitude: 40.7128,
    longitude: -74.0060,
  },
];

describe('useAppStore', () => {
  let store: ReturnType<typeof useAppStore>;

  beforeEach(() => {
    // Get a fresh store instance for each test
    store = useAppStore.getState();
    
    // Reset store to initial state
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

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const initialState = useAppStore.getState();

      expect(initialState.isLoading).toBe(false);
      expect(initialState.currentView).toBe('search');
      expect(initialState.cityOptions).toEqual([]);
      expect(initialState.selectedCity).toBeUndefined();
      expect(initialState.weatherData).toBeUndefined();
      expect(initialState.cocktailData).toBeUndefined();
      expect(initialState.cityImageUrl).toBeUndefined();
      expect(initialState.showAuthModal).toBe(false);
    });

    it('should have all required action functions', () => {
      const state = useAppStore.getState();

      expect(typeof state.setIsLoading).toBe('function');
      expect(typeof state.setCurrentView).toBe('function');
      expect(typeof state.setCityOptions).toBe('function');
      expect(typeof state.setSelectedCity).toBe('function');
      expect(typeof state.setWeatherData).toBe('function');
      expect(typeof state.setCocktailData).toBe('function');
      expect(typeof state.setCityImageUrl).toBe('function');
      expect(typeof state.setShowAuthModal).toBe('function');
      expect(typeof state.resetApp).toBe('function');
    });
  });

  describe('Loading State Management', () => {
    it('should update isLoading state correctly', () => {
      const { setIsLoading } = useAppStore.getState();

      // Test setting to true
      setIsLoading(true);
      expect(useAppStore.getState().isLoading).toBe(true);

      // Test setting to false
      setIsLoading(false);
      expect(useAppStore.getState().isLoading).toBe(false);
    });

    it('should handle multiple loading state changes', () => {
      const { setIsLoading } = useAppStore.getState();

      const loadingStates = [true, false, true, false, true];
      
      loadingStates.forEach(state => {
        setIsLoading(state);
        expect(useAppStore.getState().isLoading).toBe(state);
      });
    });
  });

  describe('Current View Management', () => {
    it('should update currentView state correctly', () => {
      const { setCurrentView } = useAppStore.getState();

      // Test setting to 'result'
      setCurrentView('result');
      expect(useAppStore.getState().currentView).toBe('result');

      // Test setting to 'dashboard'
      setCurrentView('dashboard');
      expect(useAppStore.getState().currentView).toBe('dashboard');

      // Test setting back to 'search'
      setCurrentView('search');
      expect(useAppStore.getState().currentView).toBe('search');
    });

    it('should handle all valid view types', () => {
      const { setCurrentView } = useAppStore.getState();
      const validViews: Array<'search' | 'result' | 'dashboard'> = ['search', 'result', 'dashboard'];

      validViews.forEach(view => {
        setCurrentView(view);
        expect(useAppStore.getState().currentView).toBe(view);
      });
    });
  });

  describe('City Options Management', () => {
    it('should update cityOptions state correctly', () => {
      const { setCityOptions } = useAppStore.getState();

      setCityOptions(mockCityOptions);
      expect(useAppStore.getState().cityOptions).toEqual(mockCityOptions);
      expect(useAppStore.getState().cityOptions).toHaveLength(3);
    });

    it('should handle empty city options array', () => {
      const { setCityOptions } = useAppStore.getState();

      setCityOptions([]);
      expect(useAppStore.getState().cityOptions).toEqual([]);
      expect(useAppStore.getState().cityOptions).toHaveLength(0);
    });

    it('should replace existing city options', () => {
      const { setCityOptions } = useAppStore.getState();

      // Set initial options
      setCityOptions(mockCityOptions);
      expect(useAppStore.getState().cityOptions).toHaveLength(3);

      // Replace with new options
      const newOptions = [mockCityOption];
      setCityOptions(newOptions);
      expect(useAppStore.getState().cityOptions).toEqual(newOptions);
      expect(useAppStore.getState().cityOptions).toHaveLength(1);
    });

    it('should maintain city option structure integrity', () => {
      const { setCityOptions } = useAppStore.getState();

      setCityOptions(mockCityOptions);
      const storedOptions = useAppStore.getState().cityOptions;

      storedOptions.forEach(option => {
        expect(option).toHaveProperty('city');
        expect(option).toHaveProperty('country');
        expect(option).toHaveProperty('countryCode');
        expect(option).toHaveProperty('latitude');
        expect(option).toHaveProperty('longitude');
        expect(typeof option.city).toBe('string');
        expect(typeof option.country).toBe('string');
        expect(typeof option.countryCode).toBe('string');
        expect(typeof option.latitude).toBe('number');
        expect(typeof option.longitude).toBe('number');
      });
    });
  });

  describe('Selected City Management', () => {
    it('should update selectedCity state correctly', () => {
      const { setSelectedCity } = useAppStore.getState();

      setSelectedCity(mockCityOption);
      expect(useAppStore.getState().selectedCity).toEqual(mockCityOption);
    });

    it('should handle undefined selectedCity', () => {
      const { setSelectedCity } = useAppStore.getState();

      // First set a city
      setSelectedCity(mockCityOption);
      expect(useAppStore.getState().selectedCity).toEqual(mockCityOption);

      // Then clear it
      setSelectedCity(undefined);
      expect(useAppStore.getState().selectedCity).toBeUndefined();
    });

    it('should replace existing selected city', () => {
      const { setSelectedCity } = useAppStore.getState();

      const anotherCity: CityOption = {
        city: 'Tokyo',
        country: 'Japan',
        countryCode: 'jp',
        latitude: 35.6762,
        longitude: 139.6503,
      };

      // Set initial city
      setSelectedCity(mockCityOption);
      expect(useAppStore.getState().selectedCity).toEqual(mockCityOption);

      // Replace with another city
      setSelectedCity(anotherCity);
      expect(useAppStore.getState().selectedCity).toEqual(anotherCity);
      expect(useAppStore.getState().selectedCity).not.toEqual(mockCityOption);
    });
  });

  describe('Weather Data Management', () => {
    it('should update weatherData state correctly', () => {
      const { setWeatherData } = useAppStore.getState();

      setWeatherData(mockWeatherData);
      expect(useAppStore.getState().weatherData).toEqual(mockWeatherData);
    });

    it('should handle undefined weatherData', () => {
      const { setWeatherData } = useAppStore.getState();

      // First set weather data
      setWeatherData(mockWeatherData);
      expect(useAppStore.getState().weatherData).toEqual(mockWeatherData);

      // Then clear it
      setWeatherData(undefined);
      expect(useAppStore.getState().weatherData).toBeUndefined();
    });

    it('should maintain weather data structure integrity', () => {
      const { setWeatherData } = useAppStore.getState();

      setWeatherData(mockWeatherData);
      const storedWeatherData = useAppStore.getState().weatherData;

      expect(storedWeatherData).toHaveProperty('city');
      expect(storedWeatherData).toHaveProperty('country');
      expect(storedWeatherData).toHaveProperty('latitude');
      expect(storedWeatherData).toHaveProperty('longitude');
      expect(storedWeatherData).toHaveProperty('temperature');
      expect(storedWeatherData).toHaveProperty('condition');
      expect(storedWeatherData).toHaveProperty('icon');
      expect(storedWeatherData).toHaveProperty('humidity');
      expect(storedWeatherData).toHaveProperty('windSpeed');
      expect(storedWeatherData).toHaveProperty('localTime');
      expect(storedWeatherData).toHaveProperty('isDay');

      expect(typeof storedWeatherData!.city).toBe('string');
      expect(typeof storedWeatherData!.country).toBe('string');
      expect(typeof storedWeatherData!.latitude).toBe('number');
      expect(typeof storedWeatherData!.longitude).toBe('number');
      expect(typeof storedWeatherData!.temperature).toBe('number');
      expect(typeof storedWeatherData!.condition).toBe('string');
      expect(typeof storedWeatherData!.icon).toBe('string');
      expect(typeof storedWeatherData!.humidity).toBe('number');
      expect(typeof storedWeatherData!.windSpeed).toBe('number');
      expect(typeof storedWeatherData!.localTime).toBe('string');
      expect(typeof storedWeatherData!.isDay).toBe('boolean');
    });

    it('should handle weather data updates', () => {
      const { setWeatherData } = useAppStore.getState();

      const updatedWeatherData: WeatherData = {
        ...mockWeatherData,
        temperature: 18,
        condition: 'Cloudy',
        isDay: false,
      };

      // Set initial weather data
      setWeatherData(mockWeatherData);
      expect(useAppStore.getState().weatherData?.temperature).toBe(22);

      // Update weather data
      setWeatherData(updatedWeatherData);
      expect(useAppStore.getState().weatherData?.temperature).toBe(18);
      expect(useAppStore.getState().weatherData?.condition).toBe('Cloudy');
      expect(useAppStore.getState().weatherData?.isDay).toBe(false);
    });
  });

  describe('Cocktail Data Management', () => {
    it('should update cocktailData state correctly', () => {
      const { setCocktailData } = useAppStore.getState();

      setCocktailData(mockCocktailData);
      expect(useAppStore.getState().cocktailData).toEqual(mockCocktailData);
    });

    it('should handle undefined cocktailData', () => {
      const { setCocktailData } = useAppStore.getState();

      // First set cocktail data
      setCocktailData(mockCocktailData);
      expect(useAppStore.getState().cocktailData).toEqual(mockCocktailData);

      // Then clear it
      setCocktailData(undefined);
      expect(useAppStore.getState().cocktailData).toBeUndefined();
    });

    it('should maintain cocktail data structure integrity', () => {
      const { setCocktailData } = useAppStore.getState();

      setCocktailData(mockCocktailData);
      const storedCocktailData = useAppStore.getState().cocktailData;

      expect(storedCocktailData).toHaveProperty('name');
      expect(storedCocktailData).toHaveProperty('description');
      expect(storedCocktailData).toHaveProperty('ingredients');
      expect(storedCocktailData).toHaveProperty('recipe');
      expect(storedCocktailData).toHaveProperty('imageUrl');
      expect(storedCocktailData).toHaveProperty('mood');

      expect(typeof storedCocktailData!.name).toBe('string');
      expect(typeof storedCocktailData!.description).toBe('string');
      expect(Array.isArray(storedCocktailData!.ingredients)).toBe(true);
      expect(Array.isArray(storedCocktailData!.recipe)).toBe(true);
      expect(typeof storedCocktailData!.imageUrl).toBe('string');
      expect(typeof storedCocktailData!.mood).toBe('string');

      expect(storedCocktailData!.ingredients.length).toBeGreaterThan(0);
      expect(storedCocktailData!.recipe.length).toBeGreaterThan(0);
    });

    it('should handle cocktail data updates', () => {
      const { setCocktailData } = useAppStore.getState();

      const updatedCocktailData: CocktailData = {
        ...mockCocktailData,
        name: 'Negroni',
        mood: 'complex',
        ingredients: ['1 oz gin', '1 oz Campari', '1 oz sweet vermouth'],
      };

      // Set initial cocktail data
      setCocktailData(mockCocktailData);
      expect(useAppStore.getState().cocktailData?.name).toBe('Classic Martini');

      // Update cocktail data
      setCocktailData(updatedCocktailData);
      expect(useAppStore.getState().cocktailData?.name).toBe('Negroni');
      expect(useAppStore.getState().cocktailData?.mood).toBe('complex');
      expect(useAppStore.getState().cocktailData?.ingredients).toHaveLength(3);
    });
  });

  describe('City Image URL Management', () => {
    it('should update cityImageUrl state correctly', () => {
      const { setCityImageUrl } = useAppStore.getState();
      const testUrl = 'https://images.pexels.com/photos/532826/pexels-photo-532826.jpeg';

      setCityImageUrl(testUrl);
      expect(useAppStore.getState().cityImageUrl).toBe(testUrl);
    });

    it('should handle undefined cityImageUrl', () => {
      const { setCityImageUrl } = useAppStore.getState();
      const testUrl = 'https://images.pexels.com/photos/532826/pexels-photo-532826.jpeg';

      // First set image URL
      setCityImageUrl(testUrl);
      expect(useAppStore.getState().cityImageUrl).toBe(testUrl);

      // Then clear it
      setCityImageUrl(undefined);
      expect(useAppStore.getState().cityImageUrl).toBeUndefined();
    });

    it('should handle empty string cityImageUrl', () => {
      const { setCityImageUrl } = useAppStore.getState();

      setCityImageUrl('');
      expect(useAppStore.getState().cityImageUrl).toBe('');
    });

    it('should replace existing cityImageUrl', () => {
      const { setCityImageUrl } = useAppStore.getState();
      const url1 = 'https://images.pexels.com/photos/532826/pexels-photo-532826.jpeg';
      const url2 = 'https://images.pexels.com/photos/460740/pexels-photo-460740.jpeg';

      // Set initial URL
      setCityImageUrl(url1);
      expect(useAppStore.getState().cityImageUrl).toBe(url1);

      // Replace with new URL
      setCityImageUrl(url2);
      expect(useAppStore.getState().cityImageUrl).toBe(url2);
      expect(useAppStore.getState().cityImageUrl).not.toBe(url1);
    });
  });

  describe('Auth Modal Management', () => {
    it('should update showAuthModal state correctly', () => {
      const { setShowAuthModal } = useAppStore.getState();

      // Test setting to true
      setShowAuthModal(true);
      expect(useAppStore.getState().showAuthModal).toBe(true);

      // Test setting to false
      setShowAuthModal(false);
      expect(useAppStore.getState().showAuthModal).toBe(false);
    });

    it('should handle multiple auth modal state changes', () => {
      const { setShowAuthModal } = useAppStore.getState();

      const modalStates = [true, false, true, false, true];
      
      modalStates.forEach(state => {
        setShowAuthModal(state);
        expect(useAppStore.getState().showAuthModal).toBe(state);
      });
    });
  });

  describe('Reset App Functionality', () => {
    it('should reset app state to initial search state', () => {
      const { 
        setCurrentView, 
        setSelectedCity, 
        setWeatherData, 
        setCocktailData, 
        setCityImageUrl, 
        resetApp 
      } = useAppStore.getState();

      // Set up some state
      setCurrentView('result');
      setSelectedCity(mockCityOption);
      setWeatherData(mockWeatherData);
      setCocktailData(mockCocktailData);
      setCityImageUrl('https://example.com/image.jpg');

      // Verify state is set
      expect(useAppStore.getState().currentView).toBe('result');
      expect(useAppStore.getState().selectedCity).toEqual(mockCityOption);
      expect(useAppStore.getState().weatherData).toEqual(mockWeatherData);
      expect(useAppStore.getState().cocktailData).toEqual(mockCocktailData);
      expect(useAppStore.getState().cityImageUrl).toBe('https://example.com/image.jpg');

      // Reset app
      resetApp();

      // Verify state is reset
      expect(useAppStore.getState().currentView).toBe('search');
      expect(useAppStore.getState().selectedCity).toBeUndefined();
      expect(useAppStore.getState().weatherData).toBeUndefined();
      expect(useAppStore.getState().cocktailData).toBeUndefined();
      expect(useAppStore.getState().cityImageUrl).toBeUndefined();
    });

    it('should not reset loading state and auth modal state', () => {
      const { setIsLoading, setShowAuthModal, resetApp } = useAppStore.getState();

      // Set loading and auth modal states
      setIsLoading(true);
      setShowAuthModal(true);

      // Reset app
      resetApp();

      // These states should remain unchanged
      expect(useAppStore.getState().isLoading).toBe(true);
      expect(useAppStore.getState().showAuthModal).toBe(true);
    });

    it('should not reset cityOptions', () => {
      const { setCityOptions, resetApp } = useAppStore.getState();

      // Set city options
      setCityOptions(mockCityOptions);

      // Reset app
      resetApp();

      // City options should remain unchanged
      expect(useAppStore.getState().cityOptions).toEqual(mockCityOptions);
    });

    it('should be callable multiple times without issues', () => {
      const { 
        setCurrentView, 
        setSelectedCity, 
        setWeatherData, 
        resetApp 
      } = useAppStore.getState();

      // Set up state
      setCurrentView('result');
      setSelectedCity(mockCityOption);
      setWeatherData(mockWeatherData);

      // Reset multiple times
      resetApp();
      resetApp();
      resetApp();

      // State should still be properly reset
      expect(useAppStore.getState().currentView).toBe('search');
      expect(useAppStore.getState().selectedCity).toBeUndefined();
      expect(useAppStore.getState().weatherData).toBeUndefined();
    });
  });

  describe('State Persistence and Immutability', () => {
    it('should not mutate original objects when setting state', () => {
      const { setSelectedCity, setWeatherData, setCocktailData } = useAppStore.getState();

      const originalCity = { ...mockCityOption };
      const originalWeather = { ...mockWeatherData };
      const originalCocktail = { ...mockCocktailData };

      setSelectedCity(mockCityOption);
      setWeatherData(mockWeatherData);
      setCocktailData(mockCocktailData);

      // Original objects should remain unchanged
      expect(mockCityOption).toEqual(originalCity);
      expect(mockWeatherData).toEqual(originalWeather);
      expect(mockCocktailData).toEqual(originalCocktail);
    });

    it('should handle rapid state updates correctly', () => {
      const { setIsLoading, setCurrentView } = useAppStore.getState();

      // Rapid updates
      setIsLoading(true);
      setCurrentView('result');
      setIsLoading(false);
      setCurrentView('dashboard');
      setIsLoading(true);

      // Final state should be correct
      expect(useAppStore.getState().isLoading).toBe(true);
      expect(useAppStore.getState().currentView).toBe('dashboard');
    });

    it('should maintain state consistency across multiple operations', () => {
      const { 
        setCurrentView, 
        setSelectedCity, 
        setWeatherData, 
        setCocktailData, 
        setCityImageUrl 
      } = useAppStore.getState();

      // Perform multiple operations
      setCurrentView('result');
      setSelectedCity(mockCityOption);
      setWeatherData(mockWeatherData);
      setCocktailData(mockCocktailData);
      setCityImageUrl('https://example.com/image.jpg');

      const state = useAppStore.getState();

      // All state should be consistent
      expect(state.currentView).toBe('result');
      expect(state.selectedCity).toEqual(mockCityOption);
      expect(state.weatherData).toEqual(mockWeatherData);
      expect(state.cocktailData).toEqual(mockCocktailData);
      expect(state.cityImageUrl).toBe('https://example.com/image.jpg');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null values gracefully', () => {
      const { setSelectedCity, setWeatherData, setCocktailData, setCityImageUrl } = useAppStore.getState();

      // These should not throw errors
      expect(() => {
        setSelectedCity(null as any);
        setWeatherData(null as any);
        setCocktailData(null as any);
        setCityImageUrl(null as any);
      }).not.toThrow();
    });

    it('should handle empty arrays and objects', () => {
      const { setCityOptions } = useAppStore.getState();

      expect(() => {
        setCityOptions([]);
      }).not.toThrow();

      expect(useAppStore.getState().cityOptions).toEqual([]);
    });

    it('should handle very large datasets', () => {
      const { setCityOptions } = useAppStore.getState();

      // Create a large array of city options
      const largeCityArray = Array.from({ length: 1000 }, (_, i) => ({
        city: `City ${i}`,
        country: `Country ${i}`,
        countryCode: `c${i}`,
        latitude: i * 0.1,
        longitude: i * 0.1,
      }));

      expect(() => {
        setCityOptions(largeCityArray);
      }).not.toThrow();

      expect(useAppStore.getState().cityOptions).toHaveLength(1000);
    });
  });

  describe('Type Safety', () => {
    it('should maintain proper TypeScript types', () => {
      const state = useAppStore.getState();

      // These should be properly typed
      expect(typeof state.isLoading).toBe('boolean');
      expect(['search', 'result', 'dashboard']).toContain(state.currentView);
      expect(Array.isArray(state.cityOptions)).toBe(true);
      
      if (state.selectedCity) {
        expect(typeof state.selectedCity.city).toBe('string');
        expect(typeof state.selectedCity.latitude).toBe('number');
      }
      
      if (state.weatherData) {
        expect(typeof state.weatherData.temperature).toBe('number');
        expect(typeof state.weatherData.isDay).toBe('boolean');
      }
      
      if (state.cocktailData) {
        expect(Array.isArray(state.cocktailData.ingredients)).toBe(true);
        expect(Array.isArray(state.cocktailData.recipe)).toBe(true);
      }
    });
  });
});