import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import { 
  Sunset, MoreVertical, BarChart3, User, LogOut, CloudOff, Cloud, House as HouseIcon,
  Shield, ShieldAlert, ShieldCheck, Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HeaderProps {
  setNavSource: React.Dispatch<React.SetStateAction<"button" | "input" | null>>;
}

const Header: React.FC<HeaderProps> = ({ setNavSource }) => {
  const { 
    resetApp, 
    setCurrentView, 
    setShowAuthModal, 
    currentView, 
    isPortfolioMode, 
    setIsPortfolioMode,
    weatherData,
    cocktailData
  } = useAppStore();
  
  const { 
    isAuthenticated, 
    logout, 
    user, 
    isAdmin, 
    setIsAdmin,
    globalRequestsEnabled,
    setGlobalRequestsEnabled
  } = useAuthStore();
  
  const [showMenu, setShowMenu] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const adminMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
      if (adminMenuRef.current && !adminMenuRef.current.contains(event.target as Node)) {
        setShowAdminMenu(false);
      }
    };
    
    if (showMenu || showAdminMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu, showAdminMenu]);

  const handleDashboardClick = () => {
    setCurrentView('dashboard');
    setShowMenu(false);
  };

  const handleStartOver = () => {
    resetApp();
  };
  
  const handleReset = () => {
    resetApp();
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

  const handleToggleAdmin = () => {
    setIsAdmin(!isAdmin);
    setShowMenu(false);
  };

  const handleToggleGlobalRequests = () => {
    setGlobalRequestsEnabled();
    setShowAdminMenu(false);
  };

  // Show start over button if we have results data
  const showStartOverButton = weatherData && cocktailData;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 p-4 sm:p-6 bg-transparent">
      <div className="container mx-auto px-2 sm:px-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2 sm:space-x-3 cursor-pointer" onClick={handleReset}>
            <Sunset size={24} className="text-accent-300 sm:w-7 sm:h-7" />
            <h1 className="text-xl sm:text-2xl font-display font-bold text-white">SunSip</h1>
            {isPortfolioMode && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.8 }} 
                transition={{ duration: 0.2 }} 
                className="flex items-center" 
                title="Portfolio Mode - Using mock data"
              >
                <CloudOff size={16} className="text-white/70 sm:w-5 sm:h-5" />
              </motion.div>
            )}
            {isAdmin && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.8 }} 
                transition={{ duration: 0.2 }} 
                className="flex items-center" 
                title="Admin Mode - Unlimited requests"
              >
                <Shield size={16} className="text-yellow-300 sm:w-5 sm:h-5" />
              </motion.div>
            )}
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-3">
            {showStartOverButton && (
              <motion.button 
                initial={{ opacity: 0, scale: 0.8 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.8 }} 
                transition={{ duration: 0.2 }} 
                onClick={handleStartOver} 
                className="p-2 rounded-full hover:bg-white/10 transition-colors" 
                title="Start Over"
              >
                <HouseIcon size={18} className="text-white sm:w-5 sm:h-5" />
              </motion.button>
            )}
            
            {/* Admin Settings Button - Only visible when isAdmin is true */}
            {isAdmin && (
              <div className="relative" ref={adminMenuRef}>
                <button 
                  onClick={() => setShowAdminMenu(!showAdminMenu)} 
                  className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                  title="Admin Settings"
                >
                  <Settings size={20} className="text-yellow-300 sm:w-6 sm:h-6" />
                </button>
                
                <AnimatePresence>
                  {showAdminMenu && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95, y: -10 }} 
                      animate={{ opacity: 1, scale: 1, y: 0 }} 
                      exit={{ opacity: 0, scale: 0.95, y: -10 }} 
                      transition={{ duration: 0.2 }} 
                      className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
                    >
                      <div className="px-4 py-2 border-b border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-700">Admin Controls</h3>
                      </div>
                      
                      <button 
                        onClick={handleToggleGlobalRequests} 
                        className="w-full flex items-center justify-between px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors text-sm"
                      >
                        <div className="flex items-center space-x-2">
                          {globalRequestsEnabled ? (
                            <ShieldCheck size={16} className="text-green-500" />
                          ) : (
                            <ShieldAlert size={16} className="text-red-500" />
                          )}
                          <span>Global Requests</span>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          globalRequestsEnabled 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {globalRequestsEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            
            <div className="relative" ref={menuRef}>
              <button 
                onClick={() => setShowMenu(!showMenu)} 
                className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
              >
                <MoreVertical size={20} className="sm:w-6 sm:h-6" />
              </button>
              
              <AnimatePresence>
                {showMenu && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: -10 }} 
                    animate={{ opacity: 1, scale: 1, y: 0 }} 
                    exit={{ opacity: 0, scale: 0.95, y: -10 }} 
                    transition={{ duration: 0.2 }} 
                    className="absolute right-0 mt-2 w-48 sm:w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
                  >
                    {isAuthenticated && (
                      <button 
                        onClick={handleDashboardClick} 
                        className="w-full flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors text-sm sm:text-base"
                      >
                        <BarChart3 size={16} className="sm:w-[18px] sm:h-[18px]" />
                        <span>Dashboard</span>
                      </button>
                    )}
                    <button 
                      onClick={handleTogglePortfolioMode} 
                      className="w-full flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors text-sm sm:text-base"
                    >
                      {isPortfolioMode ? (
                        <>
                          <Cloud size={16} className="sm:w-[18px] sm:h-[18px]" />
                          <span>Live Mode</span>
                        </>
                      ) : (
                        <>
                          <CloudOff size={16} className="sm:w-[18px] sm:h-[18px]" />
                          <span>Demo Mode</span>
                        </>
                      )}
                    </button>
                    <button 
                      onClick={handleAuthClick} 
                      className="w-full flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors text-sm sm:text-base"
                    >
                      {isAuthenticated ? (
                        <>
                          <LogOut size={16} className="sm:w-[18px] sm:h-[18px]" />
                          <span>Sign Out</span>
                        </>
                      ) : (
                        <>
                          <User size={16} className="sm:w-[18px] sm:h-[18px]" />
                          <span>Sign In</span>
                        </>
                      )}
                    </button>
                    
                    {/* Admin toggle - only visible for specific users */}
                    {isAuthenticated && user?.email === 'admin@sunsip.com' && (
                      <button 
                        onClick={handleToggleAdmin} 
                        className="w-full flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors text-sm sm:text-base"
                      >
                        <Shield size={16} className={`sm:w-[18px] sm:h-[18px] ${isAdmin ? 'text-yellow-500' : 'text-gray-400'}`} />
                        <span>{isAdmin ? 'Disable Admin Mode' : 'Enable Admin Mode'}</span>
                      </button>
                    )}
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