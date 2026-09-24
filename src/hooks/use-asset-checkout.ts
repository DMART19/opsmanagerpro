import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CheckoutParams {
  equipmentId: string;
  staffId: string;
  quantity: number;
  dueDate?: Date;
  purpose?: string;
  notes?: string;
  deploymentLocation?: string;
}

interface ReturnParams {
  checkoutId: string;
  condition: string;
  returnLocation?: string;
  notes?: string;
}

export const useAssetCheckout = () => {
  const [loading, setLoading] = useState(false);

  const checkoutAsset = async (params: CheckoutParams): Promise<boolean> => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to checkout assets");
        return false;
      }

      // Validate available quantity before checkout
      const { data: equipment, error: eqError } = await supabase
        .from("equipment")
        .select("available_quantity, name, asset_tag")
        .eq("id", params.equipmentId)
        .single();

      if (eqError || !equipment) {
        toast.error("Failed to validate asset availability");
        return false;
      }

      if (equipment.available_quantity < params.quantity) {
        toast.error("Not enough available stock to complete checkout", {
          description: `Available: ${equipment.available_quantity}, Requested: ${params.quantity}`,
        });
        return false;
      }

      // Get staff name for toast
      const { data: staffData } = await supabase
        .from("staff")
        .select("first_name, last_name")
        .eq("id", params.staffId)
        .single();

      const staffName = staffData 
        ? `${staffData.first_name} ${staffData.last_name}`
        : "Team member";

      // Create checkout record - the trigger will update quantities
      const { error } = await supabase
        .from("equipment_checkouts")
        .insert({
          equipment_id: params.equipmentId,
          staff_id: params.staffId,
          quantity: params.quantity,
          checked_out_by: user.id,
          due_date: params.dueDate?.toISOString(),
          purpose: params.purpose,
          checkout_notes: params.notes,
          deployment_location: params.deploymentLocation,
          status: "active",
        });

      if (error) {
        if (error.message.includes("Not enough available stock")) {
          toast.error("Not enough available stock to complete checkout");
        } else {
          toast.error("Failed to checkout asset", { description: error.message });
        }
        return false;
      }

      toast.success(`${equipment.name} checked out to ${staffName}`, {
        description: `Quantity: ${params.quantity} • Asset: ${equipment.asset_tag}`,
      });
      return true;
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error("Failed to checkout asset", { description: error.message });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const returnAsset = async (params: ReturnParams): Promise<boolean> => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to return assets");
        return false;
      }

      // Get checkout info first
      const { data: checkout, error: checkoutError } = await supabase
        .from("equipment_checkouts")
        .select(`
          *,
          equipment:equipment_id (name, asset_tag)
        `)
        .eq("id", params.checkoutId)
        .single();

      if (checkoutError || !checkout) {
        toast.error("Checkout record not found");
        return false;
      }

      // Update checkout status to returned - the trigger will restore quantities
      const { error } = await supabase
        .from("equipment_checkouts")
        .update({
          status: "returned",
          checkin_date: new Date().toISOString(),
          checked_in_by: user.id,
          return_condition: params.condition,
          return_location: params.returnLocation,
          checkin_notes: params.notes,
        })
        .eq("id", params.checkoutId);

      if (error) {
        toast.error("Failed to return asset", { description: error.message });
        return false;
      }

      const equipment = checkout.equipment as any;
      toast.success(`${equipment?.name || "Asset"} returned successfully`, {
        description: `Quantity: ${checkout.quantity} • Condition: ${params.condition}`,
      });
      return true;
    } catch (error: any) {
      console.error("Return error:", error);
      toast.error("Failed to return asset", { description: error.message });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getAssetCheckouts = async (equipmentId: string) => {
    const { data, error } = await supabase
      .from("equipment_checkouts")
      .select(`
        *,
        staff:staff_id (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq("equipment_id", equipmentId)
      .eq("status", "active")
      .order("checkout_date", { ascending: false });

    if (error) {
      console.error("Error fetching checkouts:", error);
      return [];
    }

    return data || [];
  };

  const getStaffCheckouts = async (staffId: string) => {
    const { data, error } = await supabase
      .from("equipment_checkouts")
      .select(`
        *,
        equipment:equipment_id (
          id,
          name,
          asset_tag,
          category
        )
      `)
      .eq("staff_id", staffId)
      .order("checkout_date", { ascending: false });

    if (error) {
      console.error("Error fetching staff checkouts:", error);
      return [];
    }

    return data || [];
  };

  return {
    loading,
    checkoutAsset,
    returnAsset,
    getAssetCheckouts,
    getStaffCheckouts,
  };
};
