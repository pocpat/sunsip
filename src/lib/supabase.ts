// Migration shim: re-exports from the new MongoDB API client
// This allows gradual migration of imports from '../lib/supabase' to '../lib/api'
export {
  saveCombination,
  getUserSavedCombinations,
  updateCombinationRating,
  trackCombinationAccess,
  getUserTopCombinations,
  deleteSavedCombination,
  getUserPreferences,
  saveUserPreferences,
  checkAndUpdateRequestLimit,
  getSystemSettings,
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  hasAuthToken,
} from './api';

// Legacy supabase object mock - components that use supabase.auth directly need this
export const supabase = {
  auth: {
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      const { user, error } = await import('./api').then(m => m.signIn(email, password));
      if (error) return { data: { user: null, session: null }, error: { message: error.message } };
      return { data: { user, session: null }, error: null };
    },
    signUp: async ({ email, password }: { email: string; password: string }) => {
      const { user, error } = await import('./api').then(m => m.signUp(email, password));
      if (error) return { data: { user: null, session: null }, error: { message: error.message } };
      return { data: { user, session: null }, error: null };
    },
    signOut: async () => {
      await import('./api').then(m => m.signOut());
      return { error: null };
    },
    getSession: async () => {
      const user = await import('./api').then(m => m.getCurrentUser());
      return { data: { session: user ? { user } : null }, error: null };
    },
    getUser: async () => {
      const user = await import('./api').then(m => m.getCurrentUser());
      return { data: { user }, error: null };
    },
    onAuthStateChange: (_callback: (event: string, session: any) => void) => {
      // No-op for now - auth state is managed by the store
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
  },
  from: (_table: string) => {
    // Legacy query builder - not supported in MongoDB migration
    throw new Error('supabase.from() is no longer supported. Use the new API functions from lib/api.');
  },
  rpc: async (_fn: string, _params: any) => {
    // Legacy RPC - route to new API endpoints
    if (_fn === 'check_and_update_request_limit') {
      return import('./api').then(m => m.checkAndUpdateRequestLimit(_params.user_uuid, null));
    }
    if (_fn === 'check_and_update_anonymous_request_limit') {
      return import('./api').then(m => m.checkAndUpdateRequestLimit(null, _params.client_id));
    }
    if (_fn === 'is_global_requests_enabled') {
      return import('./api').then(m => m.getSystemSettings());
    }
    return { data: null, error: { message: `RPC ${_fn} not supported` } };
  },
};