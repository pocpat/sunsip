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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleClose = () => {
    setShowAuthModal(false);
  };

  const getErrorMessage = (error: any): string => {
    const errorMessage = error?.message || '';
    
    // Handle specific Supabase auth errors with user-friendly messages
    if (errorMessage.includes('Invalid login credentials')) {
      return 'The email or password you entered is incorrect. Please check your credentials and try again.';
    }
    
    if (errorMessage.includes('Email not confirmed')) {
      return 'Please check your email and click the confirmation link before signing in.';
    }
    
    if (errorMessage.includes('User not found')) {
      return 'No account found with this email address. Please sign up first or check your email.';
    }
    
    if (errorMessage.includes('Password should be at least')) {
      return 'Password must be at least 6 characters long.';
    }
    
    if (errorMessage.includes('Unable to validate email address')) {
      return 'Please enter a valid email address.';
    }
    
    if (errorMessage.includes('User already registered')) {
      return 'An account with this email already exists. Please sign in instead.';
    }
    
    if (errorMessage.includes('Signup is disabled')) {
      return 'Account registration is currently disabled. Please contact support.';
    }
    
    // Default fallback for other errors
    return errorMessage || 'An unexpected error occurred. Please try again.';
  };

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        throw error;
      }
      
      setSuccessMessage('Successfully signed in!');
      setTimeout(() => {
        handleClose();
      }, 1000);
    } catch (error: any) {
      setError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        throw error;
      }
      
      setSuccessMessage('Account created successfully! You can now sign in.');
      setView('login');
    } catch (error: any) {
      setError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/50">
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
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              <div className="font-medium mb-1">Authentication Error</div>
              <div>{error}</div>
            </div>
          )}
          
          {successMessage && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm">
              <div className="font-medium">{successMessage}</div>
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
                onClick={() => {
                  setView(view === 'login' ? 'signup' : 'login');
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="ml-1 text-primary-600 hover:text-primary-800 font-medium"
              >
                {view === 'login' ? 'Sign up' : 'Log in'}
              </button>
            </p>
          </div>
          
          {view === 'login' && (
            <div className="mt-4 text-center">
              <p className="text-xs text-gray-500">
                Having trouble signing in? Make sure you're using the correct email and password.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AuthModal;