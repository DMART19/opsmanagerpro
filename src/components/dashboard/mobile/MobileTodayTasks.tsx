import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Clock, CheckCircle2, ChevronRight, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useDemoPath } from "@/hooks/use-demo-path";

interface Task {
  id: string;
  title: string;
  dueTime?: string;
  status?: "pending" | "completed";
}

interface MobileTodayTasksProps {
  todayTasks: Task[];
  upcomingTasks: Task[];
  loading?: boolean;
}

export const MobileTodayTasks = ({ 
  todayTasks, 
  upcomingTasks, 
  loading 
}: MobileTodayTasksProps) => {
  const navigate = useNavigate();
  const { getPath } = useDemoPath();
  const [activeTab, setActiveTab] = useState<"today" | "upcoming">("today");
  
  const tasks = activeTab === "today" ? todayTasks : upcomingTasks;
  const pendingCount = todayTasks.filter(t => t.status !== "completed").length;

  if (loading) {
    return (
      <div className="space-y-3">
        {/* Toggle */}
        <div className="flex gap-1 p-1 bg-muted/50 rounded-xl w-fit">
          <div className="h-9 w-20 bg-muted rounded-lg animate-pulse" />
          <div className="h-9 w-24 bg-muted rounded-lg animate-pulse" />
        </div>
        {/* Tasks */}
        <Card className="divide-y divide-border/50" style={{ boxShadow: "var(--shadow-card)" }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-4 animate-pulse">
              <div className="h-8 w-8 bg-muted rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-3 w-16 bg-muted rounded" />
              </div>
            </div>
          ))}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Modern pill-style toggle */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("today")}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200",
            activeTab === "today"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Today
          {pendingCount > 0 && (
            <span className={cn(
              "ml-2 text-xs font-bold px-1.5 py-0.5 rounded-full",
              activeTab === "today" 
                ? "bg-primary/10 text-primary" 
                : "bg-muted text-muted-foreground"
            )}>
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("upcoming")}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200",
            activeTab === "upcoming"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Upcoming
          {upcomingTasks.length > 0 && (
            <span className="ml-2 text-xs text-muted-foreground">
              {upcomingTasks.length}
            </span>
          )}
        </button>
      </div>

      {/* Task List */}
      {tasks.length === 0 ? (
        <Card 
          className="p-6"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="text-center">
            <div className="relative w-12 h-12 mx-auto mb-3">
              <div className="absolute inset-0 rounded-xl bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-success" />
              </div>
              <Sparkles className="absolute -top-1 -right-1 h-3.5 w-3.5 text-success/60" />
            </div>
            <p className="text-sm font-medium text-foreground mb-0.5">
              {activeTab === "today" 
                ? "All caught up!" 
                : "Schedule is clear"}
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              {activeTab === "today" 
                ? "No tasks for today — check upcoming or add one" 
                : "Nothing scheduled this week yet"}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8"
              onClick={() => navigate(getPath("/calendar"))}
            >
              <Calendar className="h-3.5 w-3.5 mr-1.5" />
              Add a task
            </Button>
          </div>
        </Card>
      ) : (
        <Card 
          className="divide-y divide-border/40 overflow-hidden"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          {tasks.slice(0, 5).map((task, index) => {
            const isCompleted = task.status === "completed";
            
            return (
              <div
                key={task.id}
                className={cn(
                  "flex items-center gap-3 p-4 transition-all duration-200",
                  "active:bg-muted/50 cursor-pointer",
                  isCompleted && "opacity-60"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => navigate(getPath(`/calendar?task=${task.id}`))}
              >
                {/* Status Icon with gradient */}
                <div className={cn(
                  "relative flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center",
                  isCompleted 
                    ? "bg-gradient-to-br from-success/20 to-success/5" 
                    : "bg-gradient-to-br from-primary/20 to-primary/5"
                )}>
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <Clock className="h-4 w-4 text-primary" />
                  )}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium truncate",
                    isCompleted && "line-through text-muted-foreground"
                  )}>
                    {task.title}
                  </p>
                  {task.dueTime && (
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {task.dueTime}
                    </p>
                  )}
                </div>
                
                <ChevronRight className="h-4 w-4 text-muted-foreground/30 flex-shrink-0" />
              </div>
            );
          })}
        </Card>
      )}

      {/* View All Link - more intentional */}
      {tasks.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs h-9 text-muted-foreground hover:text-foreground gap-1.5 mt-2"
          onClick={() => navigate(getPath("/calendar"))}
        >
          <Calendar className="h-3.5 w-3.5" />
          View all tasks in Calendar
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
};
