/**
 * useExtractionEngine — React hook wrapping the extraction engine.
 * Provides pageSchema, elementRegistry, confidenceMap with auto-refresh.
 * Includes requirement generation from schema.
 */

import { useState, useCallback, useMemo } from "react";
import {
  runExtraction,
  syncWithExistingConfigs,
  generateRequirementsFromSchema,
  mergeGeneratedWithExisting,
  getOverallConfidence,
  getModuleConfidence,
  getNeedsReviewActions,
  type ExtractionResult,
  type GeneratedRequirement,
} from "@/lib/extraction-engine";
import type { RequirementConfig } from "@/hooks/use-requirement-admin";

export function useExtractionEngine(configs: RequirementConfig[]) {
  const [result, setResult] = useState<ExtractionResult>(() => runExtraction());
  const [isScanning, setIsScanning] = useState(false);

  const scan = useCallback(async () => {
    setIsScanning(true);
    await new Promise(r => setTimeout(r, 800));
    const newResult = runExtraction();
    setResult(newResult);
    setIsScanning(false);
    return newResult;
  }, []);

  const regenerate = useCallback(async () => {
    setIsScanning(true);
    await new Promise(r => setTimeout(r, 1200));
    const newResult = runExtraction();
    setResult(newResult);
    setIsScanning(false);
    return newResult;
  }, []);

  const syncStatus = useMemo(
    () => syncWithExistingConfigs(result, configs),
    [result, configs]
  );

  const overallConfidence = useMemo(
    () => getOverallConfidence(result.confidenceMap),
    [result.confidenceMap]
  );

  const moduleConfidence = useCallback(
    (module: string) => getModuleConfidence(result.confidenceMap, result.elementRegistry, module),
    [result.confidenceMap, result.elementRegistry]
  );

  const needsReview = useMemo(
    () => getNeedsReviewActions(result.confidenceMap),
    [result.confidenceMap]
  );

  // ─── Requirement Generation ─────────────────────────────────────

  const generatedRequirements: GeneratedRequirement[] = useMemo(
    () => generateRequirementsFromSchema(
      result.pageSchemas,
      result.confidenceMap,
      result.elementRegistry,
      configs,
    ),
    [result.pageSchemas, result.confidenceMap, result.elementRegistry, configs]
  );

  /** Merge generated requirements with existing configs (preserving edits) */
  const generateMergedConfigs = useCallback(
    (): RequirementConfig[] => {
      return mergeGeneratedWithExisting(generatedRequirements, configs);
    },
    [generatedRequirements, configs]
  );

  return {
    ...result,
    isScanning,
    scan,
    regenerate,
    syncStatus,
    overallConfidence,
    moduleConfidence,
    needsReview,
    generatedRequirements,
    generateMergedConfigs,
  };
}
