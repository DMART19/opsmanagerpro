// Pallet Builder Types
// These types are used by pallet builder components even when the feature is locked

export type PalletItemSource = "item" | "container" | "case";

export interface PlacedCase {
  id: string;
  caseId: string;
  caseType: string;
  x: number;
  y: number;
  z: number;
  rotation: number;
  /**
   * Optional free-rotation angles (degrees) around each axis for
   * CAD-style 360° rotation. When set they take precedence over the
   * legacy 90°-step `rotation` field (which continues to represent
   * yaw / Y-axis rotation for backward compatibility).
   */
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
  width: number;
  length: number;
  height: number;
  weight: number;
  condition: string;
  fragile?: boolean;
  category?: string;
  allowRotation?: boolean;
  /** Which data source this item came from */
  source?: PalletItemSource;
  /** Original record ID from the source table */
  sourceId?: string;
}

/**
 * A unified item that can be dragged onto the pallet.
 * Represents an Item (cache_inventory) or Container (cache_boxes).
 * Dimensions are NOT required upfront — they're captured on placement.
 */
export interface PalletLibraryItem {
  id: string;
  name: string;
  subtitle?: string;
  source: PalletItemSource;
  /** Original record for reference */
  sourceId: string;
  // Physical properties — may be null (captured on placement)
  length?: number | null;
  width?: number | null;
  height?: number | null;
  weight?: number | null;
  // Metadata
  condition?: string | null;
  fragile?: boolean;
  category?: string | null;
  allowRotation?: boolean;
  /** Available stock quantity from inventory (items only) */
  quantityAvailable?: number | null;
}
