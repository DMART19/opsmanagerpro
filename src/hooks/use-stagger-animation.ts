import { useEffect, useState } from 'react';

interface UseStaggerAnimationOptions {
  totalItems: number;
  staggerDelay?: number;
  initialDelay?: number;
}

/**
 * Hook to create staggered reveal animations for dashboard cards
 * Returns an array of visibility states for each item
 */
export const useStaggerAnimation = ({
  totalItems,
  staggerDelay = 80,
  initialDelay = 100,
}: UseStaggerAnimationOptions) => {
  const [visibleItems, setVisibleItems] = useState<boolean[]>(
    Array(totalItems).fill(false)
  );

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    for (let i = 0; i < totalItems; i++) {
      const timer = setTimeout(() => {
        setVisibleItems((prev) => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
      }, initialDelay + i * staggerDelay);
      
      timers.push(timer);
    }

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [totalItems, staggerDelay, initialDelay]);

  return visibleItems;
};

/**
 * Simple hook to check if an element should be visible with delay
 */
export const useDelayedVisibility = (delay: number = 100) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return isVisible;
};
