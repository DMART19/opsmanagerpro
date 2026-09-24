import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Calendar, Plus, ChevronDown, Flag, Clock } from "lucide-react";
import { format, isToday, isTomorrow, addDays, isSameDay, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarTask, taskTypeColors, isOverdue } from "./types";
import { TaskCard } from "./TaskCard";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { ExpiringCalendarItem } from "@/hooks/use-expiring-items";
import { ExpiringItemsSection } from "./ExpiringItemsSection";

interface MobileAgendaViewProps {
  tasks: CalendarTask[];
  currentDate: Date;
  onTaskClick: (task: CalendarTask) => void;
  onAddTask: (date?: Date) => void;
  onDateSelect: (date: Date) => void;
  isLoading?: boolean;
  expiringItems?: ExpiringCalendarItem[];
  onExpiringItemClick?: (item: ExpiringCalendarItem) => void;
  onDismissExpiringItem?: (itemId: string) => void;
}

interface DayGroup {
  date: Date;
  label: string;
  tasks: CalendarTask[];
  expiringItems: ExpiringCalendarItem[];
  isOverdue: boolean;
}

export const MobileAgendaView = ({
  tasks,
  currentDate,
  onTaskClick,
  onAddTask,
  onDateSelect,
  isLoading = false,
  expiringItems = [],
  onExpiringItemClick,
  onDismissExpiringItem,
}: MobileAgendaViewProps) => {
  // Auto-expand today and overdue
  const [expandedDays, setExpandedDays] = useState<Set<string>>(
    new Set([format(new Date(), 'yyyy-MM-dd'), 'overdue'])
  );

  const { overdueTasks, expiredItems, upcomingGroups, totalUpcoming } = useMemo(() => {
    const today = startOfDay(new Date());
    const baseDate = startOfDay(currentDate);
    const overdue: CalendarTask[] = [];
    const upcoming: DayGroup[] = [];

    tasks.forEach(task => {
      if (isOverdue(task)) {
        overdue.push(task);
      }
    });

    overdue.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // Get expired items (separate from expiring soon)
    const expired = expiringItems.filter(item => item.type === "expired");

    let totalCount = 0;
    // Show 14 days starting from the navigated currentDate
    for (let i = 0; i < 14; i++) {
      const date = addDays(baseDate, i);
      const dayTasks = tasks.filter(t => 
        isSameDay(t.date, date) && !isOverdue(t)
      );

      dayTasks.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      // Get expiring items for this date (not expired ones)
      const dayExpiringItems = expiringItems.filter(item => 
        item.type !== "expired" && isSameDay(item.date, date)
      );

      let label = format(date, "EEE, MMM d");
      if (isToday(date)) label = "Today";
      else if (isTomorrow(date)) label = "Tomorrow";

      totalCount += dayTasks.length;
      
      upcoming.push({
        date,
        label,
        tasks: dayTasks,
        expiringItems: dayExpiringItems,
        isOverdue: false,
      });
    }

    return { overdueTasks: overdue, expiredItems: expired, upcomingGroups: upcoming, totalUpcoming: totalCount };
  }, [tasks, expiringItems, currentDate]);

  const toggleDay = (dateKey: string) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(dateKey)) {
        next.delete(dateKey);
      } else {
        next.add(dateKey);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2 pb-24">
      {/* Expired Items Alert */}
      {expiredItems.length > 0 && (
        <button
          onClick={() => toggleDay('expired')}
          className={cn(
            "w-full flex items-center justify-between p-2.5 rounded-xl transition-all",
            "bg-destructive/10 border border-destructive/20",
            "active:scale-[0.99] touch-manipulation"
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-destructive/20 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            <div className="text-left">
              <span className="text-sm font-semibold text-destructive">
                {expiredItems.length} Expired Item{expiredItems.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <ChevronDown className={cn(
            "h-4 w-4 text-destructive transition-transform",
            expandedDays.has('expired') && "rotate-180"
          )} />
        </button>
      )}

      {/* Expanded Expired Items */}
      <AnimatePresence>
        {expandedDays.has('expired') && expiredItems.length > 0 && onExpiringItemClick && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="ml-3 pl-3 border-l-2 border-destructive/20"
          >
            <ExpiringItemsSection
              items={expiredItems}
              onItemClick={onExpiringItemClick}
              onDismiss={onDismissExpiringItem}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overdue Alert */}
      {overdueTasks.length > 0 && (
        <button
          onClick={() => toggleDay('overdue')}
          className={cn(
            "w-full flex items-center justify-between p-2.5 rounded-xl transition-all",
            "bg-destructive/10 border border-destructive/20",
            "active:scale-[0.99] touch-manipulation"
          )}
        >
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-destructive/20 flex items-center justify-center">
              <Clock className="h-4 w-4 text-destructive" />
            </div>
            <div className="text-left">
              <span className="text-sm font-semibold text-destructive">
                {overdueTasks.length} Overdue Task{overdueTasks.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="destructive" className="h-5 text-[10px] px-1.5">
              {overdueTasks.filter(t => t.priority === "high").length} high
            </Badge>
            <ChevronDown className={cn(
              "h-4 w-4 text-destructive transition-transform",
              expandedDays.has('overdue') && "rotate-180"
            )} />
          </div>
        </button>
      )}

      {/* Expanded Overdue Tasks */}
      <AnimatePresence>
        {expandedDays.has('overdue') && overdueTasks.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-1.5 ml-3 pl-3 border-l-2 border-destructive/20"
          >
            {overdueTasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <TaskCard
                  task={task}
                  onClick={() => onTaskClick(task)}
                  variant="full"
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Day Groups */}
      {upcomingGroups.map((group, groupIndex) => {
        const dateKey = format(group.date, 'yyyy-MM-dd');
        const isExpanded = expandedDays.has(dateKey);
        const isCurrentDay = isToday(group.date);
        const taskCount = group.tasks.length;
        const expiringCount = group.expiringItems.length;
        const totalCount = taskCount + expiringCount;
        const highPriorityCount = group.tasks.filter(t => t.priority === "high").length;

        // Only show first 7 days or days with tasks/expiring items
        if (groupIndex > 6 && totalCount === 0) return null;

        return (
          <div key={dateKey}>
            <button
              onClick={() => toggleDay(dateKey)}
              className={cn(
                "w-full flex items-center justify-between p-2.5 rounded-xl transition-all",
                "active:scale-[0.99] touch-manipulation",
                isCurrentDay 
                  ? "bg-primary/8 border border-primary/30" 
                  : "bg-card border border-border/50",
                totalCount === 0 && "opacity-50"
              )}
            >
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  "h-10 w-10 rounded-lg flex flex-col items-center justify-center",
                  isCurrentDay ? "bg-primary text-primary-foreground" : "bg-muted/60"
                )}>
                  <span className="text-[9px] font-medium uppercase leading-none">
                    {format(group.date, "EEE")}
                  </span>
                  <span className="text-base font-bold leading-tight">
                    {format(group.date, "d")}
                  </span>
                </div>
                <div className="text-left">
                  <span className={cn(
                    "font-medium text-sm",
                    isCurrentDay ? "text-primary" : "text-foreground"
                  )}>
                    {group.label}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      {taskCount > 0 ? `${taskCount} ${taskCount === 1 ? "task" : "tasks"}` : ""}
                      {taskCount > 0 && expiringCount > 0 ? " • " : ""}
                      {expiringCount > 0 ? `${expiringCount} expiring` : ""}
                      {totalCount === 0 ? "Free" : ""}
                    </span>
                    {highPriorityCount > 0 && (
                      <Badge variant="destructive" className="h-4 text-[9px] px-1 gap-0.5">
                        <Flag className="h-2 w-2" />
                        {highPriorityCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <ChevronDown className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                isExpanded && "rotate-180"
              )} />
            </button>

            {/* Expanded Tasks */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1.5 mt-1.5 ml-3 pl-3 border-l-2 border-muted"
                >
                  {/* Expiring items for this day */}
                  {group.expiringItems.length > 0 && onExpiringItemClick && (
                    <ExpiringItemsSection
                      items={group.expiringItems}
                      onItemClick={onExpiringItemClick}
                      onDismiss={onDismissExpiringItem}
                      compact
                    />
                  )}

                  {group.tasks.length > 0 ? (
                    group.tasks.map((task, index) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <TaskCard
                          task={task}
                          onClick={() => onTaskClick(task)}
                          variant="full"
                        />
                      </motion.div>
                    ))
                  ) : group.expiringItems.length === 0 ? (
                    <div className="flex items-center justify-between py-3 px-3 bg-muted/20 rounded-lg">
                      <span className="text-xs text-muted-foreground">No tasks</span>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => onAddTask(group.date)}
                        className="h-7 text-xs gap-1"
                      >
                        <Plus className="h-3 w-3" />
                        Add
                      </Button>
                    </div>
                  ) : null}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {/* Empty State */}
      {upcomingGroups.every(g => g.tasks.length === 0 && g.expiringItems.length === 0) && overdueTasks.length === 0 && expiredItems.length === 0 && (
        <div className="text-center py-10">
          <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </div>
          <h3 className="font-medium text-foreground text-sm mb-1">All clear!</h3>
          <p className="text-xs text-muted-foreground mb-3">
            No tasks for the next 2 weeks
          </p>
          <Button onClick={() => onAddTask()} size="sm" className="gap-1.5 h-9">
            <Plus className="h-3.5 w-3.5" />
            Add Event
          </Button>
        </div>
      )}
    </div>
  );
};