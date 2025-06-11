import axios from 'axios';
import type { WeatherData } from '../store/appStore';
import { captureError, addBreadcrumb } from '../lib/sentry';

const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
const BASE_URL = 'https://my.meteoblue.com/packages/basic-1h_basic-day';

// Meteoblue pictocode to weather condition mapping
const pictocodeToCondition: Record<number, string> = {
  1: 'Sunny',
  2: 'Partly cloudy',
  3: 'Partly cloudy',
  4: 'Cloudy',
  5: 'Rain showers',
  6: 'Rain showers',
  7: 'Sleet showers',
  8: 'Snow showers',
  9: 'Thunderstorms',
  10: 'Fog',
  11: 'Light rain',
  12: 'Rain',
  13: 'Light snow',
  14: 'Snow',
  15: 'Heavy snow',
  16: 'Sleet',
  17: 'Hail',
  18: 'Thunderstorms with rain',
  19: 'Thunderstorms with snow',
  20: 'Thunderstorms with hail',
  21: 'Clear night',
  22: 'Partly cloudy night',
  23: 'Partly cloudy night',
  24: 'Cloudy night',
  25: 'Rain showers night',
  26: 'Rain showers night',
  27: 'Sleet showers night',
  28: 'Snow showers night',
  29: 'Thunderstorms night',
  30: 'Fog night',
  31: 'Light rain night',
  32: 'Rain night',
  33: 'Light snow night',
  34: 'Snow night',
  35: 'Heavy snow night'
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
        apikey: API_KEY,
        lat: latitude,
        lon: longitude,
        format: 'json',
      },
    });

    const { metadata, data_1h } = response.data;

    // Get current hour data (first element in arrays)
    const currentTemp = data_1h.temperature[0];
    const currentHumidity = data_1h.relativehumidity[0];
    const currentWindSpeed = data_1h.windspeed[0] * 3.6; // Convert m/s to km/h
    const currentPictocode = data_1h.pictocode[0];
    const currentIsDaylight = data_1h.isdaylight[0];
    const currentTime = data_1h.time[0];

    // Convert pictocode to condition
    const condition = pictocodeToCondition[currentPictocode] || 'Unknown';

    // Format local time
    const localTime = formatLocalTime(currentTime, metadata.utc_timeoffset);

    const weatherData: WeatherData = {
      city,
      country,
      latitude,
      longitude,
      temperature: Math.round(currentTemp),
      condition,
      icon: `/icons/meteoblue-${currentPictocode}.png`,
      humidity: Math.round(currentHumidity),
      windSpeed: Math.round(currentWindSpeed),
      localTime,
      isDay: currentIsDaylight === 1,
    };

    addBreadcrumb(`Successfully fetched weather data for ${city}`, 'weather', {
      temperature: weatherData.temperature,
      condition: weatherData.condition,
    });

    return weatherData;
  } catch (error) {
    captureError(error as Error, {
      service: 'meteoblue',
      city,
      country,
      latitude,
      longitude,
      apiKey: API_KEY ? 'present' : 'missing',
    });
    console.error('Error fetching weather data:', error);
    
    // Fallback to mock data
    addBreadcrumb(`Meteoblue API failed, using mock weather data for ${city}, ${country}`, 'weather');
    return getMockWeatherData(latitude, longitude, city, country);
  }
}

function formatLocalTime(timeString: string, utcOffset: number): string {
  try {
    // Parse the time string (format: "2025-06-10 00:00")
    const date = new Date(timeString + 'Z'); // Add Z to treat as UTC
    
    // Add the UTC offset (in hours)
    date.setHours(date.getHours() + utcOffset);
    
    return date.toLocaleString('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
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
export function getMockWeatherData(latitude: number, longitude: number, city: string, country: string): WeatherData {
  addBreadcrumb(`Using mock weather data for ${city}, ${country}`, 'weather');
  
  // Generate random weather conditions
  const conditions = ['Sunny', 'Partly cloudy', 'Cloudy', 'Overcast', 'Fog', 'Light rain', 'Rain', 'Light snow', 'Snow'];
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
    latitude,
    longitude,
    temperature,
    condition: randomCondition,
    icon: `/icons/${randomCondition.toLowerCase().replace(/ /g, '-')}.png`,
    humidity: Math.floor(Math.random() * 100),
    windSpeed: Math.floor(Math.random() * 30),
    localTime,
    isDay,
  };
}