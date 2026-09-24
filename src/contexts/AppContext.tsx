/**
 * Application Context - Production Mode
 * 
 * This context provides core application state management.
 * All data comes from real database sources - no demo fallbacks.
 */

import { createContext, useContext, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

interface AppContextType {
  // No demo restrictions - all features available
  isAuthenticated: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    // Return default when outside provider (e.g., landing page)
    return {
      isAuthenticated: false,
    };
  }
  return context;
};

// (Legacy useDemoContext / DemoProvider re-exports removed —
//  see @/contexts/TourModeContext for the single source of truth.)

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider = ({ children }: AppProviderProps) => {
  const location = useLocation();
  const isLandingPage = location.pathname === '/';

  return (
    <AppContext.Provider value={{ isAuthenticated: !isLandingPage }}>
      {children}
    </AppContext.Provider>
  );
};

/**
 * @deprecated Alias for backward compatibility during transition
 */
export const DemoProvider = AppProvider;
