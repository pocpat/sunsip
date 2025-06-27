import { useEffect, useRef, useState } from "react";
import { useAppStore } from "./store/appStore";
import Header from "./components/Header";
import LandingPage from "./components/LandingPage";
import ResultsPage from "./components/ResultsPage";
import AuthModal from "./components/auth/AuthModal";
import UserDashboard from "./components/UserDashboard";
import BoltBadge from "./components/BoltBadge";
import { useAuthStore } from "./store/authStore";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle } from "lucide-react";

function App() {
  const {
    isLoading,
    currentView,
    showAuthModal,
    loadingStep,
    transitionDirection,
  } = useAppStore();
  const { isAuthenticated } = useAuthStore();
  const [navSource, setNavSource] = useState<"button" | "input" | null>(null);

  // Track previous view
  const prevView = useRef<string | null>(null);
  useEffect(() => {
    prevView.current = currentView;
  }, [currentView]);

  useEffect(() => {
    document.body.classList.add("transitioning");
    return () => {
      document.body.classList.remove("transitioning");
    };
  }, [currentView, transitionDirection]);

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

  // Function to check if a step is completed
  const isStepCompleted = (step: string) => {
    const currentStepIndex = loadingSteps.findIndex(
      (s) => loadingStep.includes(s.split("…")[0]) || loadingStep.includes(s)
    );
    const stepIndex = loadingSteps.findIndex((s) => s === step);
    return currentStepIndex > stepIndex;
  };

  // Function to check if a step is current
  const isCurrentStep = (step: string) => {
    return (
      loadingStep.includes(step.split("…")[0]) || loadingStep.includes(step)
    );
  };

  // Define the transition properties
  const pageTransition = {
    duration: 0.7,
    ease: "easeInOut",
  };

  const getSearchExitY = () => {
    if (navSource === "button") return "100%"; // Exit down if button
    if (navSource === "input") return "-100%"; // Exit up if input
    return "-100%"; // Default
  };

  const getDashboardInitialY = () => {
    if (navSource === "button") return "-100%"; // Enter from top if button
    if (navSource === "input") return "100%"; // Enter from bottom if input
    return "-100%"; // Default
  };

  // Calculate initialY and exitY based on transitionDirection
  // initialY is where the incoming page starts (e.g., "100%" for coming from bottom)
  const initialY = transitionDirection;

  // exitY is where the outgoing page goes (opposite of initialY for a "push" effect)
  const exitY = "100%"; // transitionDirection === '100%' ? '-100%' : '100%';

  return (
    <div className="min-h-screen">
      <Header setNavSource={setNavSource} />

      <main
        className="relative min-h-screen"
        style={{ backgroundColor: "#819077" }}
      >
        {/* Always render LandingPage as a normal block */}
        <div style={{ width: "100%", zIndex: 1, position: "relative" }}>
          <motion.div
            key={
              currentView === "search" ? "landing-visible" : "landing-hidden"
            }
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <LandingPage setNavSource={setNavSource} />
          </motion.div>
        </div>

        {/* Animate overlays above LandingPage */}
        <AnimatePresence mode="sync">
          {currentView === "dashboard" && isAuthenticated && (
            <motion.div
              key="dashboard"
              initial={{ y: "-100%" }}
              animate={{ y: 0 }}
              exit={{ y: "-100%" }}
              transition={pageTransition}
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                top: 0,
                left: 0,
                overflow: "hidden",
                zIndex: 2,
              }}
            >
              <UserDashboard />
            </motion.div>
          )}

          {currentView === "result" && (
            <motion.div
              key="result"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }} // This will animate the Result page down on exit
              transition={pageTransition}
              style={{
                position: "absolute",
                width: "100%",
                height: "100%",
                top: 0,
                left: 0,
                overflow: "hidden",
                zIndex: 3,
              }}
            >
              <ResultsPage />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Your Loading Overlay, AuthModal, and Badge JSX remain the same */}
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

              <div className="text-center">
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
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showAuthModal && <AuthModal />}
      <BoltBadge />
    </div>
  );
}

export default App;
