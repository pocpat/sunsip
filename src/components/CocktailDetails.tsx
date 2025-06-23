import React, { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { GlassWater, List, ChefHat, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { saveCombination } from '../lib/supabase';

const CocktailDetails: React.FC = () => {
  const { weatherData, cocktailData, cityImageUrl } = useAppStore();
  const { user, isAuthenticated, addSavedCombination } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState('');

  if (!cocktailData || !weatherData) {
    return null;
  }

  const handleSave = async () => {
    if (!isAuthenticated || !user || !weatherData || !cocktailData || !cityImageUrl) {
      return;
    }

    setShowRatingModal(true);
  };

  const handleSaveWithRating = async () => {
    if (!isAuthenticated || !user || !weatherData || !cocktailData || !cityImageUrl) {
      return;
    }

    setIsSaving(true);

    try {
      const savedCombination = await saveCombination(user.id, {
        cityName: weatherData.city,
        countryName: weatherData.country,
        cityImageUrl,
        weatherDetails: JSON.stringify({
          temperature: weatherData.temperature,
          condition: weatherData.condition,
          localTime: weatherData.localTime,
        }),
        cocktailName: cocktailData.name,
        cocktailImageUrl: cocktailData.imageUrl,
        cocktailIngredients: cocktailData.ingredients,
        cocktailRecipe: cocktailData.recipe,
        rating: rating > 0 ? rating : undefined,
        notes: notes.trim() || undefined,
      });

      addSavedCombination(savedCombination);
      setShowSuccess(true);
      setShowRatingModal(false);
      setRating(0);
      setNotes('');

      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error saving combination:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const renderStars = (currentRating: number, interactive: boolean = false) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={18}
            className={`${
              star <= currentRating
                ? 'text-yellow-400 fill-current'
                : 'text-gray-300'
            } ${interactive ? 'cursor-pointer hover:text-yellow-400' : ''}`}
            onClick={interactive ? () => setRating(star) : undefined}
            data-testid="star-icon"
          />
        ))}
      </div>
    );
  };

  return (
    <>
      <motion.div 
        className="glass rounded-lg p-4 sm:p-6 shadow-lg"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 space-y-2 sm:space-y-0">
          <h3 className="text-lg sm:text-xl font-display font-bold">Cocktail Match</h3>
          {isAuthenticated && (
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="btn-primary text-xs sm:text-sm py-1 px-3 sm:px-4 whitespace-nowrap"
            >
              {isSaving ? 'Saving...' : 'Save Combination'}
            </button>
          )}
        </div>

        <div className="mb-4">
          <h4 className="text-lg sm:text-xl font-medium text-primary-800">{cocktailData.name}</h4>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">{cocktailData.description}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-6">
          <div>
            <div className="flex items-center mb-2">
              <List size={14} className="text-primary-600 mr-2 flex-shrink-0" />
              <h5 className="font-medium text-sm sm:text-base">Ingredients</h5>
            </div>
            <ul className="text-xs sm:text-sm space-y-1 pl-2">
              {cocktailData.ingredients.map((ingredient, index) => (
                <li key={index} className="text-gray-700">• {ingredient}</li>
              ))}
            </ul>
          </div>
          
          <div>
            <div className="flex items-center mb-2">
              <ChefHat size={14} className="text-primary-600 mr-2 flex-shrink-0" />
              <h5 className="font-medium text-sm sm:text-base">Instructions</h5>
            </div>
            <ol className="text-xs sm:text-sm space-y-1 pl-5 list-decimal">
              {cocktailData.recipe.map((step, index) => (
                <li key={index} className="text-gray-700">{step}</li>
              ))}
            </ol>
          </div>
        </div>

        {/* Success message */}
        {showSuccess && (
          <motion.div 
            className="mt-4 bg-green-100 border border-green-400 text-green-700 px-3 sm:px-4 py-2 rounded text-sm"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            Combination saved successfully!
          </motion.div>
        )}
      </motion.div>

      {/* Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div 
            className="bg-white rounded-lg shadow-xl w-full max-w-md"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-bold mb-4">Rate Your Combination</h3>
              
              <div className="mb-4">
                <p className="text-gray-600 mb-2 text-sm sm:text-base">
                  {weatherData.city}, {weatherData.country} + {cocktailData.name}
                </p>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How would you rate this combination? (optional)
                </label>
                {renderStars(rating, true)}
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add your thoughts about this combination..."
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none text-sm"
                  rows={3}
                />
              </div>
              
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                <button
                  onClick={() => {
                    setShowRatingModal(false);
                    setRating(0);
                    setNotes('');
                  }}
                  className="flex-1 btn-outline text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveWithRating}
                  disabled={isSaving}
                  className="flex-1 btn-primary text-sm"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
};

export default CocktailDetails;