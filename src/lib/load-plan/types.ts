/**
 * Excel-to-Load-Plan engine types.
 *
 * Defines the data flowing through the wizard:
 *   raw rows  → validated rows → planned pallets → trailer load plan
 */

import type { PlacedCase } from "@/types/pallet-builder";
import type { PlacedPallet } from "@/types/trailer-builder";

export type ColumnKey =
  | "name"
  | "quantity"
  | "weight"
  | "length"
  | "width"
  | "height"
  | "volume"
  | "sku"
  | "category"
  | "stackable"
  | "fragile";

export interface ColumnMapping {
  /** db field key -> source spreadsheet column header (or null = not mapped) */
  [field: string]: string | null;
}

/** A single row after column mapping has been applied. */
export interface ParsedRow {
  id: string;
  name: string;
  quantity: number;
  weight: number;
  length: number;
  width: number;
  height: number;
  volume?: number;
  sku?: string;
  category?: string;
  stackable?: boolean;
  fragile?: boolean;
  /** Original Excel row index for error messages */
  sourceRowIndex: number;
}

export type IssueSeverity = "error" | "warning";

export interface ValidationIssue {
  rowId: string;
  severity: IssueSeverity;
  field?: ColumnKey;
  message: string;
  suggestion?: string;
}

export interface ValidationResult {
  issues: ValidationIssue[];
  errorCount: number;
  warningCount: number;
  totals: {
    rows: number;
    units: number;
    weight: number;
    volume: number; // cubic ft
    estimatedPallets: number;
  };
}

export interface PalletPreset {
  id: string;
  name: string;
  width: number;
  length: number;
  maxHeight: number;
  maxWeight: number;
}

export interface VehiclePreset {
  id: string;
  name: string;
  /** interior width in inches */
  width: number;
  /** interior length in inches */
  length: number;
  height: number;
  maxWeight: number;
  /** wheelbase in inches (front axle to rear axle group center) — for axle math */
  wheelbase?: number;
}

export type OptimizationGoal = "space" | "weight" | "stability";

export interface PlannedPallet {
  id: string;
  index: number; // 1-based pallet number
  pallet: PalletPreset;
  placedCases: PlacedCase[];
  weight: number;
  cubeUtilization: number; // 0–100
  stabilityScore: number; // 0–100
  warnings: string[];
}

export interface TrailerPlan {
  vehicle: VehiclePreset;
  placedPallets: PlannedPallet[];
  /** Raw positioned pallets from the trailer packer (for canvas/SVG render) */
  positioned: PlacedPallet[];
  skippedPalletIds: string[];
  utilization: number; // 0–100 (floor area)
  totalWeight: number;
  remainingCube: number;
  loadingSequence: { palletId: string; step: number }[];
  axleEstimate: { front: number; drive: number; trailer: number };
  alerts: string[];
}

export interface PlacementSuggestion {
  sectionId: string;
  sectionName: string;
  warehouseName: string;
  matchScore: number; // 0–100
  availableCube: number;
  capacityImpact: number; // % the new plan would consume of section
  reason: string;
}

export interface LoadPlan {
  pallets: PlannedPallet[];
  trailer: TrailerPlan | null;
  placements: PlacementSuggestion[];
  unplacedRowIds: string[];
}