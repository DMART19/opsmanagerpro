// Calendar types and shared data

export interface CalendarTask {
  id: string;
  title: string;
  type: "task" | "event" | "deadline" | "reminder";
  date: Date;
  startTime: string;
  endTime: string;
  assignees: string[];
  status: "pending" | "in-progress" | "complete";
  warehouse: string;
  section: string;
  priority: "low" | "medium" | "high";
  notes: string;
  // Recurrence metadata
  isRecurring?: boolean;
  isOccurrence?: boolean;
  masterTaskId?: string;
  recurrenceType?: string;
  // Unified fields for single-source-of-truth
  start_date: string;
  end_date: string | null;
  deleted_at: string | null;
  updated_at: string;
}

export type ViewType = "month" | "week" | "day" | "agenda";

// Reduced saturation colors for a calmer appearance
export const taskTypeColors = {
  task: { 
    bg: "bg-primary/80", 
    dot: "bg-primary", 
    text: "text-primary", 
    border: "border-primary/60",
    light: "bg-primary/8"
  },
  event: { 
    bg: "bg-emerald-500/80", 
    dot: "bg-emerald-500", 
    text: "text-emerald-600", 
    border: "border-emerald-500/60",
    light: "bg-emerald-500/8"
  },
  deadline: { 
    bg: "bg-amber-500/80", 
    dot: "bg-amber-500", 
    text: "text-amber-600", 
    border: "border-amber-500/60",
    light: "bg-amber-500/8"
  },
  reminder: { 
    bg: "bg-violet-500/80", 
    dot: "bg-violet-500", 
    text: "text-violet-600", 
    border: "border-violet-500/60",
    light: "bg-violet-500/8"
  },
};

export const taskTypeLabels: Record<string, string> = {
  all: "All",
  task: "Tasks",
  event: "Events",
  deadline: "Deadlines",
  reminder: "Reminders",
};

export const priorityColors = {
  low: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  medium: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  high: "bg-rose-500/10 text-rose-600 border-rose-500/20",
};

export const priorityLabels: Record<string, string> = {
  all: "All",
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const statusLabels: Record<string, string> = {
  all: "All",
  pending: "Pending",
  "in-progress": "In Progress",
  complete: "Complete",
};

export const statusColors = {
  pending: "bg-muted text-muted-foreground",
  "in-progress": "bg-primary/10 text-primary border-primary/20",
  complete: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
};

// Helper to check if a task is overdue
export const isOverdue = (task: CalendarTask): boolean => {
  if (task.status === "complete") return false;
  const taskDate = new Date(task.date);
  taskDate.setHours(0, 0, 0, 0);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  return taskDate < todayStart;
};
