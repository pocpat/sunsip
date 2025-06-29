import React, { useEffect, useState, useRef } from 'react';
import { useAuthStore, type SavedCombination } from '../store/authStore';
import { getUserSavedCombinations, deleteSavedCombination, updateCombinationRating, trackCombinationAccess } from '../lib/supabase';
import { Bookmark, X, Star, Eye, MessageSquare, List, LayoutGrid, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SavedCombinations: React.FC = () => {
  const { user, savedCombinations, setSavedCombinations, removeSavedCombination, updateSavedCombination } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedCombination, setSelectedCombination] = useState<SavedCombination | null>(null);
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'carousel'>('list');
  
  // Carousel navigation state
  const carouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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

  // Update carousel navigation state
  const updateCarouselNavigation = () => {
    if (!carouselRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  };

  // Set up carousel scroll listener
  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel || viewMode !== 'carousel') return;

    updateCarouselNavigation();
    carousel.addEventListener('scroll', updateCarouselNavigation);
    
    return () => {
      carousel.removeEventListener('scroll', updateCarouselNavigation);
    };
  }, [viewMode, savedCombinations]);

  // Carousel navigation functions
  const scrollCarousel = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    
    const cardWidth = 256 + 16; // w-64 (256px) + gap (16px)
    const scrollAmount = cardWidth * 2; // Scroll 2 cards at a time
    
    const newScrollLeft = direction === 'left' 
      ? carouselRef.current.scrollLeft - scrollAmount
      : carouselRef.current.scrollLeft + scrollAmount;
    
    carouselRef.current.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    });
  };

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

  const handleCombinationClick = async (combination: SavedCombination) => {
    // Track access
    try {
      await trackCombinationAccess(combination.id);
      updateSavedCombination(combination.id, {
        timesAccessed: combination.timesAccessed + 1,
        lastAccessedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error tracking access:', error);
    }

    setSelectedCombination(combination);
    setRating(combination.rating || 0);
    setNotes(combination.notes || '');
  };

  const handleUpdateRating = async () => {
    if (!selectedCombination) return;

    setIsUpdating(true);
    
    try {
      await updateCombinationRating(selectedCombination.id, rating, notes);
      updateSavedCombination(selectedCombination.id, { rating, notes });
      setSelectedCombination(null);
    } catch (error) {
      console.error('Error updating rating:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const renderStars = (currentRating: number, interactive: boolean = false) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={16}
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

  if (savedCombinations.length === 0 && !isLoading) {
    return null;
  }

  return (
    <>
      <motion.div 
        className="w-full max-w-5xl mx-auto mt-12 mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <div 
          className="flex items-center justify-between cursor-pointer" 
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center">
            <Bookmark size={20} className="text-primary-600 mr-2" />
            <h3 className="text-xl font-display font-bold">
              Saved Combinations ({savedCombinations.length})
            </h3>
            <div 
              className={`ml-2 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
            >
              ▼
            </div>
          </div>
          
          {/* View Mode Toggle */}
          {isExpanded && savedCombinations.length > 0 && (
            <div className="flex items-center space-x-2 bg-white rounded-lg p-1 shadow-sm border">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setViewMode('list');
                }}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-primary-100 text-primary-600'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
                title="List View"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setViewMode('carousel');
                }}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'carousel'
                    ? 'bg-primary-100 text-primary-600'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
                title="Carousel View"
              >
                <List size={16} />
              </button>
            </div>
          )}
        </div>
        
        {isExpanded && (
          <div className="mt-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="relative">
                {/* Carousel Navigation Arrows */}
                {viewMode === 'carousel' && savedCombinations.length > 0 && (
                  <>
                    <button
                      onClick={() => scrollCarousel('left')}
                      disabled={!canScrollLeft}
                      className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white shadow-lg border flex items-center justify-center transition-all ${
                        canScrollLeft 
                          ? 'text-gray-700 hover:bg-gray-50 hover:shadow-xl' 
                          : 'text-gray-300 cursor-not-allowed'
                      }`}
                      style={{ transform: 'translateY(-50%) translateX(-50%)' }}
                    >
                      <ChevronLeft size={20} />
                    </button>
                    
                    <button
                      onClick={() => scrollCarousel('right')}
                      disabled={!canScrollRight}
                      className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white shadow-lg border flex items-center justify-center transition-all ${
                        canScrollRight 
                          ? 'text-gray-700 hover:bg-gray-50 hover:shadow-xl' 
                          : 'text-gray-300 cursor-not-allowed'
                      }`}
                      style={{ transform: 'translateY(-50%) translateX(50%)' }}
                    >
                      <ChevronRight size={20} />
                    </button>
                  </>
                )}

                <div 
                  ref={viewMode === 'carousel' ? carouselRef : null}
                  className={
                    viewMode === 'list'
                      ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
                      : 'flex flex-nowrap overflow-x-auto snap-x snap-mandatory gap-4 p-2 custom-scrollbar mx-8'
                  }
                  style={viewMode === 'carousel' ? {
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(0, 0, 0, 0.2) transparent'
                  } : {}}
                >
                  {savedCombinations.map((combination) => (
                    <motion.div 
                      key={combination.id}
                      className={`bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow ${
                        viewMode === 'carousel' ? 'flex-shrink-0 w-64 snap-start' : ''
                      }`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                      onClick={() => handleCombinationClick(combination)}
                    >
                      <div className="relative h-40">
                        <img 
                          src={combination.cityImageUrl} 
                          alt={combination.cityName} 
                          className="w-full h-full object-cover"
                        />
                        <button 
                          className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(combination.id);
                          }}
                          disabled={isDeleting === combination.id}
                        >
                          {isDeleting === combination.id ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <X size={16} />
                          )}
                        </button>
                        
                        {combination.timesAccessed > 0 && (
                          <div className="absolute top-2 left-2 bg-black/50 text-white rounded-full px-2 py-1 text-xs flex items-center">
                            <Eye size={12} className="mr-1" />
                            {combination.timesAccessed}
                          </div>
                        )}
                      </div>
                      
                      <div className="p-4">
                        <h4 className="font-medium text-lg truncate">{combination.cityName}</h4>
                        <p className="text-sm text-gray-600">{combination.countryName}</p>
                        
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <p className="text-sm font-medium truncate">{combination.cocktailName}</p>
                          
                          <div className="flex items-center justify-between mt-2">
                            {combination.rating && renderStars(combination.rating)}
                            {combination.notes && (
                              <MessageSquare size={14} className="text-gray-400" />
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Rating Modal */}
      <AnimatePresence>
        {selectedCombination && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <motion.div 
              className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
            >
              <div className="relative h-48">
                <img 
                  src={selectedCombination.cityImageUrl} 
                  alt={selectedCombination.cityName} 
                  className="w-full h-full object-cover"
                />
                <button 
                  onClick={() => setSelectedCombination(null)}
                  className="absolute top-4 right-4 bg-black/50 text-white rounded-full p-2 hover:bg-black/70"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6">
                <h3 className="text-xl font-bold mb-2">
                  {selectedCombination.cityName}, {selectedCombination.countryName}
                </h3>
                <p className="text-lg text-primary-600 mb-4">{selectedCombination.cocktailName}</p>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rate this combination
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
                    onClick={() => setSelectedCombination(null)}
                    className="flex-1 btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateRating}
                    disabled={isUpdating}
                    className="flex-1 btn-primary"
                  >
                    {isUpdating ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SavedCombinations;