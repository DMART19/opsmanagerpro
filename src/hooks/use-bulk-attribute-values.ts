import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BulkAttributeValue {
  asset_id: string;
  attribute_id: string;
  value: string | null;
}

/**
 * Fetches ALL asset_attribute_values for the current user's assets in one query.
 * Returns a map: assetId → { attributeId → value }
 */
export const useBulkAttributeValues = (assetIds: string[]) => {
  const { data: valuesByAsset = new Map<string, Record<string, string | null>>(), isLoading } = useQuery({
    queryKey: ["bulk-attribute-values", assetIds.length],
    queryFn: async () => {
      if (assetIds.length === 0) return new Map<string, Record<string, string | null>>();

      // Fetch in chunks of 500 to avoid URL limits
      const chunkSize = 500;
      const allValues: BulkAttributeValue[] = [];

      for (let i = 0; i < assetIds.length; i += chunkSize) {
        const chunk = assetIds.slice(i, i + chunkSize);
        const { data, error } = await supabase
          .from("asset_attribute_values")
          .select("asset_id, attribute_id, value")
          .in("asset_id", chunk);

        if (error) throw error;
        if (data) allValues.push(...(data as BulkAttributeValue[]));
      }

      const map = new Map<string, Record<string, string | null>>();
      for (const v of allValues) {
        if (!map.has(v.asset_id)) map.set(v.asset_id, {});
        map.get(v.asset_id)![v.attribute_id] = v.value;
      }
      return map;
    },
    enabled: assetIds.length > 0,
    staleTime: 1000 * 60 * 3,
    gcTime: 1000 * 60 * 10,
  });

  return { valuesByAsset, isLoading };
};
