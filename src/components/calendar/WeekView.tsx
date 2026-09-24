import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, AlertCircle } from "lucide-react";
import { format, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarTask, isOverdue } from "./types";
import { TaskCard } from "./TaskCard";

interface WeekViewProps {
  currentDate: Date;
  tasks: CalendarTask[];
  onTaskClick: (task: CalendarTask) => void;
  onAddTask: (date: Date) => void;
  onEditTask?: (task: CalendarTask) => void;
  onDeleteTask?: (task: CalendarTask) => void;
}

export const WeekView = ({ 
  currentDate, 
  tasks, 
  onTaskClick,
  onAddTask,
  onEditTask,
  onDeleteTask
}: WeekViewProps) => {
  const getDaysInWeek = () => {
    const start = startOfWeek(currentDate);
    const end = endOfWeek(currentDate);
    return eachDayOfInterval({ start, end });
  };

  const getTasksForDay = (day: Date) => {
    return tasks.filter(task => isSameDay(task.date, day));
  };

  const days = getDaysInWeek();

  return (
    <div className="space-y-3">
      {days.map((day) => {
        const dayTasks = getTasksForDay(day);
        const isCurrentDay = isToday(day);
        const overdueCount = dayTasks.filter(isOverdue).length;

        return (
          <div
            key={day.toString()}
            className={cn(
              "p-4 rounded-xl transition-all duration-200",
              isCurrentDay 
                ? "bg-primary/5 shadow-sm" 
                : "bg-card/50 hover:bg-card",
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center text-lg font-semibold transition-all",
                  isCurrentDay 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "bg-muted/50 text-muted-foreground"
                )}>
                  {format(day, "d")}
                </div>
                <div>
                  <div className={cn(
                    "font-semibold",
                    isCurrentDay ? "text-foreground" : "text-foreground/80"
                  )}>
                    {format(day, "EEEE")}
                    {isCurrentDay && (
                      <Badge className="ml-2 bg-primary/10 text-primary border-0 text-xs">Today</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(day, "MMMM d")}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {overdueCount > 0 && (
                  <div className="flex items-center gap-1 text-destructive/70 text-xs">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>{overdueCount} overdue</span>
                  </div>
                )}
                <span className="text-xs text-muted-foreground">
                  {dayTasks.length} {dayTasks.length === 1 ? "task" : "tasks"}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onAddTask(day)}
                  className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {dayTasks.length > 0 ? (
                dayTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => onTaskClick(task)}
                    onEdit={onEditTask}
                    onDelete={onDeleteTask}
                    variant="full"
                  />
                ))
              ) : (
                <button 
                  className="w-full text-sm text-muted-foreground/60 text-center py-6 bg-muted/20 rounded-xl hover:bg-muted/30 transition-colors"
                  onClick={() => onAddTask(day)}
                >
                  No tasks • Click to add
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
