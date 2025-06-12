import React from 'react';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import { Sunset, User, LogOut, BarChart3 } from 'lucide-react';

const Header: React.FC = () => {
  const { resetApp, setShowAuthModal, currentView, setCurrentView } = useAppStore();
  const { isAuthenticated, logout } = useAuthStore();

  const handleReset = () => {
    resetApp();
  };

  const handleAuthClick = () => {
    if (isAuthenticated) {
      logout();
    } else {
      setShowAuthModal(true);
    }
  };

  const handleDashboardClick = () => {
    setCurrentView('dashboard');
  };

  return (
    <header className="bg-gradient-to-r from-primary-600 to-primary-800 text-white shadow-md">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2 cursor-pointer" onClick={handleReset}>
          <Sunset size={28} className="text-accent-300" />
          <h1 className="text-2xl font-display font-bold">SunSip</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          {currentView === 'result' && (
            <button 
              onClick={handleReset}
              className="btn-outline text-white border-white/30 hover:bg-white/10"
            >
              New Search
            </button>
          )}

          {currentView === 'dashboard' && (
            <button 
              onClick={handleReset}
              className="btn-outline text-white border-white/30 hover:bg-white/10"
            >
              New Search
            </button>
          )}

          {currentView === 'search' && isAuthenticated && (
            <button 
              onClick={handleDashboardClick}
              className="flex items-center space-x-1 btn-outline text-white border-white/30 hover:bg-white/10"
            >
              <BarChart3 size={18} />
              <span>Dashboard</span>
            </button>
          )}
          
          <button 
            onClick={handleAuthClick}
            className="flex items-center space-x-1 btn-outline text-white border-white/30 hover:bg-white/10"
          >
            {isAuthenticated ? (
              <>
                <LogOut size={18} />
                <span>Sign Out</span>
              </>
            ) : (
              <>
                <User size={18} />
                <span>Sign In</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;