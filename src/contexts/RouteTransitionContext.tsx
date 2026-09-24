import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

interface RouteTransitionContextType {
  isTransitioning: boolean;
  isPageReady: boolean;
  markPageReady: () => void;
}

const RouteTransitionContext = createContext<RouteTransitionContextType | undefined>(undefined);

export const useRouteTransition = () => {
  const context = useContext(RouteTransitionContext);
  if (!context) {
    return { isTransitioning: false, isPageReady: true, markPageReady: () => {} };
  }
  return context;
};

interface RouteTransitionProviderProps {
  children: ReactNode;
  minDuration?: number;
}

/**
 * Route Transition Provider — Instant feel
 * 
 * Reduced to near-zero transition overhead.
 * Shows a thin progress bar for ~80ms during lazy-load only.
 * No blocking, no delays for cached routes.
 */
export const RouteTransitionProvider = ({ 
  children, 
  minDuration = 80
}: RouteTransitionProviderProps) => {
  const location = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPageReady, setIsPageReady] = useState(true);
  const previousPathRef = useRef(location.pathname);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const markPageReady = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsTransitioning(false);
    setIsPageReady(true);
  }, []);

  useEffect(() => {
    if (location.pathname !== previousPathRef.current) {
      if (timerRef.current) clearTimeout(timerRef.current);

      // Immediately mark page as ready — no fade-out delay
      setIsPageReady(true);
      setIsTransitioning(true);

      previousPathRef.current = location.pathname;

      // Auto-resolve after minDuration
      timerRef.current = setTimeout(() => {
        setIsTransitioning(false);
      }, minDuration);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [location.pathname, minDuration]);

  return (
    <RouteTransitionContext.Provider value={{ isTransitioning, isPageReady, markPageReady }}>
      {children}
    </RouteTransitionContext.Provider>
  );
};
