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
    // Always animate chair, regardless of preview mode
    chairControls.start({
      rotate: [0, -4, 0],
      transition: {
        duration: 4,
        ease: "easeInOut",
        repeat: 3,
        repeatType: "reverse",
      }
    });
  }, [chairControls]);

  useEffect(() => {
    // Always track mouse movement for parallax effects
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
    // Only show weather animations if not in preview mode and we have weather data
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

  // Enable full parallax effects for all modes
  const parallaxMultiplier = 1;

  return (
    <div className="relative w-full h-full overflow-hidden font-inter"> 
      <motion.div 
        className="absolute inset-0 rounded-lg"
        style={{
          backgroundColor: "#8B9A7A",
          x: mousePosition.x * 2 * parallaxMultiplier,
          y: mousePosition.y * 2 * parallaxMultiplier
        }}
      />

      {/* City view window - positioned within the frame */}
      <div className="absolute top-[36%] left-[47%] w-[32%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-md overflow-hidden z-0">
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          {isPreview || !cityImageUrl ? (
            // Blue glass placeholder for preview or when no city image
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

      {/* Frame/Wall structure - lowest layer */}
      <motion.div
        className="absolute inset-0 w-full h-full z-10"
        style={{
          x: mousePosition.x * 1 * parallaxMultiplier,
          y: mousePosition.y * 1 * parallaxMultiplier
        }}
      >
        <img
          src="/images/frame10.png"
          alt="Room frame and wall"
          className="w-full h-full object-contain pointer-events-none"
        />
      </motion.div>

      {/* Plant decoration - behind table, in front of frame */}
      <motion.div
        className="absolute inset-0 w-full h-full z-30 -left-9"
        style={{
          x: mousePosition.x * 3 * parallaxMultiplier,
          y: mousePosition.y * 5 * parallaxMultiplier
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
          x: mousePosition.x * 5 * parallaxMultiplier,
          y: mousePosition.y * 7 * parallaxMultiplier
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
            className="absolute right-[10%] bottom-[20%] w-[16%] rounded-lg shadow-lg z-10"
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
          transformOrigin: "25% 100%",
          x: mousePosition.x * 7 * parallaxMultiplier,
          y: mousePosition.y * 9 * parallaxMultiplier,
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