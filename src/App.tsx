import { useEffect } from 'react';
import { useAppStore } from './store/appStore';
import Header from './components/Header';
import LandingPage from './components/LandingPage';
import ResultsPage from './components/ResultsPage';
import AuthModal from './components/auth/AuthModal';
import SentryTestButton from './components/SentryTestButton';
import UserDashboard from './components/UserDashboard';
import BoltBadge from './components/BoltBadge';
import { useAuthStore } from './store/authStore';
import { AnimatePresence, motion } from 'framer-motion';

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
        '/images/loadingPrev10.png',
      ];
      
      imagesToPreload.forEach(src => {
        const img = new Image();
        img.src = src;
      });
    };
    
    preloadImages();
  }, []);

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="relative">
        <AnimatePresence mode="wait">
          {currentView === 'search' && <LandingPage key="landing" />}
          {currentView === 'result' && <ResultsPage key="results" />}
          {currentView === 'dashboard' && isAuthenticated && (
            <div key="dashboard" className="min-h-screen pt-24" style={{ backgroundColor: '#819077' }}>
              <UserDashboard />
            </div>
          )}
        </AnimatePresence>
      </main>
      
      {/* Subtle Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(129, 144, 119, 0.85)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="bg-white rounded-lg shadow-xl p-8 flex flex-col items-center space-y-4"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              {/* Elegant spinning loader */}
              <div className="relative">
                <div className="w-12 h-12 border-4 border-gray-200 rounded-full"></div>
                <div className="absolute top-0 left-0 w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              
              <div className="text-center">
                <h3 className="text-lg font-display font-semibold text-gray-800 mb-1">
                  Creating your SunSip experience
                </h3>
                <p className="text-sm text-gray-600">
                  Finding the perfect cocktail for your weather...
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
         {showAuthModal && <AuthModal />}
      
      {/* Bolt.new Badge */}
      <BoltBadge />
      
          {/* Sentry Test Button - Only show in development */}
      {import.meta.env.DEV && <SentryTestButton />}
    
   
    </div>
  );
}

export default App;