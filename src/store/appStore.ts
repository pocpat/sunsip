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

type AppState = {
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  
  currentView: 'search' | 'result';
  setCurrentView: (view: 'search' | 'result') => void;
  
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
  
  resetApp: () => void;
};

export const useAppStore = create<AppState>((set) => ({
  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),
  
  currentView: 'search',
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
  
  resetApp: () => set({
    currentView: 'search',
    selectedCity: undefined,
    weatherData: undefined,
    cocktailData: undefined,
    cityImageUrl: undefined,
  }),
}));