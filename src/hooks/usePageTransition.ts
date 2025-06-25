import { MotionProps } from 'framer-motion';

export function usePageTransition(page: string, transitionDirection: string): MotionProps {
  return {
    initial: { y: transitionDirection, opacity: 1 },
    animate: { y: 0, opacity: 1 },
    exit: { y: transitionDirection, opacity: 1 },
    transition: { duration: 0.7, ease: 'easeInOut' },
  };
}