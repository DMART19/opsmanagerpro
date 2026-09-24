/**
 * Pallet Recommendations — translate validation / stability / weight-distribution
 * results into severity-tagged, plain-language recommendations.
 *
 * Severity levels:
 *   - critical    blocks save (weight exceeded, out of bounds, collision)
 *   - warning     safety/quality risk (heavy above light, near edge, unsupported stack)
 *   - optimization efficiency gain (low utilization, off-center balance)
 *
 * Confidence score: 100 − (critical*40 + warning*15 + optimization*3), clamped 0..100.
 */

import { PlacedCase } from "@/types/pallet-builder";
import { analyzeAllCases, calculateStabilityScore } from "./pallet-stability";
import { getItemValidation, getWeightDistribution } from "./pallet-spatial-warnings";

export type RecSeverity = "critical" | "warning" | "optimization";

export interface PalletRecommendation {
  id: string;
  severity: RecSeverity;
  title: string;
  why: string;
  /** Optional pure transform that returns the corrected placedCases when the fix is deterministic. */
  apply?: (cases: PlacedCase[]) => PlacedCase[];
  /** Optional case id to focus on the canvas. */
  focusCaseId?: string;
}

export interface HealthCheck {
  id: string;
  label: string;
  status: "ok" | "warning" | "critical";
  detail?: string;
}

export interface PalletHealthReport {
  status: "healthy" | "attention" | "unsafe";
  verdict: string;
  confidence: number; // 0..100
  checks: HealthCheck[];
  recommendations: PalletRecommendation[];
}

const fmt = (n: number) => n.toLocaleString();

export function buildPalletHealthReport(
  placedCases: PlacedCase[],
  palletWidth: number,
  palletLength: number,
  maxWeight: number,
  strictMode: boolean,
): PalletHealthReport {
  const checks: HealthCheck[] = [];
  const recs: PalletRecommendation[] = [];

  const totalWeight = placedCases.reduce((s, c) => s + c.weight, 0);
  const palletArea = palletWidth * palletLength;
  const usedArea = placedCases.reduce((s, c) => {
    const w = c.rotation === 90 || c.rotation === 270 ? c.length : c.width;
    const l = c.rotation === 90 || c.rotation === 270 ? c.width : c.length;
    return s + w * l;
  }, 0);
  const utilization = palletArea > 0 ? Math.round((usedArea / palletArea) * 100) : 0;
  const weightUsage = maxWeight > 0 ? Math.round((totalWeight / maxWeight) * 100) : 0;
  const layers = placedCases.length ? Math.max(...placedCases.map(c => c.z)) : 0;

  // ── Weight check ──
  if (weightUsage > 100) {
    checks.push({ id: "weight", label: "Weight limit", status: "critical", detail: `${fmt(totalWeight)} / ${fmt(maxWeight)} lbs` });
    recs.push({
      id: "weight-exceeded",
      severity: "critical",
      title: "Weight exceeds limit",
      why: `Pallet is loaded to ${weightUsage}% of its ${fmt(maxWeight)} lb capacity. Remove or move items to stay under limit.`,
    });
  } else if (weightUsage >= 90) {
    checks.push({ id: "weight", label: "Weight near limit", status: "warning", detail: `${weightUsage}% capacity` });
    recs.push({
      id: "weight-near",
      severity: "warning",
      title: "Weight near limit",
      why: `Pallet is at ${weightUsage}% capacity. Avoid adding heavy items.`,
    });
  } else {
    checks.push({ id: "weight", label: "Weight within limits", status: "ok", detail: `${fmt(totalWeight)} / ${fmt(maxWeight)} lbs` });
  }

  // ── Validation: collisions / out of bounds ──
  let collisionCount = 0;
  let oobCount = 0;
  let nearEdgeCount = 0;
  let firstOobId: string | undefined;
  for (const c of placedCases) {
    const v = getItemValidation(c, placedCases, palletWidth, palletLength, strictMode);
    if (v.errors.includes("collision")) collisionCount++;
    if (v.errors.includes("out_of_bounds")) {
      oobCount++;
      if (!firstOobId) firstOobId = c.id;
    }
    if (v.warnings.includes("near_edge")) nearEdgeCount++;
  }
  if (collisionCount > 0) {
    recs.push({
      id: "collision",
      severity: "critical",
      title: `${collisionCount} overlapping ${collisionCount === 1 ? "item" : "items"}`,
      why: "Items occupy the same space on a layer. Move or remove the overlapping items.",
    });
  }
  if (oobCount > 0) {
    recs.push({
      id: "out-of-bounds",
      severity: "critical",
      title: `${oobCount} ${oobCount === 1 ? "item extends" : "items extend"} past the pallet`,
      why: "Items overhang the pallet edge. Nudge them into bounds or rotate to fit.",
      focusCaseId: firstOobId,
    });
  }
  if (nearEdgeCount > 0 && oobCount === 0) {
    checks.push({ id: "edges", label: `${nearEdgeCount} ${nearEdgeCount === 1 ? "item" : "items"} near edge`, status: "warning" });
  }

  // ── Stability ──
  const stability = calculateStabilityScore(placedCases);
  if (stability.score === "stable") {
    checks.push({ id: "stability", label: "Stable stack", status: "ok" });
  } else if (stability.score === "moderate") {
    checks.push({ id: "stability", label: "Stack moderately supported", status: "warning", detail: `${Math.round(stability.percentage)}%` });
    recs.push({
      id: "stability-moderate",
      severity: "warning",
      title: "Upper layers partially unsupported",
      why: "Some items on upper layers rest on less than 80% support. Re-stack so each item sits squarely on the one below.",
    });
  } else {
    checks.push({ id: "stability", label: "Unstable stack", status: "critical", detail: `${Math.round(stability.percentage)}%` });
    recs.push({
      id: "stability-high-risk",
      severity: "critical",
      title: "High-risk stack",
      why: "Multiple upper-layer items lack adequate support. Re-stack so heavier items sit lower and rest on full pallets below.",
    });
  }

  // ── Heavy item above lighter item ──
  const heavyAboveLight = detectHeavyAboveLight(placedCases);
  if (heavyAboveLight) {
    recs.push({
      id: "heavy-above-light",
      severity: "warning",
      title: `Move ${heavyAboveLight.heavy.caseId} to Layer 1`,
      why: `${heavyAboveLight.heavy.caseId} (${fmt(heavyAboveLight.heavy.weight)} lbs) sits above ${heavyAboveLight.light.caseId} (${fmt(heavyAboveLight.light.weight)} lbs). Heavy items belong on the bottom.`,
      focusCaseId: heavyAboveLight.heavy.id,
      apply: (cases) => cases.map(c => c.id === heavyAboveLight.heavy.id ? { ...c, z: 1 } : c),
    });
  }

  // ── Weight balance ──
  const balance = getWeightDistribution(placedCases, palletWidth, palletLength);
  if (balance.balance !== "balanced" && balance.severity > 0.25) {
    recs.push({
      id: "balance",
      severity: "warning",
      title: `Load is ${balance.balance.replace("_", " ")}`,
      why: "Center of gravity is off-center. Redistribute heavier items toward the opposite side for safer transport.",
    });
  }

  // ── Optimization: utilization ──
  if (placedCases.length > 0 && utilization < 60) {
    recs.push({
      id: "utilization",
      severity: "optimization",
      title: `Utilization could improve by ${Math.max(8, 70 - utilization)}%`,
      why: `Surface coverage is ${utilization}%. Run Auto Arrange or add more items to reach 70%+.`,
    });
  }

  // ── Confidence + verdict ──
  const critical = recs.filter(r => r.severity === "critical").length;
  const warnings = recs.filter(r => r.severity === "warning").length;
  const opts = recs.filter(r => r.severity === "optimization").length;
  const confidence = Math.max(0, Math.min(100, 100 - critical * 40 - warnings * 15 - opts * 3));

  const status: PalletHealthReport["status"] =
    critical > 0 ? "unsafe" : warnings > 0 ? "attention" : "healthy";
  const verdict =
    status === "unsafe" ? "Unsafe — fix critical issues" :
    status === "attention" ? "Needs attention" :
    placedCases.length === 0 ? "Ready to build" : "Healthy";

  // Sort recommendations: critical → warning → optimization
  const order: Record<RecSeverity, number> = { critical: 0, warning: 1, optimization: 2 };
  recs.sort((a, b) => order[a.severity] - order[b.severity]);

  return { status, verdict, confidence, checks, recommendations: recs };
}

function detectHeavyAboveLight(cases: PlacedCase[]): { heavy: PlacedCase; light: PlacedCase } | null {
  // For each case on layer >= 2, check the cases on the layer directly below it
  // that it physically overlaps. If the upper item is meaningfully heavier (>25%
  // and >20 lbs absolute), flag the first such pair.
  const upper = cases.filter(c => c.z >= 2);
  for (const u of upper) {
    const uw = u.rotation === 90 || u.rotation === 270 ? u.length : u.width;
    const ul = u.rotation === 90 || u.rotation === 270 ? u.width : u.length;
    const below = cases.filter(c => c.z === u.z - 1);
    for (const b of below) {
      const bw = b.rotation === 90 || b.rotation === 270 ? b.length : b.width;
      const bl = b.rotation === 90 || b.rotation === 270 ? b.width : b.length;
      const overlapX = Math.max(0, Math.min(u.x + uw, b.x + bw) - Math.max(u.x, b.x));
      const overlapY = Math.max(0, Math.min(u.y + ul, b.y + bl) - Math.max(u.y, b.y));
      if (overlapX > 0 && overlapY > 0) {
        if (u.weight > b.weight * 1.25 && u.weight - b.weight > 20) {
          return { heavy: u, light: b };
        }
      }
    }
  }
  // Suppress unused import warning
  void analyzeAllCases;
  return null;
}