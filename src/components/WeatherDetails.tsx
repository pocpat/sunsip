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
      className="glass rounded-lg p-6 shadow-lg"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-display font-bold">Weather Details</h3>
        <div className="flex items-center">
          <MapPin size={16} className="text-primary-600 mr-1" />
          <span>{weatherData.city}, {weatherData.country}</span>
        </div>
      </div>

      <div className="flex items-center mb-6">
        <div className="text-5xl font-bold mr-4">{Math.round(weatherData.temperature)}°C</div>
        <div>
          <div className="text-lg font-medium">{weatherData.condition}</div>
          <div className="flex items-center text-gray-600">
            <Clock size={14} className="mr-1" />
            <span>{weatherData.localTime}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center">
          <Wind size={18} className="text-primary-600 mr-2" />
          <div>
            <div className="text-sm text-gray-600">Wind</div>
            <div className="font-medium">{weatherData.windSpeed} km/h</div>
          </div>
        </div>
        
        <div className="flex items-center">
          <Droplets size={18} className="text-primary-600 mr-2" />
          <div>
            <div className="text-sm text-gray-600">Humidity</div>
            <div className="font-medium">{weatherData.humidity}%</div>
          </div>
        </div>
        
        <div className="flex items-center">
          <Cloud size={18} className="text-primary-600 mr-2" />
          <div>
            <div className="text-sm text-gray-600">Condition</div>
            <div className="font-medium">{weatherData.condition}</div>
          </div>
        </div>
        
        <div className="flex items-center">
          <div className={`w-4 h-4 rounded-full mr-2 ${weatherData.isDay ? 'bg-yellow-400' : 'bg-indigo-900'}`}></div>
          <div>
            <div className="text-sm text-gray-600">Time of Day</div>
            <div className="font-medium">{weatherData.isDay ? 'Daytime' : 'Night'}</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default WeatherDetails;