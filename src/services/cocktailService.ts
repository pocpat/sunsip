import axios from 'axios';
import type { CocktailData } from '../store/appStore';
import { captureError, addBreadcrumb } from '../lib/sentry';

// TheCocktailDB API configuration
const API_BASE_URL = 'https://www.thecocktaildb.com/api/json/v1/1';

// Country drink preferences - using our hardcoded data for cultural relevance
const countryDrinkPreferences: Record<string, string[]> = {
  'us': ['Whiskey', 'Bourbon', 'Rum'],
  'gb': ['Gin', 'Whisky', 'Beer'],
  'fr': ['Wine', 'Cognac', 'Champagne'],
  'it': ['Wine', 'Amaro', 'Vermouth'],
  'jp': ['Sake', 'Whisky', 'Umeshu'],
  'mx': ['Tequila', 'Mezcal', 'Rum'],
  'ru': ['Vodka', 'Kvass', 'Beer'],
  'au': ['Beer', 'Wine', 'Rum'],
  'ca': ['Whisky', 'Beer', 'Ice Wine'],
  'de': ['Beer', 'Schnapps', 'Jägermeister'],
  'es': ['Sangria', 'Wine', 'Sherry'],
  'ie': ['Guinness', 'Irish Whiskey', 'Baileys'],
  'br': ['Cachaça', 'Caipirinha', 'Beer'],
  'cn': ['Baijiu', 'Huangjiu', 'Beer'],
  'kr': ['Soju', 'Makgeolli', 'Beer'],
  'in': ['Whisky', 'Beer', 'Rum'],
  'nl': ['Jenever', 'Beer', 'Advocaat'],
  'gr': ['Ouzo', 'Metaxa', 'Retsina'],
  'se': ['Akvavit', 'Vodka', 'Punsch'],
  'pl': ['Vodka', 'Mead', 'Beer'],
  'ar': ['Wine', 'Fernet', 'Beer'],
  'za': ['Wine', 'Brandy', 'Amarula'],
  'pe': ['Pisco', 'Chicha de Jora', 'Beer'],
  'tr': ['Rakı', 'Wine', 'Beer'],
  'cu': ['Rum', 'Mojito', 'Daiquiri'],
  'nz': ['Wine', 'Beer', 'Sauvignon Blanc'],
  'il': ['Wine', 'Arak', 'Beer'],
  'ua': ['Horilka', 'Vodka', 'Beer'],
  'by': ['Vodka', 'Samogon', 'Beer'],
  'lt': ['Vodka', 'Mead', 'Beer'],
  'lv': ['Vodka', 'Riga Black Balsam', 'Beer'],
  'bg': ['Rakia', 'Wine', 'Beer'],
};

// Default for countries not in the list
const defaultPreferences = ['Gin', 'Vodka', 'Rum', 'Whiskey'];

// Mood mapping based on weather conditions
const weatherMoodMap: Record<string, string[]> = {
  'snow': ['cozy', 'warm', 'comforting'],
  'rain': ['moody', 'reflective', 'relaxing'],
  'cloudy': ['balanced', 'versatile', 'refreshing'],
  'sunny': ['bright', 'energetic', 'refreshing'],
  'hot': ['cooling', 'refreshing', 'light'],
  'cold': ['warming', 'cozy', 'rich'],
  'windy': ['dynamic', 'earthy', 'complex'],
  'foggy': ['mysterious', 'subtle', 'complex'],
  'stormy': ['bold', 'intense', 'complex'],
};

// Fallback cocktails in case API fails
const fallbackCocktails: CocktailData[] = [
  {
    name: 'Classic Old Fashioned',
    description: 'A timeless cocktail that showcases the rich flavors of bourbon or rye whiskey.',
    ingredients: [
      '2 oz bourbon or rye whiskey',
      '1 sugar cube',
      '2-3 dashes Angostura bitters',
      'Orange peel for garnish'
    ],
    recipe: [
      'Place sugar cube in an old-fashioned glass',
      'Add bitters and a splash of water',
      'Muddle until sugar is dissolved',
      'Add bourbon or rye whiskey',
      'Add ice (preferably one large cube)',
      'Stir gently',
      'Express orange peel over the drink and drop it in'
    ],
    imageUrl: 'https://images.pexels.com/photos/5379228/pexels-photo-5379228.jpeg',
    mood: 'cozy'
  },
  {
    name: 'Gin Fizz',
    description: 'A refreshing, effervescent cocktail perfect for warm days.',
    ingredients: [
      '2 oz gin',
      '1 oz fresh lemon juice',
      '3/4 oz simple syrup',
      'Club soda',
      'Lemon wheel for garnish'
    ],
    recipe: [
      'Add gin, lemon juice, and simple syrup to a shaker with ice',
      'Shake vigorously for 15 seconds',
      'Strain into a Collins glass filled with fresh ice',
      'Top with club soda',
      'Garnish with a lemon wheel'
    ],
    imageUrl: 'https://images.pexels.com/photos/2480828/pexels-photo-2480828.jpeg',
    mood: 'refreshing'
  },
  {
    name: 'Mojito',
    description: 'A refreshing Cuban highball that combines rum, mint, and lime.',
    ingredients: [
      '2 oz white rum',
      '1 oz fresh lime juice',
      '3/4 oz simple syrup',
      '8-10 mint leaves',
      'Club soda',
      'Mint sprig and lime wheel for garnish'
    ],
    recipe: [
      'Gently muddle mint leaves in a shaker',
      'Add rum, lime juice, and simple syrup',
      'Shake with ice and strain into a highball glass with fresh ice',
      'Top with club soda',
      'Garnish with a mint sprig and lime wheel'
    ],
    imageUrl: 'https://images.pexels.com/photos/4021983/pexels-photo-4021983.jpeg',
    mood: 'refreshing'
  }
];

// Interface for TheCocktailDB API response
interface CocktailAPIResponse {
  drinks: Array<{
    idDrink: string;
    strDrink: string;
    strDrinkThumb: string;
    strInstructions: string;
    strIngredient1?: string;
    strIngredient2?: string;
    strIngredient3?: string;
    strIngredient4?: string;
    strIngredient5?: string;
    strIngredient6?: string;
    strIngredient7?: string;
    strIngredient8?: string;
    strIngredient9?: string;
    strIngredient10?: string;
    strIngredient11?: string;
    strIngredient12?: string;
    strIngredient13?: string;
    strIngredient14?: string;
    strIngredient15?: string;
    strMeasure1?: string;
    strMeasure2?: string;
    strMeasure3?: string;
    strMeasure4?: string;
    strMeasure5?: string;
    strMeasure6?: string;
    strMeasure7?: string;
    strMeasure8?: string;
    strMeasure9?: string;
    strMeasure10?: string;
    strMeasure11?: string;
    strMeasure12?: string;
    strMeasure13?: string;
    strMeasure14?: string;
    strMeasure15?: string;
    [key: string]: any;
  }> | null;
}

// Function to search cocktails by ingredient
async function searchCocktailsByIngredient(ingredient: string): Promise<CocktailAPIResponse> {
  try {
    addBreadcrumb(`Searching cocktails by ingredient: ${ingredient}`, 'cocktail-api');
    
    const response = await axios.get(`${API_BASE_URL}/filter.php`, {
      params: { i: ingredient }
    });
    
    return response.data;
  } catch (error) {
    captureError(error as Error, {
      service: 'thecocktaildb',
      action: 'search_by_ingredient',
      ingredient
    });
    throw error;
  }
}

// Function to get full cocktail details by ID
async function getCocktailDetails(cocktailId: string): Promise<CocktailAPIResponse> {
  try {
    addBreadcrumb(`Fetching cocktail details for ID: ${cocktailId}`, 'cocktail-api');
    
    const response = await axios.get(`${API_BASE_URL}/lookup.php`, {
      params: { i: cocktailId }
    });
    
    return response.data;
  } catch (error) {
    captureError(error as Error, {
      service: 'thecocktaildb',
      action: 'get_details',
      cocktailId
    });
    throw error;
  }
}

// Function to get a random cocktail
async function getRandomCocktail(): Promise<CocktailAPIResponse> {
  try {
    addBreadcrumb('Fetching random cocktail', 'cocktail-api');
    
    const response = await axios.get(`${API_BASE_URL}/random.php`);
    
    return response.data;
  } catch (error) {
    captureError(error as Error, {
      service: 'thecocktaildb',
      action: 'get_random'
    });
    throw error;
  }
}

// Function to map API response to our CocktailData type
function mapApiResponseToCocktailData(apiCocktail: any, mood: string): CocktailData {
  // Extract ingredients and measurements
  const ingredients: string[] = [];
  for (let i = 1; i <= 15; i++) {
    const ingredient = apiCocktail[`strIngredient${i}`];
    const measure = apiCocktail[`strMeasure${i}`];
    
    if (ingredient && ingredient.trim()) {
      const formattedIngredient = measure && measure.trim() 
        ? `${measure.trim()} ${ingredient.trim()}`
        : ingredient.trim();
      ingredients.push(formattedIngredient);
    }
  }

  // Split instructions into recipe steps
  const instructions = apiCocktail.strInstructions || '';
  const recipe = instructions
    .split(/[.!?]+/)
    .map((step: string) => step.trim())
    .filter((step: string) => step.length > 0)
    .map((step: string) => step.charAt(0).toUpperCase() + step.slice(1));

  // Create description from first part of instructions or use a default
  const description = instructions.length > 100 
    ? instructions.substring(0, 100) + '...'
    : instructions || `A delicious ${apiCocktail.strDrink} cocktail.`;

  return {
    name: apiCocktail.strDrink,
    description,
    ingredients,
    recipe: recipe.length > 0 ? recipe : ['Mix all ingredients and serve'],
    imageUrl: apiCocktail.strDrinkThumb || 'https://images.pexels.com/photos/5379228/pexels-photo-5379228.jpeg',
    mood
  };
}

// Function to determine mood based on weather and temperature
function determineMood(weatherCondition: string, temperature: number): string {
  const condition = weatherCondition.toLowerCase();
  
  if (condition.includes('snow') || condition.includes('sleet')) {
    return weatherMoodMap.snow[Math.floor(Math.random() * weatherMoodMap.snow.length)];
  } else if (condition.includes('rain') || condition.includes('drizzle')) {
    return weatherMoodMap.rain[Math.floor(Math.random() * weatherMoodMap.rain.length)];
  } else if (condition.includes('cloud') || condition.includes('overcast')) {
    return weatherMoodMap.cloudy[Math.floor(Math.random() * weatherMoodMap.cloudy.length)];
  } else if (condition.includes('sunny') || condition.includes('clear')) {
    return weatherMoodMap.sunny[Math.floor(Math.random() * weatherMoodMap.sunny.length)];
  } else if (temperature > 25) {
    return weatherMoodMap.hot[Math.floor(Math.random() * weatherMoodMap.hot.length)];
  } else if (temperature < 5) {
    return weatherMoodMap.cold[Math.floor(Math.random() * weatherMoodMap.cold.length)];
  } else if (condition.includes('wind')) {
    return weatherMoodMap.windy[Math.floor(Math.random() * weatherMoodMap.windy.length)];
  } else if (condition.includes('fog') || condition.includes('mist')) {
    return weatherMoodMap.foggy[Math.floor(Math.random() * weatherMoodMap.foggy.length)];
  } else if (condition.includes('thunder') || condition.includes('storm')) {
    return weatherMoodMap.stormy[Math.floor(Math.random() * weatherMoodMap.stormy.length)];
  } else {
    return 'balanced';
  }
}

// Main function to get cocktail suggestion
export async function getCocktailSuggestion(
  countryCode: string,
  weatherCondition: string,
  temperature: number
): Promise<CocktailData> {
  addBreadcrumb(`Getting cocktail suggestion for ${countryCode}, ${weatherCondition}, ${temperature}°C`, 'cocktail');
  
  // Determine preferred spirits based on country
  const preferredSpirits = countryDrinkPreferences[countryCode.toLowerCase()] || defaultPreferences;
  
  // Determine mood based on weather
  const mood = determineMood(weatherCondition, temperature);
  
  try {
    // Try to find cocktails based on preferred spirits
    for (const spirit of preferredSpirits) {
      try {
        // Map spirit names to API-compatible ingredient names
        let apiIngredient = spirit;
        if (spirit === 'Whisky') apiIngredient = 'Whiskey';
        if (spirit === 'Cachaça') apiIngredient = 'Cachaca';
        if (spirit === 'Rakı') apiIngredient = 'Raki';
        
        const cocktailsResponse = await searchCocktailsByIngredient(apiIngredient);
        
        if (cocktailsResponse.drinks && cocktailsResponse.drinks.length > 0) {
          // Select a random cocktail from the results
          const randomCocktail = cocktailsResponse.drinks[Math.floor(Math.random() * cocktailsResponse.drinks.length)];
          
          // Get full details for the selected cocktail
          const detailsResponse = await getCocktailDetails(randomCocktail.idDrink);
          
          if (detailsResponse.drinks && detailsResponse.drinks.length > 0) {
            const cocktailData = mapApiResponseToCocktailData(detailsResponse.drinks[0], mood);
            
            addBreadcrumb(`Successfully found cocktail: ${cocktailData.name}`, 'cocktail', {
              spirit: apiIngredient,
              mood,
              country: countryCode
            });
            
            return cocktailData;
          }
        }
      } catch (error) {
        // Continue to next spirit if this one fails
        console.warn(`Failed to find cocktails for ${spirit}:`, error);
        continue;
      }
    }
    
    // If no spirit-based cocktails found, try to get a random cocktail
    addBreadcrumb('No spirit-based cocktails found, trying random cocktail', 'cocktail');
    
    const randomResponse = await getRandomCocktail();
    
    if (randomResponse.drinks && randomResponse.drinks.length > 0) {
      const cocktailData = mapApiResponseToCocktailData(randomResponse.drinks[0], mood);
      
      addBreadcrumb(`Using random cocktail: ${cocktailData.name}`, 'cocktail');
      
      return cocktailData;
    }
    
    // If everything fails, use fallback
    throw new Error('No cocktails found from API');
    
  } catch (error) {
    captureError(error as Error, {
      service: 'thecocktaildb',
      countryCode,
      weatherCondition,
      temperature,
      preferredSpirits
    });
    
    console.error('Error fetching cocktail from API, using fallback:', error);
    
    // Fallback to our hardcoded cocktails
    addBreadcrumb('API failed, using fallback cocktails', 'cocktail');
    
    // Try to match fallback cocktails with preferred spirits
    const matchingFallbacks = fallbackCocktails.filter(cocktail => {
      return preferredSpirits.some(spirit => {
        return cocktail.ingredients.some(ingredient => 
          ingredient.toLowerCase().includes(spirit.toLowerCase())
        );
      });
    });
    
    if (matchingFallbacks.length > 0) {
      const selectedCocktail = matchingFallbacks[Math.floor(Math.random() * matchingFallbacks.length)];
      return { ...selectedCocktail, mood };
    }
    
    // If no matching fallbacks, return a random fallback with the determined mood
    const fallbackCocktail = fallbackCocktails[Math.floor(Math.random() * fallbackCocktails.length)];
    return { ...fallbackCocktail, mood };
  }
}