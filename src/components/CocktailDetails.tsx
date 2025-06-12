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
            size={20}
            className={`${
              star <= currentRating
                ? 'text-yellow-400 fill-current'
                : 'text-gray-300'
            } ${interactive ? 'cursor-pointer hover:text-yellow-400' : ''}`}
            onClick={interactive ? () => setRating(star) : undefined}
          />
        ))}
      </div>
    );
  };

  return (
    <>
      <motion.div 
        className="glass rounded-lg p-6 shadow-lg"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-display font-bold">Cocktail Match</h3>
          {isAuthenticated && (
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="btn-primary text-sm py-1"
            >
              {isSaving ? 'Saving...' : 'Save Combination'}
            </button>
          )}
        </div>

        <div className="mb-4">
          <h4 className="text-xl font-medium text-primary-800">{cocktailData.name}</h4>
          <p className="text-gray-600 mt-1">{cocktailData.description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center mb-2">
              <List size={16} className="text-primary-600 mr-2" />
              <h5 className="font-medium">Ingredients</h5>
            </div>
            <ul className="text-sm space-y-1 pl-2">
              {cocktailData.ingredients.map((ingredient, index) => (
                <li key={index} className="text-gray-700">• {ingredient}</li>
              ))}
            </ul>
          </div>
          
          <div>
            <div className="flex items-center mb-2">
              <ChefHat size={16} className="text-primary-600 mr-2" />
              <h5 className="font-medium">Instructions</h5>
            </div>
            <ol className="text-sm space-y-1 pl-5 list-decimal">
              {cocktailData.recipe.map((step, index) => (
                <li key={index} className="text-gray-700">{step}</li>
              ))}
            </ol>
          </div>
        </div>

        {/* Success message */}
        {showSuccess && (
          <motion.div 
            className="mt-4 bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <motion.div 
            className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">Rate Your Combination</h3>
              
              <div className="mb-4">
                <p className="text-gray-600 mb-2">
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
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowRatingModal(false);
                    setRating(0);
                    setNotes('');
                  }}
                  className="flex-1 btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveWithRating}
                  disabled={isSaving}
                  className="flex-1 btn-primary"
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