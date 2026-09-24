import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface ReplayBundle {
  app_version?: string;
  breadcrumbs?: Array<{
    type: "navigation" | "click" | "api" | "custom";
    timestamp: string;
    data: string;
  }>;
  captured_at?: string;
  url?: string;
  viewport?: string;
}

export type ErrorStatus = "unresolved" | "investigating" | "fix_in_progress" | "resolved" | "ignored";

export const ERROR_STATUSES: { value: ErrorStatus; label: string; color: string }[] = [
  { value: "unresolved", label: "Open", color: "text-orange-600 bg-orange-500/10 border-orange-500/30" },
  { value: "investigating", label: "Investigating", color: "text-blue-600 bg-blue-500/10 border-blue-500/30" },
  { value: "fix_in_progress", label: "Fix in Progress", color: "text-purple-600 bg-purple-500/10 border-purple-500/30" },
  { value: "resolved", label: "Resolved", color: "text-green-600 bg-green-500/10 border-green-500/30" },
  { value: "ignored", label: "Ignored", color: "text-muted-foreground bg-muted/50 border-border" },
];

export interface ErrorLog {
  id: string;
  user_id: string | null;
  user_email: string | null;
  severity: "critical" | "error" | "warn" | "info";
  message: string;
  stack_trace: string | null;
  page_route: string | null;
  browser_info: string | null;
  api_endpoint: string | null;
  api_status_code: number | null;
  request_method: string | null;
  workspace_id: string | null;
  error_hash: string | null;
  hit_count: number;
  status: ErrorStatus;
  admin_notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
  last_seen_at: string;
  replay_bundle: ReplayBundle | null;
  action_context: { action: string; inputs?: Record<string, unknown> } | null;
}

export function useErrorLogs() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["error-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("error_logs" as any)
        .select("id, user_id, user_email, severity, message, stack_trace, page_route, browser_info, api_endpoint, api_status_code, request_method, workspace_id, error_hash, hit_count, status, admin_notes, resolved_at, resolved_by, created_at, updated_at, last_seen_at, replay_bundle, action_context")
        .order("last_seen_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as unknown as ErrorLog[];
    },
    staleTime: 30_000,
    gcTime: 120_000, // 2 minutes
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("error-logs-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "error_logs" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["error-logs"] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return query;
}

export function useResolveError() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, admin_notes }: { id: string; admin_notes?: string }) => {
      const { error } = await supabase
        .from("error_logs" as any)
        .update({
          status: "resolved",
          resolved_at: new Date().toISOString(),
          admin_notes: admin_notes || null,
        } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["error-logs"] });
    },
  });
}

export function useUpdateErrorNotes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, admin_notes }: { id: string; admin_notes: string }) => {
      const { error } = await supabase
        .from("error_logs" as any)
        .update({ admin_notes } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["error-logs"] });
    },
  });
}

export function useUpdateErrorStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, admin_notes }: { id: string; status: ErrorStatus; admin_notes?: string }) => {
      const updates: Record<string, unknown> = { status };
      if (status === "resolved") {
        updates.resolved_at = new Date().toISOString();
      }
      if (admin_notes !== undefined) {
        updates.admin_notes = admin_notes;
      }
      const { error } = await supabase
        .from("error_logs" as any)
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["error-logs"] });
    },
  });
}

// Re-export captureError for backward compat
export { captureError } from "@/lib/error-capture";
