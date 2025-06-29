import React, { useRef, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import LandingPage from './LandingPage';
import ResultsPage from './ResultsPage';

interface MainScrollerProps {
  setNavSource: React.Dispatch<React.SetStateAction<"button" | "input" | null>>;
}

const MainScroller: React.FC<MainScrollerProps> = ({ setNavSource }) => {
  const { currentView, weatherData, cocktailData, isLoading } = useAppStore();
  const { isAuthenticated } = useAuthStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const landingSectionRef = useRef<HTMLDivElement>(null);
  const resultsSectionRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to results when data is fully loaded
  useEffect(() => {
    if (weatherData && cocktailData && !isLoading && scrollContainerRef.current) {
      // Small delay to ensure content is fully rendered
      const scrollTimeout = setTimeout(() => {
        if (scrollContainerRef.current) {
          // Scroll by 60vh to bring results to top of screen
          scrollContainerRef.current.scrollTo({
            top: window.innerHeight * 0.6,
            behavior: 'smooth',
          });
        }
      }, 100);

      return () => clearTimeout(scrollTimeout);
    }
  }, [weatherData, cocktailData, isLoading]);

  // Reset scroll to landing when app resets
  useEffect(() => {
    if (currentView === 'main' && !weatherData && !cocktailData && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  }, [currentView, weatherData, cocktailData]);

  // Scroll lock to prevent manual scrolling back to landing when results are loaded
  useEffect(() => {
    const handleScroll = () => {
      if (!scrollContainerRef.current) return;
      
      const container = scrollContainerRef.current;
      const scrollTop = container.scrollTop;
      const lockPosition = window.innerHeight * 0.6; // 60vh
      
      // If we have results data and loading is complete
      if (weatherData && cocktailData && !isLoading) {
        // Prevent scrolling back above the results section (below 60vh)
        if (scrollTop < lockPosition) {
          container.scrollTo({
            top: lockPosition,
            behavior: 'auto',
          });
        }
      }
      // Note: Removed the else block to allow free scrolling when no results are loaded
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: false });
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [weatherData, cocktailData, isLoading]);

  return (
    <div 
      ref={scrollContainerRef}
      className="h-full overflow-y-auto"
      style={{ scrollBehavior: 'smooth' }}
    >
      {/* Landing Section - 60% of viewport height */}
      <div ref={landingSectionRef} className="h-[60vh]">
        <LandingPage setNavSource={setNavSource} />
      </div>
      
      {/* Results Section - Always visible, starts immediately after landing */}
      <div 
        ref={resultsSectionRef}
        className={`${
          isAuthenticated ? 'min-h-screen' : 'h-screen'
        }`}
        style={{ backgroundColor: '#819077' }}
      >
        <ResultsPage />
      </div>
    </div>
  );
};

export default MainScroller;