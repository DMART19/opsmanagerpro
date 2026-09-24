import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CheckoutHistoryRecord {
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
  };
}

export interface CheckoutHistoryFilters {
  employeeId?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  actionType?: 'all' | 'checked_out' | 'returned';
}

/**
 * Hook for fetching complete checkout history for an item
 * Includes both active and completed checkouts
 */
export const useItemCheckoutHistory = (
  itemId: string | null,
  filters?: CheckoutHistoryFilters
) => {
  const [history, setHistory] = useState<CheckoutHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    if (!itemId) {
      setHistory([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    let query = supabase
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
      .order("checked_out_at", { ascending: false });

    // Apply filters
    if (filters?.employeeId) {
      query = query.eq("employee_id", filters.employeeId);
    }

    if (filters?.startDate) {
      query = query.gte("checked_out_at", filters.startDate.toISOString());
    }

    if (filters?.endDate) {
      query = query.lte("checked_out_at", filters.endDate.toISOString());
    }

    if (filters?.actionType === 'returned') {
      query = query.not("checked_in_at", "is", null);
    } else if (filters?.actionType === 'checked_out') {
      query = query.is("checked_in_at", null);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching checkout history:", error);
    } else {
      setHistory((data || []) as CheckoutHistoryRecord[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchHistory();

    if (!itemId) return;

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`item_checkout_history_${itemId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "item_checkouts",
          filter: `item_id=eq.${itemId}`,
        },
        () => {
          fetchHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [itemId, filters?.employeeId, filters?.startDate?.toISOString(), filters?.endDate?.toISOString(), filters?.actionType]);

  // Calculate stats
  const activeCheckouts = history.filter(h => !h.checked_in_at);
  const completedCheckouts = history.filter(h => h.checked_in_at);
  const totalCheckouts = history.length;
  const totalQuantityCheckedOut = activeCheckouts.reduce((sum, h) => sum + h.checked_out_quantity, 0);

  return {
    history,
    activeCheckouts,
    completedCheckouts,
    totalCheckouts,
    totalQuantityCheckedOut,
    loading,
    refetch: fetchHistory,
  };
};

/**
 * Get checkout status for display
 */
export const getCheckoutStatus = (record: CheckoutHistoryRecord): {
  status: 'active' | 'returned' | 'overdue';
  label: string;
  className: string;
} => {
  if (record.checked_in_at) {
    return {
      status: 'returned',
      label: 'Returned',
      className: 'bg-muted text-muted-foreground',
    };
  }

  if (record.expected_return_at && new Date(record.expected_return_at) < new Date()) {
    return {
      status: 'overdue',
      label: 'Overdue',
      className: 'bg-destructive/10 text-destructive',
    };
  }

  return {
    status: 'active',
    label: 'Checked Out',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };
};
