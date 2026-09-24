import React, { createContext, useContext, useState, useCallback } from "react";

export type TeamFilterType = "all" | "compliant" | "expiring-soon" | "incomplete" | null;
export type FocusModeType = "all" | "needs-attention";

interface SavedView {
  id: string;
  name: string;
  filter: TeamFilterType;
  focusMode: FocusModeType;
}

interface TeamFilterContextValue {
  activeFilter: TeamFilterType;
  setActiveFilter: (filter: TeamFilterType) => void;
  clearFilter: () => void;
  focusMode: FocusModeType;
  setFocusMode: (mode: FocusModeType) => void;
  savedViews: SavedView[];
  activeSavedView: string | null;
  setActiveSavedView: (viewId: string | null) => void;
}

const defaultSavedViews: SavedView[] = [
  { id: "needs-attention", name: "Needs Attention", filter: "incomplete", focusMode: "needs-attention" },
  { id: "expiring-this-month", name: "Expiring Soon", filter: "expiring-soon", focusMode: "all" },
  { id: "all-compliant", name: "Fully Compliant", filter: "compliant", focusMode: "all" },
];

const TeamFilterContext = createContext<TeamFilterContextValue | undefined>(undefined);

export const TeamFilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeFilter, setActiveFilterState] = useState<TeamFilterType>(null);
  const [focusMode, setFocusMode] = useState<FocusModeType>("all");
  const [activeSavedView, setActiveSavedView] = useState<string | null>(null);

  const setActiveFilter = useCallback((filter: TeamFilterType) => {
    setActiveFilterState(filter);
    setActiveSavedView(null); // Clear saved view when manually setting filter
  }, []);

  const clearFilter = useCallback(() => {
    setActiveFilterState(null);
    setFocusMode("all");
    setActiveSavedView(null);
  }, []);

  return (
    <TeamFilterContext.Provider
      value={{
        activeFilter,
        setActiveFilter,
        clearFilter,
        focusMode,
        setFocusMode,
        savedViews: defaultSavedViews,
        activeSavedView,
        setActiveSavedView,
      }}
    >
      {children}
    </TeamFilterContext.Provider>
  );
};

export const useTeamFilter = () => {
  const context = useContext(TeamFilterContext);
  if (!context) {
    throw new Error("useTeamFilter must be used within a TeamFilterProvider");
  }
  return context;
};
