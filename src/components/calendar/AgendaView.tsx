import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, AlertCircle, AlertTriangle, Clock } from "lucide-react";
import { format, isToday, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarTask, isOverdue } from "./types";
import { TaskCard } from "./TaskCard";
import { ExpiringCalendarItem } from "@/hooks/use-expiring-items";
import { ExpiringItemsSection } from "./ExpiringItemsSection";

interface AgendaViewProps {
  currentDate: Date;
  tasks: CalendarTask[];
  onTaskClick: (task: CalendarTask) => void;
  onAddTask: (date: Date) => void;
  onEditTask?: (task: CalendarTask) => void;
  onDeleteTask?: (task: CalendarTask) => void;
  expiringItems?: ExpiringCalendarItem[];
  onExpiringItemClick?: (item: ExpiringCalendarItem) => void;
  onDismissExpiringItem?: (itemId: string) => void;
}

export const AgendaView = ({ 
  currentDate, 
  tasks, 
  onTaskClick,
  onAddTask,
  onEditTask,
  onDeleteTask,
  expiringItems = [],
  onExpiringItemClick,
  onDismissExpiringItem
}: AgendaViewProps) => {
  // Group tasks by date
  const groupedTasks = tasks.reduce((acc, task) => {
    const dateKey = format(task.date, "yyyy-MM-dd");
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(task);
    return acc;
  }, {} as Record<string, CalendarTask[]>);

  // Sort dates and filter to show relevant range
  const sortedDates = Object.keys(groupedTasks)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  // Get overdue tasks
  const overdueTasks = tasks.filter(isOverdue);

  // Get expired items (past expiration date)
  const expiredItems = expiringItems.filter(item => item.type === "expired");

  // Helper to get expiring items for a specific date
  const getExpiringItemsForDate = (dateKey: string) => {
    return expiringItems.filter(item => 
      item.type !== "expired" && format(item.date, "yyyy-MM-dd") === dateKey
    );
  };

  if (sortedDates.length === 0 && expiringItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="p-5 rounded-2xl bg-primary/10 mb-6">
          <Calendar className="h-10 w-10 text-primary" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">No scheduled events</h3>
        <p className="text-sm text-muted-foreground max-w-sm mb-6">
          Use the calendar to track inspections, tasks, or compliance deadlines.
        </p>
        <Button 
          onClick={() => onAddTask(new Date())} 
          size="lg"
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Event
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Expired Items Section - Show at top with critical styling */}
      {expiredItems.length > 0 && (
        <div className="bg-destructive/[0.03] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3 text-destructive/70">
            <AlertTriangle className="h-4 w-4" />
            <h3 className="font-medium text-sm">
              {expiredItems.length} Expired Item{expiredItems.length !== 1 ? 's' : ''}
            </h3>
          </div>
          {onExpiringItemClick && (
            <ExpiringItemsSection
              items={expiredItems}
              onItemClick={onExpiringItemClick}
              onDismiss={onDismissExpiringItem}
            />
          )}
        </div>
      )}

      {/* Overdue Section - Subtle styling */}
      {overdueTasks.length > 0 && (
        <div className="bg-destructive/[0.03] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3 text-destructive/70">
            <AlertCircle className="h-4 w-4" />
            <h3 className="font-medium text-sm">
              {overdueTasks.length} Overdue Task{overdueTasks.length !== 1 ? 's' : ''}
            </h3>
          </div>
          <div className="space-y-2">
            {overdueTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => onTaskClick(task)}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
                variant="full"
                showDate
              />
            ))}
          </div>
        </div>
      )}

      {/* Grouped by Date */}
      {sortedDates.map((dateKey) => {
        const date = new Date(dateKey);
        const dateTasks = groupedTasks[dateKey].filter(t => !isOverdue(t));
        const dateExpiringItems = getExpiringItemsForDate(dateKey);
        const isCurrentDay = isToday(date);
        
        // Skip if all tasks are overdue and no expiring items
        if (dateTasks.length === 0 && dateExpiringItems.length === 0) return null;

        return (
          <div
            key={dateKey}
            className={cn(
              "rounded-xl transition-all duration-200",
              isCurrentDay ? "bg-primary/5" : "bg-card/50"
            )}
          >
            {/* Date Header */}
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center text-lg font-semibold transition-all",
                  isCurrentDay 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "bg-muted/50 text-muted-foreground"
                )}>
                  {format(date, "d")}
                </div>
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    {isCurrentDay ? "Today" : format(date, "EEEE")}
                    {isCurrentDay && (
                      <Badge className="bg-primary/10 text-primary border-0 text-xs">Now</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(date, "MMMM d, yyyy")}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {dateTasks.length} {dateTasks.length === 1 ? "task" : "tasks"}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onAddTask(date)}
                  className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Tasks */}
            <div className="px-4 pb-4 space-y-2">
              {/* Expiring Items for this date */}
              {dateExpiringItems.length > 0 && onExpiringItemClick && (
                <ExpiringItemsSection
                  items={dateExpiringItems}
                  onItemClick={onExpiringItemClick}
                  onDismiss={onDismissExpiringItem}
                />
              )}
              
              {dateTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onClick={() => onTaskClick(task)}
                  onEdit={onEditTask}
                  onDelete={onDeleteTask}
                  variant="full"
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
