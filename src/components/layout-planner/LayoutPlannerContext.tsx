import { createContext, useCallback, useContext, useMemo, useState } from "react";

export interface PlannerSummary {
  /** Items in inventory available for pallet building */
  inventory?: number;
  /** Saved pallet builds */
  palletsBuilt?: number;
  /** Pallets placed on the active trailer */
  loaded?: number;
  /** Total weight loaded (lbs) */
  weightLbs?: number;
  /** Trailer fill % (0-100) */
  utilization?: number;
  /** Max weight of selected trailer (lbs) */
  maxWeightLbs?: number;
  /** Pallet capacity of selected trailer */
  palletCapacity?: number;
  /** Aggregated warning count */
  warnings?: number;
  /** Load score 0-100 */
  loadScore?: number;
}

interface Ctx {
  summary: PlannerSummary;
  setSummary: (partial: PlannerSummary) => void;
}

const LayoutPlannerCtx = createContext<Ctx | null>(null);

export const LayoutPlannerProvider = ({ children }: { children: React.ReactNode }) => {
  const [summary, setSummaryState] = useState<PlannerSummary>({});
  const setSummary = useCallback((partial: PlannerSummary) => {
    setSummaryState(prev => ({ ...prev, ...partial }));
  }, []);
  const value = useMemo(() => ({ summary, setSummary }), [summary, setSummary]);
  return <LayoutPlannerCtx.Provider value={value}>{children}</LayoutPlannerCtx.Provider>;
};

export const useLayoutPlannerSummary = (): Ctx => {
  const ctx = useContext(LayoutPlannerCtx);
  // Safe default so child pages can render standalone (e.g. /pallet-builder)
  if (!ctx) return { summary: {}, setSummary: () => {} };
  return ctx;
};