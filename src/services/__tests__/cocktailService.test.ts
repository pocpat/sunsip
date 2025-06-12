import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCocktailSuggestion } from '../cocktailService';
import type { CocktailData } from '../../store/appStore';

describe('cocktailService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCocktailSuggestion', () => {
    it('should return a valid cocktail data structure', async () => {
      const result = await getCocktailSuggestion('us', 'Sunny', 25);

      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('ingredients');
      expect(result).toHaveProperty('recipe');
      expect(result).toHaveProperty('imageUrl');
      expect(result).toHaveProperty('mood');

      expect(typeof result.name).toBe('string');
      expect(typeof result.description).toBe('string');
      expect(Array.isArray(result.ingredients)).toBe(true);
      expect(Array.isArray(result.recipe)).toBe(true);
      expect(typeof result.imageUrl).toBe('string');
      expect(typeof result.mood).toBe('string');

      expect(result.name.length).toBeGreaterThan(0);
      expect(result.ingredients.length).toBeGreaterThan(0);
      expect(result.recipe.length).toBeGreaterThan(0);
    });

    it('should suggest whiskey-based cocktails for US country code', async () => {
      const results = [];
      
      // Test multiple times to account for randomness
      for (let i = 0; i < 20; i++) {
        const result = await getCocktailSuggestion('us', 'Sunny', 25);
        results.push(result);
      }

      // Check if at least some results contain whiskey/bourbon (US preferences)
      const whiskeyCocktails = results.filter(cocktail => 
        cocktail.ingredients.some(ingredient => 
          ingredient.toLowerCase().includes('whiskey') || 
          ingredient.toLowerCase().includes('bourbon')
        )
      );

      expect(whiskeyCocktails.length).toBeGreaterThan(0);
    });

    it('should suggest gin-based cocktails for UK country code', async () => {
      const results = [];
      
      // Test multiple times to account for randomness
      for (let i = 0; i < 20; i++) {
        const result = await getCocktailSuggestion('gb', 'Cloudy', 15);
        results.push(result);
      }

      // Check if at least some results contain gin (UK preferences)
      const ginCocktails = results.filter(cocktail => 
        cocktail.ingredients.some(ingredient => 
          ingredient.toLowerCase().includes('gin')
        )
      );

      expect(ginCocktails.length).toBeGreaterThan(0);
    });

    it('should suggest tequila-based cocktails for Mexico country code', async () => {
      const results = [];
      
      // Test multiple times to account for randomness
      for (let i = 0; i < 20; i++) {
        const result = await getCocktailSuggestion('mx', 'Sunny', 30);
        results.push(result);
      }

      // Check if at least some results contain tequila (Mexico preferences)
      const tequilaCocktails = results.filter(cocktail => 
        cocktail.ingredients.some(ingredient => 
          ingredient.toLowerCase().includes('tequila')
        )
      );

      expect(tequilaCocktails.length).toBeGreaterThan(0);
    });

    it('should suggest warming cocktails for cold weather', async () => {
      const result = await getCocktailSuggestion('us', 'Snow', -5);

      // For very cold weather, should suggest warming cocktails
      const isWarmingCocktail = 
        result.name.toLowerCase().includes('toddy') ||
        result.mood === 'warming' ||
        result.mood === 'cozy' ||
        result.ingredients.some(ingredient => 
          ingredient.toLowerCase().includes('hot water') ||
          ingredient.toLowerCase().includes('honey') ||
          ingredient.toLowerCase().includes('cinnamon')
        );

      expect(isWarmingCocktail).toBe(true);
    });

    it('should suggest refreshing cocktails for hot weather', async () => {
      const results = [];
      
      // Test multiple times for hot weather
      for (let i = 0; i < 15; i++) {
        const result = await getCocktailSuggestion('us', 'Sunny', 35);
        results.push(result);
      }

      // Should suggest refreshing cocktails for hot weather
      const refreshingCocktails = results.filter(cocktail => 
        cocktail.mood === 'refreshing' ||
        cocktail.mood === 'cooling' ||
        cocktail.mood === 'light' ||
        cocktail.name.toLowerCase().includes('fizz') ||
        cocktail.name.toLowerCase().includes('mojito') ||
        cocktail.ingredients.some(ingredient => 
          ingredient.toLowerCase().includes('club soda') ||
          ingredient.toLowerCase().includes('lime') ||
          ingredient.toLowerCase().includes('mint')
        )
      );

      expect(refreshingCocktails.length).toBeGreaterThan(0);
    });

    it('should handle snow weather conditions appropriately', async () => {
      const result = await getCocktailSuggestion('ca', 'Snow', 0);

      // Snow weather should suggest cozy/warming cocktails
      const appropriateForSnow = 
        result.mood === 'cozy' ||
        result.mood === 'warming' ||
        result.mood === 'comforting' ||
        result.name.toLowerCase().includes('toddy') ||
        result.name.toLowerCase().includes('old fashioned');

      expect(appropriateForSnow).toBe(true);
    });

    it('should handle rainy weather conditions appropriately', async () => {
      const results = [];
      
      for (let i = 0; i < 10; i++) {
        const result = await getCocktailSuggestion('gb', 'Rain', 12);
        results.push(result);
      }

      // Rainy weather should suggest moody/reflective/relaxing cocktails
      const appropriateForRain = results.some(cocktail => 
        cocktail.mood === 'moody' ||
        cocktail.mood === 'reflective' ||
        cocktail.mood === 'relaxing' ||
        cocktail.mood === 'complex'
      );

      expect(appropriateForRain).toBe(true);
    });

    it('should handle sunny weather conditions appropriately', async () => {
      const results = [];
      
      for (let i = 0; i < 10; i++) {
        const result = await getCocktailSuggestion('au', 'Sunny', 28);
        results.push(result);
      }

      // Sunny weather should suggest bright/energetic/refreshing cocktails
      const appropriateForSunny = results.some(cocktail => 
        cocktail.mood === 'bright' ||
        cocktail.mood === 'energetic' ||
        cocktail.mood === 'refreshing'
      );

      expect(appropriateForSunny).toBe(true);
    });

    it('should handle unknown country codes gracefully', async () => {
      const result = await getCocktailSuggestion('zz', 'Sunny', 20);

      // Should still return a valid cocktail even for unknown country codes
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('ingredients');
      expect(result).toHaveProperty('recipe');
      expect(result.name.length).toBeGreaterThan(0);
    });

    it('should handle extreme temperatures appropriately', async () => {
      // Very hot temperature
      const hotResult = await getCocktailSuggestion('ae', 'Sunny', 45);
      
      // Very cold temperature
      const coldResult = await getCocktailSuggestion('ru', 'Snow', -20);

      // Hot weather should not suggest warming cocktails
      expect(hotResult.mood).not.toBe('warming');
      expect(hotResult.mood).not.toBe('cozy');

      // Cold weather should not suggest cooling cocktails
      expect(coldResult.mood).not.toBe('cooling');
      expect(coldResult.mood).not.toBe('light');
    });

    it('should suggest appropriate cocktails for different weather conditions', async () => {
      const weatherConditions = [
        { condition: 'Thunderstorms', expectedMoods: ['bold', 'intense', 'complex'] },
        { condition: 'Fog', expectedMoods: ['mysterious', 'subtle', 'complex'] },
        { condition: 'Cloudy', expectedMoods: ['balanced', 'versatile', 'refreshing'] },
        { condition: 'Windy', expectedMoods: ['dynamic', 'earthy', 'complex'] }
      ];

      for (const weather of weatherConditions) {
        const results = [];
        
        for (let i = 0; i < 10; i++) {
          const result = await getCocktailSuggestion('us', weather.condition, 20);
          results.push(result);
        }

        // Check if any of the results have appropriate moods
        const hasAppropriateMood = results.some(cocktail => 
          weather.expectedMoods.includes(cocktail.mood)
        );

        expect(hasAppropriateMood).toBe(true);
      }
    });

    it('should return consistent results for the same inputs', async () => {
      // While there's randomness, the function should always return valid cocktails
      const results = [];
      
      for (let i = 0; i < 5; i++) {
        const result = await getCocktailSuggestion('fr', 'Partly cloudy', 18);
        results.push(result);
      }

      // All results should be valid cocktails
      results.forEach(cocktail => {
        expect(cocktail.name).toBeTruthy();
        expect(cocktail.ingredients.length).toBeGreaterThan(0);
        expect(cocktail.recipe.length).toBeGreaterThan(0);
        expect(cocktail.imageUrl).toMatch(/^https?:\/\//);
      });
    });

    it('should prioritize country preferences when available', async () => {
      const japanResults = [];
      
      // Test Japan (should prefer sake/whisky)
      for (let i = 0; i < 15; i++) {
        const result = await getCocktailSuggestion('jp', 'Cloudy', 20);
        japanResults.push(result);
      }

      // Should have some sake or whisky-based cocktails for Japan
      const hasJapaneseSpirits = japanResults.some(cocktail => 
        cocktail.ingredients.some(ingredient => 
          ingredient.toLowerCase().includes('sake') ||
          ingredient.toLowerCase().includes('whisky') ||
          ingredient.toLowerCase().includes('whiskey')
        )
      );

      expect(hasJapaneseSpirits).toBe(true);
    });

    it('should handle case-insensitive weather conditions', async () => {
      const result1 = await getCocktailSuggestion('us', 'RAIN', 15);
      const result2 = await getCocktailSuggestion('us', 'rain', 15);
      const result3 = await getCocktailSuggestion('us', 'Rain', 15);

      // All should return valid cocktails regardless of case
      [result1, result2, result3].forEach(result => {
        expect(result.name).toBeTruthy();
        expect(result.ingredients.length).toBeGreaterThan(0);
      });
    });

    it('should return different cocktails for different mood combinations', async () => {
      const combinations = [
        { country: 'us', weather: 'Snow', temp: -10 },
        { country: 'mx', weather: 'Sunny', temp: 35 },
        { country: 'gb', weather: 'Rain', temp: 8 },
        { country: 'au', weather: 'Sunny', temp: 30 }
      ];

      const results = [];
      
      for (const combo of combinations) {
        const result = await getCocktailSuggestion(combo.country, combo.weather, combo.temp);
        results.push({
          combination: combo,
          cocktail: result
        });
      }

      // Results should vary based on different inputs
      const uniqueNames = new Set(results.map(r => r.cocktail.name));
      expect(uniqueNames.size).toBeGreaterThan(1);
    });

    it('should always return a valid image URL', async () => {
      const results = [];
      
      for (let i = 0; i < 10; i++) {
        const result = await getCocktailSuggestion('us', 'Sunny', 25);
        results.push(result);
      }

      results.forEach(cocktail => {
        expect(cocktail.imageUrl).toMatch(/^https:\/\/images\.pexels\.com\//);
      });
    });

    it('should handle temperature edge cases', async () => {
      const edgeCases = [
        { temp: 0, weather: 'Snow' },
        { temp: 5, weather: 'Rain' },
        { temp: 25, weather: 'Sunny' },
        { temp: 40, weather: 'Sunny' }
      ];

      for (const testCase of edgeCases) {
        const result = await getCocktailSuggestion('us', testCase.weather, testCase.temp);
        
        expect(result).toBeTruthy();
        expect(result.name).toBeTruthy();
        
        // Temperature-appropriate suggestions
        if (testCase.temp <= 5) {
          // Cold weather - should not suggest cooling cocktails
          expect(result.mood).not.toBe('cooling');
          expect(result.mood).not.toBe('light');
        } else if (testCase.temp >= 30) {
          // Hot weather - should not suggest warming cocktails
          expect(result.mood).not.toBe('warming');
          expect(result.mood).not.toBe('cozy');
        }
      }
    });
  });
});