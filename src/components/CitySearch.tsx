import React, { useState, useEffect } from 'react';
import { useAppStore, type CityOption } from '../store/appStore';
import { searchCities } from '../services/geocodingService';
import { getWeatherData, getMockWeatherData } from '../services/weatherService';
import { getCocktailSuggestion } from '../services/cocktailService';
import { generateCityImage } from '../services/imageGenerationService';
import { Search, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

const CitySearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  const {
    cityOptions,
    setCityOptions,
    setSelectedCity,
    setWeatherData,
    setCocktailData,
    setCityImageUrl,
    setCurrentView,
    setIsLoading,
  } = useAppStore();

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  // Search for cities when debounced query changes
  useEffect(() => {
    const fetchCities = async () => {
      if (debouncedQuery.trim().length < 2) {
        setCityOptions([]);
        return;
      }

      setIsSearching(true);

      try {
        const results = await searchCities(debouncedQuery);
        setCityOptions(results);
      } catch (error) {
        console.error('Error searching cities:', error);
        setCityOptions([]);
      } finally {
        setIsSearching(false);
      }
    };

    fetchCities();
  }, [debouncedQuery, setCityOptions]);

  const handleCitySelect = async (city: CityOption) => {
    setIsLoading(true);
    setSelectedCity(city);
    setCityOptions([]);
    setQuery('');

    try {
      // In a real implementation, these would be API calls to actual services
      // For MVP, we'll use mock data
      
      // Get weather data
      let weatherData;
      try {
        weatherData = await getWeatherData(city.city, city.country);
      } catch (error) {
        console.error('Error fetching real weather data, using mock data:', error);
        weatherData = getMockWeatherData(city.city, city.country);
      }
      setWeatherData(weatherData);
      
      // Generate city image
      const cityImageUrl = await generateCityImage(
        city.city,
        city.country,
        weatherData.condition,
        weatherData.isDay
      );
      setCityImageUrl(cityImageUrl);
      
      // Get cocktail suggestion
      const cocktailData = await getCocktailSuggestion(
        city.countryCode,
        weatherData.condition,
        weatherData.temperature
      );
      setCocktailData(cocktailData);
      
      // Switch to result view
      setCurrentView('result');
    } catch (error) {
      console.error('Error processing city selection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      className="max-w-md mx-auto my-12"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="text-center mb-8">
        <motion.h2 
          className="text-3xl md:text-4xl font-display font-bold text-gray-800 mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.7 }}
        >
          Find Your Perfect Sip
        </motion.h2>
        <motion.p 
          className="text-gray-600 text-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.7 }}
        >
          Discover a cocktail that matches your city's vibe and weather
        </motion.p>
      </div>

      <div className="relative">
        <div className="flex items-center border-2 border-gray-300 rounded-lg focus-within:border-primary-500 transition-colors bg-white shadow-sm">
          <div className="pl-4">
            <Search size={20} className="text-gray-400" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter a city name..."
            className="w-full p-4 outline-none bg-transparent"
          />
          {isSearching && (
            <div className="pr-4">
              <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>

        {cityOptions.length > 0 && (
          <motion.div 
            className="absolute z-10 mt-2 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-72 overflow-auto"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {cityOptions.map((city, index) => (
              <div
                key={`${city.city}-${city.country}-${index}`}
                className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-0 flex items-center"
                onClick={() => handleCitySelect(city)}
              >
                <MapPin size={16} className="text-primary-500 mr-2 flex-shrink-0" />
                <div>
                  <span className="font-medium">{city.city}</span>
                  <span className="text-gray-500 ml-2">{city.country}</span>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default CitySearch;