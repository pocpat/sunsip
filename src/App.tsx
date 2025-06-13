import { useEffect } from 'react';
import { useAppStore } from './store/appStore';
import Header from './components/Header';
import LandingPage from './components/LandingPage';
import ResultsPage from './components/ResultsPage';
import AuthModal from './components/auth/AuthModal';
import SentryTestButton from './components/SentryTestButton';
import UserDashboard from './components/UserDashboard';
import { useAuthStore } from './store/authStore';
import { AnimatePresence } from 'framer-motion';

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
    <div className="min-h-screen">
      <Header />
      
      <main className="relative">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-screen" style={{ backgroundColor: '#819077' }}>
            <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-white text-lg">Creating your SunSip experience...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {currentView === 'search' && <LandingPage key="landing" />}
            {currentView === 'result' && <ResultsPage key="results" />}
            {currentView === 'dashboard' && isAuthenticated && (
              <div key="dashboard" className="min-h-screen pt-24" style={{ backgroundColor: '#819077' }}>
                <UserDashboard />
              </div>
            )}
          </AnimatePresence>
        )}
      </main>
      
      {showAuthModal && <AuthModal />}
      
      {/* Sentry Test Button - Only show in development */}
      {import.meta.env.DEV && <SentryTestButton />}
    </div>
  );
}

export default App;