import { MotionProps } from 'framer-motion';

interface PageTransitionProps {
  initial: MotionProps['initial'];
  animate: MotionProps['animate'];
  exit: MotionProps['exit'];
  transition: MotionProps['transition'];
  style?: React.CSSProperties;
}

export const usePageTransition = (pageKey: 'landing' | 'results' | 'dashboard', currentTransitionDirection: string): PageTransitionProps => {
  const isUpTransition = currentTransitionDirection === "100%";
  const initialY = isUpTransition ? "100%" : "-100%";
  const exitY = isUpTransition ? "-100%" : "100%";

  const baseStyle: React.CSSProperties = {
    position: "absolute",
    width: "100%",
    height: "100%",
    top: 0,
    left: 0,
    overflow: "hidden",
  };

  // Default properties that apply to all transitions unless overridden
  let exitProps: MotionProps['exit'] = { y: exitY, opacity: 1 };
  let transitionProps: MotionProps['transition'] = {
    duration: 0.7,
    ease: pageKey === 'results' ? "easeOut" : "easeInOut",
  };

  // SPECIAL CASE: Apply fast fade-out ONLY when the Landing Page exits UPWARDS (i.e., during the lo -> re transition).
  if (pageKey === 'landing' && isUpTransition) {
    // Override the exit animation to include a fade-out
    exitProps.opacity = 0;
    
    // Override the transition to give opacity a faster, distinct animation
    transitionProps = {
      y: { 
        duration: 0.7, 
        ease: "easeInOut" 
      },
      opacity: { 
        duration: 0.55, 
        ease: "easeOut" 
      }
    };
  }

  return {
    initial: { y: initialY, opacity: 1 },
    animate: { y: 0, opacity: 1 },
    exit: exitProps,
    transition: transitionProps,
    style: baseStyle,
  };
};
