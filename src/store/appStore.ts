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

export type AppView = 'search' | 'result' | 'dashboard';

type AppState = {
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  
  loadingStep: string;
  setLoadingStep: (step: string) => void;
  
  currentView: AppView;
  
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
  
  transitionDirection: string; // This is now managed internally by changeView
  
  changeView: (newView: AppView) => void; // New centralized navigation function
  resetApp: () => void;
};

export const useAppStore = create<AppState>((set, get) => ({
  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),
  
  loadingStep: '',
  setLoadingStep: (step) => set({ loadingStep: step }),
  
  currentView: 'search',
  
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
  
  transitionDirection: "-100%", // Default initial direction
  
  changeView: (newView) => {
    const currentView = get().currentView;
    if (currentView === newView) return; // Don't do anything if we're already there

    let direction = '100%'; // Default to UP (e.g., search -> result)

    const transitions = {
      'search-result': '100%',   // lo-re: UP
      'search-dashboard': '-100%', // lo-db: DOWN
      'result-search': '-100%',   // re-lo: DOWN
      'result-dashboard': '-100%', // re-db: DOWN
      'dashboard-search': '100%',   // db-lo: UP
      'dashboard-result': '100%', // db-re: UP
    };
    
    const transitionKey = `${currentView}-${newView}` as keyof typeof transitions;
    direction = transitions[transitionKey] || direction;
    
    set({ currentView: newView, transitionDirection: direction });
  },

  resetApp: () => {
    // Let changeView handle the direction for the reset to 'search'
    get().changeView('search');

    // Then, reset all application data
    set({
      selectedCity: undefined,
      weatherData: undefined,
      cocktailData: undefined,
      cityImageUrl: undefined,
      loadingStep: '',
      // Note: currentView is already set by changeView
    });
  },
}));

