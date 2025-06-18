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
          {/* Room Component - Same width as Landing page sneak-peek */}
          <div className="w-full max-w-5xl mx-auto mb-5">
            <div className="w-full aspect-[16/9]">
              <Room isPreview={false} />
            </div>
          </div>
          
          {/* Weather and Cocktail Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl">
            <WeatherDetails />
            <CocktailDetails />
          </div>
          
          {isAuthenticated && <SavedCombinations />}
        </div>
      </div>


      <Footer />
    </motion.div>
   
  );
};


export default ResultsPage;