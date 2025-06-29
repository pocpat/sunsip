import React from 'react';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import { motion } from 'framer-motion';
import Room from './Room';
import WeatherDetails from './WeatherDetails';
import CocktailDetails from './CocktailDetails';
import SavedCombinations from './SavedCombinations';

const ResultsPage: React.FC = () => {
  const { resetApp, weatherData, cocktailData } = useAppStore();
  const { isAuthenticated } = useAuthStore();

  // Determine if we should show the full room and details
  const showFullRoom = weatherData && cocktailData;

  return (
    <div 
      className="min-h-full overflow-hidden relative"
      style={{ backgroundColor: '#819077' }}
    >
      <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-24 py-6 sm:py-8 pt-24 sm:pt-28">
        <div className="flex flex-col items-center">
          {/* Room Component - Always visible, shows preview when no data */}
          <div className="w-full max-w-5xl mx-auto mb-4 sm:mb-6">
            <div className="w-full aspect-[16/9]">
              <Room isPreview={!showFullRoom} />
            </div>
          </div>
          
          {/* Weather and Cocktail Details - Only show when data is loaded */}
          {showFullRoom && (
            <motion.div 
              className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 w-full max-w-5xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <WeatherDetails />
              <CocktailDetails />
            </motion.div>
          )}
          
          {/* Saved Combinations - Only show if authenticated and data is loaded */}
          {isAuthenticated && showFullRoom && (
            <motion.div 
              className="w-full max-w-5xl mt-6 sm:mt-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <SavedCombinations />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResultsPage;