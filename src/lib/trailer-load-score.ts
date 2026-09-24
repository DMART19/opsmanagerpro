import { CustomTrailer } from "@/hooks/use-custom-trailers";
import { PlacedPallet } from "@/types/trailer-builder";
import { analyzeLoad } from "@/lib/trailer-load-analysis";

export interface TrailerLoadScore {
  /** 0-100, higher is better */
  score: number;
  utilization: number;
  totalWeight: number;
  maxWeight: number;
  fillPct: number;
  balanceLabel: "Balanced" | "Front-heavy" | "Rear-heavy" | "Side-heavy";
  balanceOk: boolean;
  warnings: number;
  criticalWarnings: number;
  topSuggestion?: string;
  /** Validated = score >= 80 AND no critical warnings */
  validated: boolean;
}

export function scoreTrailerLoad(
  trailer: CustomTrailer | null,
  placedPallets: PlacedPallet[]
): TrailerLoadScore | null {
  if (!trailer) return null;
  if (placedPallets.length === 0) {
    return {
      score: 0,
      utilization: 0,
      totalWeight: 0,
      maxWeight: trailer.max_weight,
      fillPct: 0,
      balanceLabel: "Balanced",
      balanceOk: true,
      warnings: 0,
      criticalWarnings: 0,
      validated: false,
    };
  }

  const m = analyzeLoad(trailer, placedPallets);
  const wb = m.weightBalance;

  // Balance label from center-of-gravity (0..1 normalized)
  let balanceLabel: TrailerLoadScore["balanceLabel"] = "Balanced";
  if (!wb.isBalanced) {
    const dx = wb.cogX - 0.5;
    const dy = wb.cogY - 0.5;
    if (Math.abs(dy) >= Math.abs(dx)) {
      balanceLabel = dy < 0 ? "Front-heavy" : "Rear-heavy";
    } else {
      balanceLabel = "Side-heavy";
    }
  }

  const overWeight = m.weightUtilization > 100;
  const blockingIssues = m.sequence?.blockingIssues?.length || 0;
  const criticalWarnings = (overWeight ? 1 : 0) + blockingIssues;
  const warnings = criticalWarnings + (wb.isBalanced ? 0 : 1) + (m.spaceUtilization < 40 ? 1 : 0);

  const utilGap = Math.max(0, 80 - m.spaceUtilization);
  const imbalancePct = wb.isBalanced
    ? 0
    : Math.min(50, Math.round(Math.hypot(wb.cogX - 0.5, wb.cogY - 0.5) * 100));

  const raw =
    100 -
    (criticalWarnings * 25 + (warnings - criticalWarnings) * 8 + utilGap / 2 + imbalancePct / 2);
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  let topSuggestion: string | undefined;
  if (overWeight) topSuggestion = "Trailer is over weight limit — remove or redistribute pallets.";
  else if (blockingIssues > 0) topSuggestion = "Resolve delivery-order blocking issues.";
  else if (!wb.isBalanced) topSuggestion = `Rebalance: load is ${balanceLabel.toLowerCase()}.`;
  else if (m.spaceUtilization < 60) topSuggestion = "Consolidate pallets to free usable space.";

  return {
    score,
    utilization: Math.round(m.spaceUtilization),
    totalWeight: m.totalWeight,
    maxWeight: m.totalWeight + m.remainingWeight,
    fillPct: Math.round(m.spaceUtilization),
    balanceLabel,
    balanceOk: wb.isBalanced,
    warnings,
    criticalWarnings,
    topSuggestion,
    validated: score >= 80 && criticalWarnings === 0,
  };
}