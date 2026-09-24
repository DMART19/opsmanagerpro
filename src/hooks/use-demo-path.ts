/**
 * useDemoPath — thin wrapper over `useTourMode`.
 *
 * `getPath()` preserves `?tour=1` when the tour is active, so every
 * `<Link to={getPath(...)}>` and `navigate(getPath(...))` site keeps
 * the visitor inside the walkthrough.
 */
import { useLocation } from 'react-router-dom';
import { useCallback } from 'react';
import { useTourMode } from '@/contexts/TourModeContext';

export const useDemoPath = () => {
  const location = useLocation();
  const { isTourMode, withTour } = useTourMode();
  const getPath = useCallback((path: string): string => withTour(path), [withTour]);
  const isActive = useCallback(
    (path: string): boolean => location.pathname === path,
    [location.pathname]
  );
  return { isTourMode, isDemo: isTourMode, getPath, isActive };
};
