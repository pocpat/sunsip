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
  loadingStep: string;
  currentView: AppView;
  transitionDirection: string;
  cityOptions: CityOption[];
  selectedCity?: CityOption;
  weatherData?: WeatherData;
  cocktailData?: CocktailData;
  cityImageUrl?: string;
  showAuthModal: boolean;
  isPortfolioMode: boolean;

  changeView: (view: AppView) => void;
  resetApp: () => void;
  setIsLoading: (isLoading: boolean) => void;
  setLoadingStep: (step: string) => void;
  setCityOptions: (options: CityOption[]) => void;
  setSelectedCity: (city?: CityOption) => void;
  setWeatherData: (data?: WeatherData) => void;
  setCocktailData: (data?: CocktailData) => void;
  setCityImageUrl: (url?: string) => void;
  setShowAuthModal: (show: boolean) => void;
  setIsPortfolioMode: (mode: boolean) => void;
};

export const useAppStore = create<AppState>((set, get) => ({
  isLoading: false,
  loadingStep: '',
  currentView: 'search',
  transitionDirection: '-100%',
  cityOptions: [],
  selectedCity: undefined,
  weatherData: undefined,
  cocktailData: undefined,
  cityImageUrl: undefined,
  showAuthModal: false,
  isPortfolioMode: import.meta.env.VITE_PORTFOLIO_MODE_ENABLED === 'true',

  changeView: (newView) => {
    const currentView = get().currentView;
    if (currentView === newView) return;

    // Define transition directions
    const transitions = {
      'search-result': '100%',
      'search-dashboard': '-100%',
      'result-search': '-100%',
      'result-dashboard': '-100%',
      'dashboard-search': '100%',
      'dashboard-result': '100%',
    };
    const transitionKey = `${currentView}-${newView}` as keyof typeof transitions;
    const direction = transitions[transitionKey] || '100%';

    set({ currentView: newView, transitionDirection: direction });
  },

  resetApp: () => {
    get().changeView('search');
    set({
      selectedCity: undefined,
      weatherData: undefined,
      cocktailData: undefined,
      cityImageUrl: undefined,
      loadingStep: '',
    });
  },

  setIsLoading: (isLoading) => set({ isLoading }),
  setLoadingStep: (step) => set({ loadingStep: step }),
  setCityOptions: (options) => set({ cityOptions: options }),
  setSelectedCity: (city) => set({ selectedCity: city }),
  setWeatherData: (data) => set({ weatherData: data }),
  setCocktailData: (data) => set({ cocktailData: data }),
  setCityImageUrl: (url) => set({ cityImageUrl: url }),
  setShowAuthModal: (show) => set({ showAuthModal: show }),
  setIsPortfolioMode: (mode) => set({ isPortfolioMode: mode }),
}));


