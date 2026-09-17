import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { forgotPassword, resetPassword } from '../../lib/api';
import { X, Eye, EyeOff, Mail, Lock, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Standard auth flows (like the big-company forms): Sign in / Sign up /
// Forgot password / Set new password. Minimum clicks: Enter submits, links
// switch views, reset link signs the user straight in.

type AuthView = 'login' | 'signup' | 'forgot' | 'reset';

interface AuthModalProps {
  initialView?: AuthView;
}

const AuthModal: React.FC<AuthModalProps> = () => {
  const { setShowAuthModal } = useAppStore();
  const { setUser } = useAuthStore();
  const [view, setView] = useState<AuthView>(() =>
    typeof window !== 'undefined' && window.location.hash.includes('#reset-token=') ? 'reset' : 'login'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [demoResetUrl, setDemoResetUrl] = useState<string | null>(null);
  const [resetDone, setResetDone] = useState(false);
  // A password-reset link opens the app as .../#reset-token=<token>
  const [resetToken, setResetToken] = useState<string | null>(null);

  // Detect a reset link on mount (and support the user pasting a fresh link
  // into the same tab without a reload race).
  useEffect(() => {
    const readToken = () => {
      const hash = window.location.hash || '';
      const match = hash.match(/#reset-token=([A-Za-z0-9]+)/);
      if (match) {
        setResetToken(match[1]);
        setView('reset');
        // Clean the URL so refresh/back doesn't resurrect the token view.
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    };
    readToken();
    window.addEventListener('hashchange', readToken);
    return () => window.removeEventListener('hashchange', readToken);
  }, []);

  const handleClose = () => {
    setShowAuthModal(false);
  };

  const switchView = (next: AuthView) => {
    setView(next);
    setError(null);
    setSuccessMessage(null);
    setDemoResetUrl(null);
  };

  const getErrorMessage = (error: any): string => {
    const errorMessage = error?.message || '';

    if (errorMessage.includes('Invalid email or password')) {
      return 'The email or password you entered is incorrect. Please check your credentials and try again.';
    }

    if (errorMessage.includes('A user with this email already exists')) {
      return 'An account with this email already exists. Please sign in instead.';
    }

    if (errorMessage.includes('at least 6 characters')) {
      return 'Password must be at least 6 characters long.';
    }

    if (errorMessage.includes('reset link is invalid')) {
      return 'This reset link has expired or was already used. Please request a new one.';
    }

    // Default fallback for other errors
    return errorMessage || 'An unexpected error occurred. Please try again.';
  };

  // ------------------------------------------------------------------ Login
  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { signIn } = await import('../../lib/api');
      const { user, error } = await signIn(email, password);

      if (error) {
        throw error;
      }

      if (user) {
        setUser({ id: user.id, email: user.email });
      }
      setSuccessMessage('Welcome back!');
      setTimeout(() => {
        handleClose();
      }, 800);
    } catch (error: any) {
      setError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------------------------------------------------------- Signup
  const handleSignup = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { signUp } = await import('../../lib/api');
      const { user, error } = await signUp(email, password);

      if (error) {
        throw error;
      }

      // Sign straight in after signup (JWT cookie is already set by the API).
      if (user) {
        setUser({ id: user.id, email: user.email });
      }
      setSuccessMessage('Account created — welcome to SunSip!');
      setTimeout(() => {
        handleClose();
      }, 800);
    } catch (error: any) {
      setError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------- Forgot
  const handleForgot = async (email: string) => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    setDemoResetUrl(null);

    try {
      const result = await forgotPassword(email);
      setSuccessMessage(result.message);
      if (result.resetUrl) {
        setDemoResetUrl(result.resetUrl);
      }
    } catch (error: any) {
      setError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  // ----------------------------------------------------------------- Reset
  const handleReset = async (password: string) => {
    if (!resetToken) return;
    setIsLoading(true);
    setError(null);

    try {
      const { user, error } = await resetPassword(resetToken, password);
      if (error) {
        throw error;
      }
      if (user) {
        setUser({ id: user.id, email: user.email });
      }
      setResetDone(true);
      setTimeout(() => {
        handleClose();
      }, 1200);
    } catch (error: any) {
      setError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/50 p-4">
      <motion.div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md relative overflow-hidden"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.25 }}
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className="p-8">
          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center">
              {view === 'forgot' || view === 'reset' ? (
                <Lock size={22} className="text-primary-600" />
              ) : (
                <Mail size={22} className="text-primary-600" />
              )}
            </div>
          </div>

          <h2 className="text-2xl font-display font-bold text-center mb-1 text-gray-900">
            {view === 'login' && 'Welcome back'}
            {view === 'signup' && 'Create your account'}
            {view === 'forgot' && 'Reset your password'}
            {view === 'reset' && (resetDone ? 'Password updated' : 'Choose a new password')}
          </h2>
          <p className="text-sm text-gray-500 text-center mb-6">
            {view === 'login' && 'Sign in to save your favorite city-cocktail pairs.'}
            {view === 'signup' && 'Save combinations across visits — it takes 20 seconds.'}
            {view === 'forgot' && 'Enter your email and we\u2019ll send you a reset link.'}
            {view === 'reset' && (resetDone ? 'You\u2019re signed in with your new password.' : 'Pick something at least 6 characters long.')}
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm" role="alert">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm" role="status">
              <div className="flex items-start gap-2">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                <div>
                  <div>{successMessage}</div>
                  {demoResetUrl && (
                    <a
                      href={demoResetUrl}
                      className="mt-2 inline-block text-primary-600 hover:text-primary-800 font-medium underline break-all"
                    >
                      Open your reset link
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
            >
              {view === 'login' && (
                <LoginForm
                  onSubmit={handleLogin}
                  isLoading={isLoading}
                  onForgotPassword={() => switchView('forgot')}
                  onSwitchToSignup={() => switchView('signup')}
                />
              )}
              {view === 'signup' && (
                <SignupForm
                  onSubmit={handleSignup}
                  isLoading={isLoading}
                  onSwitchToLogin={() => switchView('login')}
                />
              )}
              {view === 'forgot' && (
                <ForgotForm onSubmit={handleForgot} isLoading={isLoading} onBackToLogin={() => switchView('login')} />
              )}
              {view === 'reset' && !resetDone && (
                <ResetForm onSubmit={handleReset} isLoading={isLoading} />
              )}
            </motion.div>
          </AnimatePresence>

          {view === 'login' && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?
                <button
                  onClick={() => switchView('signup')}
                  className="ml-1 text-primary-600 hover:text-primary-800 font-medium"
                >
                  Sign up
                </button>
              </p>
            </div>
          )}

          {view === 'signup' && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?
                <button
                  onClick={() => switchView('login')}
                  className="ml-1 text-primary-600 hover:text-primary-800 font-medium"
                >
                  Log in
                </button>
              </p>
            </div>
          )}

          {view === 'forgot' && (
            <div className="mt-6 text-center">
              <button
                onClick={() => switchView('login')}
                className="text-sm text-primary-600 hover:text-primary-800 font-medium"
              >
                Back to sign in
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// ===========================================================================
// Inline forms (kept inside AuthModal for a single-file standard flow)
// ===========================================================================

interface LoginFormProps {
  onSubmit: (email: string, password: string) => void;
  isLoading: boolean;
  onForgotPassword: () => void;
  onSwitchToSignup: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSubmit, isLoading, onForgotPassword }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    onSubmit(email.trim().toLowerCase(), password);
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="mb-4">
        <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          autoFocus
          className="input"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="login-password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-xs text-primary-600 hover:text-primary-800 font-medium"
          >
            Forgot password?
          </button>
        </div>
        <div className="relative">
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            className="input pr-10"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading || !email.trim() || !password}
        className="w-full btn-primary mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            Signing in...
          </span>
        ) : (
          'Sign in'
        )}
      </button>
    </form>
  );
};

interface SignupFormProps {
  onSubmit: (email: string, password: string) => void;
  isLoading: boolean;
  onSwitchToLogin: () => void;
}

const SignupForm: React.FC<SignupFormProps> = ({ onSubmit, isLoading }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }
    onSubmit(email.trim().toLowerCase(), password);
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="mb-4">
        <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          id="signup-email"
          type="email"
          autoComplete="email"
          autoFocus
          className="input"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="mb-4">
        <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>
        <div className="relative">
          <input
            id="signup-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            className="input pr-10"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <div className="mb-2">
        <label htmlFor="signup-confirm" className="block text-sm font-medium text-gray-700 mb-1">
          Confirm password
        </label>
        <div className="relative">
          <input
            id="signup-confirm"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            className="input pr-10"
            placeholder="Repeat your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {localError && <p className="mt-1 text-sm text-red-600">{localError}</p>}
      </div>

      <button
        type="submit"
        disabled={isLoading || !email.trim() || password.length < 6 || password !== confirmPassword}
        className="w-full btn-primary mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            Creating account...
          </span>
        ) : (
          'Create account'
        )}
      </button>
    </form>
  );
};

interface ForgotFormProps {
  onSubmit: (email: string) => void;
  isLoading: boolean;
  onBackToLogin: () => void;
}

const ForgotForm: React.FC<ForgotFormProps> = ({ onSubmit, isLoading }) => {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    onSubmit(email.trim().toLowerCase());
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="mb-4">
        <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          id="forgot-email"
          type="email"
          autoComplete="email"
          autoFocus
          className="input"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading || !email.trim()}
        className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            Sending link...
          </span>
        ) : (
          'Send reset link'
        )}
      </button>
    </form>
  );
};

interface ResetFormProps {
  onSubmit: (password: string) => void;
  isLoading: boolean;
}

const ResetForm: React.FC<ResetFormProps> = ({ onSubmit, isLoading }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }
    setLocalError(null);
    onSubmit(password);
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Hidden username field: password-manager + a11y best practice for
          password-reset forms (silences the browser's form warning). */}
      <input type="text" name="username" autoComplete="username" hidden aria-hidden="true" tabIndex={-1} />
      <div className="mb-4">
        <label htmlFor="reset-password" className="block text-sm font-medium text-gray-700 mb-1">
          New password
        </label>
        <div className="relative">
          <input
            id="reset-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            autoFocus
            className="input pr-10"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <div className="mb-2">
        <label htmlFor="reset-confirm" className="block text-sm font-medium text-gray-700 mb-1">
          Confirm new password
        </label>
        <div className="relative">
          <input
            id="reset-confirm"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            className="input pr-10"
            placeholder="Repeat your new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {localError && <p className="mt-1 text-sm text-red-600">{localError}</p>}
      </div>

      <button
        type="submit"
        disabled={isLoading || password.length < 6 || password !== confirmPassword}
        className="w-full btn-primary mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            Updating password...
          </span>
        ) : (
          'Update password'
        )}
      </button>
    </form>
  );
};

export default AuthModal;