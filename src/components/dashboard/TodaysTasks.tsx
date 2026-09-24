import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDemoPath } from "@/hooks/use-demo-path";
import { useTourMode } from "@/contexts/TourModeContext";
import { useDemoDataOptional } from "@/contexts/DemoDataContext";
import { ClipboardCheck, PackageCheck, Calendar, Wrench, Users, FileText, HelpCircle, CheckCircle2, ExternalLink, MoreHorizontal, Bell, CalendarPlus, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMaintenance } from "@/hooks/use-maintenance";
import { useTasks } from "@/hooks/use-tasks";
import { DASHBOARD_TOOLTIPS } from "@/lib/tooltip-content";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

type FilterType = "today" | "week" | "completed";

interface UnifiedTask {
  id: string;
  title: string;
  type: string;
  description?: string;
  date: string;
  time?: string;
  status: string;
  source: "maintenance" | "calendar";
  equipmentId?: string;
  reminderEnabled?: boolean;
}

const getTaskIcon = (type: string, source: string) => {
  if (source === "calendar") {
    switch (type.toLowerCase()) {
      case "meeting": return Users;
      case "training": return ClipboardCheck;
      case "review": return PackageCheck;
      case "deadline":
      case "report": return FileText;
      default: return Calendar;
    }
  }
  switch (type.toLowerCase()) {
    case "preventive":
    case "corrective": return Wrench;
    case "inspection": return PackageCheck;
    default: return Wrench;
  }
};

const getUrgencyLevel = (dateString: string | null): "today" | "tomorrow" | "week" | "later" => {
  if (!dateString) return "later";
  const taskDate = new Date(dateString);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekFromNow = new Date(now);
  weekFromNow.setDate(weekFromNow.getDate() + 7);
  
  if (taskDate < tomorrow) return "today";
  if (taskDate < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)) return "tomorrow";
  if (taskDate < weekFromNow) return "week";
  return "later";
};

export const TodaysTasks = () => {
  const navigate = useNavigate();
  const { getPath } = useDemoPath();
  const { isTourMode } = useTourMode();
  const demoData = useDemoDataOptional();
  const [activeFilter, setActiveFilter] = useState<FilterType>("today");
  const { maintenanceRecords, loading: loadingMaintenance } = useMaintenance();
  const { tasks: prodCalendarTasks, isLoading: loadingCalendar, updateTask } = useTasks();

  const calendarTasks = isTourMode && demoData
    ? demoData.tasks.map(t => ({
        ...t,
        assigned_to: t.assigned_employees,
        section: null as string | null,
        created_by: null as string | null,
      }))
    : prodCalendarTasks;

  const loading = isTourMode ? false : (loadingMaintenance || loadingCalendar);

  const unifiedTasks: UnifiedTask[] = [
    ...(isTourMode ? [] : maintenanceRecords.map((record) => ({
      id: record.id,
      title: record.equipment?.name || "Scheduled Task",
      type: record.maintenance_type,
      description: record.description,
      date: record.next_maintenance_date || "",
      status: record.status || "pending",
      source: "maintenance" as const,
      equipmentId: record.equipment_id,
    }))),
    ...calendarTasks.map((task) => ({
      id: task.id,
      title: task.title,
      type: task.task_type,
      description: task.description || undefined,
      date: task.start_date,
      time: task.start_time || undefined,
      status: task.status,
      source: "calendar" as const,
      reminderEnabled: task.reminder_enabled || false,
    })),
  ];

  const filteredTasks = unifiedTasks.filter((task) => {
    const isCompleted = task.status === "completed" || task.status === "complete";
    if (activeFilter === "completed") return isCompleted;
    if (!task.date) return false;
    const taskDate = new Date(task.date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    if (activeFilter === "today") {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return taskDate >= now && taskDate < tomorrow && !isCompleted;
    }
    if (activeFilter === "week") {
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      return taskDate >= now && taskDate < nextWeek && !isCompleted;
    }
    return false;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const urgencyOrder = { today: 0, tomorrow: 1, week: 2, later: 3 };
    const aUrgency = getUrgencyLevel(a.date);
    const bUrgency = getUrgencyLevel(b.date);
    if (aUrgency !== bUrgency) return urgencyOrder[aUrgency] - urgencyOrder[bUrgency];
    if (a.time && b.time) return a.time.localeCompare(b.time);
    if (a.time) return -1;
    if (b.time) return 1;
    return 0;
  });

  // Only show top 3 tasks for focused view
  const displayTasks = sortedTasks.slice(0, 3);
  const remainingCount = sortedTasks.length - displayTasks.length;

  const todayCount = unifiedTasks.filter(task => {
    const isCompleted = task.status === "completed" || task.status === "complete";
    if (!task.date || isCompleted) return false;
    const taskDate = new Date(task.date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return taskDate >= now && taskDate < tomorrow;
  }).length;

  const handleMarkDone = async (task: UnifiedTask) => {
    if (task.source === "calendar") {
      await updateTask.mutateAsync({ id: task.id, status: "completed" });
      toast.success(`"${task.title}" completed`, {
        description: "Task marked as done.",
      });
    }
  };

  if (loading) {
    return (
      <Card className="p-4 sm:p-6">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-6 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5 sm:p-6 animate-fade-in" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="text-lg font-semibold tracking-tight text-foreground">Today's Tasks</h3>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors"
                  aria-label="Help for Today's Tasks"
                >
                  <HelpCircle className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-sm font-medium">
                {DASHBOARD_TOOLTIPS.todaysTasks}
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-2.5 mt-1.5">
            <p className="text-[13px] text-muted-foreground/70 font-medium">
              <span className="tabular-nums">{filteredTasks.length}</span> {activeFilter === "completed" ? "completed" : "upcoming"}
            </p>
            {todayCount > 0 && activeFilter !== "today" && (
              <span className="text-xs font-medium text-primary/90 bg-primary/8 px-2.5 py-1 rounded-full">
                {todayCount} due today
              </span>
            )}
          </div>
        </div>
        
        <div className="flex gap-0.5 p-1 bg-muted/40 rounded-xl border border-border/30">
          {(["today", "week", "completed"] as FilterType[]).map((f) => (
            <Button
              key={f}
              variant="ghost"
              size="sm"
              onClick={() => setActiveFilter(f)}
              className={cn(
                "rounded-lg text-xs sm:text-sm h-8 px-3.5 font-medium transition-all duration-300",
                activeFilter === f 
                  ? "bg-background shadow-sm text-foreground" 
                  : "text-muted-foreground/70 hover:text-foreground hover:bg-transparent"
              )}
            >
              {f === "today" ? "Today" : f === "week" ? "This Week" : "Done"}
            </Button>
          ))}
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="text-center py-10">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-success/8 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 text-success/60" strokeWidth={1.5} />
          </div>
          <p className="font-semibold text-foreground/80 text-[15px]">
            {activeFilter === "completed" 
              ? "No completed tasks yet"
              : "You're clear today."}
          </p>
          <p className="text-[13px] mt-1.5 mb-5 max-w-[260px] mx-auto text-muted-foreground/60 leading-relaxed">
            {activeFilter === "completed" 
              ? "Tasks you complete will appear here."
              : "No tasks scheduled. Add one to stay organized."}
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate(getPath('/calendar'))} 
            className="gap-2 h-9 px-4 rounded-xl"
          >
            <CalendarPlus className="h-4 w-4" />
            Add a task
          </Button>
        </div>
      ) : (
        <div className="space-y-1.5">
          {displayTasks.map((task, index) => {
            const Icon = getTaskIcon(task.type, task.source);
            const urgency = getUrgencyLevel(task.date);
            
            return (
              <div
                key={`${task.source}-${task.id}`}
                className={cn(
                  "group flex items-center gap-3.5 p-3.5 rounded-xl border transition-all duration-150",
                  "hover:bg-muted/30 cursor-pointer",
                  urgency === "today" && "bg-primary/[0.02] border-primary/15"
                )}
                onClick={() => navigate(getPath(task.source === "calendar" ? `/calendar?task=${task.id}` : "/calendar"))}
              >
                {/* Quick complete checkbox */}
                <button
                  className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                    "hover:border-primary hover:bg-primary/10",
                    urgency === "today" ? "border-primary/40" : "border-border"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkDone(task);
                  }}
                  aria-label="Mark as complete"
                >
                  <Check className="h-3 w-3 text-transparent group-hover:text-primary/40 transition-colors" />
                </button>

                <div className={cn(
                  "p-2 rounded-lg shrink-0",
                  urgency === "today" ? "bg-primary/10" : "bg-muted/50"
                )}>
                  <Icon className={cn("h-4 w-4", urgency === "today" ? "text-primary" : "text-muted-foreground")} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={cn(
                      "text-xs tabular-nums",
                      urgency === "today" ? "text-primary font-medium" : "text-muted-foreground"
                    )}>
                      {task.time || (urgency === "today" ? "Today" : urgency === "tomorrow" ? "Tomorrow" : new Date(task.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }))}
                    </span>
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-medium bg-muted/60">
                      {task.type}
                    </Badge>
                  </div>
                </div>

                {task.reminderEnabled && (
                  <Bell className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                )}
              </div>
            );
          })}

          {/* View more link */}
          {remainingCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-9 text-xs text-muted-foreground hover:text-foreground mt-2"
              onClick={() => navigate(getPath('/calendar'))}
            >
              +{remainingCount} more task{remainingCount > 1 ? 's' : ''} — View all
            </Button>
          )}
        </div>
      )}
    </Card>
  );
};
