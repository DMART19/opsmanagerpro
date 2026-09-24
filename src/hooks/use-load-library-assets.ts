/**
 * Hook to fetch items and containers from cache_inventory for the Load Library.
 * Normalises them into a draggable shape compatible with the trailer canvas.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface LoadLibraryItem {
  id: string;
  name: string;
  type: "item" | "container";
  width: number;   // inches
  length: number;  // inches
  weight: number;
  caseCount: number;
  /** Raw row for reference */
  raw: Record<string, any>;
}

export const useLoadLibraryAssets = () => {
  const [items, setItems] = useState<LoadLibraryItem[]>([]);
  const [containers, setContainers] = useState<LoadLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("cache_inventory")
          .select("id, description, asset_type, box_number, custom_data, quantity_available")
          .is("deleted_at", null)
          .order("description", { ascending: true })
          .limit(200);

        if (error) throw error;

        const mapped = (data || []).map((row: any): LoadLibraryItem => {
          const cd = row.custom_data || {};
          // Try to extract dimensions from custom_data or use sensible defaults
          const w = Number(cd.width) || (row.asset_type === "container" ? 48 : 12);
          const l = Number(cd.length) || (row.asset_type === "container" ? 40 : 12);
          const wt = Number(cd.weight) || 0;

          return {
            id: row.id,
            name: row.description || row.box_number || "Unnamed",
            type: row.asset_type === "container" ? "container" : "item",
            width: w,
            length: l,
            weight: wt,
            caseCount: row.quantity_available || 1,
            raw: row,
          };
        });

        setItems(mapped.filter(m => m.type === "item"));
        setContainers(mapped.filter(m => m.type === "container"));
      } catch (err) {
        console.error("[LoadLibrary] Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, []);

  return { items, containers, loading };
};
