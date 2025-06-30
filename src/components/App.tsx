import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../store/appStore";
import Header from "./Header";
import MainScroller from "./MainScroller";
import AuthModal from "./auth/AuthModal";
import UserDashboard from "./UserDashboard";
import BoltBadge from "./BoltBadge";
import { useAuthStore } from "../store/authStore";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, AlertCircle } from "lucide-react";
import Footer from "./Footer";

function App() {
  const {
    isLoading,
    currentView,
    showAuthModal,
    loadingStep,
    dailyLimitReached,
    dailyRequestMessage
  } = useAppStore();
  const { isAuthenticated } = useAuthStore();
  const [navSource, setNavSource] = useState<"button" | "input" | null>(null);

  // Preload images for better UX
  useEffect(() => {
    const preloadImages = async () => {
      const imagesToPreload = [
        "/images/room-day.png",
        "/images/room-night.png",
        "/images/table.png",
        "/images/loadingPrev10.png",
      ];

      imagesToPreload.forEach((src) => {
        const img = new Image();
        img.src = src;
      });
    };

    preloadImages();
  }, []);

  // Define all loading steps in order
  const loadingSteps = [
    "Finding your city…",
    "Checking the weather",
    "Looking outside... Is it sunny or rainy?",
    "Country drink preferences",
    "Selecting mood",
    "Painting a picture",
    "Mixing your perfect cocktail…",
    "Almost there... Adding the final touches!",
  ];

  // Calculate progress percentage
  const getCurrentStepIndex = () => {
    return loadingSteps.findIndex(
      (s) => loadingStep.includes(s.split("…")[0]) || loadingStep.includes(s)
    );
  };

  const progressPercentage = isLoading 
    ? Math.max(0, Math.min(100, ((getCurrentStepIndex() + 1) / loadingSteps.length) * 100))
    : 0;

  // Function to check if a step is completed
  const isStepCompleted = (step: string) => {
    const currentStepIndex = getCurrentStepIndex();
    const stepIndex = loadingSteps.findIndex((s) => s === step);
    return currentStepIndex > stepIndex;
  };

  // Function to check if a step is current
  const isCurrentStep = (step: string) => {
    return (
      loadingStep.includes(step.split("…")[0]) || loadingStep.includes(step)
    );
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col">
      <Header setNavSource={setNavSource} />

      {/* Main Scrolling Container - Takes remaining height, exactly 100vh total */}
      <div className="flex-1 overflow-hidden relative">
        {/* Main Content - Constrained to exactly 100vh */}
        <div className="h-full overflow-hidden">
          <MainScroller setNavSource={setNavSource} />
        </div>
        
        {/* Dashboard Blur Overlay - positioned to cover all content including Room component */}
        <AnimatePresence>
          {currentView === 'dashboard' && isAuthenticated && (
            <motion.div
              className="absolute inset-0 z-40 bg-black/30 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Footer - Always at bottom */}
      <Footer />

      {/* Dashboard Modal - Above the blur overlay */}
      <AnimatePresence>
        {currentView === 'dashboard' && isAuthenticated && (
          <motion.div
            className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4"
            initial={{ y: "-100%" }}
            animate={{ y: 0 }}
            exit={{ y: "-100%" }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <div className="w-full max-w-7xl max-h-[90vh] relative">
              <UserDashboard />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Overlay */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: "rgba(129, 144, 119, 0.85)" }}
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
              <div className="relative">
                <div className="w-12 h-12 border-4 border-gray-200 rounded-full"></div>
                <div className="absolute top-0 left-0 w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              </div>

              <div className="text-center w-full">
                <h3 className="text-lg font-display font-semibold text-gray-800 mb-4">
                  Creating your SunSip experience
                </h3>

                <div className="space-y-3 text-left">
                  {loadingSteps.map((step, index) => {
                    const isCompleted = isStepCompleted(step);
                    const isCurrent = isCurrentStep(step);

                    return (
                      <motion.div
                        key={index}
                        className={`flex items-center space-x-3 transition-all duration-300 ${
                          isCompleted || isCurrent
                            ? "opacity-100"
                            : "opacity-40"
                        }`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{
                          opacity: isCompleted || isCurrent ? 1 : 0.4,
                          x: 0,
                        }}
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
                        <span
                          className={`text-sm ${
                            isCompleted
                              ? "text-green-600 font-medium"
                              : isCurrent
                              ? "text-primary-600 font-medium"
                              : "text-gray-500"
                          }`}
                        >
                          {isCurrent && loadingStep !== step
                            ? loadingStep
                            : step}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Visual Progress Bar */}
                <div className="mt-6 w-full">
                  <div className="flex justify-between text-xs text-gray-500 mb-2">
                    <span>Progress</span>
                    <span>{Math.round(progressPercentage)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <motion.div
                      className="bg-primary-500 h-full rounded-full"
                      initial={{ width: '0%' }}
                      animate={{ width: `${progressPercentage}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Daily Limit Reached Toast */}
      <AnimatePresence>
        {dailyLimitReached && (
          <motion.div
            className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-white rounded-lg shadow-xl p-4 max-w-md w-full mx-4 border-l-4 border-red-500"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-start">
              <AlertCircle className="text-red-500 mr-3 mt-0.5 flex-shrink-0" size={20} />
              <div>
                <h3 className="font-medium text-gray-900">Daily Limit Reached</h3>
                <p className="text-sm text-gray-600 mt-1">{dailyRequestMessage}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showAuthModal && <AuthModal />}
      <BoltBadge />
    </div>
  );
}

export default App;