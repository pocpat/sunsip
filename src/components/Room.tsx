import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { motion, useAnimation } from 'framer-motion';

interface RoomProps {
  isPreview?: boolean;
}

const Room: React.FC<RoomProps> = ({ isPreview = false }) => {
  const { weatherData, cityImageUrl, cocktailData } = useAppStore();
  const [weatherAnimations, setWeatherAnimations] = useState<JSX.Element[]>([]);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const chairControls = useAnimation();

  const isDay = weatherData?.isDay ?? true;

  useEffect(() => {
    // Initial chair animation (the "rocking" rotation)
    chairControls.start({
      rotate: [0, -2, 0],
      transition: {
        duration: 4,
        ease: "easeOut",
        times: [0, 0.5, 1]
      }
    });
  }, [chairControls]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX - window.innerWidth / 2) / window.innerWidth,
        y: (e.clientY - window.innerHeight / 2) / window.innerHeight
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    if (!weatherData || isPreview) return;

    const condition = weatherData.condition.toLowerCase();
    const animations: JSX.Element[] = [];

    if (condition.includes('rain') || condition.includes('drizzle')) {
      for (let i = 0; i < 30; i++) {
        const left = `${Math.random() * 100}%`;
        const duration = 0.5 + Math.random() * 1;
        const delay = Math.random() * 2;
        animations.push(
           <motion.div
            key={`rain-${i}`}
            className="absolute rounded-full bg-blue-50 opacity-50" 
            initial={{ top: '-5%', left, width: '2px', height: '10px' }} 
            animate={{ top: '105%' }}
            transition={{
              duration,
              delay,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        );
      }
     } else if (condition.includes('snow')) {
      for (let i = 0; i < 20; i++) {
        const left = `${Math.random() * 100}%`;
        const duration = 3 + Math.random() * 3;
        const delay = Math.random() * 5;
        animations.push(
          <motion.div
            key={`snow-${i}`}
            className="absolute rounded-full bg-white opacity-80"
            initial={{ top: '-5%', left, width: '5px', height: '5px' }}
            animate={{
              top: '105%',
              x: [0, 10, -10, 5, -5, 0],
            }}
            transition={{
              duration,
              delay,
              repeat: Infinity,
              ease: 'linear',
              x: {
                duration: 3,
                repeat: Infinity,
                repeatType: 'reverse',
              },
            }}
          />
        );
      }
    }
    setWeatherAnimations(animations);
  }, [weatherData, isPreview]);

  // For preview mode, show the room without requiring data
  const showRoom = isPreview || (weatherData && cityImageUrl && cocktailData);

  if (!showRoom) {
    return (
      <div className="relative w-full aspect-[16/9] overflow-hidden bg-gray-100 rounded-lg shadow-xl font-inter flex items-center justify-center">
        <div className="text-gray-500 text-lg">Loading room...</div>
      </div>
    );
  }

  return (
<div className="relative w-full h-full overflow-hidden font-inter"> 
       <motion.div 
        className="absolute inset-0 rounded-lg"
        style={{
          backgroundColor: "#8B9A7A", // Warm sage green background
          x: mousePosition.x * 2,
          y: mousePosition.y * 2
        }}
      />

      {/* Frame/Wall structure - lowest layer */}
      <motion.div
        className="absolute inset-0 w-full h-full z-10"
        style={{
          x: mousePosition.x * 1,
          y: mousePosition.y * 1
        }}
      >
        <img
          src="/images/frame10.png"
          alt="Room frame and wall"
          className="w-full h-full object-contain pointer-events-none"
        />
      </motion.div>

      {/* City view window - positioned within the frame */}
      <div className="absolute top-[36%] left-[47%] w-[32%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-md overflow-hidden z-0">
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          {isPreview ? (
            // Blue glass placeholder for preview
            <div 
              className="absolute inset-0 w-full h-full"
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 50%, #1e3a8a 100%)',
                opacity: 0.8
              }}
            />
          ) : (
            <>
              <img
                src={cityImageUrl}
                alt={`${weatherData?.city} with ${weatherData?.condition}`}
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* Weather animations overlay */}
              <div className="absolute inset-0">
                {weatherAnimations}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Plant decoration - behind table, in front of frame */}
      <motion.div
        className="absolute inset-0  w-full h-full z-30 -left-9"
        style={{
          x: mousePosition.x * 8,
          y: mousePosition.y * 8
        }}
      >
        <img
          src="/images/plant10.png"
          alt="Plant decoration"
          className="w-full h-full object-contain pointer-events-none"
        />
      </motion.div>

      {/* Table with cocktail - middle layer */}
      <motion.div
        className="absolute inset-0 w-full h-full z-40"
        style={{
          x: mousePosition.x * 12,
          y: mousePosition.y * 12
        }}
      >
        <img
          src="/images/table10.png"
          alt="Table with decor"
          className="w-full h-full object-contain"
        />
        
        {/* Cocktail positioned on the table - only show if not preview and data exists */}
        {!isPreview && cocktailData && (
          <motion.img
            src={cocktailData.imageUrl}
            alt={cocktailData.name}
            className="absolute top-[42%] right-[10%] w-[16%] rounded-lg shadow-lg z-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          />
        )}
      </motion.div>

      {/* Chair in front - highest layer */}
      <motion.div
        className="absolute inset-0 top-[5%] w-full h-full z-50"
        style={{
          transformOrigin: "left bottom", // or "0% 100%"
          x: mousePosition.x * 20,
          y: mousePosition.y * 20,
         
        }}
        animate={chairControls}
      >
        <img
          src="/images/chair10.png"
          alt="Chair"
          className="w-full h-full object-contain"
        />
      </motion.div>
    </div>
  );
};

export default Room;