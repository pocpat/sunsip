import axios from 'axios';

const API_BASE = '/api';

// Helper to get auth token from cookie
function getAuthToken(): string | null {
  const match = document.cookie.match(/sunsip_token=([^;]+)/);
  return match ? match[1] : null;
}

// Helper to check if we have a token (for auth state)
export function hasAuthToken(): boolean {
  return !!getAuthToken();
}

// ============ AUTH ============

export async function signUp(email: string, password: string): Promise<{ user: { id: string; email: string; isAdmin: boolean } | null; error: { message: string } | null }> {
  try {
    const response = await axios.post(`${API_BASE}/auth-signup`, { email, password });
    return { user: response.data.user, error: null };
  } catch (error: any) {
    return { user: null, error: { message: error.response?.data?.error || 'Sign up failed' } };
  }
}

export async function signIn(email: string, password: string): Promise<{ user: { id: string; email: string; isAdmin: boolean } | null; error: { message: string } | null }> {
  try {
    const response = await axios.post(`${API_BASE}/auth-signin`, { email, password });
    return { user: response.data.user, error: null };
  } catch (error: any) {
    return { user: null, error: { message: error.response?.data?.error || 'Sign in failed' } };
  }
}

export async function signOut(): Promise<void> {
  try {
    await axios.post(`${API_BASE}/auth-signout`);
  } catch {
    // Ignore errors
  }
}

export async function getCurrentUser(): Promise<{ id: string; email: string; isAdmin: boolean } | null> {
  try {
    const response = await axios.get(`${API_BASE}/auth-me`);
    return response.data.user || null;
  } catch {
    return null;
  }
}

// ============ SAVED COMBINATIONS ============

export async function saveCombination(userId: string, data: {
  cityName: string;
  countryName: string;
  cityImageUrl: string;
  weatherDetails: string;
  cocktailName: string;
  cocktailImageUrl: string;
  cocktailIngredients: string[];
  cocktailRecipe: string[];
  rating?: number;
  notes?: string;
}) {
  const response = await axios.post(`${API_BASE}/combinations`, data);
  return response.data;
}

export async function getUserSavedCombinations(userId: string) {
  const response = await axios.get(`${API_BASE}/combinations`);
  return response.data;
}

export async function updateCombinationRating(id: string, rating: number, notes?: string) {
  await axios.patch(`${API_BASE}/combination?id=${id}`, { rating, notes });
}

export async function trackCombinationAccess(id: string) {
  try {
    await axios.patch(`${API_BASE}/combination?id=${id}`, { trackAccess: true });
  } catch (error) {
    console.error('Error tracking combination access:', error);
  }
}

export async function getUserTopCombinations(userId: string, limit: number = 5) {
  const response = await axios.get(`${API_BASE}/combinations?top=true&limit=${limit}`);
  return response.data;
}

export async function deleteSavedCombination(id: string) {
  await axios.delete(`${API_BASE}/combination?id=${id}`);
}

// ============ USER PREFERENCES ============

export async function getUserPreferences(userId: string) {
  const response = await axios.get(`${API_BASE}/preferences`);
  return response.data;
}

export async function saveUserPreferences(userId: string, preferences: {
  preferredSpirits: string[];
  dietaryRestrictions: string[];
  favoriteWeatherMoods: Record<string, any>;
}) {
  const response = await axios.put(`${API_BASE}/preferences`, preferences);
  return response.data;
}

// ============ REQUEST LIMITS ============

export async function checkAndUpdateRequestLimit(userId: string | null, clientId?: string | null) {
  try {
    const response = await axios.post(`${API_BASE}/request-limit`, {
      userId,
      clientId,
    });
    return response.data;
  } catch (error) {
    console.error('Error checking request limit:', error);
    // Default to allowing the request if there's an error
    return {
      canProceed: true,
      count: 0,
      remaining: 10,
      resetDate: null,
    };
  }
}

// ============ SYSTEM SETTINGS ============

export async function getSystemSettings() {
  try {
    const response = await axios.get(`${API_BASE}/system-settings`);
    return response.data;
  } catch {
    return { global_enabled: true };
  }
}