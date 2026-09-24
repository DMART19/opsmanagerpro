import { useRef, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, AlertTriangle, Clock } from "lucide-react";
import { format, addDays, subDays, isToday, isSameDay, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarTask, taskTypeColors, isOverdue } from "./types";
import { TaskCard } from "./TaskCard";
import { motion, AnimatePresence } from "framer-motion";

interface MobileCalendarViewProps {
  currentDate: Date;
  tasks: CalendarTask[];
  onDateChange: (date: Date) => void;
  onTaskClick: (task: CalendarTask) => void;
  onAddTask: (date: Date) => void;
}

export const MobileCalendarView = ({ 
  currentDate, 
  tasks, 
  onDateChange,
  onTaskClick,
  onAddTask 
}: MobileCalendarViewProps) => {
  const isCurrentDay = isToday(currentDate);
  const dayTasks = tasks.filter(task => isSameDay(task.date, currentDate));
  const hasOverdue = dayTasks.some(isOverdue);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  
  // Sort tasks by priority (high first) then by status
  const sortedTasks = [...dayTasks].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const statusOrder = { pending: 0, "in-progress": 1, complete: 2 };
    
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return statusOrder[a.status] - statusOrder[b.status];
  });
  
  // Swipe handling
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 20) {
      setSwipeDirection(diff > 0 ? "left" : "right");
    }
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        onDateChange(addDays(currentDate, 1));
      } else {
        onDateChange(subDays(currentDate, 1));
      }
    }
    setSwipeDirection(null);
  };

  // Generate week days
  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const handleDateSelect = useCallback((day: Date) => {
    onDateChange(day);
  }, [onDateChange]);

  return (
    <div 
      ref={containerRef}
      className="space-y-3"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Compact Week Strip */}
      <div className="flex items-center bg-muted/30 rounded-xl p-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDateChange(subDays(currentDate, 7))}
          className="shrink-0 h-8 w-8"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        
        <div className="flex-1 flex justify-between px-0.5">
          {weekDays.map((day) => {
            const isSelected = isSameDay(day, currentDate);
            const dayIsToday = isToday(day);
            const dayTaskCount = tasks.filter(t => isSameDay(t.date, day)).length;
            const hasOverdueTasks = tasks.filter(t => isSameDay(t.date, day)).some(isOverdue);
            
            return (
              <button
                key={day.toString()}
                onClick={() => handleDateSelect(day)}
                className={cn(
                  "flex flex-col items-center py-1.5 px-1 rounded-lg transition-all min-w-[38px]",
                  "active:scale-95 touch-manipulation",
                  isSelected 
                    ? "bg-primary text-primary-foreground" 
                    : dayIsToday 
                      ? "bg-primary/10"
                      : "hover:bg-muted/60"
                )}
              >
                <span className={cn(
                  "text-[9px] font-medium uppercase leading-none",
                  isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
                )}>
                  {format(day, "EEE")}
                </span>
                <span className={cn(
                  "text-sm font-semibold leading-tight mt-0.5",
                  isSelected ? "text-primary-foreground" : dayIsToday ? "text-primary" : "text-foreground"
                )}>
                  {format(day, "d")}
                </span>
                {/* Task indicator */}
                <div className="flex gap-0.5 mt-0.5 h-1.5 items-center">
                  {hasOverdueTasks ? (
                    <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
                  ) : dayTaskCount > 0 ? (
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      isSelected ? "bg-primary-foreground/60" : "bg-primary/60"
                    )} />
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDateChange(addDays(currentDate, 7))}
          className="shrink-0 h-8 w-8"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Day Header - Compact */}
      <motion.div 
        key={currentDate.toISOString()}
        initial={{ opacity: 0, x: swipeDirection === "left" ? 15 : -15 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.15 }}
        className={cn(
          "p-3 rounded-xl border transition-all",
          isCurrentDay 
            ? "bg-primary/5 border-primary/20" 
            : "bg-card border-border/50",
          hasOverdue && "border-destructive/30"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className={cn(
              "font-semibold text-base",
              isCurrentDay ? "text-primary" : "text-foreground"
            )}>
              {isCurrentDay ? "Today" : format(currentDate, "EEE")}
            </h2>
            <span className="text-xs text-muted-foreground">
              {format(currentDate, "MMM d")}
            </span>
          </div>
          
          <div className="flex items-center gap-1.5">
            {hasOverdue && (
              <Badge variant="destructive" className="gap-0.5 h-5 text-[10px] px-1.5">
                <AlertTriangle className="h-2.5 w-2.5" />
                Overdue
              </Badge>
            )}
            <Badge variant="secondary" className="h-5 text-[10px] px-1.5">
              {sortedTasks.length}
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* Tasks List */}
      <AnimatePresence mode="popLayout">
        <div className="space-y-2 pb-24">
          {sortedTasks.length > 0 ? (
            sortedTasks.map((task, index) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15, delay: index * 0.03 }}
              >
                <TaskCard
                  task={task}
                  onClick={() => onTaskClick(task)}
                  variant="full"
                />
              </motion.div>
            ))
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-10"
            >
              <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <Plus className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-foreground text-sm mb-1">No tasks</h3>
              <p className="text-xs text-muted-foreground mb-3">
                {isCurrentDay ? "Add your first task" : `Nothing on ${format(currentDate, "EEE")}`}
              </p>
              <Button 
                onClick={() => onAddTask(currentDate)} 
                size="sm"
                className="gap-1.5 h-9"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Event
              </Button>
            </motion.div>
          )}
        </div>
      </AnimatePresence>
    </div>
  );
};