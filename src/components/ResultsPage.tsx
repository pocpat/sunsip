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
  const { resetApp } = useAppStore();
  const { isAuthenticated } = useAuthStore();

  const handleNewSearch = () => {
    resetApp();
  };

  return (

    <motion.div 
      className="min-h-screen relative "
      style={{ backgroundColor: '#819077' }}
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <div className="container mx-auto px-4 py-8 pt-24">
        <div className="flex flex-col items-center">
          {/* Room Component - Same width as the grid below */}
<div className="w-full aspect-[16/9]  mb-5 "> {/* or h-screen for full viewport height */}
  <Room isPreview={false} />
</div>
          
          {/* Weather and Cocktail Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl">
            <WeatherDetails />
            <CocktailDetails />
          </div>
          
          {isAuthenticated && <SavedCombinations />}
        </div>
      </div>

      {/* New Search Button */}
      <motion.button
        onClick={handleNewSearch}
        className="fixed bottom-6 right-6 bg-white text-gray-800 px-6 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-2 font-medium"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1, duration: 0.3 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <RotateCcw size={18} />
        <span>New Search</span>
      </motion.button>
      <Footer />
    </motion.div>
   
  );
};

export default ResultsPage;