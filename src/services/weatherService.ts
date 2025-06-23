import axios from 'axios';
import type { WeatherData } from '../store/appStore';
import { captureError, addBreadcrumb } from '../lib/sentry';

const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';

// OpenWeatherMap weather condition mapping
const conditionMapping: Record<string, string> = {
  'Clear': 'Sunny',
  'Clouds': 'Cloudy',
  'Rain': 'Rain',
  'Drizzle': 'Light rain',
  'Thunderstorm': 'Thunderstorms',
  'Snow': 'Snow',
  'Mist': 'Fog',
  'Smoke': 'Fog',
  'Haze': 'Fog',
  'Dust': 'Fog',
  'Fog': 'Fog',
  'Sand': 'Fog',
  'Ash': 'Fog',
  'Squall': 'Windy',
  'Tornado': 'Stormy',
};

export async function getWeatherData(latitude: number, longitude: number, city: string, country: string): Promise<WeatherData> {
  // If no API key is provided, use mock data instead of making API calls
  if (!API_KEY || API_KEY === 'your-weather-api-key') {
    addBreadcrumb(`No valid API key found, using mock weather data for ${city}, ${country}`, 'weather');
    return getMockWeatherData(latitude, longitude, city, country);
  }

  try {
    addBreadcrumb(`Fetching weather data for ${city}, ${country} (${latitude}, ${longitude})`, 'weather');
    
    const response = await axios.get(BASE_URL, {
      params: {
        lat: latitude,
        lon: longitude,
        appid: API_KEY,
        units: 'metric', // Get temperature in Celsius
      },
    });

    const data = response.data;

    // Extract weather data
    const temperature = Math.round(data.main.temp);
    const humidity = data.main.humidity;
    const windSpeed = Math.round(data.wind.speed * 3.6); // Convert m/s to km/h
    const weatherMain = data.weather[0].main;
    const weatherDescription = data.weather[0].description;
    const weatherIcon = data.weather[0].icon;
    
    // Map OpenWeatherMap condition to our condition
    const condition = conditionMapping[weatherMain] || weatherMain;
    
    // Determine if it's day or night
    const currentTime = data.dt;
    const sunrise = data.sys.sunrise;
    const sunset = data.sys.sunset;
    const isDay = currentTime >= sunrise && currentTime <= sunset;
    
    // Format local time
    const localTime = formatLocalTime(currentTime, data.timezone);

    const weatherData: WeatherData = {
      city,
      country,
      latitude,
      longitude,
      temperature,
      condition,
      icon: `https://openweathermap.org/img/wn/${weatherIcon}@2x.png`,
      humidity,
      windSpeed,
      localTime,
      isDay,
    };

    addBreadcrumb(`Successfully fetched weather data for ${city}`, 'weather', {
      temperature: weatherData.temperature,
      condition: weatherData.condition,
    });

    return weatherData;
  } catch (error) {
    captureError(error as Error, {
      service: 'openweathermap',
      city,
      country,
      latitude,
      longitude,
      apiKey: API_KEY ? 'present' : 'missing',
    });
    console.error('Error fetching weather data:', error);
    
    // Fallback to mock data
    addBreadcrumb(`OpenWeatherMap API failed, using mock weather data for ${city}, ${country}`, 'weather');
    return getMockWeatherData(latitude, longitude, city, country);
  }
}

function formatLocalTime(unixTimestamp: number, timezoneOffset: number): string {
  try {
    // Create date from Unix timestamp (in seconds)
    const date = new Date(unixTimestamp * 1000);
    
    // Add timezone offset (in seconds)
    const localDate = new Date(date.getTime() + (timezoneOffset * 1000));
    
    return localDate.toLocaleString('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC', // Use UTC since we already applied the offset
    });
  } catch (error) {
    // Fallback to current time if parsing fails
    return new Date().toLocaleString('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
}

// For MVP, use this function to get mock weather data when API key is not available
function getMockWeatherData(latitude: number, longitude: number, city: string, country: string): WeatherData {
  addBreadcrumb(`Using mock weather data for ${city}, ${country}`, 'weather');
  
  // Generate random weather conditions with realistic temperature ranges
  const weatherConditions = [
    { condition: 'Sunny', tempRange: [18, 35] },
    { condition: 'Partly cloudy', tempRange: [12, 28] },
    { condition: 'Cloudy', tempRange: [8, 22] },
    { condition: 'Overcast', tempRange: [5, 18] },
    { condition: 'Fog', tempRange: [2, 15] },
    { condition: 'Light rain', tempRange: [8, 20] },
    { condition: 'Rain', tempRange: [5, 18] },
    { condition: 'Light snow', tempRange: [-8, 2] },
    { condition: 'Snow', tempRange: [-15, 0] },
  ];
  
  // Randomly select a weather condition
  const selectedWeather = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
  
  // Generate temperature within the realistic range for the condition
  const tempRange = selectedWeather.tempRange;
  const temperature = Math.floor(Math.random() * (tempRange[1] - tempRange[0] + 1)) + tempRange[0];
  
  // Adjust humidity based on weather condition
  let humidity: number;
  if (selectedWeather.condition.includes('Rain') || selectedWeather.condition === 'Fog') {
    humidity = Math.floor(Math.random() * 20) + 80; // 80-100% for wet conditions
  } else if (selectedWeather.condition.includes('Snow')) {
    humidity = Math.floor(Math.random() * 30) + 70; // 70-100% for snow
  } else if (selectedWeather.condition === 'Sunny') {
    humidity = Math.floor(Math.random() * 40) + 30; // 30-70% for sunny
  } else {
    humidity = Math.floor(Math.random() * 50) + 40; // 40-90% for other conditions
  }
  
  // Adjust wind speed based on weather condition
  let windSpeed: number;
  if (selectedWeather.condition.includes('Storm') || selectedWeather.condition.includes('Thunder')) {
    windSpeed = Math.floor(Math.random() * 20) + 20; // 20-40 km/h for storms
  } else if (selectedWeather.condition.includes('Snow') && temperature < -5) {
    windSpeed = Math.floor(Math.random() * 15) + 10; // 10-25 km/h for snow
  } else if (selectedWeather.condition === 'Fog') {
    windSpeed = Math.floor(Math.random() * 8) + 2; // 2-10 km/h for fog (low wind)
  } else {
    windSpeed = Math.floor(Math.random() * 20) + 5; // 5-25 km/h for normal conditions
  }
  
  // Determine if it's day or night (more likely to be day for better UX)
  const isDay = Math.random() > 0.3; // 70% chance of daytime
  
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
    latitude,
    longitude,
    temperature,
    condition: selectedWeather.condition,
    icon: `/icons/${selectedWeather.condition.toLowerCase().replace(/ /g, '-')}.png`,
    humidity,
    windSpeed,
    localTime,
    isDay,
  };
}