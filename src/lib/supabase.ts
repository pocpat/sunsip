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
    savedAt: savedData.created_at,
  };
}

export async function getUserSavedCombinations(userId: string) {
  const { data, error } = await supabase
    .from('saved_combinations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

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
    savedAt: item.created_at,
  }));
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