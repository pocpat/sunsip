import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setUserContext, clearUserContext } from '../lib/sentry';
import { supabase } from '../lib/supabase';

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
  rating?: number;
  notes?: string;
  timesAccessed: number;
  lastAccessedAt?: string;
  savedAt: string;
};

export type UserPreferences = {
  id: string;
  preferredSpirits: string[];
  dietaryRestrictions: string[];
  favoriteWeatherMoods: Record<string, any>;
  dailyRequestCount: number;
  lastRequestDate?: string;
  createdAt: string;
  updatedAt: string;
};

type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  savedCombinations: SavedCombination[];
  userPreferences: UserPreferences | null;
  isAdmin: boolean;
  setIsAdmin: (isAdmin: boolean) => void;
  globalRequestsEnabled: boolean;
  setGlobalRequestsEnabled: () => void;
  
  setUser: (user: User | null) => void;
  setSavedCombinations: (combinations: SavedCombination[]) => void;
  addSavedCombination: (combination: SavedCombination) => void;
  updateSavedCombination: (id: string, updates: Partial<SavedCombination>) => void;
  removeSavedCombination: (id: string) => void;
  setUserPreferences: (preferences: UserPreferences | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      savedCombinations: [],
      userPreferences: null,
      isAdmin: false,
      setIsAdmin: (isAdmin) => set({ isAdmin }),
      globalRequestsEnabled: true,
      setGlobalRequestsEnabled: () => set((state) => ({ globalRequestsEnabled: !state.globalRequestsEnabled })),
      
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
        // Keep only the last 20 combinations
        const newCombinations = [combination, ...state.savedCombinations].slice(0, 20);
        return { savedCombinations: newCombinations };
      }),
      
      updateSavedCombination: (id, updates) => set((state) => ({
        savedCombinations: state.savedCombinations.map((c) =>
          c.id === id ? { ...c, ...updates } : c
        ),
      })),
      
      removeSavedCombination: (id) => set((state) => ({
        savedCombinations: state.savedCombinations.filter((c) => c.id !== id),
      })),
      
      setUserPreferences: (preferences) => set({
        userPreferences: preferences,
      }),
      
      setIsLoading: (isLoading) => set({ isLoading }),
      
      logout: async () => {
        try {
          // Sign out from Supabase
          await supabase.auth.signOut();
          
          // Clear Sentry user context
          clearUserContext();
          
          // Reset auth state
          set({
            user: null,
            isAuthenticated: false,
            savedCombinations: [],
            userPreferences: null,
            isAdmin: false,
          });
        } catch (error) {
          console.error('Error signing out:', error);
          // Still reset local state even if Supabase call fails
          clearUserContext();
          set({
            user: null,
            isAuthenticated: false,
            savedCombinations: [],
            userPreferences: null,
            isAdmin: false,
          });
        }
      },
    }),
    {
      name: 'sunsip-auth',
    }
  )
);