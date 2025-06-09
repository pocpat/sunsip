import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setUserContext, clearUserContext } from '../lib/sentry';

export type User = {
  id: string;
  email: string;
};

export type SavedCombination = {
  id: string;
  cityName: string;
  countryName: string;
  cityImageUrl: string;
  weatherDetails: string;
  cocktailName: string;
  cocktailImageUrl: string;
  cocktailIngredients: string[];
  cocktailRecipe: string[];
  savedAt: string;
};

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  savedCombinations: SavedCombination[];
  
  setUser: (user: User | null) => void;
  setSavedCombinations: (combinations: SavedCombination[]) => void;
  addSavedCombination: (combination: SavedCombination) => void;
  removeSavedCombination: (id: string) => void;
  setIsLoading: (isLoading: boolean) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      savedCombinations: [],
      
      setUser: (user) => {
        // Set Sentry user context when user logs in/out
        if (user) {
          setUserContext(user);
        } else {
          clearUserContext();
        }
        
        set({
          user,
          isAuthenticated: !!user,
        });
      },
      
      setSavedCombinations: (combinations) => set({
        savedCombinations: combinations,
      }),
      
      addSavedCombination: (combination) => set((state) => {
        // Keep only the last 10 combinations
        const newCombinations = [combination, ...state.savedCombinations].slice(0, 10);
        return { savedCombinations: newCombinations };
      }),
      
      removeSavedCombination: (id) => set((state) => ({
        savedCombinations: state.savedCombinations.filter((c) => c.id !== id),
      })),
      
      setIsLoading: (isLoading) => set({ isLoading }),
      
      logout: () => {
        clearUserContext();
        set({
          user: null,
          isAuthenticated: false,
          savedCombinations: [],
        });
      },
    }),
    {
      name: 'sunsip-auth',
    }
  )
);