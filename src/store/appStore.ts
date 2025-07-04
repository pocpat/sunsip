import { create } from 'zustand';

export type WeatherData = {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  temperature: number;
  condition: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  localTime: string;
  isDay: boolean;
};

export type CocktailData = {
  name: string;
  description: string;
  ingredients: string[];
  recipe: string[];
  imageUrl: string;
  mood: string;
};

export type CityOption = {
  city: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
};

export type AppView = 'main' | 'dashboard';

type AppState = {
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  
  loadingStep: string;
  setLoadingStep: (step: string) => void;
  
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  
  cityOptions: CityOption[];
  setCityOptions: (options: CityOption[]) => void;
  
  selectedCity?: CityOption;
  setSelectedCity: (city?: CityOption) => void;
  
  weatherData?: WeatherData;
  setWeatherData: (data?: WeatherData) => void;
  
  cocktailData?: CocktailData;
  setCocktailData: (data?: CocktailData) => void;
  
  cityImageUrl?: string;
  setCityImageUrl: (url?: string) => void;
  
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  
  isPortfolioMode: boolean;
  setIsPortfolioMode: (mode: boolean) => void;
  
  isResetting: boolean;
  setIsResetting: (resetting: boolean) => void;
  
  resetCounter: number;
  
  dailyLimitReached: boolean;
  setDailyLimitReached: (reached: boolean) => void;
  
  dailyRequestMessage: string;
  setDailyRequestMessage: (message: string) => void;
  
  resetApp: () => void;
};

export const useAppStore = create<AppState>((set, get) => ({
  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),
  
  loadingStep: '',
  setLoadingStep: (step) => set({ loadingStep: step }),
  
  currentView: 'main',
  setCurrentView: (view) => set({ currentView: view }),
  
  cityOptions: [],
  setCityOptions: (options) => set({ cityOptions: options }),
  
  selectedCity: undefined,
  setSelectedCity: (city) => set({ selectedCity: city }),
  
  weatherData: undefined,
  setWeatherData: (data) => set({ weatherData: data }),
  
  cocktailData: undefined,
  setCocktailData: (data) => set({ cocktailData: data }),
  
  cityImageUrl: undefined,
  setCityImageUrl: (url) => set({ cityImageUrl: url }),
  
  showAuthModal: false,
  setShowAuthModal: (show) => set({ showAuthModal: show }),
  
  isPortfolioMode: import.meta.env.VITE_PORTFOLIO_MODE_ENABLED === 'true',
  setIsPortfolioMode: (mode) => set({ isPortfolioMode: mode }),
  
  isResetting: false,
  setIsResetting: (resetting) => set({ isResetting: resetting }),
  
  resetCounter: 0,
  
  dailyLimitReached: false,
  setDailyLimitReached: (reached) => set({ dailyLimitReached: reached }),
  
  dailyRequestMessage: '',
  setDailyRequestMessage: (message) => set({ dailyRequestMessage: message }),
  
  resetApp: () => {
    const currentCounter = get().resetCounter;
    set({
      isResetting: true, // Signal that a reset is in progress
      currentView: 'main',
      selectedCity: undefined,
      weatherData: undefined,
      cocktailData: undefined,
      cityImageUrl: undefined,
      loadingStep: '',
      dailyLimitReached: false,
      dailyRequestMessage: '',
      resetCounter: currentCounter + 1, // Increment counter to trigger re-animations
    });
  },
}));