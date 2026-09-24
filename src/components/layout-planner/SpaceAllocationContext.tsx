import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useWarehouses } from "@/hooks/use-warehouses";
import { useWarehouseSections, WarehouseSection } from "@/hooks/use-warehouse-sections";
import { useInventoryData } from "@/hooks/use-inventory-data";
import { usePallets } from "@/hooks/use-pallets";
import type { CacheInventoryItem } from "@/hooks/use-cache-inventory";
import { CACHE_INVENTORY_QUERY_KEY } from "@/hooks/use-cache-inventory";

const LS_KEY = "layout-planner.selectedWarehouseId";

interface Ctx {
  warehouses: ReturnType<typeof useWarehouses>["warehouses"];
  sections: WarehouseSection[];
  allSections: WarehouseSection[];
  inventory: CacheInventoryItem[];
  awaiting: CacheInventoryItem[];
  loading: boolean;
  selectedWarehouseId: string | null;
  setSelectedWarehouseId: (id: string) => void;
  selectedItem: CacheInventoryItem | null;
  setSelectedItem: (item: CacheInventoryItem | null) => void;
  selectedSection: WarehouseSection | null;
  setSelectedSection: (s: WarehouseSection | null) => void;
  assignInventoryToSection: (item: CacheInventoryItem, section: WarehouseSection) => Promise<boolean>;
}

const SpaceAllocationCtx = createContext<Ctx | null>(null);

export const SpaceAllocationProvider = ({ children }: { children: ReactNode }) => {
  const { warehouses } = useWarehouses();
  const { sections: allSections, loading: loadingSections, refetch: refetchSections } = useWarehouseSections();
  const { items: inventory, loading: loadingInventory, isDemoMode, updateItem } = useInventoryData();
  const { pallets } = usePallets();
  const queryClient = useQueryClient();

  const [selectedWarehouseId, setSelectedWarehouseIdState] = useState<string | null>(() => {
    try { return localStorage.getItem(LS_KEY); } catch { return null; }
  });
  const [selectedItem, setSelectedItem] = useState<CacheInventoryItem | null>(null);
  const [selectedSection, setSelectedSection] = useState<WarehouseSection | null>(null);

  // Default-select first warehouse
  useEffect(() => {
    if (!selectedWarehouseId && warehouses.length > 0) {
      setSelectedWarehouseIdState(warehouses[0].id);
    }
  }, [warehouses, selectedWarehouseId]);

  const setSelectedWarehouseId = useCallback((id: string) => {
    setSelectedWarehouseIdState(id);
    try { localStorage.setItem(LS_KEY, id); } catch { /* no-op */ }
  }, []);

  const sections = useMemo(
    () => allSections.filter((s) => s.warehouse_id === selectedWarehouseId),
    [allSections, selectedWarehouseId]
  );

  // Sections codes for the selected warehouse — used to determine "awaiting"
  const sectionCodes = useMemo(() => new Set(allSections.map((s) => s.section_code)), [allSections]);

  const awaiting = useMemo(
    () => inventory.filter((it) => {
      const sec = (it.section || "").trim();
      // Awaiting = no section OR section value doesn't correspond to a known warehouse section
      return !sec || !sectionCodes.has(sec);
    }),
    [inventory, sectionCodes]
  );

  const assignInventoryToSection = useCallback(async (item: CacheInventoryItem, section: WarehouseSection): Promise<boolean> => {
    const qty = Math.max(1, item.quantity_available || 1);
    const newCapacity = (section.current_capacity || 0) + qty;

    // Optimistic cache update
    queryClient.setQueryData<CacheInventoryItem[]>(CACHE_INVENTORY_QUERY_KEY, (old) =>
      old ? old.map((x) => (x.id === item.id ? { ...x, section: section.section_code } : x)) : old
    );

    try {
      // 1) update inventory.section
      const ok = await updateItem(item.id, { section: section.section_code });
      if (!ok) throw new Error("Inventory update failed");

      // 2) bump section.current_capacity (skip in demo)
      if (!isDemoMode) {
        const { error } = await supabase
          .from("warehouse_sections")
          .update({ current_capacity: Math.min(section.max_capacity, newCapacity) })
          .eq("id", section.id);
        if (error) throw error;
      }

      toast.success(`Placed in ${section.section_code}`, {
        description: `${item.description || "Item"} → ${section.section_name}`,
      });

      if (selectedItem?.id === item.id) setSelectedItem(null);
      await refetchSections();
      return true;
    } catch (err: any) {
      // rollback
      queryClient.invalidateQueries({ queryKey: CACHE_INVENTORY_QUERY_KEY });
      toast.error("Could not place inventory", { description: err?.message || "Try again." });
      return false;
    }
  }, [queryClient, updateItem, isDemoMode, refetchSections, selectedItem]);

  const value: Ctx = {
    warehouses,
    sections,
    allSections,
    inventory,
    awaiting,
    loading: loadingSections || loadingInventory,
    selectedWarehouseId,
    setSelectedWarehouseId,
    selectedItem,
    setSelectedItem,
    selectedSection,
    setSelectedSection,
    assignInventoryToSection,
  };

  // suppress unused warning for pallets — kept to ensure realtime subscription stays mounted
  void pallets;

  return <SpaceAllocationCtx.Provider value={value}>{children}</SpaceAllocationCtx.Provider>;
};

export const useSpaceAllocation = () => {
  const ctx = useContext(SpaceAllocationCtx);
  if (!ctx) throw new Error("useSpaceAllocation must be used inside SpaceAllocationProvider");
  return ctx;
};