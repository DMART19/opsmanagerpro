/**
 * useCalendarItems — Single source of truth for all calendar data.
 *
 * Provides:
 *   • calendarItems   – the unified, unfiltered list (tasks + generated recurrence instances)
 *   • filteredItems   – calendarItems after type/priority/status/assignee/search filters (derived, not stored)
 *   • overdueItems    – computed from filteredItems where start_date < now && status != complete
 *   • overdueCount    – convenience count
 *   • isLoading       – data still loading
 *   • dbTasks / mutations forwarded from useTasks
 */

import { useMemo } from "react";
import { addDays, addMonths, format, isSameDay, parseISO } from "date-fns";
import { useTasks, Task } from "@/hooks/use-tasks";
import { useTourMode } from "@/contexts/TourModeContext";
import { useDemoDataOptional } from "@/contexts/DemoDataContext";
import { CalendarTask, isOverdue } from "@/components/calendar/types";

// ── Mapping helpers ──────────────────────────────────────────────

const taskTypeMap: Record<string, CalendarTask["type"]> = {
  review: "task",
  service: "task",
  testing: "task",
  training: "event",
  transfer: "task",
  other: "task",
  task: "task",
  event: "event",
  deadline: "deadline",
  reminder: "reminder",
};

const statusMap: Record<string, CalendarTask["status"]> = {
  pending: "pending",
  in_progress: "in-progress",
  completed: "complete",
  complete: "complete",
  cancelled: "pending",
};

const priorityMap: Record<string, CalendarTask["priority"]> = {
  low: "low",
  medium: "medium",
  high: "high",
};

export const mapDbTaskToCalendarTask = (task: Task): CalendarTask => {
  const isRecurring = task.recurrence_type && task.recurrence_type !== "none";
  return {
    id: task.id,
    title: task.title,
    type: taskTypeMap[task.task_type] || "task",
    date: parseISO(task.start_date),
    startTime: task.start_time || "09:00",
    endTime: task.end_time || "17:00",
    assignees: task.assigned_to || [],
    status: statusMap[task.status] || "pending",
    warehouse: task.location || "Not specified",
    section: task.section || "Not specified",
    priority: priorityMap[task.priority] || "medium",
    notes: task.description || "",
    isRecurring: !!isRecurring,
    masterTaskId: task.recurrence_parent_id || (isRecurring ? task.id : undefined),
    recurrenceType: task.recurrence_type,
    // Unified fields
    start_date: task.start_date,
    end_date: task.end_date || null,
    deleted_at: null, // already filtered out by query
    updated_at: task.updated_at,
  };
};

// ── Recurrence generator ─────────────────────────────────────────

const generateOccurrences = (dbTasks: Task[]): CalendarTask[] => {
  const horizonEnd = addDays(new Date(), 90);
  const occurrences: CalendarTask[] = [];

  for (const dbTask of dbTasks) {
    if (dbTask.recurrence_type === "none" || !dbTask.recurrence_type) continue;
    if (dbTask.recurrence_parent_id) continue;

    const startDate = parseISO(dbTask.start_date);
    const endDate = dbTask.recurrence_end_date
      ? parseISO(dbTask.recurrence_end_date)
      : horizonEnd;
    const interval = dbTask.recurrence_interval || 1;
    const exceptions = dbTask.recurrence_exceptions || [];

    const overrideDates = dbTasks
      .filter((t) => t.recurrence_parent_id === dbTask.id && t.original_date)
      .map((t) => t.original_date!);

    let cursor = startDate;
    let safety = 0;
    while (cursor <= endDate && cursor <= horizonEnd && safety < 500) {
      safety++;
      const dateStr = format(cursor, "yyyy-MM-dd");
      if (
        !isSameDay(cursor, startDate) &&
        !exceptions.includes(dateStr) &&
        !overrideDates.includes(dateStr)
      ) {
        const mapped = mapDbTaskToCalendarTask(dbTask);
        occurrences.push({
          ...mapped,
          id: `${dbTask.id}_${dateStr}`,
          date: cursor,
          start_date: dateStr,
          isOccurrence: true,
          masterTaskId: dbTask.id,
        });
      }

      if (dbTask.recurrence_type === "daily") cursor = addDays(cursor, interval);
      else if (dbTask.recurrence_type === "weekly") cursor = addDays(cursor, 7 * interval);
      else if (dbTask.recurrence_type === "monthly") cursor = addMonths(cursor, interval);
      else if (dbTask.recurrence_type === "custom") cursor = addDays(cursor, interval);
      else break;
    }
  }

  return occurrences;
};

// ── Filter options ───────────────────────────────────────────────

export interface CalendarFilters {
  typeFilter: string;
  priorityFilter: string;
  statusFilter: string;
  assigneeFilter: string;
  searchQuery: string;
}

const DEFAULT_FILTERS: CalendarFilters = {
  typeFilter: "all",
  priorityFilter: "all",
  statusFilter: "all",
  assigneeFilter: "all",
  searchQuery: "",
};

// ── Hook ─────────────────────────────────────────────────────────

export const useCalendarItems = (filters: CalendarFilters = DEFAULT_FILTERS) => {
  const { tasks: prodDbTasks, isLoading: prodLoading, updateTask, deleteTask, createTask } = useTasks();
  const { isTourMode } = useTourMode();
  const demoData = useDemoDataOptional();

  // Unified database tasks (demo or production)
  const dbTasks: Task[] = useMemo(() => {
    if (isTourMode && demoData) {
      return demoData.tasks.map((t: any) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        task_type: t.task_type,
        priority: t.priority,
        status: t.status,
        start_date: t.start_date,
        end_date: t.end_date,
        start_time: t.start_time,
        end_time: t.end_time,
        assigned_to: t.assigned_employees,
        location: t.location,
        section: null,
        reminder_enabled: t.reminder_enabled,
        created_by: null,
        user_id: t.user_id,
        created_at: t.created_at,
        updated_at: t.updated_at,
        recurrence_type: "none",
        recurrence_interval: 1,
        recurrence_end_date: null,
        recurrence_parent_id: null,
        original_date: null,
        recurrence_exceptions: null,
      }));
    }
    return prodDbTasks;
  }, [isTourMode, demoData, prodDbTasks]);

  const isLoading = isTourMode ? false : prodLoading;

  // ── calendarItems: single source of truth, deduped + sorted ──
  const calendarItems = useMemo(() => {
    const base = dbTasks.map(mapDbTaskToCalendarTask);
    const occurrences = generateOccurrences(dbTasks);
    const all = [...base, ...occurrences];
    // Deduplicate by id (last wins) and sort by start_date
    const seen = new Map<string, CalendarTask>();
    for (const item of all) {
      // Hard guard: never include items with deleted_at
      if (item.deleted_at) continue;
      seen.set(item.id, item);
    }
    return Array.from(seen.values()).sort((a, b) =>
      a.start_date.localeCompare(b.start_date)
    );
  }, [dbTasks]);

  // ── filteredItems: derived, not stored ──
  const filteredItems = useMemo(() => {
    let items = calendarItems;

    if (filters.typeFilter !== "all") {
      items = items.filter((t) => t.type === filters.typeFilter);
    }
    if (filters.priorityFilter !== "all") {
      items = items.filter((t) => t.priority === filters.priorityFilter);
    }
    if (filters.statusFilter !== "all") {
      items = items.filter((t) => t.status === filters.statusFilter);
    }
    if (filters.assigneeFilter !== "all") {
      items = items.filter((t) => t.assignees.some((a) => a === filters.assigneeFilter));
    }
    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase();
      items = items.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.assignees.some((a) => a.toLowerCase().includes(q)) ||
          t.warehouse.toLowerCase().includes(q) ||
          t.section.toLowerCase().includes(q) ||
          t.notes.toLowerCase().includes(q)
      );
    }

    return items;
  }, [calendarItems, filters]);

  // ── overdueItems: computed, never stored ──
  const overdueItems = useMemo(() => filteredItems.filter(isOverdue), [filteredItems]);

  return {
    /** All calendar items — the single source of truth */
    calendarItems,
    /** Filtered view of calendarItems (derived) */
    filteredItems,
    /** Overdue subset of filteredItems (derived) */
    overdueItems,
    /** Convenience count */
    overdueCount: overdueItems.length,
    /** Raw database tasks for edit/delete lookups */
    dbTasks,
    /** Loading state */
    isLoading,
    /** Mutations */
    createTask,
    updateTask,
    deleteTask,
  };
};
