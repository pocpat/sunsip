import React, { useState, useEffect } from "react";
import { useAppStore, type CityOption } from "../store/appStore";
import { useAuthStore } from "../store/authStore";
import { searchCities } from "../services/geocodingService";
import { getWeatherData } from "../services/weatherService";
import { getCocktailSuggestion } from "../services/cocktailService";
import { generateCityImage } from "../services/imageGenerationService";
import { checkAndUpdateRequestLimit } from "../lib/supabase";
import { MapPin, AlertCircle, Sun, Martini, Heart } from "lucide-react";
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
      className="h-full flex flex-col bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/images/landing-bg.png')" }}
    >
      {/* Soft olive wash on the left so text stays readable over the wall,
          fading out before the window/illustration zone */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(100deg, rgba(60,72,48,0.88) 0%, rgba(60,72,48,0.72) 34%, rgba(60,72,48,0.25) 52%, rgba(60,72,48,0) 66%)',
        }}
      />

      {/* Main Content - Takes full height of the viewport container */}
      <div className="relative flex flex-col justify-center flex-grow pl-6 sm:pl-10 md:pl-14 lg:pl-20 pr-4 pt-24 pb-10">
        {/* Content column — no container wrapper: the pill stretches right
            until the wall's corner, like the mockup */}
        <div className="w-full">
          {/* Titles block, left-aligned, tilted -3deg like the mockup */}
          <div className="max-w-5xl text-left">
            <motion.h1
              animate={titleControls}
              initial={{ opacity: 0, y: 50 }}
              className="font-script font-bold text-[#F4EFE2] mb-5 sm:mb-6 leading-[1.02] text-6xl sm:text-7xl md:text-8xl lg:text-[7rem]"
              style={{ transform: 'rotate(-3deg)', transformOrigin: 'left bottom' }}
            >
              Your city,
              <br />
              its weather,
              <br />
              <span className="relative inline-block">
                its drink.
                {/* hand-drawn brush underline */}
                <svg
                  className="absolute -bottom-2 left-0 w-full h-3 sm:h-4"
                  viewBox="0 0 220 12"
                  fill="none"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path
                    d="M3 8 C 40 4, 90 3, 130 6 S 200 9, 217 5"
                    stroke="#F4EFE2"
                    strokeWidth="4"
                    strokeLinecap="round"
                    opacity="0.85"
                  />
                </svg>
              </span>
            </motion.h1>

            <motion.p
              animate={subtitleControls}
              initial={{ opacity: 0, y: 65 }}
              className="font-round text-lg sm:text-xl md:text-2xl text-[#F4EFE2]/90 mb-10 leading-relaxed max-w-2xl"
            >
              Enter a city and let us match you with the perfect cocktail for the day's mood.
            </motion.p>
          </div>

          {/* Search input — the hero CTA: stretches right until the wall's
              corner (no max-width cap, like the mockup) */}
          <motion.div
            animate={searchControls}
            initial={{ opacity: 0, y: 80 }}
            className="w-full max-w-[62rem]"
          >
            <div className="relative w-full">
              <form
                className="flex items-center bg-[#F4EFE2] rounded-full shadow-lg focus-within:shadow-xl transition-shadow pr-2 py-2.5 pl-6"
                onSubmit={(e) => e.preventDefault()}
              >
                <MapPin size={24} className="text-[#4C5A3B] mr-3 shrink-0" />
                <input
                  id="city-search"
                  name="city-search"
                  type="text"
                  value={query}
                  onChange={handleInputChange}
                  onFocus={handleInputFocus}
                  placeholder="e.g. Wellington, New York, Bali..."
                  className="w-full p-3 outline-none bg-transparent text-[#3B4830] placeholder-[#8B8E7B] font-round text-base sm:text-lg md:text-xl"
                  disabled={dailyLimitReached}
                />
                {isSearching ? (
                  <div className="shrink-0 mr-1">
                    <div className="w-12 h-12 rounded-full bg-[#3B4830] flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  </div>
                ) : (
                  <button
                    type="submit"
                    aria-label="Search city"
                    className="w-12 h-12 shrink-0 rounded-full bg-[#3B4830] hover:bg-[#2F3A26] flex items-center justify-center transition-colors"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M5 12h14M13 6l6 6-6 6" stroke="#F4EFE2" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                )}
              </form>

              {/* Daily request limit message */}
              {dailyRequestMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-3 p-2 rounded-md text-sm ${
                    dailyLimitReached
                      ? 'bg-red-100 text-red-700 border border-red-200'
                      : isAdmin
                        ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                        : 'bg-white/90 text-[#3B4830] border border-white'
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
                    className="absolute z-20 mt-2 w-full bg-white rounded-2xl shadow-xl border border-gray-200 max-h-60 sm:max-h-72 overflow-auto"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    {cityOptions.map((city, index) => (
                      <div
                        key={`${city.city}-${city.country}-${index}`}
                        className="p-3 hover:bg-[#F4EFE2] cursor-pointer border-b border-gray-100 last:border-0 flex items-center transition-colors"
                        onClick={() => handleCitySelect(city)}
                      >
                        <MapPin
                          size={16}
                          className="text-[#4C5A3B] mr-2 flex-shrink-0 sm:w-4 sm:h-4"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="font-round font-semibold text-[#3B4830] text-sm sm:text-base">
                            {city.city}
                          </span>
                          <span className="text-gray-500 ml-2 text-sm">
                            {city.country}
                          </span>
                          <div className="text-xs text-gray-400 truncate">
                            {city.latitude.toFixed(4)},{ " "}
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

          {/* Feature row — ☀ Weather + 🍸 Cocktail + ♡ Good vibes, bigger,
              pushed down to the "table" line like the mockup */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.7 }}
            className="mt-20 md:mt-28 flex items-center gap-3 text-[#F4EFE2]/90"
          >
            <Sun size={30} className="text-[#E7B54B]" />
            <span className="font-script text-3xl md:text-4xl">Weather</span>
            <span className="mx-1 text-xl">+</span>
            <Martini size={30} className="text-[#E7B54B]" />
            <span className="font-script text-3xl md:text-4xl">Cocktail</span>
            <span className="mx-1 text-xl">+</span>
            <Heart size={26} className="text-[#E7B54B]" />
            <span className="font-script text-3xl md:text-4xl">Good vibes</span>
          </motion.div>
        </div>
      </div>
    </main>
  );
};

export default LandingPage;