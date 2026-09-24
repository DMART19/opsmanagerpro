import type { ParsedRow, PalletPreset, ValidationIssue, ValidationResult } from "./types";

/** Cubic inches → cubic feet */
const CUBE_FT = (cuIn: number) => cuIn / 1728;

export function validateRows(
  rows: ParsedRow[],
  pallet: PalletPreset,
  defaultMaxPalletWeight = 2200
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const seenSkus = new Map<string, string>();

  for (const r of rows) {
    if (!r.name) issues.push({ rowId: r.id, severity: "error", field: "name", message: "Missing item name" });
    if (!r.quantity || r.quantity < 1) issues.push({ rowId: r.id, severity: "error", field: "quantity", message: "Quantity must be ≥ 1" });
    if (!r.weight || r.weight <= 0) issues.push({ rowId: r.id, severity: "error", field: "weight", message: "Missing weight", suggestion: "Set a default weight" });
    if (!r.length || !r.width || !r.height) {
      issues.push({
        rowId: r.id, severity: "error", field: "length",
        message: "Missing dimensions (length/width/height)",
        suggestion: "Use a 40×40×40 default",
      });
    }
    if (r.length > pallet.length + 12 || r.width > pallet.width + 12) {
      issues.push({
        rowId: r.id, severity: "error", field: "length",
        message: `Oversized — does not fit on ${pallet.name}`,
      });
    }
    if (r.sku) {
      const prev = seenSkus.get(r.sku);
      if (prev) issues.push({ rowId: r.id, severity: "warning", field: "sku", message: `Duplicate SKU "${r.sku}"` });
      else seenSkus.set(r.sku, r.id);
    }
    // Unusual density warning
    const cubeIn = r.length * r.width * r.height;
    if (cubeIn > 0 && r.weight > 0) {
      const density = r.weight / CUBE_FT(cubeIn);
      if (density > 120) issues.push({ rowId: r.id, severity: "warning", message: `Very dense item (${density.toFixed(0)} lb/ft³)` });
    }
  }

  // Totals
  const units = rows.reduce((s, r) => s + (r.quantity || 0), 0);
  const totalWeight = rows.reduce((s, r) => s + r.weight * (r.quantity || 0), 0);
  const totalVolume = rows.reduce(
    (s, r) => s + CUBE_FT(r.length * r.width * r.height) * (r.quantity || 0),
    0
  );
  const palletUsableCube = CUBE_FT(pallet.width * pallet.length * pallet.maxHeight) * 0.85;
  const byCube = palletUsableCube > 0 ? Math.ceil(totalVolume / palletUsableCube) : 0;
  const byWeight = Math.ceil(totalWeight / (pallet.maxWeight || defaultMaxPalletWeight));
  const estimatedPallets = Math.max(1, byCube, byWeight);

  return {
    issues,
    errorCount: issues.filter((i) => i.severity === "error").length,
    warningCount: issues.filter((i) => i.severity === "warning").length,
    totals: {
      rows: rows.length,
      units,
      weight: totalWeight,
      volume: totalVolume,
      estimatedPallets,
    },
  };
}