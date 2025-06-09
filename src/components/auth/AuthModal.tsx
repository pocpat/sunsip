import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { supabase } from '../../lib/supabase';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';

const AuthModal: React.FC = () => {
  const { setShowAuthModal } = useAppStore();
  const [view, setView] = useState<'login' | 'signup'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setShowAuthModal(false);
  };

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        throw error;
      }
      
      handleClose();
    } catch (error: any) {
      setError(error.message || 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        throw error;
      }
      
      // Show success message and switch to login view
      setView('login');
    } catch (error: any) {
      setError(error.message || 'Failed to sign up');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <motion.div 
        className="bg-white rounded-lg shadow-xl w-full max-w-md relative overflow-hidden"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3 }}
      >
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <X size={20} />
        </button>
        
        <div className="p-8">
          <h2 className="text-2xl font-display font-bold text-center mb-6">
            {view === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}
          
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, x: view === 'login' ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: view === 'login' ? 20 : -20 }}
              transition={{ duration: 0.3 }}
            >
              {view === 'login' ? (
                <LoginForm onSubmit={handleLogin} isLoading={isLoading} />
              ) : (
                <SignupForm onSubmit={handleSignup} isLoading={isLoading} />
              )}
            </motion.div>
          </AnimatePresence>
          
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              {view === 'login' ? "Don't have an account?" : "Already have an account?"}
              <button
                onClick={() => setView(view === 'login' ? 'signup' : 'login')}
                className="ml-1 text-primary-600 hover:text-primary-800 font-medium"
              >
                {view === 'login' ? 'Sign up' : 'Log in'}
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthModal;