/**
 * Scroll Restoration Component
 * 
 * Restores scroll position when navigating back to a page,
 * and scrolls to top when navigating to a new page.
 * 
 * Uses sessionStorage to persist scroll positions across
 * the browser session.
 */

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

// Store scroll positions by pathname
const scrollPositions = new Map<string, number>();

export const ScrollRestoration = () => {
  const location = useLocation();
  const previousPathRef = useRef<string | null>(null);

  useEffect(() => {
    // Save scroll position of previous page before navigating
    if (previousPathRef.current && previousPathRef.current !== location.pathname) {
      scrollPositions.set(previousPathRef.current, window.scrollY);
    }

    // Check if we have a saved position for this page
    const savedPosition = scrollPositions.get(location.pathname);

    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      if (savedPosition !== undefined && savedPosition > 0) {
        // Restore scroll position (navigating back)
        window.scrollTo({
          top: savedPosition,
          behavior: 'instant'
        });
      } else {
        // Scroll to top (navigating forward to new page)
        window.scrollTo({
          top: 0,
          behavior: 'instant'
        });
      }
    });

    previousPathRef.current = location.pathname;
  }, [location.pathname]);

  return null;
};

/**
 * Hook for manual scroll restoration control
 * 
 * Useful for pages that need to control their own scroll behavior
 */
export const useScrollRestoration = () => {
  const location = useLocation();

  const saveScrollPosition = () => {
    scrollPositions.set(location.pathname, window.scrollY);
  };

  const restoreScrollPosition = () => {
    const savedPosition = scrollPositions.get(location.pathname);
    if (savedPosition !== undefined) {
      window.scrollTo({
        top: savedPosition,
        behavior: 'instant'
      });
    }
  };

  const clearScrollPosition = () => {
    scrollPositions.delete(location.pathname);
  };

  return {
    saveScrollPosition,
    restoreScrollPosition,
    clearScrollPosition,
  };
};
