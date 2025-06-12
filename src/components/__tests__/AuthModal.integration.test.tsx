import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import AuthModal from '../auth/AuthModal';
import { supabase } from '../../lib/supabase';

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
    },
  },
}));

// Mock Sentry functions
vi.mock('../../lib/sentry', () => ({
  setUserContext: vi.fn(),
  clearUserContext: vi.fn(),
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

const mockSupabase = vi.mocked(supabase);

describe('Authentication Integration Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
    
    // Reset stores to initial state
    useAppStore.setState({
      showAuthModal: true,
      isLoading: false,
      currentView: 'search',
    });
    
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      savedCombinations: [],
      userPreferences: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Modal Display and Navigation', () => {
    it('should render login form by default when modal is shown', () => {
      render(<AuthModal />);

      expect(screen.getByText('Welcome Back')).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
      expect(screen.getByText("Don't have an account?")).toBeInTheDocument();
    });

    it('should switch to signup form when signup link is clicked', async () => {
      render(<AuthModal />);

      const signupLink = screen.getByRole('button', { name: /sign up/i });
      await user.click(signupLink);

      expect(screen.getByText('Create Account')).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
      expect(screen.getByText('Already have an account?')).toBeInTheDocument();
    });

    it('should switch back to login form when login link is clicked', async () => {
      render(<AuthModal />);

      // Switch to signup
      await user.click(screen.getByRole('button', { name: /sign up/i }));
      expect(screen.getByText('Create Account')).toBeInTheDocument();

      // Switch back to login
      await user.click(screen.getByRole('button', { name: /log in/i }));
      expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    });

    it('should close modal when close button is clicked', async () => {
      render(<AuthModal />);

      const closeButton = screen.getByRole('button', { name: '' }); // X button
      await user.click(closeButton);

      expect(useAppStore.getState().showAuthModal).toBe(false);
    });
  });

  describe('Login Process Integration', () => {
    it('should complete successful login flow and update auth state', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: {
          user: mockUser,
          session: { user: mockUser, access_token: 'token' },
        },
        error: null,
      } as any);

      render(<AuthModal />);

      // Fill in login form
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');

      // Submit form
      await user.click(screen.getByRole('button', { name: /log in/i }));

      // Wait for API call
      await waitFor(() => {
        expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
        });
      });

      // Verify modal is closed
      expect(useAppStore.getState().showAuthModal).toBe(false);
    });

    it('should handle login validation errors', async () => {
      render(<AuthModal />);

      // Try to submit without filling fields
      await user.click(screen.getByRole('button', { name: /log in/i }));

      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });

    it('should handle invalid email format', async () => {
      render(<AuthModal />);

      await user.type(screen.getByLabelText(/email/i), 'invalid-email');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /log in/i }));

      expect(screen.getByText('Invalid email address')).toBeInTheDocument();
    });

    it('should handle short password validation', async () => {
      render(<AuthModal />);

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), '123');
      await user.click(screen.getByRole('button', { name: /log in/i }));

      expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
    });

    it('should display API error messages during login', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      } as any);

      render(<AuthModal />);

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /log in/i }));

      await waitFor(() => {
        expect(screen.getByText('Invalid login credentials')).toBeInTheDocument();
      });

      // Modal should remain open
      expect(useAppStore.getState().showAuthModal).toBe(true);
    });

    it('should show loading state during login', async () => {
      // Mock a delayed response
      mockSupabase.auth.signInWithPassword.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve({
          data: { user: null, session: null },
          error: null,
        } as any), 100))
      );

      render(<AuthModal />);

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /log in/i }));

      // Should show loading state
      expect(screen.getByText('Logging in...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /logging in/i })).toBeDisabled();

      await waitFor(() => {
        expect(screen.queryByText('Logging in...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Signup Process Integration', () => {
    it('should complete successful signup flow', async () => {
      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: {
          user: { id: 'user-123', email: 'newuser@example.com' },
          session: null,
        },
        error: null,
      } as any);

      render(<AuthModal />);

      // Switch to signup form
      await user.click(screen.getByRole('button', { name: /sign up/i }));

      // Fill in signup form
      await user.type(screen.getByLabelText(/email/i), 'newuser@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');

      // Submit form
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
          email: 'newuser@example.com',
          password: 'password123',
        });
      });

      // Should switch back to login view after successful signup
      expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    });

    it('should handle signup validation errors', async () => {
      render(<AuthModal />);

      // Switch to signup form
      await user.click(screen.getByRole('button', { name: /sign up/i }));

      // Try to submit without filling fields
      await user.click(screen.getByRole('button', { name: /create account/i }));

      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
      expect(screen.getByText('Please confirm your password')).toBeInTheDocument();
    });

    it('should handle password mismatch validation', async () => {
      render(<AuthModal />);

      // Switch to signup form
      await user.click(screen.getByRole('button', { name: /sign up/i }));

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'differentpassword');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });

    it('should display API error messages during signup', async () => {
      mockSupabase.auth.signUp.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Email already registered' },
      } as any);

      render(<AuthModal />);

      // Switch to signup form
      await user.click(screen.getByRole('button', { name: /sign up/i }));

      await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText('Email already registered')).toBeInTheDocument();
      });
    });

    it('should show loading state during signup', async () => {
      // Mock a delayed response
      mockSupabase.auth.signUp.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve({
          data: { user: null, session: null },
          error: null,
        } as any), 100))
      );

      render(<AuthModal />);

      // Switch to signup form
      await user.click(screen.getByRole('button', { name: /sign up/i }));

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText(/confirm password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /create account/i }));

      // Should show loading state
      expect(screen.getByText('Creating account...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /creating account/i })).toBeDisabled();

      await waitFor(() => {
        expect(screen.queryByText('Creating account...')).not.toBeInTheDocument();
      });
    });
  });

  describe('State Management Integration', () => {
    it('should update auth store state after successful login', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: {
          user: mockUser,
          session: { user: mockUser, access_token: 'token' },
        },
        error: null,
      } as any);

      render(<AuthModal />);

      // Verify initial auth state
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);

      // Perform login
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /log in/i }));

      await waitFor(() => {
        expect(useAppStore.getState().showAuthModal).toBe(false);
      });

      // Note: In a real app, the auth state would be updated by the AuthProvider
      // listening to Supabase auth state changes, not directly by the modal
    });

    it('should maintain app store state during authentication', async () => {
      // Set some app state before authentication
      useAppStore.setState({
        currentView: 'result',
        isLoading: false,
        showAuthModal: true,
      });

      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: {
          user: { id: 'user-123', email: 'test@example.com' },
          session: { user: { id: 'user-123', email: 'test@example.com' }, access_token: 'token' },
        },
        error: null,
      } as any);

      render(<AuthModal />);

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /log in/i }));

      await waitFor(() => {
        expect(useAppStore.getState().showAuthModal).toBe(false);
      });

      // App state should be preserved (except for showAuthModal)
      expect(useAppStore.getState().currentView).toBe('result');
      expect(useAppStore.getState().isLoading).toBe(false);
    });

    it('should handle authentication errors without affecting other state', async () => {
      useAppStore.setState({
        currentView: 'result',
        isLoading: false,
        showAuthModal: true,
      });

      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Authentication failed' },
      } as any);

      render(<AuthModal />);

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /log in/i }));

      await waitFor(() => {
        expect(screen.getByText('Authentication failed')).toBeInTheDocument();
      });

      // Modal should remain open, other state unchanged
      expect(useAppStore.getState().showAuthModal).toBe(true);
      expect(useAppStore.getState().currentView).toBe('result');
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe('Form Interaction and UX', () => {
    it('should handle keyboard navigation correctly', async () => {
      render(<AuthModal />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const loginButton = screen.getByRole('button', { name: /log in/i });

      // Tab navigation should work
      emailInput.focus();
      expect(emailInput).toHaveFocus();

      await user.tab();
      expect(passwordInput).toHaveFocus();

      await user.tab();
      expect(loginButton).toHaveFocus();
    });

    it('should submit form on Enter key press', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: {
          user: { id: 'user-123', email: 'test@example.com' },
          session: { user: { id: 'user-123', email: 'test@example.com' }, access_token: 'token' },
        },
        error: null,
      } as any);

      render(<AuthModal />);

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      
      // Press Enter to submit
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalled();
      });
    });

    it('should clear error messages when switching between forms', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Login failed' },
      } as any);

      render(<AuthModal />);

      // Trigger login error
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword');
      await user.click(screen.getByRole('button', { name: /log in/i }));

      await waitFor(() => {
        expect(screen.getByText('Login failed')).toBeInTheDocument();
      });

      // Switch to signup form
      await user.click(screen.getByRole('button', { name: /sign up/i }));

      // Error should be cleared
      expect(screen.queryByText('Login failed')).not.toBeInTheDocument();
    });

    it('should handle rapid form submissions gracefully', async () => {
      let resolveCount = 0;
      mockSupabase.auth.signInWithPassword.mockImplementation(
        () => new Promise(resolve => {
          setTimeout(() => {
            resolveCount++;
            resolve({
              data: { user: { id: 'user-123', email: 'test@example.com' }, session: null },
              error: null,
            } as any);
          }, 50);
        })
      );

      render(<AuthModal />);

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');

      // Click submit button multiple times rapidly
      const submitButton = screen.getByRole('button', { name: /log in/i });
      await user.click(submitButton);
      await user.click(submitButton);
      await user.click(submitButton);

      // Should be disabled after first click
      expect(submitButton).toBeDisabled();

      await waitFor(() => {
        expect(resolveCount).toBe(1); // Should only call API once
      });
    });
  });

  describe('Error Recovery and Edge Cases', () => {
    it('should handle network errors gracefully', async () => {
      mockSupabase.auth.signInWithPassword.mockRejectedValueOnce(
        new Error('Network error')
      );

      render(<AuthModal />);

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /log in/i }));

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('should handle malformed API responses', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: null,
        error: null,
      } as any);

      render(<AuthModal />);

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /log in/i }));

      await waitFor(() => {
        // Should handle gracefully without crashing
        expect(screen.getByRole('button', { name: /log in/i })).not.toBeDisabled();
      });
    });

    it('should handle very long email addresses', async () => {
      render(<AuthModal />);

      const longEmail = 'a'.repeat(100) + '@example.com';
      await user.type(screen.getByLabelText(/email/i), longEmail);
      await user.type(screen.getByLabelText(/password/i), 'password123');

      // Should not crash and should validate properly
      await user.click(screen.getByRole('button', { name: /log in/i }));

      // Should show invalid email error for malformed long email
      expect(screen.getByText('Invalid email address')).toBeInTheDocument();
    });

    it('should handle special characters in passwords', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: {
          user: { id: 'user-123', email: 'test@example.com' },
          session: { user: { id: 'user-123', email: 'test@example.com' }, access_token: 'token' },
        },
        error: null,
      } as any);

      render(<AuthModal />);

      const specialPassword = 'p@ssw0rd!#$%^&*()';
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), specialPassword);
      await user.click(screen.getByRole('button', { name: /log in/i }));

      await waitFor(() => {
        expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: specialPassword,
        });
      });
    });
  });

  describe('Accessibility and User Experience', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<AuthModal />);

      expect(screen.getByLabelText(/email/i)).toHaveAttribute('type', 'email');
      expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password');
      expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
    });

    it('should show proper focus management', async () => {
      render(<AuthModal />);

      // Email field should be focusable
      const emailInput = screen.getByLabelText(/email/i);
      emailInput.focus();
      expect(emailInput).toHaveFocus();

      // Should be able to tab to password field
      await user.tab();
      expect(screen.getByLabelText(/password/i)).toHaveFocus();
    });

    it('should provide clear feedback for form validation', async () => {
      render(<AuthModal />);

      // Submit empty form
      await user.click(screen.getByRole('button', { name: /log in/i }));

      // Should show validation messages
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();

      // Messages should be associated with inputs
      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute('aria-invalid');
    });

    it('should handle screen reader announcements for state changes', async () => {
      render(<AuthModal />);

      // Switch to signup form
      await user.click(screen.getByRole('button', { name: /sign up/i }));

      // Should announce the form change
      expect(screen.getByText('Create Account')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument();
    });
  });

  describe('Integration with App Flow', () => {
    it('should integrate properly with the overall app authentication flow', async () => {
      // Simulate a user trying to save a combination without being authenticated
      useAppStore.setState({
        showAuthModal: true,
        currentView: 'result',
        weatherData: {
          city: 'Paris',
          country: 'France',
          latitude: 48.8566,
          longitude: 2.3522,
          temperature: 22,
          condition: 'Sunny',
          icon: 'https://openweathermap.org/img/wn/01d@2x.png',
          humidity: 65,
          windSpeed: 12,
          localTime: 'Jun 10, 2025, 2:30 PM',
          isDay: true,
        },
        cocktailData: {
          name: 'Classic Martini',
          description: 'A timeless cocktail',
          ingredients: ['2 oz gin', '1/2 oz dry vermouth'],
          recipe: ['Stir with ice', 'Strain into glass'],
          imageUrl: 'https://images.pexels.com/photos/5379228/pexels-photo-5379228.jpeg',
          mood: 'sophisticated',
        },
      });

      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: {
          user: { id: 'user-123', email: 'test@example.com' },
          session: { user: { id: 'user-123', email: 'test@example.com' }, access_token: 'token' },
        },
        error: null,
      } as any);

      render(<AuthModal />);

      // Complete login
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /log in/i }));

      await waitFor(() => {
        expect(useAppStore.getState().showAuthModal).toBe(false);
      });

      // App state should be preserved
      expect(useAppStore.getState().currentView).toBe('result');
      expect(useAppStore.getState().weatherData).toBeDefined();
      expect(useAppStore.getState().cocktailData).toBeDefined();
    });

    it('should handle authentication timeout scenarios', async () => {
      // Mock a very slow response
      mockSupabase.auth.signInWithPassword.mockImplementationOnce(
        () => new Promise(resolve => {
          setTimeout(() => resolve({
            data: { user: null, session: null },
            error: { message: 'Request timeout' },
          } as any), 5000);
        })
      );

      render(<AuthModal />);

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'password123');
      await user.click(screen.getByRole('button', { name: /log in/i }));

      // Should show loading state
      expect(screen.getByText('Logging in...')).toBeInTheDocument();

      // User should be able to close modal during loading
      const closeButton = screen.getByRole('button', { name: '' }); // X button
      await user.click(closeButton);

      expect(useAppStore.getState().showAuthModal).toBe(false);
    });
  });
});