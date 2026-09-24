import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { differenceInDays } from "date-fns";

export interface ItemCheckout {
  id: string;
  item_id: string;
  employee_id: string;
  checked_out_quantity: number;
  checked_out_at: string;
  checked_out_by: string;
  expected_return_at: string | null;
  checked_in_at: string | null;
  checked_in_by: string | null;
  checkout_notes: string | null;
  checkin_notes: string | null;
  return_condition: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    position: string | null;
  };
  item?: {
    id: string;
    description: string | null;
    id_cache_fema: string | null;
    barcode: string | null;
    subcategory: string | null;
    section: string | null;
  };
}

interface CheckoutParams {
  itemId: string;
  employeeId: string;
  quantity: number;
  expectedReturnAt?: Date;
  notes?: string;
}

interface CheckinParams {
  checkoutId: string;
  condition: string;
  notes?: string;
  returnQuantity?: number; // For partial returns
}

export const useItemCheckout = () => {
  const [loading, setLoading] = useState(false);

  const checkoutItem = async (params: CheckoutParams): Promise<boolean> => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to checkout items");
        return false;
      }

      // Validate available quantity before checkout
      const { data: item, error: itemError } = await supabase
        .from("cache_inventory")
        .select("quantity_available, description, id_cache_fema, date_expire")
        .eq("id", params.itemId)
        .single();

      if (itemError || !item) {
        toast.error("Failed to validate item availability");
        return false;
      }

      // Block checkout of expired items
      if (item.date_expire) {
        const expDate = new Date(item.date_expire);
        const today = new Date();
        if (expDate < today) {
          toast.error("Cannot check out expired items", {
            description: "This item has passed its expiration date and cannot be checked out.",
          });
          return false;
        }
      }

      if ((item.quantity_available ?? 0) < params.quantity) {
        toast.error("Not enough available quantity", {
          description: `Available: ${item.quantity_available ?? 0}, Requested: ${params.quantity}`,
        });
        return false;
      }

      // Get employee name for toast
      const { data: employeeData } = await supabase
        .from("employees")
        .select("first_name, last_name")
        .eq("id", params.employeeId)
        .single();

      const employeeName = employeeData 
        ? `${employeeData.first_name} ${employeeData.last_name}`
        : "Team member";

      // Create checkout record - the trigger will update quantities
      const { error } = await supabase
        .from("item_checkouts")
        .insert({
          item_id: params.itemId,
          employee_id: params.employeeId,
          checked_out_quantity: params.quantity,
          checked_out_by: user.id,
          expected_return_at: params.expectedReturnAt?.toISOString(),
          checkout_notes: params.notes,
        });

      if (error) {
        if (error.message.includes("Not enough available quantity")) {
          toast.error("Not enough available quantity for checkout");
        } else {
          toast.error("Failed to checkout item", { description: error.message });
        }
        return false;
      }

      toast.success(`${item.description || "Item"} checked out to ${employeeName}`, {
        description: `Quantity: ${params.quantity}${item.id_cache_fema ? ` • ID: ${item.id_cache_fema}` : ""}`,
      });
      return true;
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error("Failed to checkout item", { description: error.message });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const checkinItem = async (params: CheckinParams): Promise<boolean> => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to check in items");
        return false;
      }

      // Get checkout info first with employee data
      const { data: checkout, error: checkoutError } = await supabase
        .from("item_checkouts")
        .select(`
          *,
          item:item_id (id, description, id_cache_fema, quantity_available, quantity_out),
          employee:employee_id (id, first_name, last_name)
        `)
        .eq("id", params.checkoutId)
        .single();

      if (checkoutError || !checkout) {
        toast.error("Checkout record not found");
        return false;
      }

      const returnQty = params.returnQuantity ?? checkout.checked_out_quantity;
      const isPartialReturn = returnQty < checkout.checked_out_quantity;

      if (returnQty > checkout.checked_out_quantity) {
        toast.error("Cannot return more than checked out quantity");
        return false;
      }

      const item = checkout.item as any;
      const employee = checkout.employee as any;

      if (isPartialReturn) {
        // Partial return: update the checkout record with reduced quantity
        const newCheckedOutQty = checkout.checked_out_quantity - returnQty;
        
        const { error: updateError } = await supabase
          .from("item_checkouts")
          .update({
            checked_out_quantity: newCheckedOutQty,
            checkin_notes: params.notes 
              ? `Partial return (${returnQty}): ${params.notes}` 
              : `Partial return: ${returnQty} of ${checkout.checked_out_quantity} returned`,
          })
          .eq("id", params.checkoutId);

        if (updateError) {
          toast.error("Failed to process partial return", { description: updateError.message });
          return false;
        }

        // Manually update inventory quantities for partial return
        const currentAvailable = item?.quantity_available ?? 0;
        const currentOut = item?.quantity_out ?? 0;
        
        const { error: invError } = await supabase
          .from("cache_inventory")
          .update({
            quantity_available: currentAvailable + returnQty,
            quantity_out: Math.max(0, currentOut - returnQty),
            status_item: 'available',
            updated_at: new Date().toISOString(),
          })
          .eq("id", checkout.item_id);

        if (invError) {
          console.error("Error updating inventory for partial return:", invError);
          // Don't fail the whole operation, quantities will be eventually consistent
        }

        const employeeName = employee 
          ? `${employee.first_name} ${employee.last_name}` 
          : 'team member';

        toast.success(`${returnQty} of ${checkout.checked_out_quantity} returned`, {
          description: `${newCheckedOutQty} still checked out to ${employeeName}`,
        });

      } else {
        // Full return: mark as checked in - trigger handles quantity restoration
        const { error } = await supabase
          .from("item_checkouts")
          .update({
            checked_in_at: new Date().toISOString(),
            checked_in_by: user.id,
            return_condition: params.condition,
            checkin_notes: params.notes,
          })
          .eq("id", params.checkoutId);

        if (error) {
          toast.error("Failed to check in item", { description: error.message });
          return false;
        }

        toast.success(`${item?.description || "Item"} returned successfully`, {
          description: `Quantity: ${checkout.checked_out_quantity} • Condition: ${params.condition}`,
        });
      }

      return true;
    } catch (error: any) {
      console.error("Check-in error:", error);
      toast.error("Failed to check in item", { description: error.message });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getItemCheckouts = async (itemId: string): Promise<ItemCheckout[]> => {
    const { data, error } = await supabase
      .from("item_checkouts")
      .select(`
        *,
        employee:employee_id (
          id,
          first_name,
          last_name,
          email,
          position
        )
      `)
      .eq("item_id", itemId)
      .is("checked_in_at", null)
      .order("checked_out_at", { ascending: false });

    if (error) {
      console.error("Error fetching item checkouts:", error);
      return [];
    }

    return (data || []) as ItemCheckout[];
  };

  const getEmployeeItemCheckouts = async (employeeId: string): Promise<ItemCheckout[]> => {
    const { data, error } = await supabase
      .from("item_checkouts")
      .select(`
        *,
        item:item_id (
          id,
          description,
          id_cache_fema,
          barcode,
          section,
          category_ref:category_id(name)
        )
      `)
      .eq("employee_id", employeeId)
      .order("checked_out_at", { ascending: false });

    if (error) {
      console.error("Error fetching employee item checkouts:", error);
      return [];
    }

    return (data || []).map((d: any) => ({
      ...d,
      item: d.item ? { ...d.item, subcategory: d.item.category_ref?.name ?? null } : d.item,
    })) as ItemCheckout[];
  };

  const getAllActiveCheckouts = async (): Promise<ItemCheckout[]> => {
    const { data, error } = await supabase
      .from("item_checkouts")
      .select(`
        *,
        employee:employee_id (
          id,
          first_name,
          last_name,
          email,
          position
        ),
        item:item_id (
          id,
          description,
          id_cache_fema,
          barcode,
          section,
          category_ref:category_id(name)
        )
      `)
      .is("checked_in_at", null)
      .order("checked_out_at", { ascending: false });

    if (error) {
      console.error("Error fetching all active checkouts:", error);
      return [];
    }

    return (data || []).map((d: any) => ({
      ...d,
      item: d.item ? { ...d.item, subcategory: d.item.category_ref?.name ?? null } : d.item,
    })) as ItemCheckout[];
  };

  return {
    loading,
    checkoutItem,
    checkinItem,
    getItemCheckouts,
    getEmployeeItemCheckouts,
    getAllActiveCheckouts,
  };
};

// Hook to fetch and subscribe to item checkouts for a specific item
export const useItemCheckoutsForItem = (itemId: string | null) => {
  const [checkouts, setCheckouts] = useState<ItemCheckout[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCheckouts = async () => {
    if (!itemId) {
      setCheckouts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("item_checkouts")
      .select(`
        *,
        employee:employee_id (
          id,
          first_name,
          last_name,
          email,
          position
        )
      `)
      .eq("item_id", itemId)
      .is("checked_in_at", null)
      .order("checked_out_at", { ascending: false });

    if (error) {
      console.error("Error fetching checkouts:", error);
    } else {
      setCheckouts((data || []) as ItemCheckout[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCheckouts();

    if (!itemId) return;

    const channel = supabase
      .channel(`item_checkouts_${itemId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "item_checkouts",
          filter: `item_id=eq.${itemId}`,
        },
        () => {
          fetchCheckouts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [itemId]);

  return { checkouts, loading, refetch: fetchCheckouts };
};

// Hook for employee item checkouts
export const useEmployeeItemCheckouts = (employeeId: string | null) => {
  const [checkouts, setCheckouts] = useState<ItemCheckout[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCheckouts = async () => {
    if (!employeeId) {
      setCheckouts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("item_checkouts")
      .select(`
        *,
        item:item_id (
          id,
          description,
          id_cache_fema,
          barcode,
          section,
          category_ref:category_id(name)
        )
      `)
      .eq("employee_id", employeeId)
      .order("checked_out_at", { ascending: false });

    if (error) {
      console.error("Error fetching employee checkouts:", error);
    } else {
      setCheckouts((data || []).map((d: any) => ({
        ...d,
        item: d.item ? { ...d.item, subcategory: d.item.category_ref?.name ?? null } : d.item,
      })) as ItemCheckout[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCheckouts();

    if (!employeeId) return;

    const channel = supabase
      .channel(`employee_item_checkouts_${employeeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "item_checkouts",
          filter: `employee_id=eq.${employeeId}`,
        },
        () => {
          fetchCheckouts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [employeeId]);

  // Calculate checkout stats
  const activeCheckouts = checkouts.filter(c => !c.checked_in_at);
  const returnedCheckouts = checkouts.filter(c => c.checked_in_at);
  
  const overdueCheckouts = activeCheckouts.filter(c => {
    if (!c.expected_return_at) return false;
    return new Date(c.expected_return_at) < new Date();
  });

  return { 
    checkouts, 
    activeCheckouts,
    returnedCheckouts,
    overdueCheckouts,
    loading, 
    refetch: fetchCheckouts 
  };
};

// Utility to check if a checkout is overdue
export const isCheckoutOverdue = (checkout: ItemCheckout): boolean => {
  if (!checkout.expected_return_at || checkout.checked_in_at) return false;
  return new Date(checkout.expected_return_at) < new Date();
};

// Utility to get days until/past due
export const getCheckoutDueStatus = (checkout: ItemCheckout): { 
  isOverdue: boolean; 
  daysRemaining: number | null;
  status: "overdue" | "due-soon" | "ok" | "no-due-date";
} => {
  if (!checkout.expected_return_at) {
    return { isOverdue: false, daysRemaining: null, status: "no-due-date" };
  }
  
  const dueDate = new Date(checkout.expected_return_at);
  const today = new Date();
  const daysRemaining = differenceInDays(dueDate, today);
  
  if (daysRemaining < 0) {
    return { isOverdue: true, daysRemaining, status: "overdue" };
  }
  if (daysRemaining <= 3) {
    return { isOverdue: false, daysRemaining, status: "due-soon" };
  }
  return { isOverdue: false, daysRemaining, status: "ok" };
};
