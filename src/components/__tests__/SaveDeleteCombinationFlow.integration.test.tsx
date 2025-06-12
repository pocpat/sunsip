import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { saveCombination, deleteSavedCombination, updateCombinationRating, trackCombinationAccess } from '../../lib/supabase';
import CocktailDetails from '../CocktailDetails';
import SavedCombinations from '../SavedCombinations';
import type { WeatherData, CocktailData } from '../../store/appStore';
import type { SavedCombination, User } from '../../store/authStore';

// Mock Supabase functions
vi.mock('../../lib/supabase', () => ({
  saveCombination: vi.fn(),
  deleteSavedCombination: vi.fn(),
  updateCombinationRating: vi.fn(),
  trackCombinationAccess: vi.fn(),
  getUserSavedCombinations: vi.fn(),
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

const mockSaveCombination = vi.mocked(saveCombination);
const mockDeleteSavedCombination = vi.mocked(deleteSavedCombination);
const mockUpdateCombinationRating = vi.mocked(updateCombinationRating);
const mockTrackCombinationAccess = vi.mocked(trackCombinationAccess);

const mockUser: User = {
  id: 'user-123',
  email: 'test@example.com',
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

const mockSavedCombination: SavedCombination = {
  id: 'combo-123',
  cityName: 'Paris',
  countryName: 'France',
  cityImageUrl: mockCityImageUrl,
  weatherDetails: JSON.stringify({
    temperature: mockWeatherData.temperature,
    condition: mockWeatherData.condition,
    localTime: mockWeatherData.localTime,
  }),
  cocktailName: mockCocktailData.name,
  cocktailImageUrl: mockCocktailData.imageUrl,
  cocktailIngredients: mockCocktailData.ingredients,
  cocktailRecipe: mockCocktailData.recipe,
  rating: 5,
  notes: 'Perfect combination for a sunny day!',
  timesAccessed: 0,
  savedAt: '2025-01-10T10:00:00Z',
};

// Component that renders both CocktailDetails and SavedCombinations
const SaveDeleteFlowComponent = () => {
  return (
    <div>
      <CocktailDetails />
      <SavedCombinations />
    </div>
  );
};

describe('Save/Delete Combination Flow Integration Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    
    // Reset stores to initial state
    useAppStore.setState({
      isLoading: false,
      currentView: 'result',
      cityOptions: [],
      selectedCity: undefined,
      weatherData: mockWeatherData,
      cocktailData: mockCocktailData,
      cityImageUrl: mockCityImageUrl,
      showAuthModal: false,
    });

    useAuthStore.setState({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      savedCombinations: [],
      userPreferences: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Complete Save Combination Flow', () => {
    it('should save a combination with rating and notes from CocktailDetails', async () => {
      mockSaveCombination.mockResolvedValueOnce(mockSavedCombination);

      render(<SaveDeleteFlowComponent />);

      // Verify CocktailDetails is displayed
      expect(screen.getByText('Cocktail Match')).toBeInTheDocument();
      expect(screen.getByText('Classic Martini')).toBeInTheDocument();

      // Click save combination button
      const saveButton = screen.getByRole('button', { name: 'Save Combination' });
      await user.click(saveButton);

      // Rating modal should open
      await waitFor(() => {
        expect(screen.getByText('Rate Your Combination')).toBeInTheDocument();
        expect(screen.getByText('Paris, France + Classic Martini')).toBeInTheDocument();
      });

      // Rate the combination (click 5th star)
      const stars = screen.getAllByTestId('star-icon');
      await user.click(stars[4]); // 5th star for 5-star rating

      // Add notes
      const notesTextarea = screen.getByPlaceholderText('Add your thoughts about this combination...');
      await user.type(notesTextarea, 'Perfect combination for a sunny day!');

      // Save the combination
      const saveModalButton = screen.getByRole('button', { name: 'Save' });
      await user.click(saveModalButton);

      // Verify API call was made with correct data
      await waitFor(() => {
        expect(mockSaveCombination).toHaveBeenCalledWith(mockUser.id, {
          cityName: 'Paris',
          countryName: 'France',
          cityImageUrl: mockCityImageUrl,
          weatherDetails: JSON.stringify({
            temperature: 22,
            condition: 'Sunny',
            localTime: 'Jun 10, 2025, 2:30 PM',
          }),
          cocktailName: 'Classic Martini',
          cocktailImageUrl: 'https://images.pexels.com/photos/5379228/pexels-photo-5379228.jpeg',
          cocktailIngredients: ['2 oz gin', '1/2 oz dry vermouth', 'Lemon twist for garnish'],
          cocktailRecipe: [
            'Add gin and vermouth to mixing glass with ice',
            'Stir until well chilled',
            'Strain into chilled martini glass',
            'Garnish with lemon twist'
          ],
          rating: 5,
          notes: 'Perfect combination for a sunny day!',
        });
      });

      // Verify success message is shown
      await waitFor(() => {
        expect(screen.getByText('Combination saved successfully!')).toBeInTheDocument();
      });

      // Verify combination is added to auth store
      expect(useAuthStore.getState().savedCombinations).toHaveLength(1);
      expect(useAuthStore.getState().savedCombinations[0]).toEqual(mockSavedCombination);

      // Modal should close
      expect(screen.queryByText('Rate Your Combination')).not.toBeInTheDocument();
    });

    it('should save a combination without rating or notes', async () => {
      const savedCombinationWithoutRating = {
        ...mockSavedCombination,
        rating: undefined,
        notes: undefined,
      };

      mockSaveCombination.mockResolvedValueOnce(savedCombinationWithoutRating);

      render(<SaveDeleteFlowComponent />);

      // Click save combination button
      const saveButton = screen.getByRole('button', { name: 'Save Combination' });
      await user.click(saveButton);

      // Rating modal should open
      await waitFor(() => {
        expect(screen.getByText('Rate Your Combination')).toBeInTheDocument();
      });

      // Save without rating or notes
      const saveModalButton = screen.getByRole('button', { name: 'Save' });
      await user.click(saveModalButton);

      // Verify API call was made without rating and notes
      await waitFor(() => {
        expect(mockSaveCombination).toHaveBeenCalledWith(mockUser.id, {
          cityName: 'Paris',
          countryName: 'France',
          cityImageUrl: mockCityImageUrl,
          weatherDetails: JSON.stringify({
            temperature: 22,
            condition: 'Sunny',
            localTime: 'Jun 10, 2025, 2:30 PM',
          }),
          cocktailName: 'Classic Martini',
          cocktailImageUrl: 'https://images.pexels.com/photos/5379228/pexels-photo-5379228.jpeg',
          cocktailIngredients: ['2 oz gin', '1/2 oz dry vermouth', 'Lemon twist for garnish'],
          cocktailRecipe: [
            'Add gin and vermouth to mixing glass with ice',
            'Stir until well chilled',
            'Strain into chilled martini glass',
            'Garnish with lemon twist'
          ],
          rating: undefined,
          notes: undefined,
        });
      });

      // Verify combination is saved
      expect(useAuthStore.getState().savedCombinations).toHaveLength(1);
    });

    it('should handle save errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSaveCombination.mockRejectedValueOnce(new Error('Save failed'));

      render(<SaveDeleteFlowComponent />);

      const saveButton = screen.getByRole('button', { name: 'Save Combination' });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Rate Your Combination')).toBeInTheDocument();
      });

      const saveModalButton = screen.getByRole('button', { name: 'Save' });
      await user.click(saveModalButton);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error saving combination:', expect.any(Error));
      });

      // Modal should remain open on error
      expect(screen.getByText('Rate Your Combination')).toBeInTheDocument();
      
      // No combination should be added to store
      expect(useAuthStore.getState().savedCombinations).toHaveLength(0);

      consoleErrorSpy.mockRestore();
    });

    it('should not show save button when user is not authenticated', () => {
      useAuthStore.setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        savedCombinations: [],
        userPreferences: null,
      });

      render(<SaveDeleteFlowComponent />);

      // Save button should not be visible
      expect(screen.queryByRole('button', { name: 'Save Combination' })).not.toBeInTheDocument();
    });

    it('should handle missing required data gracefully', () => {
      // Remove required data
      useAppStore.setState({
        weatherData: undefined,
        cocktailData: mockCocktailData,
        cityImageUrl: mockCityImageUrl,
      });

      render(<SaveDeleteFlowComponent />);

      // Save button should not be visible when required data is missing
      expect(screen.queryByRole('button', { name: 'Save Combination' })).not.toBeInTheDocument();
    });
  });

  describe('Complete Delete Combination Flow', () => {
    beforeEach(() => {
      // Set up saved combinations in the store
      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
        savedCombinations: [mockSavedCombination],
        userPreferences: null,
      });
    });

    it('should delete a combination from SavedCombinations', async () => {
      mockDeleteSavedCombination.mockResolvedValueOnce(undefined);

      render(<SaveDeleteFlowComponent />);

      // Verify saved combination is displayed
      expect(screen.getByText('Saved Combinations (1)')).toBeInTheDocument();

      // Expand saved combinations
      await user.click(screen.getByText('Saved Combinations (1)'));

      // Verify combination details are shown
      await waitFor(() => {
        expect(screen.getByText('Paris')).toBeInTheDocument();
        expect(screen.getByText('Classic Martini')).toBeInTheDocument();
      });

      // Find and click delete button
      const deleteButton = screen.getByRole('button', { name: '' }); // X button
      await user.click(deleteButton);

      // Verify API call was made
      await waitFor(() => {
        expect(mockDeleteSavedCombination).toHaveBeenCalledWith('combo-123');
      });

      // Verify combination is removed from store
      expect(useAuthStore.getState().savedCombinations).toHaveLength(0);

      // Saved combinations section should no longer be visible (empty list)
      expect(screen.queryByText('Saved Combinations')).not.toBeInTheDocument();
    });

    it('should handle delete errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockDeleteSavedCombination.mockRejectedValueOnce(new Error('Delete failed'));

      render(<SaveDeleteFlowComponent />);

      // Expand saved combinations
      await user.click(screen.getByText('Saved Combinations (1)'));

      // Try to delete
      const deleteButton = screen.getByRole('button', { name: '' });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error deleting saved combination:', expect.any(Error));
      });

      // Combination should still be in the store (delete failed)
      expect(useAuthStore.getState().savedCombinations).toHaveLength(1);
      expect(screen.getByText('Classic Martini')).toBeInTheDocument();

      consoleErrorSpy.mockRestore();
    });

    it('should show loading state during deletion', async () => {
      // Mock delayed response
      mockDeleteSavedCombination.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve(undefined), 100))
      );

      render(<SaveDeleteFlowComponent />);

      // Expand saved combinations
      await user.click(screen.getByText('Saved Combinations (1)'));

      // Click delete button
      const deleteButton = screen.getByRole('button', { name: '' });
      await user.click(deleteButton);

      // Should show loading spinner
      expect(screen.getByRole('progressbar', { hidden: true })).toBeInTheDocument();

      // Wait for deletion to complete
      await waitFor(() => {
        expect(screen.queryByRole('progressbar', { hidden: true })).not.toBeInTheDocument();
      }, { timeout: 200 });

      expect(useAuthStore.getState().savedCombinations).toHaveLength(0);
    });
  });

  describe('Complete Save-Then-Delete Flow', () => {
    it('should save a combination and then delete it in sequence', async () => {
      mockSaveCombination.mockResolvedValueOnce(mockSavedCombination);
      mockDeleteSavedCombination.mockResolvedValueOnce(undefined);

      render(<SaveDeleteFlowComponent />);

      // Step 1: Save the combination
      const saveButton = screen.getByRole('button', { name: 'Save Combination' });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Rate Your Combination')).toBeInTheDocument();
      });

      // Rate and save
      const stars = screen.getAllByTestId('star-icon');
      await user.click(stars[4]); // 5 stars

      const notesTextarea = screen.getByPlaceholderText('Add your thoughts about this combination...');
      await user.type(notesTextarea, 'Great combination!');

      const saveModalButton = screen.getByRole('button', { name: 'Save' });
      await user.click(saveModalButton);

      // Wait for save to complete
      await waitFor(() => {
        expect(mockSaveCombination).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByText('Combination saved successfully!')).toBeInTheDocument();
      });

      // Verify combination appears in saved combinations
      expect(screen.getByText('Saved Combinations (1)')).toBeInTheDocument();

      // Step 2: Delete the combination
      await user.click(screen.getByText('Saved Combinations (1)'));

      await waitFor(() => {
        expect(screen.getByText('Classic Martini')).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: '' });
      await user.click(deleteButton);

      // Wait for delete to complete
      await waitFor(() => {
        expect(mockDeleteSavedCombination).toHaveBeenCalledWith('combo-123');
      });

      // Verify combination is removed
      expect(useAuthStore.getState().savedCombinations).toHaveLength(0);
      expect(screen.queryByText('Saved Combinations')).not.toBeInTheDocument();
    });

    it('should handle multiple save and delete operations', async () => {
      const combination1 = { ...mockSavedCombination, id: 'combo-1', cocktailName: 'Martini' };
      const combination2 = { ...mockSavedCombination, id: 'combo-2', cocktailName: 'Negroni' };

      mockSaveCombination
        .mockResolvedValueOnce(combination1)
        .mockResolvedValueOnce(combination2);
      mockDeleteSavedCombination.mockResolvedValue(undefined);

      render(<SaveDeleteFlowComponent />);

      // Save first combination
      const saveButton = screen.getByRole('button', { name: 'Save Combination' });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Rate Your Combination')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => {
        expect(useAuthStore.getState().savedCombinations).toHaveLength(1);
      });

      // Change cocktail data for second save
      useAppStore.setState({
        cocktailData: { ...mockCocktailData, name: 'Negroni' },
      });

      // Save second combination
      await user.click(screen.getByRole('button', { name: 'Save Combination' }));

      await waitFor(() => {
        expect(screen.getByText('Rate Your Combination')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => {
        expect(useAuthStore.getState().savedCombinations).toHaveLength(2);
      });

      // Verify both combinations are shown
      expect(screen.getByText('Saved Combinations (2)')).toBeInTheDocument();

      // Expand and delete first combination
      await user.click(screen.getByText('Saved Combinations (2)'));

      const deleteButtons = screen.getAllByRole('button', { name: '' });
      await user.click(deleteButtons[0]); // Delete first combination

      await waitFor(() => {
        expect(mockDeleteSavedCombination).toHaveBeenCalledWith('combo-2'); // Most recent first
      });

      expect(useAuthStore.getState().savedCombinations).toHaveLength(1);
      expect(screen.getByText('Saved Combinations (1)')).toBeInTheDocument();
    });
  });

  describe('Data Consistency and State Management', () => {
    it('should maintain data consistency between save and display', async () => {
      mockSaveCombination.mockResolvedValueOnce(mockSavedCombination);

      render(<SaveDeleteFlowComponent />);

      // Save combination
      const saveButton = screen.getByRole('button', { name: 'Save Combination' });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Rate Your Combination')).toBeInTheDocument();
      });

      const stars = screen.getAllByTestId('star-icon');
      await user.click(stars[2]); // 3 stars

      const notesTextarea = screen.getByPlaceholderText('Add your thoughts about this combination...');
      await user.type(notesTextarea, 'Nice combination');

      await user.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => {
        expect(useAuthStore.getState().savedCombinations).toHaveLength(1);
      });

      // Verify saved data matches what was entered
      const savedCombination = useAuthStore.getState().savedCombinations[0];
      expect(savedCombination.cityName).toBe('Paris');
      expect(savedCombination.countryName).toBe('France');
      expect(savedCombination.cocktailName).toBe('Classic Martini');
      expect(savedCombination.rating).toBe(5); // From mock response
      expect(savedCombination.notes).toBe('Perfect combination for a sunny day!'); // From mock response

      // Verify display shows correct data
      expect(screen.getByText('Saved Combinations (1)')).toBeInTheDocument();
      await user.click(screen.getByText('Saved Combinations (1)'));

      expect(screen.getByText('Paris')).toBeInTheDocument();
      expect(screen.getByText('France')).toBeInTheDocument();
      expect(screen.getByText('Classic Martini')).toBeInTheDocument();
    });

    it('should handle concurrent save and delete operations correctly', async () => {
      mockSaveCombination.mockResolvedValueOnce(mockSavedCombination);
      mockDeleteSavedCombination.mockResolvedValueOnce(undefined);

      // Start with one existing combination
      useAuthStore.setState({
        savedCombinations: [{
          ...mockSavedCombination,
          id: 'existing-combo',
          cocktailName: 'Old Fashioned',
        }],
      });

      render(<SaveDeleteFlowComponent />);

      // Verify existing combination is shown
      expect(screen.getByText('Saved Combinations (1)')).toBeInTheDocument();

      // Save new combination while existing one is displayed
      const saveButton = screen.getByRole('button', { name: 'Save Combination' });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Rate Your Combination')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => {
        expect(useAuthStore.getState().savedCombinations).toHaveLength(2);
      });

      // Should now show 2 combinations
      expect(screen.getByText('Saved Combinations (2)')).toBeInTheDocument();

      // Delete one combination
      await user.click(screen.getByText('Saved Combinations (2)'));

      const deleteButtons = screen.getAllByRole('button', { name: '' });
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(useAuthStore.getState().savedCombinations).toHaveLength(1);
      });

      expect(screen.getByText('Saved Combinations (1)')).toBeInTheDocument();
    });

    it('should preserve other app state during save/delete operations', async () => {
      mockSaveCombination.mockResolvedValueOnce(mockSavedCombination);
      mockDeleteSavedCombination.mockResolvedValueOnce(undefined);

      // Set additional app state
      useAppStore.setState({
        currentView: 'result',
        isLoading: false,
      });

      render(<SaveDeleteFlowComponent />);

      // Save combination
      const saveButton = screen.getByRole('button', { name: 'Save Combination' });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Rate Your Combination')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => {
        expect(useAuthStore.getState().savedCombinations).toHaveLength(1);
      });

      // Verify app state is preserved
      expect(useAppStore.getState().currentView).toBe('result');
      expect(useAppStore.getState().isLoading).toBe(false);
      expect(useAppStore.getState().weatherData).toEqual(mockWeatherData);
      expect(useAppStore.getState().cocktailData).toEqual(mockCocktailData);

      // Delete combination
      await user.click(screen.getByText('Saved Combinations (1)'));
      const deleteButton = screen.getByRole('button', { name: '' });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(useAuthStore.getState().savedCombinations).toHaveLength(0);
      });

      // App state should still be preserved
      expect(useAppStore.getState().currentView).toBe('result');
      expect(useAppStore.getState().weatherData).toEqual(mockWeatherData);
      expect(useAppStore.getState().cocktailData).toEqual(mockCocktailData);
    });
  });

  describe('User Experience and Interaction', () => {
    it('should provide clear feedback during save operations', async () => {
      // Mock delayed save to test loading states
      mockSaveCombination.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve(mockSavedCombination), 100))
      );

      render(<SaveDeleteFlowComponent />);

      const saveButton = screen.getByRole('button', { name: 'Save Combination' });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Rate Your Combination')).toBeInTheDocument();
      });

      const saveModalButton = screen.getByRole('button', { name: 'Save' });
      await user.click(saveModalButton);

      // Should show loading state
      expect(screen.getByText('Saving...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();

      // Wait for save to complete
      await waitFor(() => {
        expect(screen.getByText('Combination saved successfully!')).toBeInTheDocument();
      }, { timeout: 200 });

      expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
    });

    it('should allow canceling save operation', async () => {
      render(<SaveDeleteFlowComponent />);

      const saveButton = screen.getByRole('button', { name: 'Save Combination' });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Rate Your Combination')).toBeInTheDocument();
      });

      // Cancel the save
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      // Modal should close
      expect(screen.queryByText('Rate Your Combination')).not.toBeInTheDocument();

      // No API call should be made
      expect(mockSaveCombination).not.toHaveBeenCalled();

      // No combination should be saved
      expect(useAuthStore.getState().savedCombinations).toHaveLength(0);
    });

    it('should handle rapid save button clicks gracefully', async () => {
      mockSaveCombination.mockResolvedValueOnce(mockSavedCombination);

      render(<SaveDeleteFlowComponent />);

      const saveButton = screen.getByRole('button', { name: 'Save Combination' });
      
      // Click multiple times rapidly
      await user.click(saveButton);
      await user.click(saveButton);
      await user.click(saveButton);

      // Should only open one modal
      const modals = screen.getAllByText('Rate Your Combination');
      expect(modals).toHaveLength(1);
    });

    it('should provide visual feedback for successful operations', async () => {
      mockSaveCombination.mockResolvedValueOnce(mockSavedCombination);

      render(<SaveDeleteFlowComponent />);

      const saveButton = screen.getByRole('button', { name: 'Save Combination' });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Rate Your Combination')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: 'Save' }));

      // Success message should appear
      await waitFor(() => {
        expect(screen.getByText('Combination saved successfully!')).toBeInTheDocument();
      });

      // Success message should disappear after timeout
      await waitFor(() => {
        expect(screen.queryByText('Combination saved successfully!')).not.toBeInTheDocument();
      }, { timeout: 4000 });
    });
  });
});