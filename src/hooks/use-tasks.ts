import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  task_type: string;
  priority: string;
  status: string;
  start_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  assigned_to: string[] | null;
  location: string | null;
  section: string | null;
  reminder_enabled: boolean | null;
  created_by: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  recurrence_type: string;
  recurrence_interval: number;
  recurrence_end_date: string | null;
  recurrence_parent_id: string | null;
  original_date: string | null;
  recurrence_exceptions: string[] | null;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  task_type: string;
  priority: string;
  status?: string;
  start_date: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  assigned_to?: string[];
  location?: string;
  section?: string;
  reminder_enabled?: boolean;
  recurrence_type?: string;
  recurrence_interval?: number;
  recurrence_end_date?: string;
  recurrence_parent_id?: string;
  original_date?: string;
  recurrence_exceptions?: string[];
}

const TASKS_KEY = ["tasks"];

const TASK_COLUMNS = "id, title, description, task_type, priority, status, start_date, end_date, start_time, end_time, assigned_to, location, section, reminder_enabled, created_by, user_id, created_at, updated_at, recurrence_type, recurrence_interval, recurrence_end_date, recurrence_parent_id, original_date, recurrence_exceptions";

// Track IDs pending deletion — prevents realtime from re-adding them
const pendingDeletes = new Set<string>();

// ── Cache helpers ────────────────────────────────────────────────
// Deduplicate by id and sort by start_date in one pass.
const dedupeAndSort = (tasks: Task[]): Task[] => {
  const map = new Map<string, Task>();
  for (const t of tasks) map.set(t.id, t);
  return Array.from(map.values()).sort((a, b) =>
    a.start_date.localeCompare(b.start_date)
  );
};

// Guard: never let the cache become undefined/empty due to a race.
// Returns the previous snapshot if the updater would produce nothing.
const safeSetTasks = (
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (old: Task[]) => Task[],
) => {
  queryClient.setQueryData<Task[]>(TASKS_KEY, (old) => {
    if (!old) return old as unknown as Task[]; // cache not initialised yet — don't touch
    const next = updater(old);
    return dedupeAndSort(next);
  });
};

export const useTasks = () => {
  const queryClient = useQueryClient();

  // ── Initial fetch — runs once, then realtime keeps it fresh ──
  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: TASKS_KEY,
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("tasks")
        .select(TASK_COLUMNS)
        .is("deleted_at", null)
        .order("start_date", { ascending: true });

      if (error) throw error;
      // Fire-and-forget access log
      import("@/lib/log-data-access").then(m =>
        m.logDataAccess({ objectType: "calendar_tasks", actionType: "read", metadata: { count: (data || []).length } })
      );
      return dedupeAndSort(data as Task[]);
    },
    staleTime: Infinity,
    gcTime: 1000 * 60 * 10,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // ── Realtime subscription — patches cache directly ──
  useEffect(() => {
    const channel = supabase
      .channel("tasks_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tasks" },
        (payload) => {
          const newTask = payload.new as Task & { deleted_at?: string | null };
          // Hard guard: never add soft-deleted or pending-delete rows
          if (newTask.deleted_at || pendingDeletes.has(newTask.id)) return;
          safeSetTasks(queryClient, (old) => {
            // Replace any temp-* optimistic entry that matches by title+start_date
            const cleaned = old.filter(t =>
              !(t.id.startsWith("temp-") && t.title === newTask.title && t.start_date === newTask.start_date)
            );
            // Replace if exists, otherwise append
            const exists = cleaned.some(t => t.id === newTask.id);
            if (exists) return cleaned.map(t => t.id === newTask.id ? newTask : t);
            return [...cleaned, newTask];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tasks" },
        (payload) => {
          const updated = payload.new as Task & { deleted_at?: string | null };
          // If soft-deleted or pending deletion → remove from cache
          if (updated.deleted_at || pendingDeletes.has(updated.id)) {
            pendingDeletes.delete(updated.id);
            safeSetTasks(queryClient, (old) => old.filter(t => t.id !== updated.id));
            return;
          }
          // Otherwise replace in-place (never re-add if not present)
          safeSetTasks(queryClient, (old) => {
            const exists = old.some(t => t.id === updated.id);
            if (!exists) return old; // don't re-introduce unknown rows
            return old.map(t => t.id === updated.id ? updated : t);
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "tasks" },
        (payload) => {
          const deletedId = (payload.old as any)?.id;
          if (deletedId) {
            pendingDeletes.delete(deletedId);
            safeSetTasks(queryClient, (old) => old.filter(t => t.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // ── Mutations — optimistic updates, NO invalidateQueries ──

  const createTask = useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in to create tasks");

      const cleanInput: Record<string, any> = { user_id: user.id };
      for (const [key, value] of Object.entries(input)) {
        if (value !== undefined) {
          cleanInput[key] = value;
        }
      }

      const { data, error } = await supabase
        .from("tasks")
        .insert([cleanInput as any])
        .select()
        .single();

      if (error) throw error;
      import("@/lib/track-event").then(m => m.trackEvent("calendar_event_created", {
        object_id: data?.id,
        object_name: (data as any)?.title || "Task",
      }));
      return data;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: TASKS_KEY });
      const previous = queryClient.getQueryData<Task[]>(TASKS_KEY);
      const optimistic: Task = {
        id: `temp-${Date.now()}`,
        title: input.title,
        description: input.description || null,
        task_type: input.task_type,
        priority: input.priority,
        status: input.status || "pending",
        start_date: input.start_date,
        end_date: input.end_date || null,
        start_time: input.start_time || null,
        end_time: input.end_time || null,
        assigned_to: input.assigned_to || null,
        location: input.location || null,
        section: input.section || null,
        reminder_enabled: input.reminder_enabled || null,
        created_by: null,
        user_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        recurrence_type: input.recurrence_type || "none",
        recurrence_interval: input.recurrence_interval || 1,
        recurrence_end_date: input.recurrence_end_date || null,
        recurrence_parent_id: input.recurrence_parent_id || null,
        original_date: input.original_date || null,
        recurrence_exceptions: input.recurrence_exceptions || null,
      };
      safeSetTasks(queryClient, (old) => [...old, optimistic]);
      return { previous };
    },
    onError: (_err, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(TASKS_KEY, context.previous);
      }
      toast({
        title: "Error creating task",
        description: _err.message,
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Task Created",
        description: "Your task has been successfully added to the calendar.",
      });
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Task> & { id: string }) => {
      const { data, error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: TASKS_KEY });
      const previous = queryClient.getQueryData<Task[]>(TASKS_KEY);
      safeSetTasks(queryClient, (old) =>
        old.map((t) => (t.id === variables.id ? { ...t, ...variables } : t))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(TASKS_KEY, context.previous);
      }
      toast({
        title: "Error updating task",
        description: _err.message,
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Task Updated",
        description: "Your task has been updated.",
      });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      // Optimistic temp items haven't been persisted yet — nothing to delete server-side
      if (id.startsWith("temp-")) return;

      const { error } = await supabase
        .from("tasks")
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq("id", id);

      if (error) throw error;
    },
    onMutate: async (id) => {
      pendingDeletes.add(id);
      await queryClient.cancelQueries({ queryKey: TASKS_KEY });
      const previous = queryClient.getQueryData<Task[]>(TASKS_KEY);
      // Only filter — never replace with empty array
      if (previous && previous.length > 0) {
        queryClient.setQueryData<Task[]>(TASKS_KEY,
          previous.filter((t) => t.id !== id)
        );
      }
      return { previous };
    },
    onError: (_err, id, context) => {
      pendingDeletes.delete(id);
      if (context?.previous) {
        queryClient.setQueryData(TASKS_KEY, context.previous);
      }
      toast({
        title: "Error deleting task",
        description: _err.message,
        variant: "destructive",
      });
    },
    onSuccess: (_data, id) => {
      toast({
        title: "Task Deleted",
        description: "The task has been removed.",
      });
    },
  });

  return {
    tasks,
    isLoading,
    error,
    createTask,
    updateTask,
    deleteTask,
  };
};
