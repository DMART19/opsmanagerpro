import { Badge } from "@/components/ui/badge";
import { Plus, AlertCircle, Edit, Trash2 } from "lucide-react";
import { format, isToday, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarTask, taskTypeColors, isOverdue } from "./types";
import { useFormatters } from "@/hooks/use-formatters";

interface DayViewProps {
  currentDate: Date;
  tasks: CalendarTask[];
  onTaskClick: (task: CalendarTask) => void;
  onAddTask: (date: Date, time?: string) => void;
  onEditTask?: (task: CalendarTask) => void;
  onDeleteTask?: (task: CalendarTask) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export const DayView = ({ 
  currentDate, 
  tasks, 
  onTaskClick,
  onAddTask,
  onEditTask,
  onDeleteTask
}: DayViewProps) => {
  const { formatTimeString, timeFormat } = useFormatters();
  const isCurrentDay = isToday(currentDate);
  const currentHour = new Date().getHours();
  
  const dayTasks = tasks.filter(task => isSameDay(task.date, currentDate));
  const overdueCount = dayTasks.filter(isOverdue).length;

  const getTasksForHour = (hour: number) => {
    return dayTasks.filter(task => {
      const startHour = parseInt(task.startTime.split(":")[0]);
      return startHour === hour;
    });
  };

  const formatHour = (hour: number) => {
    if (timeFormat === "24") {
      return `${hour.toString().padStart(2, "0")}:00`;
    }
    if (hour === 0) return "12 AM";
    if (hour === 12) return "12 PM";
    return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
  };

  return (
    <div className="space-y-4">
      {/* Day Header - Simplified */}
      <div className={cn(
        "p-4 rounded-xl",
        isCurrentDay ? "bg-primary/5" : "bg-card/50"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold transition-all",
              isCurrentDay 
                ? "bg-primary text-primary-foreground shadow-sm" 
                : "bg-muted/50 text-muted-foreground"
            )}>
              {format(currentDate, "d")}
            </div>
            <div>
              <div className="font-semibold text-lg">
                {format(currentDate, "EEEE")}
                {isCurrentDay && (
                  <Badge className="ml-2 bg-primary/10 text-primary border-0 text-xs">Today</Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {format(currentDate, "MMMM d, yyyy")}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {overdueCount > 0 && (
              <div className="flex items-center gap-1.5 text-destructive/70 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{overdueCount} overdue</span>
              </div>
            )}
            <span className="text-sm text-muted-foreground">
              {dayTasks.length} {dayTasks.length === 1 ? "task" : "tasks"}
            </span>
          </div>
        </div>
      </div>

      {/* Hourly Grid - Softer styling */}
      <div className="rounded-xl overflow-hidden bg-card/30">
        {HOURS.map((hour) => {
          const hourTasks = getTasksForHour(hour);
          const isCurrentHour = isCurrentDay && hour === currentHour;
          
          return (
            <div
              key={hour}
              className={cn(
                "flex border-b border-border/30 last:border-b-0 min-h-[56px] transition-colors",
                isCurrentHour && "bg-primary/[0.03]"
              )}
            >
              {/* Time Label */}
              <div className={cn(
                "w-16 shrink-0 px-3 py-2 text-xs font-medium",
                "flex items-start justify-end",
                isCurrentHour ? "text-primary" : "text-muted-foreground/60"
              )}>
                {formatHour(hour)}
                {isCurrentHour && (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary ml-1 mt-0.5 animate-pulse" />
                )}
              </div>
              
              {/* Tasks Area */}
              <div 
                className="flex-1 p-1 space-y-1 cursor-pointer hover:bg-muted/20 transition-colors border-l border-border/20"
                onClick={() => onAddTask(currentDate, `${hour.toString().padStart(2, "0")}:00`)}
              >
                {hourTasks.map((task) => {
                  const taskOverdue = isOverdue(task);
                  return (
                    <div
                      key={task.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onTaskClick(task);
                      }}
                      className={cn(
                        "group/task relative p-2 rounded-lg text-sm transition-all duration-200",
                        "hover:shadow-sm cursor-pointer",
                        "border-l-3",
                        taskTypeColors[task.type]?.light,
                        taskTypeColors[task.type]?.border,
                        taskOverdue && "underline decoration-destructive/40 underline-offset-2"
                      )}
                    >
                      {/* Hover actions */}
                      {(onEditTask || onDeleteTask) && (
                        <div className="absolute top-1 right-1 flex items-center gap-0.5 opacity-0 group-hover/task:opacity-100 transition-opacity duration-150 z-10">
                          {onEditTask && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onEditTask(task); }}
                              className="h-6 w-6 flex items-center justify-center rounded bg-background/80 backdrop-blur-sm border border-border/50 text-muted-foreground hover:text-foreground shadow-sm transition-all duration-150 active:scale-95"
                            >
                              <Edit className="h-3 w-3" />
                            </button>
                          )}
                          {onDeleteTask && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onDeleteTask(task); }}
                              className="h-6 w-6 flex items-center justify-center rounded bg-background/80 backdrop-blur-sm border border-border/50 text-muted-foreground hover:text-destructive shadow-sm transition-all duration-150 active:scale-95"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      )}
                      <div className="font-medium text-foreground">{task.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {formatTimeString(task.startTime)} - {formatTimeString(task.endTime)}
                        {task.assignees.length > 0 && ` • ${task.assignees.slice(0, 2).join(", ")}`}
                        {task.assignees.length > 2 && ` +${task.assignees.length - 2}`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
