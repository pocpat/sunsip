//
// Tests for the rebuilt AuthModal (standard 4-view flow):
//   login / signup / forgot password / set-new-password
// The modal talks to the MongoDB-backed /api/auth-* endpoints via lib/api,
// so axios is mocked (repo convention) — no network, no Supabase.
//

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthModal from '../auth/AuthModal';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import * as api from '../../lib/api';

vi.mock('../../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../../lib/api')>('../../lib/api');
  return {
    ...actual,
    signIn: vi.fn(),
    signUp: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
  };
});

const mockedApi = vi.mocked(api, true);

const renderModal = () => {
  useAppStore.setState({ showAuthModal: true });
  return render(<AuthModal />);
};

/** Click a view-switching link and wait for a control that exists only in the
 *  NEW view — the heading sits outside AnimatePresence and appears instantly,
 *  while the old form is still exiting and would eat half the typed text. */
async function switchViewAndWait(buttonName: RegExp, newViewControl: () => HTMLElement) {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: buttonName }));
  await waitFor(() => expect(newViewControl()).toBeInTheDocument());
}

describe('AuthModal (standard auth flows)', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    useAppStore.setState({ showAuthModal: true });
    useAuthStore.setState({ user: null, isAuthenticated: false });
    vi.clearAllMocks();
    window.location.hash = '';
  });

  afterEach(() => {
    useAppStore.setState({ showAuthModal: false });
    useAuthStore.setState({ user: null, isAuthenticated: false });
  });

  it('shows the login view with a Forgot password link by default', () => {
    renderModal();
    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /forgot password\?/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^sign in$/i })).toBeInTheDocument();
  });

  it('switches to signup and back with one click', async () => {
    renderModal();
    await switchViewAndWait(/sign up/i, () => screen.getByLabelText(/confirm password/i));
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();

    await switchViewAndWait(/^log in$/i, () => screen.getByLabelText(/^email$/i));
  });

  it('closes via the X button', async () => {
    renderModal();
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(useAppStore.getState().showAuthModal).toBe(false);
  });

  it('signs in on submit and updates the auth store', async () => {
    mockedApi.signIn.mockResolvedValueOnce({
      user: { id: 'u1', email: 'test@example.com', isAdmin: false },
      error: null,
    });
    renderModal();

    await user.type(screen.getByLabelText(/^email$/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(mockedApi.signIn).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(useAuthStore.getState().user?.email).toBe('test@example.com');
    });
    await waitFor(() => {
      expect(useAppStore.getState().showAuthModal).toBe(false);
    });
  });

  it('shows a friendly error when credentials are wrong', async () => {
    mockedApi.signIn.mockResolvedValueOnce({
      user: null,
      error: { message: 'Invalid email or password.' },
    });
    renderModal();

    await user.type(screen.getByLabelText(/^email$/i), 'test@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(screen.getByText(/incorrect/i)).toBeInTheDocument();
    });
    expect(useAppStore.getState().showAuthModal).toBe(true);
  });

  it('rejects a signup with mismatched passwords without calling the API', async () => {
    renderModal();
    await switchViewAndWait(/sign up/i, () => screen.getByLabelText(/confirm password/i));

    await user.type(screen.getByLabelText(/^email$/i), 'new@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'abcdef');
    await user.type(screen.getByLabelText(/confirm password/i), 'otherpass');

    // Submit stays disabled while passwords differ — standard guard.
    expect(screen.getByRole('button', { name: /create account/i })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /create account/i }));
    expect(mockedApi.signUp).not.toHaveBeenCalled();
  });

  it('creates an account, signs the user in, and closes', async () => {
    mockedApi.signUp.mockResolvedValueOnce({
      user: { id: 'u2', email: 'new@example.com', isAdmin: false },
      error: null,
    });
    renderModal();
    await switchViewAndWait(/sign up/i, () => screen.getByLabelText(/confirm password/i));

    await user.type(screen.getByLabelText(/^email$/i), 'new@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'abcdef');
    await user.type(screen.getByLabelText(/confirm password/i), 'abcdef');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockedApi.signUp).toHaveBeenCalledWith('new@example.com', 'abcdef');
      expect(useAuthStore.getState().user?.email).toBe('new@example.com');
    });
  });

  it('forgot password: requests a link and shows the demo link when email is unconfigured', async () => {
    mockedApi.forgotPassword.mockResolvedValueOnce({
      message: 'Email service is not set up yet — use this link to reset your password:',
      resetUrl: 'https://sunsip.netlify.app/#reset-token=abc123',
    });
    renderModal();
    await switchViewAndWait(/forgot password\?/i, () => screen.getByRole('button', { name: /send reset link/i }));

    await user.type(screen.getByLabelText(/^email$/i), 'me@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(mockedApi.forgotPassword).toHaveBeenCalledWith('me@example.com');
      expect(screen.getByRole('link', { name: /open your reset link/i })).toHaveAttribute(
        'href',
        'https://sunsip.netlify.app/#reset-token=abc123'
      );
    });
  });

  it('forgot password: shows the check-your-inbox message when email is configured', async () => {
    mockedApi.forgotPassword.mockResolvedValueOnce({
      message: 'Check your inbox — we sent a reset link.',
    });
    renderModal();
    await switchViewAndWait(/forgot password\?/i, () => screen.getByRole('button', { name: /send reset link/i }));

    await user.type(screen.getByLabelText(/^email$/i), 'me@example.com');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText(/check your inbox/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole('link', { name: /open your reset link/i })).not.toBeInTheDocument();
  });

  it('reset view: opens via #reset-token hash and signs the user in with the new password', async () => {
    window.location.hash = '#reset-token=tok123';
    mockedApi.resetPassword.mockResolvedValueOnce({
      user: { id: 'u3', email: 'reset@example.com', isAdmin: false },
      error: null,
    });

    renderModal();

    expect(screen.getByRole('heading', { name: /choose a new password/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/^new password$/i), 'brandnew1');
    await user.type(screen.getByLabelText(/confirm new password/i), 'brandnew1');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(mockedApi.resetPassword).toHaveBeenCalledWith('tok123', 'brandnew1');
      expect(useAuthStore.getState().user?.email).toBe('reset@example.com');
    });
    // Modal auto-closes ~1.2s after success.
    await waitFor(
      () => {
        expect(useAppStore.getState().showAuthModal).toBe(false);
      },
      { timeout: 3000 }
    );
  });

  it('reset view: rejects mismatched passwords without calling the API', async () => {
    window.location.hash = '#reset-token=tok123';
    renderModal();

    await user.type(screen.getByLabelText(/^new password$/i), 'brandnew1');
    await user.type(screen.getByLabelText(/confirm new password/i), 'different1');

    // Submit stays disabled while passwords differ — standard guard.
    expect(screen.getByRole('button', { name: /update password/i })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /update password/i }));
    expect(mockedApi.resetPassword).not.toHaveBeenCalled();
  });
});