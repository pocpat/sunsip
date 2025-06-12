import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { motion, useAnimation } from 'framer-motion';

const Room: React.FC = () => {
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
    if (!weatherData) return;

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
  }, [weatherData]);

  if (!weatherData || !cityImageUrl || !cocktailData) {
    return null;
  }

  return (
 <div className="relative w-full max-w-4xl mx-auto aspect-[16/9] overflow-hidden bg-gray-100 rounded-lg shadow-xl font-inter">
      {/* Background layer  */}
      <motion.div 
        className="absolute inset-0 from-amber-50 to-amber-100 rounded-lg"
        style={{
          backgroundColor: "#819077",
          // x and y are fine here because this is a motion.div
          x: mousePosition.x * 0,
          y: mousePosition.y * 0
        }}
      />
      {/* Frame image covering the whole area */}
     <img
  src="/images/frame10.png"
  alt="Window frame"
  className="absolute inset-0 w-full h-full object-contain z-10 pointer-events-none"
/>
      {/* City view with window frame */}
      <div className="absolute top-[38%] left-[47%] w-[38%] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-md overflow-hidden ">
        {/* Inner div for the city image to ensure it fits the window pane */}
        <div className="absolute top-[15%] left-[10%] w-[80%] h-[70%] overflow-hidden">
          <img
            src={cityImageUrl}
            alt={`${weatherData.city} with ${weatherData.condition}`}
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Weather animations should also go inside this inner 'pane' div */}
          <div className="absolute inset-0">
            {weatherAnimations}
          </div>
        </div>
      </div>

      {/* Plant image in front of frame, behind table */}
<motion.div
  className="absolute inset-0 w-full h-full -left-10 z-20 top-2 pointer-events-none"
  style={{
    x: mousePosition.x * 10,
    y: mousePosition.y * 10
  }}
>
  <img
    src="/images/plant10.png"
    alt="Plant decor"
    className="w-full h-full object-contain"
  />
</motion.div>
      {/* Table with cocktail - Now uses table10.png */}
      <motion.div
        className="absolute -bottom-2 left-0 w-full z-30"
        style={{
          x: mousePosition.x * 20,
          y: mousePosition.y * 20
        }}
      >
        <img
          src="/images/table10.png"
          alt="Table with plants and decor"
          className="w-full h-auto object-cover"
        />
        <motion.img
          src={cocktailData.imageUrl}
          alt={cocktailData.name}
          className="absolute top-[36%] right-[9%] w-[18%] rounded-lg shadow-lg"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        />
      </motion.div>

      {/* Chair in front */}
      <motion.div
        className="absolute bottom-[-2%] left-[4%] w-[100%] z-40"
        style={{
          x: mousePosition.x * 30,
          y: mousePosition.y * 30,
          transformOrigin: "0% 80%"
        }}
        animate={chairControls}
      >
        <img
          src="/images/chair10.png"
          alt="Chair"
          className="w-full"
        />
      </motion.div>
    </div>  );
};

export default Room;