import React, { useEffect, useState } from 'react';
import { useAuthStore, type SavedCombination } from '../store/authStore';
import { getUserSavedCombinations, deleteSavedCombination } from '../lib/supabase';
import { Bookmark, X } from 'lucide-react';
import { motion } from 'framer-motion';

const SavedCombinations: React.FC = () => {
  const { user, savedCombinations, setSavedCombinations, removeSavedCombination } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchSavedCombinations = async () => {
      if (!user) return;
      
      setIsLoading(true);
      
      try {
        const combinations = await getUserSavedCombinations(user.id);
        setSavedCombinations(combinations);
      } catch (error) {
        console.error('Error fetching saved combinations:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSavedCombinations();
  }, [user, setSavedCombinations]);

  const handleDelete = async (id: string) => {
    setIsDeleting(id);
    
    try {
      await deleteSavedCombination(id);
      removeSavedCombination(id);
    } catch (error) {
      console.error('Error deleting saved combination:', error);
    } finally {
      setIsDeleting(null);
    }
  };

  if (savedCombinations.length === 0 && !isLoading) {
    return null;
  }

  return (
    <motion.div 
      className="w-full max-w-5xl mx-auto mt-12 mb-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.5 }}
    >
      <div 
        className="flex items-center cursor-pointer" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Bookmark size={20} className="text-primary-600 mr-2" />
        <h3 className="text-xl font-display font-bold">
          Saved Combinations
        </h3>
        <div 
          className={`ml-2 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
        >
          ▼
        </div>
      </div>
      
      {isExpanded && (
        <div className="mt-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {savedCombinations.map((combination) => (
                <motion.div 
                  key={combination.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="relative h-40">
                    <img 
                      src={combination.cityImageUrl} 
                      alt={combination.cityName} 
                      className="w-full h-full object-cover"
                    />
                    <button 
                      className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                      onClick={() => handleDelete(combination.id)}
                      disabled={isDeleting === combination.id}
                    >
                      {isDeleting === combination.id ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <X size={16} />
                      )}
                    </button>
                  </div>
                  <div className="p-4">
                    <h4 className="font-medium text-lg truncate">{combination.cityName}</h4>
                    <p className="text-sm text-gray-600">{combination.countryName}</p>
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-sm font-medium">{combination.cocktailName}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default SavedCombinations;