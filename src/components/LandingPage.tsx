import React, { useState, useEffect } from "react";
import { useAppStore, type CityOption } from "../store/appStore";
import { searchCities } from "../services/geocodingService";
import { getWeatherData } from "../services/weatherService";
import { getCocktailSuggestion } from "../services/cocktailService";
import { generateCityImage } from "../services/imageGenerationService";
import { Search, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Room from "./Room";
import Footer from "./Footer";

const LandingPage: React.FC = () => {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

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
        console.error("Error searching cities:", error);
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
    setQuery("");

    try {
      // Get weather data using coordinates
      const weatherData = await getWeatherData(
        city.latitude,
        city.longitude,
        city.city,
        city.country
      );
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
      setCurrentView("result");
    } catch (error) {
      console.error("Error processing city selection:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputFocus = () => {
    setIsFocused(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (!isFocused) {
      setIsFocused(true);
    }
  };

  return (
    //<div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: '#819077' }}>
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#819077" }}
    >
      {/* This container will hold all content and grow to push the footer down */}
      <main className="flex-grow mt-40">
        {/* Main Content */}
        <div className="container mx-auto py-40 md:px-12 lg:px-24">
          <motion.div
            className="max-w-2xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h1 className="text-5xl md:text-7xl font-display font-bold text-white mb-6 leading-tight whitespace-nowrap">
              FIND YOUR PERFECT SIP
            </h1>

            <p className="text-xl md:text-2xl text-white/90 mb-8 leading-relaxed whitespace-nowrap">
              Discover a cocktail that matches your city's vibe and weather
            </p>

            {/* Search Input */}
            <div className="relative max-w-lg">
              <div className="flex items-center bg-white rounded-lg shadow-lg focus-within:shadow-xl transition-shadow">
                <div className="pl-4">
                  <Search size={20} className="text-gray-400" />
                </div>
                <input
                  id="city-search"
                  name="city-search"
                  type="text"
                  value={query}
                  onChange={handleInputChange}
                  onFocus={handleInputFocus}
                  placeholder="Enter a city name..."
                  className="w-full p-4 outline-none bg-transparent text-gray-800 placeholder-gray-400"
                />
                {isSearching && (
                  <div className="pr-4">
                    <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>

              {/* City Options Dropdown */}
              <AnimatePresence>
                {cityOptions.length > 0 && (
                  <motion.div
                    className="absolute z-20 mt-2 w-full bg-white rounded-lg shadow-xl border border-gray-200 max-h-72 overflow-auto"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    {cityOptions.map((city, index) => (
                      <div
                        key={`${city.city}-${city.country}-${index}`}
                        className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-0 flex items-center transition-colors"
                        onClick={() => handleCitySelect(city)}
                      >
                        <MapPin
                          size={16}
                          className="text-primary-500 mr-2 flex-shrink-0"
                        />
                        <div>
                          <span className="font-medium text-gray-800">
                            {city.city}
                          </span>
                          <span className="text-gray-500 ml-2">
                            {city.country}
                          </span>
                          <div className="text-xs text-gray-400">
                            {city.latitude.toFixed(4)},{" "}
                            {city.longitude.toFixed(4)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* --- REVISED IMAGE SECTION --- */}
        {/* We create one container that defines the cropped area */}
        <div className="container mx-auto px-4 pb-0 mb-0">
        <div
          className="relative w-full " // to lower the image mt-40
          style={{
            height: "20vh", // This sets a height (e.g., 20% of the screen height).
            overflow: "hidden", // This crops the image
            boxShadow: "0 10px 10px -5px rgba(0, 0, 0, 0.3)",
          }}
        >
          <img
            src="/images/loadingPrev10.png"
            alt="Room preview"
            // These styles make the image cover the container from the top
            className="absolute top-0 left-0 w-full h-auto"
            style={{ objectFit: "cover", objectPosition: "top" }}
          />
        </div>
        </div>
        {/* This container will hold the room preview */}
        {/* --- END REVISED IMAGE SECTION --- */}
      </main>

      <Footer />
    </div>
  );
};

export default LandingPage;
