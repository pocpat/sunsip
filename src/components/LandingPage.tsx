import React, { useState, useEffect } from "react";
import { useAppStore, type CityOption } from "../store/appStore";
import { useAuthStore } from "../store/authStore";
import { searchCities } from "../services/geocodingService";
import { getWeatherData } from "../services/weatherService";
import { getCocktailSuggestion } from "../services/cocktailService";
import { generateCityImage } from "../services/imageGenerationService";
import { checkAndUpdateRequestLimit } from "../lib/supabase";
import { Search, MapPin, AlertCircle } from "lucide-react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";

interface LandingPageProps {
  setNavSource: React.Dispatch<React.SetStateAction<"button" | "input" | null>>;
  resetCounter: number;
}

const LandingPage: React.FC<LandingPageProps> = ({ setNavSource, resetCounter }) => {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Animation controls for each element
  const titleControls = useAnimation();
  const subtitleControls = useAnimation();
  const searchControls = useAnimation();

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
    dailyLimitReached,
    setDailyLimitReached,
    dailyRequestMessage,
    setDailyRequestMessage,
    isPortfolioMode
  } = useAppStore();

  const { 
    user, 
    isAuthenticated, 
    isAdmin, 
    globalRequestsEnabled 
  } = useAuthStore();

  // Trigger animations whenever resetCounter changes (including initial load)
  useEffect(() => {
    const animateElements = async () => {
      // Reset all elements to initial state
      titleControls.set({ opacity: 0, y: 50 });
      subtitleControls.set({ opacity: 0, y: 65 });
      searchControls.set({ opacity: 0, y: 80 });

      // Animate elements in sequence with original timing and easeInOut
      titleControls.start({
        opacity: 1,
        y: 0,
        transition: { duration: 1.6, delay: 0.2, ease: "easeInOut" }
      });

      subtitleControls.start({
        opacity: 1,
        y: 0,
        transition: { duration: 1.6, delay: 0.3, ease: "easeInOut" }
      });

      searchControls.start({
        opacity: 1,
        y: 0,
        transition: { duration: 1.6, delay: 0.4, ease: "easeInOut" }
      });
    };

    animateElements();
  }, [resetCounter, titleControls, subtitleControls, searchControls]);

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
    // Skip limit check for admin users or in portfolio mode
    if (!isAdmin && !isPortfolioMode) {
      // Check if global requests are enabled
      if (!globalRequestsEnabled) {
        setDailyLimitReached(true);
        setDailyRequestMessage("The system administrator has temporarily disabled requests for all users. Please try again later.");
        return;
      }
      
      // Check daily limit for authenticated users
      if (isAuthenticated && user) {
        try {
          const limitResult = await checkAndUpdateRequestLimit(user.id);
          
          if (!limitResult.canProceed) {
            setDailyLimitReached(true);
            
            // Format reset date if available
            let resetMessage = "Please try again tomorrow.";
            if (limitResult.resetDate) {
              const resetDate = new Date(limitResult.resetDate);
              resetMessage = `Limit resets on ${resetDate.toLocaleDateString()}.`;
            }
            
            setDailyRequestMessage(`You've reached your daily limit of 10 requests. ${resetMessage}`);
            return; // Stop execution if limit reached
          } else {
            // Update message with remaining requests
            setDailyRequestMessage(`You have ${limitResult.remaining} request${limitResult.remaining !== 1 ? 's' : ''} remaining today.`);
          }
        } catch (error) {
          console.error("Error checking request limit:", error);
          // Continue execution if there's an error checking the limit
        }
      } else if (!isAuthenticated) {
        // Handle anonymous users
        try {
          const clientId = localStorage.getItem('sunsip_client_id');
          if (clientId) {
            const limitResult = await checkAndUpdateRequestLimit(null, clientId);
            
            if (!limitResult.canProceed) {
              setDailyLimitReached(true);
              
              // Format reset date if available
              let resetMessage = "Please try again tomorrow.";
              if (limitResult.resetDate) {
                const resetDate = new Date(limitResult.resetDate);
                resetMessage = `Limit resets on ${resetDate.toLocaleDateString()}.`;
              }
              
              setDailyRequestMessage(`You've reached your daily limit of 10 requests. ${resetMessage} Sign in to get your own quota.`);
              return; // Stop execution if limit reached
            } else {
              // Update message with remaining requests
              setDailyRequestMessage(`You have ${limitResult.remaining} anonymous request${limitResult.remaining !== 1 ? 's' : ''} remaining today. Sign in for your own quota.`);
            }
          }
        } catch (error) {
          console.error("Error checking anonymous request limit:", error);
          // Continue execution if there's an error checking the limit
        }
      }
    } else if (isAdmin) {
      // Admin users get a special message
      setDailyRequestMessage("Admin mode: Unlimited requests available.");
    }

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
      setNavSource("input");
      // Don't change view here - the MainScroller will handle scrolling to results
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
      className="h-full flex flex-col"
      style={{ backgroundColor: "#819077" }}
    >
      {/* Main Content - Takes full height of the viewport container */}
      <div className="flex flex-col justify-center flex-grow px-4 sm:px-6 md:px-8 lg:px-12 xl:px-24 pt-24 pb-8">
        {/* Container to match ResultsPage structure */}
        <div className="container mx-auto">
          {/* Titles block, left-aligned */}
          <div className="max-w-5xl text-left">
            <motion.h1
              animate={titleControls}
              initial={{ opacity: 0, y: 50 }}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-display font-bold text-white mb-4 sm:mb-6 leading-tight lg:whitespace-nowrap"
            >
              FIND YOUR PERFECT SIP
            </motion.h1>

            <motion.p
              animate={subtitleControls}
              initial={{ opacity: 0, y: 65 }}
              className="text-lg sm:text-xl md:text-2xl text-white/90 mb-8 leading-relaxed max-w-3xl lg:whitespace-nowrap"
            >
              Discover a cocktail that matches your city's vibe and weather
            </motion.p>
          </div>

          {/* Search input */}
          <motion.div
            animate={searchControls}
            initial={{ opacity: 0, y: 80 }}
            className="max-w-5xl"
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
                  disabled={dailyLimitReached}
                />
                {isSearching && (
                  <div className="pr-3 sm:pr-4">
                    <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              
              {/* Daily request limit message */}
              {dailyRequestMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-2 p-2 rounded-md text-sm ${
                    dailyLimitReached 
                      ? 'bg-red-100 text-red-700 border border-red-200' 
                      : isAdmin
                        ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-100'
                  }`}
                >
                  <div className="flex items-start">
                    <AlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                    <span>{dailyRequestMessage}</span>
                  </div>
                </motion.div>
              )}
              
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
    </main>
  );
};

export default LandingPage;