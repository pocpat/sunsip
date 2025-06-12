import { useEffect } from 'react';
import { useAppStore } from './store/appStore';
import Header from './components/Header';
import Room from './components/Room';
import CitySearch from './components/CitySearch';
import WeatherDetails from './components/WeatherDetails';
import CocktailDetails from './components/CocktailDetails';
import AuthModal from './components/auth/AuthModal';
import SentryTestButton from './components/SentryTestButton';
import UserDashboard from './components/UserDashboard';
import { useAuthStore } from './store/authStore';
import SavedCombinations from './components/SavedCombinations';

function App() {
  const { isLoading, currentView, showAuthModal } = useAppStore();
  const { isAuthenticated } = useAuthStore();

  // Preload images for better UX
  useEffect(() => {
    const preloadImages = async () => {
      const imagesToPreload = [
        '/images/room-day.png',
        '/images/room-night.png',
        '/images/table.png',
      ];
      
      imagesToPreload.forEach(src => {
        const img = new Image();
        img.src = src;
      });
    };
    
    preloadImages();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[70vh]">
            <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600">Creating your SunSip experience...</p>
          </div>
        ) : (
          <>
            {currentView === 'search' && <CitySearch />}
            
            {currentView === 'result' && (
              <div className="flex flex-col items-center">
                <Room />
                
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl">
                  <WeatherDetails />
                  <CocktailDetails />
                </div>
                
                {isAuthenticated && <SavedCombinations />}
              </div>
            )}

            {currentView === 'dashboard' && isAuthenticated && <UserDashboard />}
          </>
        )}
      </main>
      
      {showAuthModal && <AuthModal />}
      
      {/* Sentry Test Button - Only show in development */}
      {import.meta.env.DEV && <SentryTestButton />}
    </div>
  );
}

export default App;