import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { useSettingsOptional } from "@/contexts/SettingsContext";

export interface UserNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  notification_type: string;
  priority: string;
  is_read: boolean;
  is_dismissed: boolean;
  related_entity_type: string | null;
  related_entity_id: string | null;
  action_url: string | null;
  created_at: string;
  read_at: string | null;
  expires_at: string | null;
}

// Map notification_type to the corresponding notification_settings toggle
const typeToToggle: Record<string, string> = {
  checkout_overdue: "checkout_alerts",
  maintenance_reminder: "maintenance_alerts",
  credential_expiry: "certification_expiry_alerts",
  task_reminder: "task_due_alerts",
  // low_stock has no dedicated toggle — always shown if in_app_enabled
};

export const useNotifications = () => {
  const queryClient = useQueryClient();
  const settings = useSettingsOptional();
  const notifSettings = settings?.notificationSettings;

  const { data: rawNotifications = [], isLoading, error } = useQuery({
    queryKey: ["user-notifications"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("user_notifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_dismissed", false)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as UserNotification[];
    },
  });

  // Filter notifications based on user's in_app_enabled + per-type toggles
  const notifications = rawNotifications.filter((n) => {
    // If settings haven't loaded yet, show all (they'll re-filter once loaded)
    if (!notifSettings) return true;

    // Master in-app toggle
    if (!notifSettings.in_app_enabled) return false;

    // Per-type toggle
    const toggleKey = typeToToggle[n.notification_type];
    if (toggleKey && toggleKey in notifSettings) {
      return (notifSettings as any)[toggleKey] === true;
    }

    // Types without a dedicated toggle (e.g. low_stock) — show if in_app is on
    return true;
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("user-notifications-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_notifications",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const highPriorityCount = notifications.filter((n) => n.priority === "high" && !n.is_read).length;

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("user_notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("user_notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
    },
  });

  const dismiss = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("user_notifications")
        .update({ is_dismissed: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
    },
  });

  const dismissAll = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("user_notifications")
        .update({ is_dismissed: true })
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-notifications"] });
    },
  });

  return {
    notifications,
    unreadCount,
    highPriorityCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    dismiss,
    dismissAll,
  };
};
