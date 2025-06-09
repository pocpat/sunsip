import axios from 'axios';
import type { WeatherData } from '../store/appStore';
import { captureError, addBreadcrumb } from '../lib/sentry';

const API_KEY = import.meta.env.VITE_WEATHER_API_KEY || 'your-weather-api-key';
const BASE_URL = 'https://api.weatherapi.com/v1';

export async function getWeatherData(city: string, country: string): Promise<WeatherData> {
  try {
    addBreadcrumb(`Fetching weather data for ${city}, ${country}`, 'weather');
    
    const response = await axios.get(`${BASE_URL}/current.json`, {
      params: {
        key: API_KEY,
        q: `${city},${country}`,
      },
    });

    const { location, current } = response.data;

    const weatherData = {
      city: location.name,
      country: location.country,
      temperature: current.temp_c,
      condition: current.condition.text,
      icon: current.condition.icon,
      humidity: current.humidity,
      windSpeed: current.wind_kph,
      localTime: location.localtime,
      isDay: current.is_day === 1,
    };

    addBreadcrumb(`Successfully fetched weather data for ${city}`, 'weather', {
      temperature: weatherData.temperature,
      condition: weatherData.condition,
    });

    return weatherData;
  } catch (error) {
    captureError(error as Error, {
      service: 'weather',
      city,
      country,
      apiKey: API_KEY ? 'present' : 'missing',
    });
    console.error('Error fetching weather data:', error);
    throw new Error('Failed to fetch weather data');
  }
}

// For MVP, use this function to get mock weather data when API key is not available
export function getMockWeatherData(city: string, country: string): WeatherData {
  addBreadcrumb(`Using mock weather data for ${city}, ${country}`, 'weather');
  
  // Generate random weather conditions
  const conditions = ['Sunny', 'Partly cloudy', 'Cloudy', 'Overcast', 'Mist', 'Patchy rain possible', 'Light rain', 'Moderate rain', 'Heavy rain', 'Light snow', 'Moderate snow', 'Heavy snow'];
  const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
  
  // Random temperature based on condition
  let tempRange;
  if (randomCondition.includes('Snow')) {
    tempRange = [-10, 5];
  } else if (randomCondition.includes('Rain')) {
    tempRange = [5, 20];
  } else if (randomCondition === 'Sunny') {
    tempRange = [20, 35];
  } else {
    tempRange = [10, 25];
  }
  
  const temperature = Math.floor(Math.random() * (tempRange[1] - tempRange[0])) + tempRange[0];
  
  // Random time of day
  const isDay = Math.random() > 0.5;
  
  // Create a date object for local time
  const now = new Date();
  const localTime = now.toLocaleString('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  
  return {
    city,
    country,
    temperature,
    condition: randomCondition,
    icon: `/icons/${randomCondition.toLowerCase().replace(/ /g, '-')}.png`,
    humidity: Math.floor(Math.random() * 100),
    windSpeed: Math.floor(Math.random() * 30),
    localTime,
    isDay,
  };
}