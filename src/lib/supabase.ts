import { createClient } from '@supabase/supabase-js';

// These would typically come from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-supabase-url.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-anon-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

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
  const { data: savedData, error } = await supabase
    .from('saved_combinations')
    .insert([
      {
        user_id: userId,
        city_name: data.cityName,
        country_name: data.countryName,
        city_image_url: data.cityImageUrl,
        weather_details: data.weatherDetails,
        cocktail_name: data.cocktailName,
        cocktail_image_url: data.cocktailImageUrl,
        cocktail_ingredients: data.cocktailIngredients,
        cocktail_recipe: data.cocktailRecipe,
        rating: data.rating,
        notes: data.notes || '',
      }
    ])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return {
    id: savedData.id,
    cityName: savedData.city_name,
    countryName: savedData.country_name,
    cityImageUrl: savedData.city_image_url,
    weatherDetails: savedData.weather_details,
    cocktailName: savedData.cocktail_name,
    cocktailImageUrl: savedData.cocktail_image_url,
    cocktailIngredients: savedData.cocktail_ingredients,
    cocktailRecipe: savedData.cocktail_recipe,
    rating: savedData.rating,
    notes: savedData.notes,
    timesAccessed: savedData.times_accessed || 0,
    lastAccessedAt: savedData.last_accessed_at,
    savedAt: savedData.created_at,
  };
}

export async function getUserSavedCombinations(userId: string) {
  const { data, error } = await supabase
    .from('saved_combinations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    throw error;
  }

  return data.map(item => ({
    id: item.id,
    cityName: item.city_name,
    countryName: item.country_name,
    cityImageUrl: item.city_image_url,
    weatherDetails: item.weather_details,
    cocktailName: item.cocktail_name,
    cocktailImageUrl: item.cocktail_image_url,
    cocktailIngredients: item.cocktail_ingredients,
    cocktailRecipe: item.cocktail_recipe,
    rating: item.rating,
    notes: item.notes,
    timesAccessed: item.times_accessed || 0,
    lastAccessedAt: item.last_accessed_at,
    savedAt: item.created_at,
  }));
}

export async function updateCombinationRating(id: string, rating: number, notes?: string) {
  const { error } = await supabase
    .from('saved_combinations')
    .update({ 
      rating,
      notes: notes || '',
    })
    .eq('id', id);

  if (error) {
    throw error;
  }
}

export async function trackCombinationAccess(id: string) {
  const { error } = await supabase.rpc('update_combination_access', {
    combination_id: id
  });

  if (error) {
    console.error('Error tracking combination access:', error);
  }
}

export async function getUserTopCombinations(userId: string, limit: number = 5) {
  const { data, error } = await supabase.rpc('get_user_top_combinations', {
    user_uuid: userId,
    limit_count: limit
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteSavedCombination(id: string) {
  const { error } = await supabase
    .from('saved_combinations')
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }
}

// User Preferences Functions
export async function getUserPreferences(userId: string) {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? {
    id: data.id,
    preferredSpirits: data.preferred_spirits || [],
    dietaryRestrictions: data.dietary_restrictions || [],
    favoriteWeatherMoods: data.favorite_weather_moods || {},
    dailyRequestCount: data.daily_request_count || 0,
    lastRequestDate: data.last_request_date,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  } : null;
}

export async function saveUserPreferences(userId: string, preferences: {
  preferredSpirits: string[];
  dietaryRestrictions: string[];
  favoriteWeatherMoods: Record<string, any>;
  dailyRequestCount?: number;
  lastRequestDate?: string;
}) {
  const { data, error } = await supabase
    .from('user_preferences')
    .upsert([
      {
        user_id: userId,
        preferred_spirits: preferences.preferredSpirits,
        dietary_restrictions: preferences.dietaryRestrictions,
        favorite_weather_moods: preferences.favoriteWeatherMoods,
        daily_request_count: preferences.dailyRequestCount,
        last_request_date: preferences.lastRequestDate,
        updated_at: new Date().toISOString(),
      }
    ], {
      onConflict: 'user_id'
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return {
    id: data.id,
    preferredSpirits: data.preferred_spirits,
    dietaryRestrictions: data.dietary_restrictions,
    favoriteWeatherMoods: data.favorite_weather_moods,
    dailyRequestCount: data.daily_request_count || 0,
    lastRequestDate: data.last_request_date,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// Function to check and update daily request limit
export async function checkAndUpdateRequestLimit(userId: string | null, clientId?: string | null) {
  try {
    // Call the appropriate RPC function based on whether we have a userId or clientId
    const { data, error } = await supabase.rpc(
      userId ? 'check_and_update_request_limit' : 'check_and_update_anonymous_request_limit',
      userId ? { user_uuid: userId } : { client_id: clientId }
    );

    if (error) {
      console.error('Error checking request limit:', error);
      // Default to allowing the request if there's an error
      return {
        canProceed: true,
        count: 0,
        remaining: 10,
        resetDate: null
      };
    }

    return {
      canProceed: data.can_proceed,
      count: data.count,
      remaining: data.remaining,
      resetDate: data.reset_date
    };
  } catch (error) {
    console.error('Error in checkAndUpdateRequestLimit:', error);
    // Default to allowing the request if there's an exception
    return {
      canProceed: true,
      count: 0,
      remaining: 10,
      resetDate: null
    };
  }
}