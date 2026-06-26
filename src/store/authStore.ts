import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setUserContext, clearUserContext } from '../lib/sentry';
import { signOut as apiSignOut, getSystemSettings } from '../lib/api';

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
  setGlobalRequestsEnabled: () => Promise<void>;
  
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
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      savedCombinations: [],
      userPreferences: null,
      isAdmin: false,
      setIsAdmin: (isAdmin) => set({ isAdmin }),
      globalRequestsEnabled: true,
      setGlobalRequestsEnabled: async () => {
        try {
          const state = get();
          const newEnabledState = !state.globalRequestsEnabled;
          
          if (!state.user || !state.isAdmin) {
            console.error('Only authenticated admin users can toggle global requests');
            return;
          }
          
          // For now, just toggle locally. A dedicated admin API endpoint can be added later.
          set({ globalRequestsEnabled: newEnabledState });
          console.log(`Global requests ${newEnabledState ? 'enabled' : 'disabled'} successfully`);
        } catch (error) {
          console.error('Error in setGlobalRequestsEnabled:', error);
        }
      },
      
      setUser: (user) => {
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
          await apiSignOut();
          
          clearUserContext();
          
          set({
            user: null,
            isAuthenticated: false,
            savedCombinations: [],
            userPreferences: null,
            isAdmin: false,
          });
        } catch (error) {
          console.error('Error signing out:', error);
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