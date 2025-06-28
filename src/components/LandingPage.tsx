import React, { useState, useEffect } from "react";
import { useAppStore, type CityOption } from "../store/appStore";
import { searchCities } from "../services/geocodingService";
import { getWeatherData } from "../services/weatherService";
import { getCocktailSuggestion } from "../services/cocktailService";
import { generateCityImage } from "../services/imageGenerationService";
import { Search, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Footer from "./Footer";
import Room from "./Room"; // Assuming you have a Room component for the image preview



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
    changeView,
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
      setLoadingStep("Finding your city…");
      await new Promise((resolve) => setTimeout(resolve, 500));
      setLoadingStep(`Checking the weather in ${city.city}…`);
      const weatherData = await getWeatherData(
        city.latitude,
        city.longitude,
        city.city,
        city.country
      );
      setWeatherData(weatherData);
      setLoadingStep("Looking outside... Is it sunny or rainy?");
      await new Promise((resolve) => setTimeout(resolve, 800));
      setLoadingStep("Country drink preferences…");
      await new Promise((resolve) => setTimeout(resolve, 600));
      setLoadingStep("Selecting mood…");
      await new Promise((resolve) => setTimeout(resolve, 500));
      setLoadingStep(`Painting a picture of ${city.city}…`);
      const [cityImageUrl, cocktailData] = await Promise.all([
        generateCityImage(
          city.city,
          city.country,
          weatherData.condition,
          weatherData.isDay
        ),
        (async () => {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          setLoadingStep("Mixing your perfect cocktail…");
          return getCocktailSuggestion(
            city.countryCode,
            weatherData.condition,
            weatherData.temperature
          );
        })(),
      ]);
      setCityImageUrl(cityImageUrl);
      setCocktailData(cocktailData);
      setLoadingStep("Almost there... Adding the final touches!");
      await new Promise((resolve) => setTimeout(resolve, 800));
    
      changeView("result");
    } catch (error) {
      console.error("Error processing city selection:", error);
    } finally {
      setIsLoading(false);
      setLoadingStep("");
    }
  };

  const handleInputFocus = () => setIsFocused(true);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (!isFocused) setIsFocused(true);
  };

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#819077" }}
    >
      {/* Main Content: 2/3 of the screen */}
      <div className="flex flex-col flex-grow" style={{ minHeight: "66vh" }}>
        <div
          className="flex flex-col justify-center h-full"
          style={{ flex: 1 }}
        >
          <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-24">
            {/* Titles block, left-aligned */}
            <div className="max-w-3xl text-left mx-0">
              <motion.h1
                initial={{ opacity: 0, y: 35 , x: 20 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                transition={{ duration: 1.6, delay: 0.2, ease: "easeInOut" }}
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-display font-bold text-white mb-4 sm:mb-6 leading-tight lg:whitespace-nowrap"
              >
                FIND YOUR PERFECT SIP
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 40, x: -10 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                transition={{ duration: 1.6, delay: 0.3, ease: "easeInOut" }}
                className="text-lg sm:text-xl md:text-2xl text-white/90 mb-8 leading-relaxed max-w-3xl lg:whitespace-nowrap"
              >
                Discover a cocktail that matches your city's vibe and weather
              </motion.p>
            </div>

            {/* ...your search input code... */}
            <motion.div
              initial={{ opacity: 0, y: 45, x: 10 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              transition={{ duration: 1.6, delay: 0.4, ease: "easeInOut" }}
              className="text-lg sm:text-xl md:text-2xl text-white/90 mb-8 leading-relaxed max-w-3xl lg:whitespace-nowrap"
            >
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
        </div>
        {/* Peek image and footer are now part of the static layout */}
        <div className="relative w-full">
          <div
            className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-24 pb-0 mb-0"
            style={{ position: "relative", zIndex: 1 }}
          >
            <div
              className="relative w-full overflow-hidden rounded-t-lg shadow-lg"
              style={{ height: "15vh", minHeight: "120px", maxHeight: "200px" }}
            >
              {/* <img
                src="/images/loadingPrev10.png"
                alt="Room preview"
                className="absolute top-0 left-0 w-full h-auto min-h-full"
                style={{ objectFit: "cover", objectPosition: "top center" }}
              /> */}
              <Room/>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
};

export default LandingPage;
