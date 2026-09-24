/**
 * GuidanceContext — Global guidance provider
 *
 * Wraps the app to provide adaptive guidance state to all pages/components.
 */

import { createContext, useContext, type ReactNode } from "react";
import { useAdaptiveGuidance, type GuidanceState } from "@/hooks/use-adaptive-guidance";

const GuidanceContext = createContext<GuidanceState | null>(null);

export function GuidanceProvider({ children }: { children: ReactNode }) {
  const guidance = useAdaptiveGuidance();

  return (
    <GuidanceContext.Provider value={guidance}>
      {children}
    </GuidanceContext.Provider>
  );
}

export function useGuidanceContext(): GuidanceState {
  const ctx = useContext(GuidanceContext);
  if (!ctx) {
    throw new Error("useGuidanceContext must be used within GuidanceProvider");
  }
  return ctx;
}
