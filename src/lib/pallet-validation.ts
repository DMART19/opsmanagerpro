import { PlacedCase } from "@/types/pallet-builder";

export interface OverhangData {
  hasOverhang: boolean;
  amount: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  isOversized: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  overhang?: OverhangData;
}

/**
 * Check if a case is larger than the pallet dimensions
 */
export const checkOversized = (
  width: number,
  length: number,
  palletWidth: number,
  palletLength: number,
  rotation: number = 0
): boolean => {
  const actualWidth = rotation === 90 || rotation === 270 ? length : width;
  const actualLength = rotation === 90 || rotation === 270 ? width : length;
  
  return actualWidth > palletWidth || actualLength > palletLength;
};

/**
 * Calculate overhang amounts for a case
 */
export const calculateOverhang = (
  x: number,
  y: number,
  width: number,
  length: number,
  palletWidth: number,
  palletLength: number,
  rotation: number = 0
): OverhangData => {
  const actualWidth = rotation === 90 || rotation === 270 ? length : width;
  const actualLength = rotation === 90 || rotation === 270 ? width : length;
  
  const rightEdge = x + actualWidth;
  const bottomEdge = y + actualLength;
  
  const overhang = {
    top: Math.max(0, -y),
    right: Math.max(0, rightEdge - palletWidth),
    bottom: Math.max(0, bottomEdge - palletLength),
    left: Math.max(0, -x),
  };
  
  const hasOverhang = Object.values(overhang).some(v => v > 0);
  const isOversized = checkOversized(width, length, palletWidth, palletLength, rotation);
  
  return {
    hasOverhang,
    amount: overhang,
    isOversized,
  };
};

/**
 * Validate case placement on pallet
 */
export const validateCasePlacement = (
  caseItem: PlacedCase,
  palletWidth: number,
  palletLength: number,
  strictMode: boolean
): ValidationResult => {
  const { x, y, width, length, rotation } = caseItem;
  
  // Check if case is oversized
  const isOversized = checkOversized(width, length, palletWidth, palletLength, rotation);
  
  if (isOversized) {
    return {
      isValid: false,
      error: "This case is larger than the pallet footprint and cannot be placed.",
    };
  }
  
  // Calculate overhang
  const overhang = calculateOverhang(x, y, width, length, palletWidth, palletLength, rotation);
  
  // In strict mode, any overhang is not allowed
  if (strictMode && overhang.hasOverhang) {
    return {
      isValid: false,
      error: "Case extends beyond pallet edges. Strict Safety Mode does not allow overhang.",
      overhang,
    };
  }
  
  // In normal mode, warn about overhang but allow override
  if (overhang.hasOverhang) {
    return {
      isValid: false,
      error: "Case extends beyond pallet edges. This may be unsafe.",
      overhang,
    };
  }
  
  return {
    isValid: true,
  };
};

/**
 * Get support level color for visual feedback
 */
export const getSupportLevelColor = (
  caseItem: PlacedCase,
  palletWidth: number,
  palletLength: number
): "green" | "yellow" | "red" => {
  const overhang = calculateOverhang(
    caseItem.x,
    caseItem.y,
    caseItem.width,
    caseItem.length,
    palletWidth,
    palletLength,
    caseItem.rotation
  );
  
  if (overhang.hasOverhang) {
    return "red"; // Unsafe overhang
  }
  
  // Check if case is well-centered and supported
  const actualWidth = caseItem.rotation === 90 || caseItem.rotation === 270 ? caseItem.length : caseItem.width;
  const actualLength = caseItem.rotation === 90 || caseItem.rotation === 270 ? caseItem.width : caseItem.length;
  
  const centerX = caseItem.x + actualWidth / 2;
  const centerY = caseItem.y + actualLength / 2;
  const palletCenterX = palletWidth / 2;
  const palletCenterY = palletLength / 2;
  
  const distanceFromCenter = Math.sqrt(
    Math.pow(centerX - palletCenterX, 2) + Math.pow(centerY - palletCenterY, 2)
  );
  
  // If case is near edges but not overhanging (within 2 inches)
  const edgeThreshold = 2;
  const nearEdge = 
    caseItem.x < edgeThreshold ||
    caseItem.y < edgeThreshold ||
    (palletWidth - (caseItem.x + actualWidth)) < edgeThreshold ||
    (palletLength - (caseItem.y + actualLength)) < edgeThreshold;
  
  if (nearEdge) {
    return "yellow"; // Partially supported
  }
  
  return "green"; // Fully supported
};
