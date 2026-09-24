import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface PalletSlot {
  id: string;
  section_id: string;
  slot_number: number;
  slot_code: string;
  is_occupied: boolean;
  equipment_id: string | null;
  shipment_item_id: string | null;
  occupancy_status: "available" | "occupied" | "reserved" | "maintenance";
  last_updated: string;
}

export interface WarehouseSection {
  id: string;
  warehouse_id: string | null;
  section_code: string;
  section_name: string;
  max_capacity: number;
  current_capacity: number;
  location_description: string | null;
  floor_level: number;
  section_type: string | null;
  row_count: number | null;
  bay_count: number | null;
  level_count: number | null;
  density_threshold_low: number | null;
  density_threshold_medium: number | null;
  gps_coordinates: string | null;
  zone_grouping: string[] | null;
  label_color: string | null;
  default_pallet_type: string | null;
  temperature_controlled: boolean | null;
  access_restrictions: string | null;
  auto_density_alerts: boolean | null;
  maintenance_cycle_days: number | null;
  created_at: string;
  updated_at: string;
  pallet_slots?: PalletSlot[];
}

export const useWarehouseSections = (warehouseId?: string) => {
  const [sections, setSections] = useState<WarehouseSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<WarehouseSection[]>([]);
  const capacityAlertShownRef = useRef(false);

  const loadSections = async () => {
    try {
      setLoading(true);
      const query = supabase
        .from("warehouse_sections")
        .select("*")
        .order("section_code", { ascending: true });

      if (warehouseId) {
        query.eq("warehouse_id", warehouseId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setSections((data || []) as unknown as WarehouseSection[]);
      
      // Check for alerts (>90% capacity)
      const highCapacity = ((data || []) as unknown as WarehouseSection[]).filter(
        (section) => (section.current_capacity / section.max_capacity) * 100 > 90
      );
      setAlerts(highCapacity);
      
      if (highCapacity.length > 0 && !capacityAlertShownRef.current) {
        capacityAlertShownRef.current = true;
        toast({
          title: "⚠️ Capacity Alert",
          description: `${highCapacity.length} section(s) are over 90% capacity`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error loading warehouse sections:", error);
      toast({
        title: "Error loading sections",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSectionWithSlots = async (sectionId: string): Promise<PalletSlot[]> => {
    try {
      const { data: slots, error } = await supabase
        .from("pallet_slots")
        .select("*")
        .eq("section_id", sectionId)
        .order("slot_number", { ascending: true });

      if (error) throw error;

      return (slots || []) as PalletSlot[];
    } catch (error: any) {
      console.error("Error loading pallet slots:", error);
      toast({
        title: "Error loading pallet slots",
        description: error.message,
        variant: "destructive",
      });
      return [];
    }
  };

  useEffect(() => {
    loadSections();

    // Set up realtime subscriptions
    const sectionsChannel = supabase
      .channel("warehouse_sections_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "warehouse_sections",
        },
        () => {
          loadSections();
        }
      )
      .subscribe();

    const slotsChannel = supabase
      .channel("pallet_slots_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pallet_slots",
        },
        () => {
          loadSections();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sectionsChannel);
      supabase.removeChannel(slotsChannel);
    };
  }, [warehouseId]);

  return { 
    sections, 
    loading, 
    alerts,
    refetch: loadSections,
    loadSectionWithSlots 
  };
};