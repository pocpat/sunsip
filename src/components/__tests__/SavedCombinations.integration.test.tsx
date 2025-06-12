import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAuthStore } from '../../store/authStore';
import { getUserSavedCombinations, deleteSavedCombination, updateCombinationRating, trackCombinationAccess } from '../../lib/supabase';
import SavedCombinations from '../SavedCombinations';
import type { SavedCombination } from '../../store/authStore';

// Mock Supabase functions
vi.mock('../../lib/supabase', () => ({
  getUserSavedCombinations: vi.fn(),
  deleteSavedCombination: vi.fn(),
  updateCombinationRating: vi.fn(),
  trackCombinationAccess: vi.fn(),
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

const mockGetUserSavedCombinations = vi.mocked(getUserSavedCombinations);
const mockDeleteSavedCombination = vi.mocked(deleteSavedCombination);
const mockUpdateCombinationRating = vi.mocked(updateCombinationRating);
const mockTrackCombinationAccess = vi.mocked(trackCombinationAccess);

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
};

const mockSavedCombinations: SavedCombination[] = [
  {
    id: 'combo-1',
    cityName: 'Paris',
    countryName: 'France',
    cityImageUrl: 'https://images.pexels.com/photos/532826/pexels-photo-532826.jpeg',
    weatherDetails: '{"temperature": 22, "condition": "Sunny"}',
    cocktailName: 'Classic Martini',
    cocktailImageUrl: 'https://images.pexels.com/photos/5379228/pexels-photo-5379228.jpeg',
    cocktailIngredients: ['2 oz gin', '1/2 oz dry vermouth', 'Lemon twist'],
    cocktailRecipe: ['Add gin and vermouth to mixing glass with ice', 'Stir until chilled'],
    rating: 5,
    notes: 'Perfect for a sunny day in Paris!',
    timesAccessed: 3,
    lastAccessedAt: '2025-01-10T15:30:00Z',
    savedAt: '2025-01-10T10:00:00Z',
  },
  {
    id: 'combo-2',
    cityName: 'London',
    countryName: 'United Kingdom',
    cityImageUrl: 'https://images.pexels.com/photos/672532/pexels-photo-672532.jpeg',
    weatherDetails: '{"temperature": 15, "condition": "Cloudy"}',
    cocktailName: 'Gin & Tonic',
    cocktailImageUrl: 'https://images.pexels.com/photos/2480828/pexels-photo-2480828.jpeg',
    cocktailIngredients: ['2 oz gin', '4 oz tonic water', 'Lime wedge'],
    cocktailRecipe: ['Fill glass with ice', 'Add gin', 'Top with tonic water'],
    rating: 4,
    notes: 'Classic British drink',
    timesAccessed: 1,
    lastAccessedAt: '2025-01-09T20:00:00Z',
    savedAt: '2025-01-09T18:00:00Z',
  },
  {
    id: 'combo-3',
    cityName: 'Tokyo',
    countryName: 'Japan',
    cityImageUrl: 'https://images.pexels.com/photos/2506923/pexels-photo-2506923.jpeg',
    weatherDetails: '{"temperature": 18, "condition": "Rain"}',
    cocktailName: 'Whiskey Highball',
    cocktailImageUrl: 'https://images.pexels.com/photos/602750/pexels-photo-602750.jpeg',
    cocktailIngredients: ['2 oz whiskey', '4 oz soda water', 'Lemon peel'],
    cocktailRecipe: ['Fill glass with ice', 'Add whiskey', 'Top with soda water'],
    timesAccessed: 0,
    savedAt: '2025-01-08T12:00:00Z',
  },
];

describe('SavedCombinations Integration Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    
    // Reset auth store to initial state
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
  });

  describe('Fetching Saved Combinations After Login', () => {
    it('should fetch saved combinations when user logs in', async () => {
      // Mock successful API response
      mockGetUserSavedCombinations.mockResolvedValueOnce(mockSavedCombinations);

      // Set authenticated user
      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
        savedCombinations: [],
      });

      render(<SavedCombinations />);

      // Should show loading state initially
      expect(screen.getByRole('progressbar', { hidden: true })).toBeInTheDocument();

      // Wait for API call to complete
      await waitFor(() => {
        expect(mockGetUserSavedCombinations).toHaveBeenCalledWith(mockUser.id);
      });

      // Should display the fetched combinations
      await waitFor(() => {
        expect(screen.getByText('Saved Combinations (3)')).toBeInTheDocument();
      });

      // Verify combinations are stored in the auth store
      expect(useAuthStore.getState().savedCombinations).toEqual(mockSavedCombinations);
    });

    it('should handle empty saved combinations list', async () => {
      // Mock empty response
      mockGetUserSavedCombinations.mockResolvedValueOnce([]);

      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
        savedCombinations: [],
      });

      render(<SavedCombinations />);

      await waitFor(() => {
        expect(mockGetUserSavedCombinations).toHaveBeenCalledWith(mockUser.id);
      });

      // Component should not render when no combinations exist
      expect(screen.queryByText('Saved Combinations')).not.toBeInTheDocument();
    });

    it('should handle API errors gracefully when fetching combinations', async () => {
      // Mock API error
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockGetUserSavedCombinations.mockRejectedValueOnce(new Error('Network error'));

      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
        savedCombinations: [],
      });

      render(<SavedCombinations />);

      await waitFor(() => {
        expect(mockGetUserSavedCombinations).toHaveBeenCalledWith(mockUser.id);
      });

      // Should handle error gracefully
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching saved combinations:', expect.any(Error));
      
      // Component should not crash
      expect(screen.queryByText('Saved Combinations')).not.toBeInTheDocument();

      consoleErrorSpy.mockRestore();
    });

    it('should not fetch combinations when user is not authenticated', () => {
      useAuthStore.setState({
        user: null,
        isAuthenticated: false,
        savedCombinations: [],
      });

      render(<SavedCombinations />);

      // Should not make API call
      expect(mockGetUserSavedCombinations).not.toHaveBeenCalled();
      
      // Component should not render
      expect(screen.queryByText('Saved Combinations')).not.toBeInTheDocument();
    });

    it('should refetch combinations when user changes', async () => {
      const user1 = { id: 'user-1', email: 'user1@example.com' };
      const user2 = { id: 'user-2', email: 'user2@example.com' };
      
      const combinations1 = [mockSavedCombinations[0]];
      const combinations2 = [mockSavedCombinations[1], mockSavedCombinations[2]];

      // Mock different responses for different users
      mockGetUserSavedCombinations
        .mockResolvedValueOnce(combinations1)
        .mockResolvedValueOnce(combinations2);

      // Start with first user
      useAuthStore.setState({
        user: user1,
        isAuthenticated: true,
        savedCombinations: [],
      });

      const { rerender } = render(<SavedCombinations />);

      await waitFor(() => {
        expect(mockGetUserSavedCombinations).toHaveBeenCalledWith(user1.id);
      });

      expect(useAuthStore.getState().savedCombinations).toEqual(combinations1);

      // Switch to second user
      useAuthStore.setState({
        user: user2,
        isAuthenticated: true,
        savedCombinations: [],
      });

      rerender(<SavedCombinations />);

      await waitFor(() => {
        expect(mockGetUserSavedCombinations).toHaveBeenCalledWith(user2.id);
      });

      expect(useAuthStore.getState().savedCombinations).toEqual(combinations2);
    });

    it('should display loading state while fetching combinations', async () => {
      // Mock delayed response
      mockGetUserSavedCombinations.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve(mockSavedCombinations), 100))
      );

      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
        savedCombinations: [],
      });

      render(<SavedCombinations />);

      // Should show loading spinner
      expect(screen.getByRole('progressbar', { hidden: true })).toBeInTheDocument();

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByRole('progressbar', { hidden: true })).not.toBeInTheDocument();
      }, { timeout: 200 });

      expect(screen.getByText('Saved Combinations (3)')).toBeInTheDocument();
    });
  });

  describe('Saved Combinations Display and Interaction', () => {
    beforeEach(async () => {
      mockGetUserSavedCombinations.mockResolvedValueOnce(mockSavedCombinations);
      
      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
        savedCombinations: [],
      });
    });

    it('should display combinations in a collapsible list', async () => {
      render(<SavedCombinations />);

      await waitFor(() => {
        expect(screen.getByText('Saved Combinations (3)')).toBeInTheDocument();
      });

      // Should be collapsed by default
      expect(screen.queryByText('Classic Martini')).not.toBeInTheDocument();

      // Click to expand
      await user.click(screen.getByText('Saved Combinations (3)'));

      // Should show combinations
      expect(screen.getByText('Classic Martini')).toBeInTheDocument();
      expect(screen.getByText('Gin & Tonic')).toBeInTheDocument();
      expect(screen.getByText('Whiskey Highball')).toBeInTheDocument();
    });

    it('should display combination details correctly', async () => {
      render(<SavedCombinations />);

      await waitFor(() => {
        expect(screen.getByText('Saved Combinations (3)')).toBeInTheDocument();
      });

      // Expand the list
      await user.click(screen.getByText('Saved Combinations (3)'));

      // Check combination details
      expect(screen.getByText('Paris')).toBeInTheDocument();
      expect(screen.getByText('France')).toBeInTheDocument();
      expect(screen.getByText('Classic Martini')).toBeInTheDocument();
      
      // Check access count
      expect(screen.getByText('3')).toBeInTheDocument(); // times accessed
      
      // Check rating stars (5 stars for first combination)
      const stars = screen.getAllByTestId('star-icon');
      expect(stars).toHaveLength(15); // 5 stars × 3 combinations
    });

    it('should handle combination deletion', async () => {
      mockDeleteSavedCombination.mockResolvedValueOnce(undefined);

      render(<SavedCombinations />);

      await waitFor(() => {
        expect(screen.getByText('Saved Combinations (3)')).toBeInTheDocument();
      });

      // Expand the list
      await user.click(screen.getByText('Saved Combinations (3)'));

      // Find and click delete button for first combination
      const deleteButtons = screen.getAllByRole('button', { name: '' }); // X buttons
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(mockDeleteSavedCombination).toHaveBeenCalledWith('combo-1');
      });

      // Combination should be removed from store
      const updatedCombinations = useAuthStore.getState().savedCombinations;
      expect(updatedCombinations).toHaveLength(2);
      expect(updatedCombinations.find(c => c.id === 'combo-1')).toBeUndefined();
    });

    it('should handle combination click and track access', async () => {
      mockTrackCombinationAccess.mockResolvedValueOnce(undefined);

      render(<SavedCombinations />);

      await waitFor(() => {
        expect(screen.getByText('Saved Combinations (3)')).toBeInTheDocument();
      });

      // Expand the list
      await user.click(screen.getByText('Saved Combinations (3)'));

      // Click on a combination
      const combinationCard = screen.getByText('Classic Martini').closest('div');
      await user.click(combinationCard!);

      await waitFor(() => {
        expect(mockTrackCombinationAccess).toHaveBeenCalledWith('combo-1');
      });

      // Should open rating modal
      expect(screen.getByText('Paris, France')).toBeInTheDocument();
      expect(screen.getByText('Rate this combination')).toBeInTheDocument();
    });

    it('should handle rating updates', async () => {
      mockTrackCombinationAccess.mockResolvedValueOnce(undefined);
      mockUpdateCombinationRating.mockResolvedValueOnce(undefined);

      render(<SavedCombinations />);

      await waitFor(() => {
        expect(screen.getByText('Saved Combinations (3)')).toBeInTheDocument();
      });

      // Expand and click combination
      await user.click(screen.getByText('Saved Combinations (3)'));
      const combinationCard = screen.getByText('Classic Martini').closest('div');
      await user.click(combinationCard!);

      // Wait for modal to open
      await waitFor(() => {
        expect(screen.getByText('Rate this combination')).toBeInTheDocument();
      });

      // Click on 3rd star to rate
      const modalStars = screen.getAllByTestId('star-icon');
      await user.click(modalStars[2]); // 3rd star

      // Add notes
      const notesTextarea = screen.getByPlaceholderText('Add your thoughts about this combination...');
      await user.type(notesTextarea, 'Updated notes');

      // Save rating
      await user.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => {
        expect(mockUpdateCombinationRating).toHaveBeenCalledWith('combo-1', 3, 'Updated notes');
      });

      // Modal should close
      expect(screen.queryByText('Rate this combination')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle deletion errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockGetUserSavedCombinations.mockResolvedValueOnce(mockSavedCombinations);
      mockDeleteSavedCombination.mockRejectedValueOnce(new Error('Delete failed'));

      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
        savedCombinations: [],
      });

      render(<SavedCombinations />);

      await waitFor(() => {
        expect(screen.getByText('Saved Combinations (3)')).toBeInTheDocument();
      });

      // Expand and try to delete
      await user.click(screen.getByText('Saved Combinations (3)'));
      const deleteButtons = screen.getAllByRole('button', { name: '' });
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error deleting saved combination:', expect.any(Error));
      });

      // Combination should still be in the list (deletion failed)
      expect(useAuthStore.getState().savedCombinations).toHaveLength(3);

      consoleErrorSpy.mockRestore();
    });

    it('should handle rating update errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockGetUserSavedCombinations.mockResolvedValueOnce(mockSavedCombinations);
      mockTrackCombinationAccess.mockResolvedValueOnce(undefined);
      mockUpdateCombinationRating.mockRejectedValueOnce(new Error('Update failed'));

      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
        savedCombinations: [],
      });

      render(<SavedCombinations />);

      await waitFor(() => {
        expect(screen.getByText('Saved Combinations (3)')).toBeInTheDocument();
      });

      // Open rating modal
      await user.click(screen.getByText('Saved Combinations (3)'));
      const combinationCard = screen.getByText('Classic Martini').closest('div');
      await user.click(combinationCard!);

      await waitFor(() => {
        expect(screen.getByText('Rate this combination')).toBeInTheDocument();
      });

      // Try to save rating
      await user.click(screen.getByRole('button', { name: 'Save' }));

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error updating rating:', expect.any(Error));
      });

      consoleErrorSpy.mockRestore();
    });

    it('should handle access tracking errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockGetUserSavedCombinations.mockResolvedValueOnce(mockSavedCombinations);
      mockTrackCombinationAccess.mockRejectedValueOnce(new Error('Tracking failed'));

      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
        savedCombinations: [],
      });

      render(<SavedCombinations />);

      await waitFor(() => {
        expect(screen.getByText('Saved Combinations (3)')).toBeInTheDocument();
      });

      // Click combination
      await user.click(screen.getByText('Saved Combinations (3)'));
      const combinationCard = screen.getByText('Classic Martini').closest('div');
      await user.click(combinationCard!);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Error tracking access:', expect.any(Error));
      });

      // Modal should still open despite tracking error
      expect(screen.getByText('Rate this combination')).toBeInTheDocument();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Performance and State Management', () => {
    it('should only fetch combinations once per user session', async () => {
      mockGetUserSavedCombinations.mockResolvedValueOnce(mockSavedCombinations);

      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
        savedCombinations: [],
      });

      const { rerender } = render(<SavedCombinations />);

      await waitFor(() => {
        expect(mockGetUserSavedCombinations).toHaveBeenCalledTimes(1);
      });

      // Rerender component
      rerender(<SavedCombinations />);

      // Should not fetch again if combinations already exist
      expect(mockGetUserSavedCombinations).toHaveBeenCalledTimes(1);
    });

    it('should handle rapid user interactions without issues', async () => {
      mockGetUserSavedCombinations.mockResolvedValueOnce(mockSavedCombinations);
      mockTrackCombinationAccess.mockResolvedValue(undefined);

      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
        savedCombinations: [],
      });

      render(<SavedCombinations />);

      await waitFor(() => {
        expect(screen.getByText('Saved Combinations (3)')).toBeInTheDocument();
      });

      // Rapid expand/collapse
      const header = screen.getByText('Saved Combinations (3)');
      await user.click(header);
      await user.click(header);
      await user.click(header);

      // Should handle rapid clicks gracefully
      expect(screen.getByText('Classic Martini')).toBeInTheDocument();
    });

    it('should maintain state consistency during operations', async () => {
      mockGetUserSavedCombinations.mockResolvedValueOnce(mockSavedCombinations);
      mockDeleteSavedCombination.mockResolvedValueOnce(undefined);
      mockUpdateCombinationRating.mockResolvedValueOnce(undefined);

      useAuthStore.setState({
        user: mockUser,
        isAuthenticated: true,
        savedCombinations: [],
      });

      render(<SavedCombinations />);

      await waitFor(() => {
        expect(screen.getByText('Saved Combinations (3)')).toBeInTheDocument();
      });

      // Perform multiple operations
      await user.click(screen.getByText('Saved Combinations (3)'));
      
      // Delete one combination
      const deleteButtons = screen.getAllByRole('button', { name: '' });
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(useAuthStore.getState().savedCombinations).toHaveLength(2);
      });

      // State should remain consistent
      expect(useAuthStore.getState().user).toEqual(mockUser);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });
  });
});