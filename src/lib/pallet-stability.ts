import { PlacedCase } from "@/types/pallet-builder";

export interface SupportLevel {
  level: "supported" | "partial" | "unsupported";
  percentage: number;
  color: string;
}

export interface StabilityAnalysis {
  caseId: string;
  layer: number;
  supportLevel: SupportLevel;
  supportingCases: string[];
}

/**
 * Calculate the overlap percentage between two rectangles
 */
const calculateOverlap = (
  case1: { x: number; y: number; width: number; length: number; rotation: number },
  case2: { x: number; y: number; width: number; length: number; rotation: number }
): number => {
  // Get actual dimensions considering rotation
  const c1Width = case1.rotation % 180 === 0 ? case1.width : case1.length;
  const c1Length = case1.rotation % 180 === 0 ? case1.length : case1.width;
  const c2Width = case2.rotation % 180 === 0 ? case2.width : case2.length;
  const c2Length = case2.rotation % 180 === 0 ? case2.length : case2.width;

  // Calculate bounds
  const c1Right = case1.x + c1Width;
  const c1Bottom = case1.y + c1Length;
  const c2Right = case2.x + c2Width;
  const c2Bottom = case2.y + c2Length;

  // Calculate overlap
  const overlapX = Math.max(0, Math.min(c1Right, c2Right) - Math.max(case1.x, case2.x));
  const overlapY = Math.max(0, Math.min(c1Bottom, c2Bottom) - Math.max(case1.y, case2.y));
  const overlapArea = overlapX * overlapY;

  // Calculate area of case1
  const case1Area = c1Width * c1Length;

  // Return percentage of case1 that is supported
  return case1Area > 0 ? (overlapArea / case1Area) * 100 : 0;
};

/**
 * Analyze the support level for a case on an upper layer
 */
export const analyzeCaseSupport = (
  targetCase: PlacedCase,
  allCases: PlacedCase[]
): SupportLevel => {
  const targetLayer = Math.floor((targetCase.z || 0) / 10) + 1;
  
  // Layer 1 is always fully supported (on pallet surface)
  if (targetLayer === 1) {
    return {
      level: "supported",
      percentage: 100,
      color: "rgb(34, 197, 94)", // green-500
    };
  }

  // Find cases directly below (layer below)
  const casesBelow = allCases.filter((c) => {
    const caseLayer = Math.floor((c.z || 0) / 10) + 1;
    return caseLayer === targetLayer - 1;
  });

  if (casesBelow.length === 0) {
    return {
      level: "unsupported",
      percentage: 0,
      color: "rgb(239, 68, 68)", // red-500
    };
  }

  // Calculate total support percentage
  let totalSupport = 0;
  casesBelow.forEach((caseBelow) => {
    const overlap = calculateOverlap(targetCase, caseBelow);
    totalSupport = Math.max(totalSupport, overlap);
  });

  // Determine support level
  if (totalSupport >= 80) {
    return {
      level: "supported",
      percentage: totalSupport,
      color: "rgb(34, 197, 94)", // green-500
    };
  } else if (totalSupport >= 30) {
    return {
      level: "partial",
      percentage: totalSupport,
      color: "rgb(234, 179, 8)", // yellow-500
    };
  } else {
    return {
      level: "unsupported",
      percentage: totalSupport,
      color: "rgb(239, 68, 68)", // red-500
    };
  }
};

/**
 * Analyze stability for all cases in the pallet
 */
export const analyzeAllCases = (cases: PlacedCase[]): StabilityAnalysis[] => {
  return cases.map((targetCase) => {
    const supportLevel = analyzeCaseSupport(targetCase, cases);
    const targetLayer = Math.floor((targetCase.z || 0) / 10) + 1;
    
    // Find supporting cases
    const casesBelow = cases.filter((c) => {
      const caseLayer = Math.floor((c.z || 0) / 10) + 1;
      return caseLayer === targetLayer - 1;
    });
    
    const supportingCases = casesBelow
      .filter((c) => calculateOverlap(targetCase, c) > 0)
      .map((c) => c.id);

    return {
      caseId: targetCase.id,
      layer: targetLayer,
      supportLevel,
      supportingCases,
    };
  });
};

/**
 * Calculate overall pallet stability score
 */
export const calculateStabilityScore = (
  cases: PlacedCase[]
): {
  score: "stable" | "moderate" | "high-risk";
  color: string;
  percentage: number;
} => {
  if (cases.length === 0) {
    return { score: "stable", color: "rgb(34, 197, 94)", percentage: 100 };
  }

  const analyses = analyzeAllCases(cases);
  const upperLayerCases = analyses.filter((a) => a.layer > 1);

  if (upperLayerCases.length === 0) {
    return { score: "stable", color: "rgb(34, 197, 94)", percentage: 100 };
  }

  const unsupportedCount = upperLayerCases.filter(
    (a) => a.supportLevel.level === "unsupported"
  ).length;
  const partialCount = upperLayerCases.filter(
    (a) => a.supportLevel.level === "partial"
  ).length;
  const supportedCount = upperLayerCases.filter(
    (a) => a.supportLevel.level === "supported"
  ).length;

  // Calculate weighted score
  const totalScore =
    (supportedCount * 100 + partialCount * 50 + unsupportedCount * 0) /
    upperLayerCases.length;

  if (totalScore >= 80) {
    return { score: "stable", color: "rgb(34, 197, 94)", percentage: totalScore };
  } else if (totalScore >= 50) {
    return { score: "moderate", color: "rgb(234, 179, 8)", percentage: totalScore };
  } else {
    return { score: "high-risk", color: "rgb(239, 68, 68)", percentage: totalScore };
  }
};
