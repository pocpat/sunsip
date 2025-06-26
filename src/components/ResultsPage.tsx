import React from 'react';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import { RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';
import Room from './Room';
import WeatherDetails from './WeatherDetails';
import CocktailDetails from './CocktailDetails';
import SavedCombinations from './SavedCombinations';
import Footer from './Footer';

const ResultsPage: React.FC = () => {
  const { resetApp, changeView } = useAppStore();
  const { isAuthenticated } = useAuthStore();

  const handleNewSearch = () => {
    changeView("search"); // Use changeView to go back to search
    resetApp(); // Reset app data
  };

  return (
    <div 
      className="min-h-screen relative"
      style={{ backgroundColor: '#819077' }}
    >
      <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 xl:px-24 py-6 sm:py-8 pt-20 sm:pt-24">
        <div className="flex flex-col items-center">
          {/* Room Component - Responsive container */}
          <div className="w-full max-w-5xl mx-auto mb-4 sm:mb-6">
            <div className="w-full aspect-[16/9]">
              <Room isPreview={false} />
            </div>
          </div>
          
          {/* Weather and Cocktail Details Grid - Responsive */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 w-full max-w-5xl">
            <WeatherDetails />
            <CocktailDetails />
          </div>
          
          {/* Saved Combinations - Only show if authenticated */}
          {isAuthenticated && (
            <div className="w-full max-w-5xl mt-6 sm:mt-8">
              <SavedCombinations />
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ResultsPage;
