import React, { useState, useEffect } from "react";
import { useAppStore, type CityOption } from "../store/appStore";
import { searchCities } from "../services/geocodingService";
import { getWeatherData } from "../services/weatherService";
import { getCocktailSuggestion } from "../services/cocktailService";
import { generateCityImage } from "../services/imageGenerationService";
import { Search, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
    setLoadingStep,
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
      // Step 1: Finding city (already done, but we show the step)
      setLoadingStep('Finding your city…');
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for UX

      // Step 2: Get weather data
      setLoadingStep(`Checking the weather in ${city.city}…`);
      const weatherData = await getWeatherData(
        city.latitude,
        city.longitude,
        city.city,
        city.country
      );
      setWeatherData(weatherData);

      // Step 3: Weather analysis
      setLoadingStep('Looking outside... Is it sunny or rainy?');
      await new Promise(resolve => setTimeout(resolve, 800)); // Pause for effect

      // Step 4: Country drink preferences
      setLoadingStep('Country drink preferences…');
      await new Promise(resolve => setTimeout(resolve, 600)); // Pause for effect

      // Step 5: Selecting mood
      setLoadingStep('Selecting mood…');
      await new Promise(resolve => setTimeout(resolve, 500)); // Pause for effect

      // Step 6: Parallelize image generation and cocktail suggestion
      setLoadingStep(`Painting a picture of ${city.city}…`);
      
      const [cityImageUrl, cocktailData] = await Promise.all([
        generateCityImage(
          city.city,
          city.country,
          weatherData.condition,
          weatherData.isDay
        ),
        (async () => {
          // Add a small delay before cocktail mixing step
          await new Promise(resolve => setTimeout(resolve, 1000));
          setLoadingStep('Mixing your perfect cocktail…');
          return getCocktailSuggestion(
            city.countryCode,
            weatherData.condition,
            weatherData.temperature
          );
        })()
      ]);

      // Set the results
      setCityImageUrl(cityImageUrl);
      setCocktailData(cocktailData);

      // Step 7: Final touches
      setLoadingStep('Almost there... Adding the final touches!');
      await new Promise(resolve => setTimeout(resolve, 800)); // Final pause

      // Switch to result view
      setCurrentView("result");
    } catch (error) {
      console.error("Error processing city selection:", error);
    } finally {
      setIsLoading(false);
      setLoadingStep('');
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
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#819077" }}
    >
      {/* Main Content */}
      <main className="flex-grow pt-20 sm:pt-24 md:pt-32 lg:pt-40">
        <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-24">
          <motion.div
            className="max-w-4xl"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {/* Responsive Typography */}
            <h1 className="text-3xl mt-8 sm:mt-12 md:mt-16 sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-display font-bold text-white mb-4 sm:mb-6 leading-tight">
              FIND YOUR PERFECT SIP
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/90 mb-6 sm:mb-8 leading-relaxed max-w-3xl">
              Discover a cocktail that matches your city's vibe and weather
            </p>

            {/* Responsive Search Input */}
            <div className="relative w-full max-w-sm sm:max-w-md md:max-w-lg">
              <div className="flex items-center bg-white rounded-lg shadow-lg focus-within:shadow-xl transition-shadow">
                <div className="pl-3 sm:pl-4">
                  <Search size={18} className="text-gray-400 sm:w-5 sm:h-5" />
                </div>
                <input
                  id="city-search"
                  name="city-search"
                  type="text"
                  value={query}
                  onChange={handleInputChange}
                  onFocus={handleInputFocus}
                  placeholder="Enter a city name..."
                  className="w-full p-3 sm:p-4 outline-none bg-transparent text-gray-800 placeholder-gray-400 text-sm sm:text-base"
                />
                {isSearching && (
                  <div className="pr-3 sm:pr-4">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>

              {/* City Options Dropdown */}
              <AnimatePresence>
                {cityOptions.length > 0 && (
                  <motion.div
                    className="absolute z-20 mt-2 w-full bg-white rounded-lg shadow-xl border border-gray-200 max-h-60 sm:max-h-72 overflow-auto"
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
                          size={14}
                          className="text-primary-500 mr-2 flex-shrink-0 sm:w-4 sm:h-4"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="font-medium text-gray-800 text-sm sm:text-base">
                            {city.city}
                          </span>
                          <span className="text-gray-500 ml-2 text-sm">
                            {city.country}
                          </span>
                          <div className="text-xs text-gray-400 truncate">
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
  </main>
        {/* Responsive Sneak-Peek Image Section */}
        <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-24 pb-0 mb-0 ">
          <div
            className="relative w-full overflow-hidden rounded-t-lg shadow-lg"
            style={{
              height: "15vh", // Responsive height using viewport units
              minHeight: "120px", // Minimum height for very small screens
              maxHeight: "200px", // Maximum height for larger screens
            }}
          >
            <img
              src="/images/loadingPrev10.png"
              alt="Room preview"
              className="absolute top-0 left-0 w-full h-auto min-h-full"
              style={{ 
                objectFit: "cover", 
                objectPosition: "top center"
              }}
            />
          </div>
        </div>
    

      <Footer />
    </div>
  );
};

export default LandingPage;