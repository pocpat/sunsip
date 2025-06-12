import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '../authStore';
import type { User, SavedCombination, UserPreferences } from '../authStore';

// Mock Sentry functions
vi.mock('../../lib/sentry', () => ({
  setUserContext: vi.fn(),
  clearUserContext: vi.fn(),
}));

// Mock data for testing
const mockUser: User = {
  id: 'user-123',
  email: 'test@example.com',
};

const mockSavedCombination: SavedCombination = {
  id: 'combo-123',
  cityName: 'Paris',
  countryName: 'France',
  cityImageUrl: 'https://images.pexels.com/photos/532826/pexels-photo-532826.jpeg',
  weatherDetails: '{"temperature": 22, "condition": "Sunny"}',
  cocktailName: 'Classic Martini',
  cocktailImageUrl: 'https://images.pexels.com/photos/5379228/pexels-photo-5379228.jpeg',
  cocktailIngredients: ['2 oz gin', '1/2 oz dry vermouth', 'Lemon twist'],
  cocktailRecipe: ['Add gin and vermouth to mixing glass with ice', 'Stir until chilled', 'Strain into chilled martini glass'],
  rating: 5,
  notes: 'Perfect for a sunny day in Paris!',
  timesAccessed: 3,
  lastAccessedAt: '2025-01-10T15:30:00Z',
  savedAt: '2025-01-10T10:00:00Z',
};

const mockUserPreferences: UserPreferences = {
  id: 'pref-123',
  preferredSpirits: ['Gin', 'Whiskey', 'Rum'],
  dietaryRestrictions: ['Vegetarian', 'Gluten-free'],
  favoriteWeatherMoods: {
    sunny: true,
    rainy: false,
    snowy: true,
    cloudy: false,
  },
  createdAt: '2025-01-10T10:00:00Z',
  updatedAt: '2025-01-10T15:00:00Z',
};

const mockSavedCombinations: SavedCombination[] = [
  mockSavedCombination,
  {
    id: 'combo-456',
    cityName: 'London',
    countryName: 'United Kingdom',
    cityImageUrl: 'https://images.pexels.com/photos/672532/pexels-photo-672532.jpeg',
    weatherDetails: '{"temperature": 15, "condition": "Cloudy"}',
    cocktailName: 'Gin & Tonic',
    cocktailImageUrl: 'https://images.pexels.com/photos/2480828/pexels-photo-2480828.jpeg',
    cocktailIngredients: ['2 oz gin', '4 oz tonic water', 'Lime wedge'],
    cocktailRecipe: ['Fill glass with ice', 'Add gin', 'Top with tonic water', 'Garnish with lime'],
    rating: 4,
    notes: 'Classic British drink',
    timesAccessed: 1,
    lastAccessedAt: '2025-01-09T20:00:00Z',
    savedAt: '2025-01-09T18:00:00Z',
  },
  {
    id: 'combo-789',
    cityName: 'Tokyo',
    countryName: 'Japan',
    cityImageUrl: 'https://images.pexels.com/photos/2506923/pexels-photo-2506923.jpeg',
    weatherDetails: '{"temperature": 18, "condition": "Rain"}',
    cocktailName: 'Whiskey Highball',
    cocktailImageUrl: 'https://images.pexels.com/photos/602750/pexels-photo-602750.jpeg',
    cocktailIngredients: ['2 oz whiskey', '4 oz soda water', 'Lemon peel'],
    cocktailRecipe: ['Fill glass with ice', 'Add whiskey', 'Top with soda water', 'Express lemon peel'],
    timesAccessed: 0,
    savedAt: '2025-01-08T12:00:00Z',
  },
];

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      savedCombinations: [],
      userPreferences: null,
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const initialState = useAuthStore.getState();

      expect(initialState.user).toBeNull();
      expect(initialState.isAuthenticated).toBe(false);
      expect(initialState.isLoading).toBe(false);
      expect(initialState.savedCombinations).toEqual([]);
      expect(initialState.userPreferences).toBeNull();
    });

    it('should have all required action functions', () => {
      const state = useAuthStore.getState();

      expect(typeof state.setUser).toBe('function');
      expect(typeof state.setSavedCombinations).toBe('function');
      expect(typeof state.addSavedCombination).toBe('function');
      expect(typeof state.updateSavedCombination).toBe('function');
      expect(typeof state.removeSavedCombination).toBe('function');
      expect(typeof state.setUserPreferences).toBe('function');
      expect(typeof state.setIsLoading).toBe('function');
      expect(typeof state.logout).toBe('function');
    });
  });

  describe('User State Management', () => {
    it('should set user and update authentication state', () => {
      const { setUser } = useAuthStore.getState();

      setUser(mockUser);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should clear user and update authentication state', () => {
      const { setUser } = useAuthStore.getState();

      // First set a user
      setUser(mockUser);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      // Then clear the user
      setUser(null);

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should handle user updates correctly', () => {
      const { setUser } = useAuthStore.getState();

      const updatedUser: User = {
        id: 'user-456',
        email: 'updated@example.com',
      };

      // Set initial user
      setUser(mockUser);
      expect(useAuthStore.getState().user?.email).toBe('test@example.com');

      // Update user
      setUser(updatedUser);
      expect(useAuthStore.getState().user?.email).toBe('updated@example.com');
      expect(useAuthStore.getState().user?.id).toBe('user-456');
    });

    it('should maintain authentication state consistency', () => {
      const { setUser } = useAuthStore.getState();

      // Test multiple user state changes
      setUser(mockUser);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      setUser(null);
      expect(useAuthStore.getState().isAuthenticated).toBe(false);

      setUser(mockUser);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });
  });

  describe('Loading State Management', () => {
    it('should update loading state correctly', () => {
      const { setIsLoading } = useAuthStore.getState();

      setIsLoading(true);
      expect(useAuthStore.getState().isLoading).toBe(true);

      setIsLoading(false);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should handle multiple loading state changes', () => {
      const { setIsLoading } = useAuthStore.getState();

      const loadingStates = [true, false, true, false, true];
      
      loadingStates.forEach(state => {
        setIsLoading(state);
        expect(useAuthStore.getState().isLoading).toBe(state);
      });
    });
  });

  describe('Saved Combinations Management', () => {
    it('should set saved combinations correctly', () => {
      const { setSavedCombinations } = useAuthStore.getState();

      setSavedCombinations(mockSavedCombinations);

      const state = useAuthStore.getState();
      expect(state.savedCombinations).toEqual(mockSavedCombinations);
      expect(state.savedCombinations).toHaveLength(3);
    });

    it('should add new saved combination to the beginning of the list', () => {
      const { setSavedCombinations, addSavedCombination } = useAuthStore.getState();

      // Set initial combinations
      setSavedCombinations([mockSavedCombinations[1], mockSavedCombinations[2]]);
      expect(useAuthStore.getState().savedCombinations).toHaveLength(2);

      // Add new combination
      addSavedCombination(mockSavedCombination);

      const state = useAuthStore.getState();
      expect(state.savedCombinations).toHaveLength(3);
      expect(state.savedCombinations[0]).toEqual(mockSavedCombination);
      expect(state.savedCombinations[0].id).toBe('combo-123');
    });

    it('should limit saved combinations to 20 items', () => {
      const { addSavedCombination } = useAuthStore.getState();

      // Create 25 combinations
      const manyCombinations = Array.from({ length: 25 }, (_, i) => ({
        ...mockSavedCombination,
        id: `combo-${i}`,
        cityName: `City ${i}`,
      }));

      // Add all combinations
      manyCombinations.forEach(combo => {
        addSavedCombination(combo);
      });

      const state = useAuthStore.getState();
      expect(state.savedCombinations).toHaveLength(20);
      
      // Should keep the most recent 20 (last 20 added)
      expect(state.savedCombinations[0].id).toBe('combo-24');
      expect(state.savedCombinations[19].id).toBe('combo-5');
    });

    it('should remove saved combination correctly', () => {
      const { setSavedCombinations, removeSavedCombination } = useAuthStore.getState();

      // Set initial combinations
      setSavedCombinations(mockSavedCombinations);
      expect(useAuthStore.getState().savedCombinations).toHaveLength(3);

      // Remove one combination
      removeSavedCombination('combo-456');

      const state = useAuthStore.getState();
      expect(state.savedCombinations).toHaveLength(2);
      expect(state.savedCombinations.find(c => c.id === 'combo-456')).toBeUndefined();
      expect(state.savedCombinations.find(c => c.id === 'combo-123')).toBeDefined();
      expect(state.savedCombinations.find(c => c.id === 'combo-789')).toBeDefined();
    });

    it('should handle removing non-existent combination gracefully', () => {
      const { setSavedCombinations, removeSavedCombination } = useAuthStore.getState();

      setSavedCombinations(mockSavedCombinations);
      const initialLength = useAuthStore.getState().savedCombinations.length;

      // Try to remove non-existent combination
      removeSavedCombination('non-existent-id');

      const state = useAuthStore.getState();
      expect(state.savedCombinations).toHaveLength(initialLength);
    });

    it('should update saved combination correctly', () => {
      const { setSavedCombinations, updateSavedCombination } = useAuthStore.getState();

      setSavedCombinations(mockSavedCombinations);

      const updates = {
        rating: 3,
        notes: 'Updated notes',
        timesAccessed: 5,
      };

      updateSavedCombination('combo-456', updates);

      const state = useAuthStore.getState();
      const updatedCombo = state.savedCombinations.find(c => c.id === 'combo-456');
      
      expect(updatedCombo?.rating).toBe(3);
      expect(updatedCombo?.notes).toBe('Updated notes');
      expect(updatedCombo?.timesAccessed).toBe(5);
      
      // Other properties should remain unchanged
      expect(updatedCombo?.cityName).toBe('London');
      expect(updatedCombo?.cocktailName).toBe('Gin & Tonic');
    });

    it('should handle updating non-existent combination gracefully', () => {
      const { setSavedCombinations, updateSavedCombination } = useAuthStore.getState();

      setSavedCombinations(mockSavedCombinations);
      const originalCombinations = [...useAuthStore.getState().savedCombinations];

      // Try to update non-existent combination
      updateSavedCombination('non-existent-id', { rating: 5 });

      const state = useAuthStore.getState();
      expect(state.savedCombinations).toEqual(originalCombinations);
    });

    it('should handle partial updates correctly', () => {
      const { setSavedCombinations, updateSavedCombination } = useAuthStore.getState();

      setSavedCombinations(mockSavedCombinations);

      // Update only rating
      updateSavedCombination('combo-123', { rating: 2 });

      const state = useAuthStore.getState();
      const updatedCombo = state.savedCombinations.find(c => c.id === 'combo-123');
      
      expect(updatedCombo?.rating).toBe(2);
      expect(updatedCombo?.notes).toBe('Perfect for a sunny day in Paris!'); // Should remain unchanged
      expect(updatedCombo?.timesAccessed).toBe(3); // Should remain unchanged
    });

    it('should maintain saved combination structure integrity', () => {
      const { setSavedCombinations } = useAuthStore.getState();

      setSavedCombinations(mockSavedCombinations);
      const combinations = useAuthStore.getState().savedCombinations;

      combinations.forEach(combo => {
        expect(combo).toHaveProperty('id');
        expect(combo).toHaveProperty('cityName');
        expect(combo).toHaveProperty('countryName');
        expect(combo).toHaveProperty('cityImageUrl');
        expect(combo).toHaveProperty('weatherDetails');
        expect(combo).toHaveProperty('cocktailName');
        expect(combo).toHaveProperty('cocktailImageUrl');
        expect(combo).toHaveProperty('cocktailIngredients');
        expect(combo).toHaveProperty('cocktailRecipe');
        expect(combo).toHaveProperty('timesAccessed');
        expect(combo).toHaveProperty('savedAt');

        expect(typeof combo.id).toBe('string');
        expect(typeof combo.cityName).toBe('string');
        expect(typeof combo.countryName).toBe('string');
        expect(typeof combo.cityImageUrl).toBe('string');
        expect(typeof combo.weatherDetails).toBe('string');
        expect(typeof combo.cocktailName).toBe('string');
        expect(typeof combo.cocktailImageUrl).toBe('string');
        expect(Array.isArray(combo.cocktailIngredients)).toBe(true);
        expect(Array.isArray(combo.cocktailRecipe)).toBe(true);
        expect(typeof combo.timesAccessed).toBe('number');
        expect(typeof combo.savedAt).toBe('string');

        if (combo.rating !== undefined) {
          expect(typeof combo.rating).toBe('number');
          expect(combo.rating).toBeGreaterThanOrEqual(1);
          expect(combo.rating).toBeLessThanOrEqual(5);
        }

        if (combo.notes !== undefined) {
          expect(typeof combo.notes).toBe('string');
        }

        if (combo.lastAccessedAt !== undefined) {
          expect(typeof combo.lastAccessedAt).toBe('string');
        }
      });
    });
  });

  describe('User Preferences Management', () => {
    it('should set user preferences correctly', () => {
      const { setUserPreferences } = useAuthStore.getState();

      setUserPreferences(mockUserPreferences);

      const state = useAuthStore.getState();
      expect(state.userPreferences).toEqual(mockUserPreferences);
    });

    it('should handle null user preferences', () => {
      const { setUserPreferences } = useAuthStore.getState();

      // First set preferences
      setUserPreferences(mockUserPreferences);
      expect(useAuthStore.getState().userPreferences).toEqual(mockUserPreferences);

      // Then clear them
      setUserPreferences(null);
      expect(useAuthStore.getState().userPreferences).toBeNull();
    });

    it('should update user preferences correctly', () => {
      const { setUserPreferences } = useAuthStore.getState();

      const updatedPreferences: UserPreferences = {
        ...mockUserPreferences,
        preferredSpirits: ['Vodka', 'Tequila'],
        dietaryRestrictions: ['Vegan'],
        favoriteWeatherMoods: {
          sunny: false,
          rainy: true,
          snowy: false,
          cloudy: true,
        },
      };

      // Set initial preferences
      setUserPreferences(mockUserPreferences);
      expect(useAuthStore.getState().userPreferences?.preferredSpirits).toEqual(['Gin', 'Whiskey', 'Rum']);

      // Update preferences
      setUserPreferences(updatedPreferences);
      expect(useAuthStore.getState().userPreferences?.preferredSpirits).toEqual(['Vodka', 'Tequila']);
      expect(useAuthStore.getState().userPreferences?.dietaryRestrictions).toEqual(['Vegan']);
    });

    it('should maintain user preferences structure integrity', () => {
      const { setUserPreferences } = useAuthStore.getState();

      setUserPreferences(mockUserPreferences);
      const preferences = useAuthStore.getState().userPreferences;

      expect(preferences).toHaveProperty('id');
      expect(preferences).toHaveProperty('preferredSpirits');
      expect(preferences).toHaveProperty('dietaryRestrictions');
      expect(preferences).toHaveProperty('favoriteWeatherMoods');
      expect(preferences).toHaveProperty('createdAt');
      expect(preferences).toHaveProperty('updatedAt');

      expect(typeof preferences!.id).toBe('string');
      expect(Array.isArray(preferences!.preferredSpirits)).toBe(true);
      expect(Array.isArray(preferences!.dietaryRestrictions)).toBe(true);
      expect(typeof preferences!.favoriteWeatherMoods).toBe('object');
      expect(typeof preferences!.createdAt).toBe('string');
      expect(typeof preferences!.updatedAt).toBe('string');
    });
  });

  describe('Logout Functionality', () => {
    it('should clear all user-related state on logout', () => {
      const { setUser, setSavedCombinations, setUserPreferences, logout } = useAuthStore.getState();

      // Set up user state
      setUser(mockUser);
      setSavedCombinations(mockSavedCombinations);
      setUserPreferences(mockUserPreferences);

      // Verify state is set
      expect(useAuthStore.getState().user).toEqual(mockUser);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().savedCombinations).toHaveLength(3);
      expect(useAuthStore.getState().userPreferences).toEqual(mockUserPreferences);

      // Logout
      logout();

      // Verify all user-related state is cleared
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.savedCombinations).toEqual([]);
      expect(state.userPreferences).toBeNull();
    });

    it('should not affect loading state on logout', () => {
      const { setUser, setIsLoading, logout } = useAuthStore.getState();

      // Set user and loading state
      setUser(mockUser);
      setIsLoading(true);

      // Logout
      logout();

      // Loading state should remain unchanged
      expect(useAuthStore.getState().isLoading).toBe(true);
    });

    it('should be callable multiple times without issues', () => {
      const { setUser, logout } = useAuthStore.getState();

      // Set user
      setUser(mockUser);

      // Logout multiple times
      logout();
      logout();
      logout();

      // State should remain properly cleared
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.savedCombinations).toEqual([]);
      expect(state.userPreferences).toBeNull();
    });
  });

  describe('State Persistence and Immutability', () => {
    it('should not mutate original objects when setting state', () => {
      const { setUser, setSavedCombinations, setUserPreferences } = useAuthStore.getState();

      const originalUser = { ...mockUser };
      const originalCombinations = [...mockSavedCombinations];
      const originalPreferences = { ...mockUserPreferences };

      setUser(mockUser);
      setSavedCombinations(mockSavedCombinations);
      setUserPreferences(mockUserPreferences);

      // Original objects should remain unchanged
      expect(mockUser).toEqual(originalUser);
      expect(mockSavedCombinations).toEqual(originalCombinations);
      expect(mockUserPreferences).toEqual(originalPreferences);
    });

    it('should handle rapid state updates correctly', () => {
      const { setUser, setIsLoading } = useAuthStore.getState();

      // Rapid updates
      setUser(mockUser);
      setIsLoading(true);
      setUser(null);
      setIsLoading(false);
      setUser(mockUser);

      // Final state should be correct
      expect(useAuthStore.getState().user).toEqual(mockUser);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should maintain state consistency across multiple operations', () => {
      const { setUser, setSavedCombinations, setUserPreferences, addSavedCombination } = useAuthStore.getState();

      // Perform multiple operations
      setUser(mockUser);
      setSavedCombinations([mockSavedCombinations[0]]);
      setUserPreferences(mockUserPreferences);
      addSavedCombination(mockSavedCombinations[1]);

      const state = useAuthStore.getState();

      // All state should be consistent
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.savedCombinations).toHaveLength(2);
      expect(state.savedCombinations[0]).toEqual(mockSavedCombinations[1]); // Most recent first
      expect(state.userPreferences).toEqual(mockUserPreferences);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null and undefined values gracefully', () => {
      const { setUser, setSavedCombinations, setUserPreferences } = useAuthStore.getState();

      // These should not throw errors
      expect(() => {
        setUser(null);
        setSavedCombinations([]);
        setUserPreferences(null);
      }).not.toThrow();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.savedCombinations).toEqual([]);
      expect(state.userPreferences).toBeNull();
    });

    it('should handle empty arrays correctly', () => {
      const { setSavedCombinations } = useAuthStore.getState();

      setSavedCombinations([]);
      expect(useAuthStore.getState().savedCombinations).toEqual([]);
    });

    it('should handle operations on empty saved combinations', () => {
      const { removeSavedCombination, updateSavedCombination } = useAuthStore.getState();

      // These should not throw errors when no combinations exist
      expect(() => {
        removeSavedCombination('any-id');
        updateSavedCombination('any-id', { rating: 5 });
      }).not.toThrow();

      expect(useAuthStore.getState().savedCombinations).toEqual([]);
    });

    it('should handle very large datasets', () => {
      const { setSavedCombinations } = useAuthStore.getState();

      // Create a large array of combinations (more than the 20 limit)
      const largeCombinationArray = Array.from({ length: 50 }, (_, i) => ({
        ...mockSavedCombination,
        id: `combo-${i}`,
        cityName: `City ${i}`,
      }));

      expect(() => {
        setSavedCombinations(largeCombinationArray);
      }).not.toThrow();

      // Should still respect the limit when adding new ones
      const { addSavedCombination } = useAuthStore.getState();
      addSavedCombination({
        ...mockSavedCombination,
        id: 'new-combo',
        cityName: 'New City',
      });

      expect(useAuthStore.getState().savedCombinations).toHaveLength(20);
    });
  });

  describe('Type Safety and Data Validation', () => {
    it('should maintain proper TypeScript types', () => {
      const state = useAuthStore.getState();

      // User type validation
      if (state.user) {
        expect(typeof state.user.id).toBe('string');
        expect(typeof state.user.email).toBe('string');
      }

      // Boolean types
      expect(typeof state.isAuthenticated).toBe('boolean');
      expect(typeof state.isLoading).toBe('boolean');

      // Array types
      expect(Array.isArray(state.savedCombinations)).toBe(true);

      // UserPreferences type validation
      if (state.userPreferences) {
        expect(typeof state.userPreferences.id).toBe('string');
        expect(Array.isArray(state.userPreferences.preferredSpirits)).toBe(true);
        expect(Array.isArray(state.userPreferences.dietaryRestrictions)).toBe(true);
        expect(typeof state.userPreferences.favoriteWeatherMoods).toBe('object');
      }
    });

    it('should validate saved combination data structure', () => {
      const { setSavedCombinations } = useAuthStore.getState();

      setSavedCombinations(mockSavedCombinations);
      const combinations = useAuthStore.getState().savedCombinations;

      combinations.forEach(combo => {
        // Required fields
        expect(typeof combo.id).toBe('string');
        expect(typeof combo.cityName).toBe('string');
        expect(typeof combo.countryName).toBe('string');
        expect(typeof combo.cityImageUrl).toBe('string');
        expect(typeof combo.weatherDetails).toBe('string');
        expect(typeof combo.cocktailName).toBe('string');
        expect(typeof combo.cocktailImageUrl).toBe('string');
        expect(Array.isArray(combo.cocktailIngredients)).toBe(true);
        expect(Array.isArray(combo.cocktailRecipe)).toBe(true);
        expect(typeof combo.timesAccessed).toBe('number');
        expect(typeof combo.savedAt).toBe('string');

        // Optional fields
        if (combo.rating !== undefined) {
          expect(typeof combo.rating).toBe('number');
        }
        if (combo.notes !== undefined) {
          expect(typeof combo.notes).toBe('string');
        }
        if (combo.lastAccessedAt !== undefined) {
          expect(typeof combo.lastAccessedAt).toBe('string');
        }
      });
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle user switching correctly', () => {
      const { setUser, setSavedCombinations, setUserPreferences } = useAuthStore.getState();

      const user1: User = { id: 'user-1', email: 'user1@example.com' };
      const user2: User = { id: 'user-2', email: 'user2@example.com' };

      // Set up first user
      setUser(user1);
      setSavedCombinations([mockSavedCombinations[0]]);
      setUserPreferences(mockUserPreferences);

      expect(useAuthStore.getState().user?.id).toBe('user-1');
      expect(useAuthStore.getState().savedCombinations).toHaveLength(1);

      // Switch to second user (in real app, this would involve logout/login)
      setUser(user2);
      setSavedCombinations([mockSavedCombinations[1], mockSavedCombinations[2]]);
      setUserPreferences(null);

      const state = useAuthStore.getState();
      expect(state.user?.id).toBe('user-2');
      expect(state.savedCombinations).toHaveLength(2);
      expect(state.userPreferences).toBeNull();
    });

    it('should handle concurrent combination operations', () => {
      const { setSavedCombinations, addSavedCombination, updateSavedCombination, removeSavedCombination } = useAuthStore.getState();

      // Set initial state
      setSavedCombinations([mockSavedCombinations[0]]);

      // Perform multiple operations
      addSavedCombination(mockSavedCombinations[1]);
      updateSavedCombination(mockSavedCombinations[0].id, { rating: 3 });
      addSavedCombination(mockSavedCombinations[2]);
      removeSavedCombination(mockSavedCombinations[1].id);

      const state = useAuthStore.getState();
      expect(state.savedCombinations).toHaveLength(2);
      
      // Should have the updated first combination and the third combination
      const firstCombo = state.savedCombinations.find(c => c.id === mockSavedCombinations[0].id);
      expect(firstCombo?.rating).toBe(3);
      
      const thirdCombo = state.savedCombinations.find(c => c.id === mockSavedCombinations[2].id);
      expect(thirdCombo).toBeDefined();
      
      const secondCombo = state.savedCombinations.find(c => c.id === mockSavedCombinations[1].id);
      expect(secondCombo).toBeUndefined();
    });

    it('should maintain data integrity during stress operations', () => {
      const { addSavedCombination, updateSavedCombination, removeSavedCombination } = useAuthStore.getState();

      // Add many combinations rapidly
      for (let i = 0; i < 30; i++) {
        addSavedCombination({
          ...mockSavedCombination,
          id: `stress-combo-${i}`,
          cityName: `Stress City ${i}`,
        });
      }

      // Should respect the 20 item limit
      expect(useAuthStore.getState().savedCombinations).toHaveLength(20);

      // Update and remove operations should still work
      const firstComboId = useAuthStore.getState().savedCombinations[0].id;
      updateSavedCombination(firstComboId, { rating: 1 });
      
      const updatedCombo = useAuthStore.getState().savedCombinations.find(c => c.id === firstComboId);
      expect(updatedCombo?.rating).toBe(1);

      // Remove half of the combinations
      const idsToRemove = useAuthStore.getState().savedCombinations.slice(0, 10).map(c => c.id);
      idsToRemove.forEach(id => removeSavedCombination(id));

      expect(useAuthStore.getState().savedCombinations).toHaveLength(10);
    });
  });
});