import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { normalizeFieldValue } from "@/lib/normalize";

export interface DataCorrection {
  id: string;
  /** The pattern detected (e.g. "Glock") */
  detectedValue: string;
  /** Which field it was found in */
  sourceField: "description";
  /** Which field it should move to */
  targetField: "manufacturer" | "model_part_num";
  /** How many items have this pattern */
  affectedCount: number;
  /** IDs of affected items */
  affectedItemIds: string[];
  /** The existing taxonomy ID if the value matches a known manufacturer */
  taxonomyId?: string;
  /** Confidence: 'high' if matches known taxonomy, 'medium' if repeated pattern */
  confidence: "high" | "medium";
}

/**
 * Scans inventory descriptions for values that look like they belong in
 * manufacturer or model/part number fields.
 */
export const useDataCorrections = () => {
  // Fetch known manufacturers for matching
  const { data: manufacturers = [] } = useQuery({
    queryKey: ["taxonomy-manufacturers-for-corrections"],
    queryFn: async () => {
      const { data } = await supabase
        .from("manufacturers" as any)
        .select("id, name")
        .limit(500);
      return (data as any[] | null) || [];
    },
    staleTime: 1000 * 60 * 10,
  });

  // Fetch inventory items with descriptions
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["data-corrections-scan"],
    queryFn: async () => {
      const { data } = await supabase
        .from("cache_inventory")
        .select("id, description, manufacturer_id, model_part_num")
        .not("description", "is", null)
        .is("deleted_at", null)
        .limit(1000);
      return (data as any[] | null) || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  const corrections = useMemo((): DataCorrection[] => {
    if (!items.length) return [];

    const results: DataCorrection[] = [];
    const mfgNormMap = new Map<string, { id: string; name: string }>();

    // Build normalized manufacturer lookup
    for (const m of manufacturers) {
      mfgNormMap.set(normalizeFieldValue(m.name), m);
    }

    // === 1. Detect manufacturer names in descriptions ===
    // For items WITHOUT a manufacturer_id, check if description contains a known manufacturer name
    const noMfgItems = items.filter((i: any) => !i.manufacturer_id && i.description);

    // Count how many descriptions contain each manufacturer
    const mfgHits = new Map<string, { mfg: { id: string; name: string }; itemIds: string[] }>();

    for (const item of noMfgItems) {
      const descNorm = normalizeFieldValue(item.description);
      const descLower = item.description.toLowerCase();

      for (const [norm, mfg] of mfgNormMap) {
        if (norm.length < 3) continue; // skip very short names
        if (descLower.includes(mfg.name.toLowerCase()) || descNorm.includes(norm)) {
          const key = mfg.id;
          if (!mfgHits.has(key)) {
            mfgHits.set(key, { mfg, itemIds: [] });
          }
          mfgHits.get(key)!.itemIds.push(item.id);
          break; // one match per item
        }
      }
    }

    for (const [, { mfg, itemIds }] of mfgHits) {
      if (itemIds.length >= 2) {
        results.push({
          id: `mfg-${mfg.id}`,
          detectedValue: mfg.name,
          sourceField: "description",
          targetField: "manufacturer",
          affectedCount: itemIds.length,
          affectedItemIds: itemIds,
          taxonomyId: mfg.id,
          confidence: "high",
        });
      }
    }

    // === 2. Detect model/part numbers in descriptions ===
    // Pattern: items without model_part_num that have description containing
    // common part number patterns (alphanumeric with dashes, e.g. "ABC-123", "M4A1")
    const noModelItems = items.filter((i: any) => !i.model_part_num && i.description);
    const partNumPattern = /\b([A-Z]{1,4}[-\s]?\d{2,6}[A-Z]?)\b/gi;

    const modelHits = new Map<string, string[]>();
    for (const item of noModelItems) {
      const matches = item.description.match(partNumPattern);
      if (matches) {
        for (const match of matches) {
          const norm = normalizeFieldValue(match);
          if (norm.length < 3 || norm.length > 15) continue;
          if (!modelHits.has(norm)) modelHits.set(norm, []);
          modelHits.get(norm)!.push(item.id);
        }
      }
    }

    for (const [norm, itemIds] of modelHits) {
      if (itemIds.length >= 3) {
        // Find the most common raw form
        const rawCounts = new Map<string, number>();
        for (const id of itemIds) {
          const item = items.find((i: any) => i.id === id);
          if (item) {
            const matches = item.description.match(partNumPattern) || [];
            for (const m of matches) {
              if (normalizeFieldValue(m) === norm) {
                rawCounts.set(m, (rawCounts.get(m) || 0) + 1);
              }
            }
          }
        }
        const bestRaw = [...rawCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || norm;

        results.push({
          id: `model-${norm}`,
          detectedValue: bestRaw,
          sourceField: "description",
          targetField: "model_part_num",
          affectedCount: itemIds.length,
          affectedItemIds: [...new Set(itemIds)],
          confidence: "medium",
        });
      }
    }

    // Sort by affected count desc
    results.sort((a, b) => b.affectedCount - a.affectedCount);
    return results;
  }, [items, manufacturers]);

  return {
    corrections,
    isLoading,
    totalAffected: corrections.reduce((sum, c) => sum + c.affectedCount, 0),
  };
};
