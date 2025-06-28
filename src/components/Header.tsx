// src/components/Header.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import { 
  Sunset, MoreVertical, BarChart3, User, LogOut, CloudOff, Cloud, House as HouseIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';




const Header: React.FC = () => { 
   
  const { 
    resetApp, 
    changeView, 
    setShowAuthModal, 
    currentView, 
    isPortfolioMode, 
    setIsPortfolioMode 
  } = useAppStore();
  
  const { isAuthenticated, logout } = useAuthStore();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  // THIS IS THE KEY FIX.
  // This function now ONLY calls changeView. It does not set the direction itself.
  // The store will look up 'search-dashboard' and correctly set the direction to DOWN ("-100%").
  const handleDashboardClick = () => {
 
    changeView('dashboard');
    setShowMenu(false);
  };

  const handleStartOver = () => {
    resetApp(); // Relies on the store to set the correct direction.
  };
  
  const handleReset = () => {
    resetApp(); // Relies on the store to set the correct direction.
    setShowMenu(false);
  };

  const handleAuthClick = () => {
    if (isAuthenticated) logout();
    else setShowAuthModal(true);
    setShowMenu(false);
  };

  const handleTogglePortfolioMode = () => {
    setIsPortfolioMode(!isPortfolioMode);
    setShowMenu(false);
  };

  return (
    <header className="absolute top-0 left-0 right-0 z-50 p-4 sm:p-6">
      <div className="container mx-auto px-2 sm:px-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2 sm:space-x-3 cursor-pointer" onClick={handleReset}>
            <Sunset size={24} className="text-accent-300 sm:w-7 sm:h-7" />
            <h1 className="text-xl sm:text-2xl font-display font-bold text-white">SunSip</h1>
            {isPortfolioMode && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.2 }} className="flex items-center" title="Portfolio Mode - Using mock data">
                <CloudOff size={16} className="text-white/70 sm:w-5 sm:h-5" />
              </motion.div>
            )}
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-3">
            {(currentView === 'result' || currentView === 'dashboard') && (
              <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.2 }} onClick={handleStartOver} className="p-2 rounded-full hover:bg-white/10 transition-colors" title="Start Over">
                <HouseIcon size={18} className="text-white sm:w-5 sm:h-5" />
              </motion.button>
            )}
            
            <div className="relative" ref={menuRef}>
              <button onClick={() => setShowMenu(!showMenu)} className="p-2 text-white hover:bg-white/10 rounded-full transition-colors">
                <MoreVertical size={20} className="sm:w-6 sm:h-6" />
              </button>
              
              <AnimatePresence>
                {showMenu && (
                  <motion.div initial={{ opacity: 0, scale: 0.95, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -10 }} transition={{ duration: 0.2 }} className="absolute right-0 mt-2 w-48 sm:w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                    {isAuthenticated && (
                      <button  onClick={handleDashboardClick} className="w-full flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors text-sm sm:text-base">
                        <BarChart3 size={16} className="sm:w-[18px] sm:h-[18px]" />
                        <span>Dashboard</span>
                      </button>
                    )}
                    <button onClick={handleTogglePortfolioMode} className="w-full flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors text-sm sm:text-base">
                      {isPortfolioMode ? (<><Cloud size={16} className="sm:w-[18px] sm:h-[18px]" /><span>Live Mode</span></>) : (<><CloudOff size={16} className="sm:w-[18px] sm:h-[18px]" /><span>Demo Mode</span></>)}
                    </button>
                    <button onClick={handleAuthClick} className="w-full flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors text-sm sm:text-base">
                      {isAuthenticated ? (<><LogOut size={16} className="sm:w-[18px] sm:h-[18px]" /><span>Sign Out</span></>) : (<><User size={16} className="sm:w-[18px] sm:h-[18px]" /><span>Sign In</span></>)}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
