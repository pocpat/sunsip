import React from 'react';
import { useAppStore } from '../store/appStore';
import { Cloud, Droplets, Wind, Clock, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

const WeatherDetails: React.FC = () => {
  const { weatherData } = useAppStore();

  if (!weatherData) {
    return null;
  }

  return (
    <motion.div 
      className="glass rounded-lg p-4 sm:p-6 shadow-lg"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 space-y-2 sm:space-y-0">
        <h3 className="text-lg sm:text-xl font-display font-bold">Weather Details</h3>
        <div className="flex items-center text-sm sm:text-base">
          <MapPin size={14} className="text-primary-600 mr-1 flex-shrink-0" />
          <span className="truncate">{weatherData.city}, {weatherData.country}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center mb-4 sm:mb-6 space-y-2 sm:space-y-0">
        <div className="text-4xl sm:text-5xl font-bold mr-0 sm:mr-4">
          {Math.round(weatherData.temperature)}°C
        </div>
        <div className="flex-1">
          <div className="text-base sm:text-lg font-medium">{weatherData.condition}</div>
          <div className="flex items-center text-gray-600 text-sm">
            <Clock size={12} className="mr-1 flex-shrink-0" />
            <span className="truncate">{weatherData.localTime}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="flex items-center">
          <Wind size={16} className="text-primary-600 mr-2 flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-xs sm:text-sm text-gray-600">Wind</div>
            <div className="font-medium text-sm sm:text-base truncate">{weatherData.windSpeed} km/h</div>
          </div>
        </div>
        
        <div className="flex items-center">
          <Droplets size={16} className="text-primary-600 mr-2 flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-xs sm:text-sm text-gray-600">Humidity</div>
            <div className="font-medium text-sm sm:text-base">{weatherData.humidity}%</div>
          </div>
        </div>
        
        <div className="flex items-center">
          <Cloud size={16} className="text-primary-600 mr-2 flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-xs sm:text-sm text-gray-600">Condition</div>
            <div className="font-medium text-sm sm:text-base truncate">{weatherData.condition}</div>
          </div>
        </div>
        
        <div className="flex items-center">
          <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full mr-2 flex-shrink-0 ${weatherData.isDay ? 'bg-yellow-400' : 'bg-indigo-900'}`}></div>
          <div className="min-w-0">
            <div className="text-xs sm:text-sm text-gray-600">Time of Day</div>
            <div className="font-medium text-sm sm:text-base">{weatherData.isDay ? 'Daytime' : 'Night'}</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default WeatherDetails;