import type { CocktailData } from '../store/appStore';

// For a real implementation, this would connect to an AI service
// For the MVP, we'll use a mock service that returns predefined cocktails based on conditions

// Mock database of country preferences
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

// Mock cocktail database
const cocktails: CocktailData[] = [
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
    name: 'Espresso Martini',
    description: 'The perfect pick-me-up cocktail combining vodka with coffee liqueur and espresso.',
    ingredients: [
      '1.5 oz vodka',
      '1 oz coffee liqueur',
      '1 oz freshly brewed espresso, cooled',
      '1/2 oz simple syrup',
      'Coffee beans for garnish'
    ],
    recipe: [
      'Add all ingredients to a shaker with ice',
      'Shake vigorously for 20 seconds',
      'Double strain into a chilled martini glass',
      'Garnish with three coffee beans'
    ],
    imageUrl: 'https://images.pexels.com/photos/2531188/pexels-photo-2531188.jpeg',
    mood: 'energetic'
  },
  {
    name: 'Hot Toddy',
    description: 'A warming cocktail perfect for cold days or when you need comfort.',
    ingredients: [
      '2 oz whiskey',
      '1 tbsp honey',
      '1/2 oz lemon juice',
      'Hot water',
      'Cinnamon stick and lemon wheel for garnish'
    ],
    recipe: [
      'Add whiskey, honey, and lemon juice to a mug',
      'Fill with hot water and stir until honey dissolves',
      'Garnish with a cinnamon stick and lemon wheel'
    ],
    imageUrl: 'https://images.pexels.com/photos/5363250/pexels-photo-5363250.jpeg',
    mood: 'warming'
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
  },
  {
    name: 'Manhattan',
    description: 'A sophisticated cocktail with bourbon, sweet vermouth, and bitters.',
    ingredients: [
      '2 oz bourbon or rye whiskey',
      '1 oz sweet vermouth',
      '2 dashes Angostura bitters',
      'Cherry for garnish'
    ],
    recipe: [
      'Add all ingredients to a mixing glass with ice',
      'Stir for 30 seconds until well-chilled',
      'Strain into a chilled coupe glass',
      'Garnish with a cherry'
    ],
    imageUrl: 'https://images.pexels.com/photos/602750/pexels-photo-602750.jpeg',
    mood: 'complex'
  },
  {
    name: 'Margarita',
    description: 'A perfect balance of tequila, lime, and orange liqueur.',
    ingredients: [
      '2 oz tequila',
      '1 oz Cointreau or triple sec',
      '1 oz fresh lime juice',
      'Salt for rim (optional)',
      'Lime wheel for garnish'
    ],
    recipe: [
      'If desired, salt the rim of a chilled glass',
      'Add tequila, Cointreau, and lime juice to a shaker with ice',
      'Shake until well-chilled',
      'Strain into the prepared glass over fresh ice',
      'Garnish with a lime wheel'
    ],
    imageUrl: 'https://images.pexels.com/photos/3407782/pexels-photo-3407782.jpeg',
    mood: 'bright'
  },
  {
    name: 'Negroni',
    description: 'A perfectly balanced classic with gin, vermouth, and Campari.',
    ingredients: [
      '1 oz gin',
      '1 oz Campari',
      '1 oz sweet vermouth',
      'Orange peel for garnish'
    ],
    recipe: [
      'Add all ingredients to a mixing glass with ice',
      'Stir until well-chilled',
      'Strain into a rocks glass with a large ice cube',
      'Garnish with an orange peel'
    ],
    imageUrl: 'https://images.pexels.com/photos/5947019/pexels-photo-5947019.jpeg',
    mood: 'complex'
  },
  {
    name: 'Piña Colada',
    description: 'A tropical blend of rum, coconut, and pineapple.',
    ingredients: [
      '2 oz white rum',
      '1.5 oz coconut cream',
      '1.5 oz pineapple juice',
      'Pineapple wedge and cherry for garnish'
    ],
    recipe: [
      'Add all ingredients to a blender with 1 cup of crushed ice',
      'Blend until smooth',
      'Pour into a hurricane glass',
      'Garnish with a pineapple wedge and cherry'
    ],
    imageUrl: 'https://images.pexels.com/photos/4021983/pexels-photo-4021983.jpeg',
    mood: 'refreshing'
  },
  {
    name: 'Moscow Mule',
    description: 'A refreshing mix of vodka, lime, and ginger beer served in a copper mug.',
    ingredients: [
      '2 oz vodka',
      '1/2 oz lime juice',
      'Ginger beer',
      'Lime wheel for garnish'
    ],
    recipe: [
      'Fill a copper mug with ice',
      'Add vodka and lime juice',
      'Top with ginger beer',
      'Stir gently',
      'Garnish with a lime wheel'
    ],
    imageUrl: 'https://images.pexels.com/photos/5947028/pexels-photo-5947028.jpeg',
    mood: 'refreshing'
  }
];

export async function getCocktailSuggestion(
  countryCode: string,
  weatherCondition: string,
  temperature: number
): Promise<CocktailData> {
  // In a real implementation, this would call an AI service
  // For MVP, we'll use our mock data to create a reasonable suggestion
  
  // Determine preferred spirits based on country
  const preferredSpirits = countryDrinkPreferences[countryCode.toLowerCase()] || defaultPreferences;
  
  // Determine mood based on weather
  let mood: string;
  if (weatherCondition.toLowerCase().includes('snow') || weatherCondition.toLowerCase().includes('sleet')) {
    mood = weatherMoodMap.snow[Math.floor(Math.random() * weatherMoodMap.snow.length)];
  } else if (weatherCondition.toLowerCase().includes('rain') || weatherCondition.toLowerCase().includes('drizzle')) {
    mood = weatherMoodMap.rain[Math.floor(Math.random() * weatherMoodMap.rain.length)];
  } else if (weatherCondition.toLowerCase().includes('cloud') || weatherCondition.toLowerCase().includes('overcast')) {
    mood = weatherMoodMap.cloudy[Math.floor(Math.random() * weatherMoodMap.cloudy.length)];
  } else if (weatherCondition.toLowerCase().includes('sunny') || weatherCondition.toLowerCase().includes('clear')) {
    mood = weatherMoodMap.sunny[Math.floor(Math.random() * weatherMoodMap.sunny.length)];
  } else if (temperature > 25) {
    mood = weatherMoodMap.hot[Math.floor(Math.random() * weatherMoodMap.hot.length)];
  } else if (temperature < 5) {
    mood = weatherMoodMap.cold[Math.floor(Math.random() * weatherMoodMap.cold.length)];
  } else if (weatherCondition.toLowerCase().includes('wind')) {
    mood = weatherMoodMap.windy[Math.floor(Math.random() * weatherMoodMap.windy.length)];
  } else if (weatherCondition.toLowerCase().includes('fog') || weatherCondition.toLowerCase().includes('mist')) {
    mood = weatherMoodMap.foggy[Math.floor(Math.random() * weatherMoodMap.foggy.length)];
  } else if (weatherCondition.toLowerCase().includes('thunder') || weatherCondition.toLowerCase().includes('storm')) {
    mood = weatherMoodMap.stormy[Math.floor(Math.random() * weatherMoodMap.stormy.length)];
  } else {
    // Default mood
    mood = 'balanced';
  }
  
  // Find cocktails that match the preferred spirits
  const matchingCocktails = cocktails.filter(cocktail => {
    // Check if any of the preferred spirits are in the ingredients
    return preferredSpirits.some(spirit => {
      return cocktail.ingredients.some(ingredient => 
        ingredient.toLowerCase().includes(spirit.toLowerCase())
      );
    });
  });
  
  // If we have matches, prioritize those with matching mood
  if (matchingCocktails.length > 0) {
    const moodMatches = matchingCocktails.filter(cocktail => 
      cocktail.mood === mood || 
      weatherMoodMap[mood]?.includes(cocktail.mood)
    );
    
    if (moodMatches.length > 0) {
      return moodMatches[Math.floor(Math.random() * moodMatches.length)];
    }
    
    // If no mood matches, return a random matching cocktail
    return matchingCocktails[Math.floor(Math.random() * matchingCocktails.length)];
  }
  
  // If no spirit matches, try to match by mood
  const moodMatches = cocktails.filter(cocktail => 
    cocktail.mood === mood || 
    weatherMoodMap[mood]?.includes(cocktail.mood)
  );
  
  if (moodMatches.length > 0) {
    return moodMatches[Math.floor(Math.random() * moodMatches.length)];
  }
  
  // Fallback: return a random cocktail
  return cocktails[Math.floor(Math.random() * cocktails.length)];
}