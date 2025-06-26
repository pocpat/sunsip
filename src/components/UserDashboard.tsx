import React, { useEffect, useState } from 'react';
import { useAuthStore, type SavedCombination } from '../store/authStore';
import { getUserSavedCombinations, getUserTopCombinations, getUserPreferences, saveUserPreferences } from '../lib/supabase';
import { 
  User, 
  Star, 
  MapPin, 
  Calendar, 
  TrendingUp, 
  Settings, 
  Heart,
  Eye,
  Wine,
  CloudRain,
  Sun,
  Snowflake,
  Cloud,
  Edit3,
  Save,
  X,
  ArrowLeft, // Import ArrowLeft
  House as HouseIcon // Import HouseIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/appStore'; // Import useAppStore

interface TopCombination {
  id: string;
  city_name: string;
  country_name: string;
  cocktail_name: string;
  rating: number;
  times_accessed: number;
  last_accessed_at: string;
}

const UserDashboard: React.FC = () => {
  const { user, savedCombinations, setSavedCombinations, userPreferences, setUserPreferences } = useAuthStore();
  const { changeView, resetApp } = useAppStore(); // Destructure changeView and resetApp from useAppStore
  const [topCombinations, setTopCombinations] = useState<TopCombination[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingPreferences, setIsEditingPreferences] = useState(false);
  const [editedPreferences, setEditedPreferences] = useState({
    preferredSpirits: [] as string[],
    dietaryRestrictions: [] as string[],
    favoriteWeatherMoods: {} as Record<string, any>
  });

  const spiritOptions = [
    'Gin', 'Vodka', 'Rum', 'Whiskey', 'Bourbon', 'Tequila', 'Mezcal', 
    'Brandy', 'Cognac', 'Wine', 'Champagne', 'Beer', 'Sake'
  ];

  const dietaryOptions = [
    'Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'Sugar-free', 
    'Low-calorie', 'No artificial sweeteners', 'Organic only'
  ];

  const weatherMoods = [
    { key: 'sunny', label: 'Sunny Days', icon: Sun, color: 'text-yellow-500' },
    { key: 'rainy', label: 'Rainy Weather', icon: CloudRain, color: 'text-blue-500' },
    { key: 'snowy', label: 'Snow Days', icon: Snowflake, color: 'text-blue-300' },
    { key: 'cloudy', label: 'Cloudy Skies', icon: Cloud, color: 'text-gray-500' }
  ];

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      
      setIsLoading(true);
      
      try {
        // Fetch saved combinations if not already loaded
        if (savedCombinations.length === 0) {
          const combinations = await getUserSavedCombinations(user.id);
          setSavedCombinations(combinations);
        }
        
        // Fetch top combinations
        const topCombs = await getUserTopCombinations(user.id, 5);
        setTopCombinations(topCombs);
        
        // Fetch user preferences
        const preferences = await getUserPreferences(user.id);
        if (preferences) {
          setUserPreferences(preferences);
          setEditedPreferences({
            preferredSpirits: preferences.preferredSpirits,
            dietaryRestrictions: preferences.dietaryRestrictions,
            favoriteWeatherMoods: preferences.favoriteWeatherMoods
          });
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [user, savedCombinations.length, setSavedCombinations, setUserPreferences]);

  const handleSavePreferences = async () => {
    if (!user) return;
    
    try {
      const savedPrefs = await saveUserPreferences(user.id, editedPreferences);
      setUserPreferences(savedPrefs);
      setIsEditingPreferences(false);
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  const toggleSpirit = (spirit: string) => {
    setEditedPreferences(prev => ({
      ...prev,
      preferredSpirits: prev.preferredSpirits.includes(spirit)
        ? prev.preferredSpirits.filter(s => s !== spirit)
        : [...prev.preferredSpirits, spirit]
    }));
  };

  const toggleDietaryRestriction = (restriction: string) => {
    setEditedPreferences(prev => ({
      ...prev,
      dietaryRestrictions: prev.dietaryRestrictions.includes(restriction)
        ? prev.dietaryRestrictions.filter(r => r !== restriction)
        : [...prev.dietaryRestrictions, restriction]
    }));
  };

  const toggleWeatherMood = (mood: string) => {
    setEditedPreferences(prev => ({
      ...prev,
      favoriteWeatherMoods: {
        ...prev.favoriteWeatherMoods,
        [mood]: !prev.favoriteWeatherMoods[mood]
      }
    }));
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={16}
            className={star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}
          />
        ))}
      </div>
    );
  };

  const getStats = () => {
    const totalCombinations = savedCombinations.length;
    const ratedCombinations = savedCombinations.filter(c => c.rating).length;
    const averageRating = ratedCombinations > 0 
      ? savedCombinations.reduce((sum, c) => sum + (c.rating || 0), 0) / ratedCombinations 
      : 0;
    const totalAccesses = savedCombinations.reduce((sum, c) => sum + c.timesAccessed, 0);
    
    return { totalCombinations, averageRating, totalAccesses, ratedCombinations };
  };

  const handleGoBackToResults = () => {
    changeView('result');
  };

  const handleGoBackToLanding = () => {
    resetApp(); // resetApp handles changing view to 'search'
  };

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const stats = getStats();

  return (
    <div className=" bg-[#819077] max-w-7xl mx-auto px-4 py-8">


      {/* Header */}
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.4 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 mt-20">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center">
              <User size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold text-gray-800">
                Welcome back!
              </h1>
              <p className="text-gray-600">{user.email}</p>
            </div>
          </div>
          
          <button
            onClick={() => setIsEditingPreferences(!isEditingPreferences)}
            className="flex items-center space-x-2 btn-outline"
          >
            {isEditingPreferences ? <X size={18} /> : <Settings size={18} />}
            <span>{isEditingPreferences ? 'Cancel' : 'Preferences'}</span>
          </button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.4, delay: 0.1 }}
      >
        <div className="bg-white rounded-lg p-6 shadow-md border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Combinations</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalCombinations}</p>
            </div>
            <Heart className="text-primary-500" size={24} />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-6 shadow-md border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Average Rating</p>
              <p className="text-2xl font-bold text-gray-800">
                {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '—'}
              </p>
            </div>
            <Star className="text-yellow-500" size={24} />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-6 shadow-md border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Views</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalAccesses}</p>
            </div>
            <Eye className="text-blue-500" size={24} />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-6 shadow-md border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Rated Combinations</p>
              <p className="text-2xl font-bold text-gray-800">{stats.ratedCombinations}</p>
            </div>
            <TrendingUp className="text-green-500" size={24} />
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Preferences Panel */}
        <motion.div 
          className="lg:col-span-1"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.4, delay: 0.2 }}
        >
          <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-display font-bold text-gray-800">Preferences</h2>
                {isEditingPreferences && (
                  <button
                    onClick={handleSavePreferences}
                    className="flex items-center space-x-1 btn-primary text-sm py-1"
                  >
                    <Save size={16} />
                    <span>Save</span>
                  </button>
                )}
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Preferred Spirits */}
              <div>
                <h3 className="font-medium text-gray-800 mb-3 flex items-center">
                  <Wine size={18} className="mr-2 text-primary-600" />
                  Preferred Spirits
                </h3>
                <div className="flex flex-wrap gap-2">
                  {spiritOptions.map(spirit => (
                    <button
                      key={spirit}
                      onClick={() => isEditingPreferences && toggleSpirit(spirit)}
                      disabled={!isEditingPreferences}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        editedPreferences.preferredSpirits.includes(spirit)
                          ? 'bg-primary-100 text-primary-800 border border-primary-300'
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                      } ${isEditingPreferences ? 'hover:bg-primary-50 cursor-pointer' : 'cursor-default'}`}
                    >
                      {spirit}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dietary Restrictions */}
              <div>
                <h3 className="font-medium text-gray-800 mb-3">Dietary Preferences</h3>
                <div className="flex flex-wrap gap-2">
                  {dietaryOptions.map(restriction => (
                    <button
                      key={restriction}
                      onClick={() => isEditingPreferences && toggleDietaryRestriction(restriction)}
                      disabled={!isEditingPreferences}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        editedPreferences.dietaryRestrictions.includes(restriction)
                          ? 'bg-green-100 text-green-800 border border-green-300'
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                      } ${isEditingPreferences ? 'hover:bg-green-50 cursor-pointer' : 'cursor-default'}`}
                    >
                      {restriction}
                    </button>
                  ))}
                </div>
              </div>

              {/* Weather Moods */}
              <div>
                <h3 className="font-medium text-gray-800 mb-3">Favorite Weather</h3>
                <div className="space-y-2">
                  {weatherMoods.map(({ key, label, icon: Icon, color }) => (
                    <button
                      key={key}
                      onClick={() => isEditingPreferences && toggleWeatherMood(key)}
                      disabled={!isEditingPreferences}
                      className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                        editedPreferences.favoriteWeatherMoods[key]
                          ? 'bg-blue-50 border border-blue-200'
                          : 'bg-gray-50 border border-gray-200'
                      } ${isEditingPreferences ? 'hover:bg-blue-25 cursor-pointer' : 'cursor-default'}`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon size={20} className={color} />
                        <span className="text-gray-800">{label}</span>
                      </div>
                      {editedPreferences.favoriteWeatherMoods[key] && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Top Combinations */}
        <motion.div 
          className="lg:col-span-2"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.4, delay: 0.3 }}
        >
          <div className="bg-white rounded-lg shadow-md border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-display font-bold text-gray-800 flex items-center">
                <TrendingUp size={24} className="mr-2 text-primary-600" />
                Your Top Combinations
              </h2>
            </div>
            
            <div className="p-6">
              {topCombinations.length > 0 ? (
                <div className="space-y-4">
                  {topCombinations.map((combination, index) => (
                    <motion.div
                      key={combination.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-800 font-bold text-sm">#{index + 1}</span>
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-800">{combination.cocktail_name}</h3>
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <MapPin size={14} />
                            <span>{combination.city_name}, {combination.country_name}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        {combination.rating && renderStars(combination.rating)}
                        <div className="flex items-center space-x-1 text-sm text-gray-600">
                          <Eye size={14} />
                          <span>{combination.times_accessed}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Wine size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-600">No combinations yet. Start exploring to build your collection!</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          {savedCombinations.length > 0 && (
            <div className="mt-8 bg-white rounded-lg shadow-md border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-display font-bold text-gray-800 flex items-center">
                  <Calendar size={24} className="mr-2 text-primary-600" />
                  Recent Combinations
                </h2>
              </div>
              
              <div className="p-6">
                <div className="space-y-3">
                  {savedCombinations.slice(0, 5).map((combination, index) => (
                    <motion.div
                      key={combination.id}
                      className="flex items-center justify-between py-2"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <div>
                        <h4 className="font-medium text-gray-800">{combination.cocktailName}</h4>
                        <p className="text-sm text-gray-600">{combination.cityName}, {combination.countryName}</p>
                      </div>
                      <div className="text-right">
                        {combination.rating && renderStars(combination.rating)}
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(combination.savedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default UserDashboard;

