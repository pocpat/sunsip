import { useEffect } from 'react';
import { useAppStore } from './store/appStore';
import Header from './components/Header';
import LandingPage from './components/LandingPage';
import ResultsPage from './components/ResultsPage';
import AuthModal from './components/auth/AuthModal';
//import SentryTestButton from './components/SentryTestButton';
import UserDashboard from './components/UserDashboard';
import BoltBadge from './components/BoltBadge';
import { useAuthStore } from './store/authStore';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { usePageTransition } from './hooks/usePageTransition'; // Import the new hook

function App() {
  const { isLoading, currentView, showAuthModal, loadingStep, transitionDirection } = useAppStore();
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

  // Define all loading steps in order
  const loadingSteps = [
    'Finding your city…',
    'Checking the weather',
    'Looking outside... Is it sunny or rainy?',
    'Country drink preferences',
    'Selecting mood',
    'Painting a picture',
    'Mixing your perfect cocktail…',
    'Almost there... Adding the final touches!'
  ];

  // Function to check if a step is completed
  const isStepCompleted = (step: string) => {
    const currentStepIndex = loadingSteps.findIndex(s => loadingStep.includes(s.split('…')[0]) || loadingStep.includes(s));
    const stepIndex = loadingSteps.findIndex(s => s === step);
    return currentStepIndex > stepIndex;
  };

  // Function to check if a step is current
  const isCurrentStep = (step: string) => {
    return loadingStep.includes(step.split('…')[0]) || loadingStep.includes(step);
  };

  // Get transition props for each page using the custom hook
  const landingPageProps = usePageTransition('landing', transitionDirection);
  const resultsPageProps = usePageTransition('results', transitionDirection);
  const dashboardPageProps = usePageTransition('dashboard', transitionDirection);

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="relative min-h-screen" style={{ backgroundColor: '#819077' }}> {/* Moved background color here */}
        <AnimatePresence mode="sync"> 
          {currentView === 'search' && (
            <motion.div
              key="search" 
              {...landingPageProps} 
 style={{
                ...landingPageProps.style,
                zIndex: currentView === 'search' ? 2 : 1,
                position: 'absolute',
                width: '100%',
                top: 0,
                left: 0,
              }}            >
              <LandingPage />
            </motion.div>
          )}

          {currentView === 'dashboard' && isAuthenticated && ( // Re-added isAuthenticated condition here
            <motion.div 
              key="dashboard" // Key should match currentView for AnimatePresence
              {...dashboardPageProps} // Apply all props from the hook
 style={{
                ...dashboardPageProps.style,
                zIndex: currentView === 'dashboard' ? 2 : 1,
                position: 'absolute',
                width: '100%',
                top: 0,
                left: 0,
              }}            >
              <UserDashboard />
            </motion.div>
          )}
        
          {currentView === 'result' && (
            <motion.div
              key="result" // Key should match currentView for AnimatePresence
              {...resultsPageProps} // Apply all props from the hook
  style={{
                ...resultsPageProps.style,
                zIndex: currentView === 'result' ? 2 : 1,
                position: 'absolute',
                width: '100%',
                top: 0,
                left: 0,
              }}            >
              <ResultsPage />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      
      {/* Enhanced Loading Overlay with Step-by-Step Progress */}
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
              className="bg-white rounded-lg shadow-xl p-8 flex flex-col items-center space-y-6 max-w-md w-full mx-4"
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
                <h3 className="text-lg font-display font-semibold text-gray-800 mb-4">
                  Creating your SunSip experience
                </h3>
                
                {/* Loading Steps */}
                <div className="space-y-3 text-left">
                  {loadingSteps.map((step, index) => {
                    const isCompleted = isStepCompleted(step);
                    const isCurrent = isCurrentStep(step);
                    
                    return (
                      <motion.div
                        key={index}
                        className={`flex items-center space-x-3 transition-all duration-300 ${
                          isCompleted || isCurrent ? 'opacity-100' : 'opacity-40'
                        }`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: isCompleted || isCurrent ? 1 : 0.4, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      >
                        <div className="flex-shrink-0">
                          {isCompleted ? (
                            <CheckCircle size={16} className="text-green-500" />
                          ) : isCurrent ? (
                            <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <div className="w-4 h-4 border-2 border-gray-300 rounded-full"></div>
                          )}
                        </div>
                        <span className={`text-sm ${
                          isCompleted ? 'text-green-600 font-medium' : 
                          isCurrent ? 'text-primary-600 font-medium' : 
                          'text-gray-500'
                        }`}>
                          {isCurrent && loadingStep !== step ? loadingStep : step}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
         {showAuthModal && <AuthModal />}
      
      {/* Bolt.new Badge */}
      <BoltBadge />
      
    
    
   
    </div>
  );
}

export default App;

