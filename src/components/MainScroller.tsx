import React, { useRef, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import LandingPage from './LandingPage';
import ResultsPage from './ResultsPage';

interface MainScrollerProps {
  setNavSource: React.Dispatch<React.SetStateAction<"button" | "input" | null>>;
}

const MainScroller: React.FC<MainScrollerProps> = ({ setNavSource }) => {
  const { weatherData, cocktailData, isLoading, currentView, isResetting, setIsResetting } = useAppStore();
  const { isAuthenticated } = useAuthStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to results when data is fully loaded
  useEffect(() => {
    if (weatherData && cocktailData && !isLoading && scrollContainerRef.current) {
      // Small delay to ensure content is fully rendered
      const scrollTimeout = setTimeout(() => {
        if (scrollContainerRef.current) {
          // Scroll to 75vh to bring results to top of screen
          scrollContainerRef.current.scrollTo({
            top: window.innerHeight * 0.75,
            behavior: 'smooth',
          });
        }
      }, 100);

      return () => clearTimeout(scrollTimeout);
    }
  }, [weatherData, cocktailData, isLoading]);

  // Reset scroll to landing when app resets - ensure it goes to the EXACT initial position
  useEffect(() => {
    if (currentView === 'main' && !weatherData && !cocktailData && scrollContainerRef.current) {
      // Reset to position 0 (top of landing page) - this is the initial position
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth',
      });

      // If this is a reset operation, set a timeout to clear the resetting flag
      // This allows the scroll animation to complete before potentially re-applying overflow-hidden
      if (isResetting) {
        setTimeout(() => {
          setIsResetting(false);
        }, 1000); // Increased from 500ms to 1000ms to give more time for smooth scroll animation
      }
    }
  }, [currentView, weatherData, cocktailData, isResetting, setIsResetting]);

  // Scroll lock to prevent unwanted scrolling - DISABLED during reset operations
  useEffect(() => {
    // Completely disable scroll lock during reset operations
    if (isResetting) {
      return;
    }

    const handleScroll = () => {
      if (!scrollContainerRef.current) return;
      
      const container = scrollContainerRef.current;
      const scrollTop = container.scrollTop;
      const previewLimit = window.innerHeight * 0.25; // 25vh
      const resultsLockPosition = window.innerHeight * 0.75; // 75vh
      
      // If we have results data and loading is complete
      if (weatherData && cocktailData && !isLoading) {
        // Prevent scrolling back above the results section (below 75vh)
        if (scrollTop < resultsLockPosition) {
          container.scrollTo({
            top: resultsLockPosition,
            behavior: 'auto',
          });
        }
      } else {
        // If no results data, prevent scrolling past the preview area (25vh)
        if (scrollTop > previewLimit) {
          container.scrollTo({
            top: previewLimit,
            behavior: 'auto',
          });
        }
      }
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: false });
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [weatherData, cocktailData, isLoading, isResetting]); // Added isResetting to dependencies

  // Determine if results should be visible and scrolling enabled
  const resultsReady = weatherData && cocktailData && !isLoading;
  
  // During reset, ensure container is scrollable so scrollTo(0) works properly
  const shouldBeScrollable = resultsReady || isResetting;

  return (
    <div 
      ref={scrollContainerRef}
      className={`h-full custom-scrollbar ${shouldBeScrollable ? 'overflow-y-scroll' : 'overflow-hidden'}`}
      style={{ scrollBehavior: 'smooth' }}
    >
      {/* Landing Section - 75vh - This is the initial view */}
      <div className="h-[75vh]">
        <LandingPage setNavSource={setNavSource} />
      </div>
      
      {/* Results Section - Dynamic height based on data availability */}
      <div 
        className={resultsReady ? 'min-h-screen' : 'h-[25vh]'}
        style={{ backgroundColor: '#819077' }}
      >
        <ResultsPage />
      </div>
    </div>
  );
};

export default MainScroller;