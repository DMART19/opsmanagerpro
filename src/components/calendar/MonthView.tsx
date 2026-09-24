import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Plus, AlertCircle } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek, isToday, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors, DragOverlay } from "@dnd-kit/core";
import { CalendarTask, taskTypeColors, isOverdue } from "./types";
import { DayTasksDrawer } from "./DayTasksDrawer";
import { QuickAddPopover } from "./QuickAddPopover";
import { DraggableTaskItem } from "./DraggableTaskItem";
import { DroppableDayCell } from "./DroppableDayCell";
import { ExpiringCalendarItem } from "@/hooks/use-expiring-items";
import { ExpiringItemsDot } from "./ExpiringItemsSection";

interface MonthViewProps {
  currentDate: Date;
  tasks: CalendarTask[];
  onDateClick: (date: Date, hasTasks: boolean) => void;
  onTaskClick: (task: CalendarTask) => void;
  onAddTask: (date: Date) => void;
  onTaskReschedule?: (taskId: string, newDate: Date) => void;
  onEditTask?: (task: CalendarTask) => void;
  onDeleteTask?: (task: CalendarTask) => void;
  expiringItems?: ExpiringCalendarItem[];
  onExpiringItemClick?: (item: ExpiringCalendarItem) => void;
}

export const MonthView = ({ 
  currentDate, 
  tasks, 
  onDateClick, 
  onTaskClick,
  onAddTask,
  onTaskReschedule,
  onEditTask,
  onDeleteTask,
  expiringItems = [],
  onExpiringItemClick 
}: MonthViewProps) => {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hoveredDay, setHoveredDay] = useState<Date | null>(null);
  const [draggingTask, setDraggingTask] = useState<CalendarTask | null>(null);

  // Require 8px movement before starting drag to allow clicks
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const getDaysInMonth = () => {
    const start = startOfWeek(startOfMonth(currentDate));
    const end = endOfWeek(endOfMonth(currentDate));
    return eachDayOfInterval({ start, end });
  };

  const getTasksForDay = (day: Date) => {
    return tasks.filter(task => isSameDay(task.date, day));
  };

  const getExpiringItemsForDay = (day: Date) => {
    return expiringItems.filter(item => isSameDay(item.date, day));
  };

  const handleDayClick = (day: Date, dayTasks: CalendarTask[]) => {
    if (dayTasks.length > 0) {
      setSelectedDay(day);
      setDrawerOpen(true);
    } else {
      onAddTask(day);
    }
  };

  const handleDragStart = useCallback((event: any) => {
    const task = event.active.data.current?.task as CalendarTask;
    if (task) setDraggingTask(task);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setDraggingTask(null);
    const { active, over } = event;
    if (!over || !onTaskReschedule) return;

    const taskId = active.id as string;
    const newDate = parseISO(over.id as string);
    const task = tasks.find(t => t.id === taskId);

    // Only reschedule if dropped on a different day
    if (task && !isSameDay(task.date, newDate)) {
      onTaskReschedule(taskId, newDate);
    }
  }, [onTaskReschedule, tasks]);

  const days = getDaysInMonth();
  const hasAnyTasks = tasks.length > 0;

  return (
    <>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="space-y-4">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div 
                key={day} 
                className="text-center text-xs font-medium text-muted-foreground/60 py-2 uppercase tracking-wider"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {days.map((day, index) => {
              const dayTasks = getTasksForDay(day);
              const dayExpiringItems = getExpiringItemsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isCurrentDay = isToday(day);
              const hasOverdue = dayTasks.some(isOverdue);
              const hasTasks = dayTasks.length > 0;
              const hasExpiringItems = dayExpiringItems.length > 0;
              const isHovered = hoveredDay && isSameDay(hoveredDay, day);
              const isSelected = selectedDay && isSameDay(selectedDay, day);
              const dateKey = format(day, "yyyy-MM-dd");

              return (
                <DroppableDayCell
                  key={index}
                  dateKey={dateKey}
                  isCurrentMonth={isCurrentMonth}
                  className={cn(
                    "relative min-h-[110px] p-2.5 rounded-xl transition-all duration-200 group cursor-pointer",
                    isCurrentMonth
                      ? "bg-card/60"
                      : "bg-transparent opacity-30 pointer-events-none",
                    isCurrentMonth && !isCurrentDay && "hover:bg-accent/50 hover:shadow-sm hover:-translate-y-0.5",
                    isCurrentDay && "bg-primary/[0.06] ring-1 ring-primary/20 shadow-sm",
                    isSelected && !isCurrentDay && "ring-1 ring-primary/40 bg-accent/40",
                    hasOverdue && isCurrentMonth && !isCurrentDay && "bg-destructive/[0.04]"
                  )}
                  onMouseEnter={() => setHoveredDay(day)}
                  onMouseLeave={() => setHoveredDay(null)}
                  onClick={() => isCurrentMonth && handleDayClick(day, dayTasks)}
                  role="button"
                  tabIndex={isCurrentMonth ? 0 : -1}
                >
                  {/* Day Number */}
                  <div className="flex items-center justify-between mb-2">
                    <div className={cn(
                      "text-sm transition-all duration-200",
                      isCurrentDay 
                        ? "w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shadow-sm"
                        : isHovered && isCurrentMonth
                          ? "text-foreground font-semibold"
                          : "font-medium text-foreground/70"
                    )}>
                      {format(day, "d")}
                    </div>
                    
                    {hasOverdue && (
                      <AlertCircle className="h-3.5 w-3.5 text-destructive/60" />
                    )}
                  </div>
                  
                  {/* Tasks - Max 2 with +X more */}
                  {hasTasks && (
                    <div className="space-y-1">
                      {dayTasks.slice(0, 2).map((task) => (
                        <DraggableTaskItem
                          key={task.id}
                          task={task}
                          onTaskClick={onTaskClick}
                          onEditTask={onEditTask}
                          onDeleteTask={onDeleteTask}
                        />
                      ))}
                      {dayTasks.length > 2 && (
                        <div className="text-[10px] text-muted-foreground/60 px-2 font-medium">
                          +{dayTasks.length - 2} more
                        </div>
                      )}
                    </div>
                  )}

                  {/* Expiring Items Indicator */}
                  {hasExpiringItems && (
                    <ExpiringItemsDot items={dayExpiringItems} />
                  )}

                  {/* Quick Add Button - Shows on hover for empty days */}
                  {isCurrentMonth && isHovered && !hasTasks && !hasExpiringItems && (
                    <QuickAddPopover
                      date={day}
                      onAddTask={onAddTask}
                    >
                      <button
                        className={cn(
                          "absolute bottom-2 right-2 w-7 h-7 rounded-full",
                          "bg-primary/10 hover:bg-primary/20 text-primary",
                          "flex items-center justify-center",
                          "transition-all duration-200 opacity-0 group-hover:opacity-100",
                          "hover:scale-110 active:scale-95"
                        )}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </QuickAddPopover>
                  )}

                  {/* Quick add for days with tasks or expiring items */}
                  {isCurrentMonth && isHovered && (hasTasks || hasExpiringItems) && (
                    <button
                      className={cn(
                        "absolute bottom-2 right-2 w-5 h-5 rounded-full",
                        "bg-muted hover:bg-muted/80 text-muted-foreground",
                        "flex items-center justify-center",
                        "transition-all duration-200 opacity-0 group-hover:opacity-100",
                        "hover:scale-110 active:scale-95"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddTask(day);
                      }}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  )}
                </DroppableDayCell>
              );
            })}
          </div>

          {/* Empty State */}
          {!hasAnyTasks && (
            <div className="text-center py-10 text-muted-foreground/50">
              <p className="text-sm">Click any day to add your first task</p>
            </div>
          )}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {draggingTask ? (
            <div className={cn(
              "text-[11px] px-2 py-1.5 rounded-lg truncate font-medium shadow-lg",
              "pointer-events-none w-[120px]",
              taskTypeColors[draggingTask.type]?.light,
              taskTypeColors[draggingTask.type]?.text,
            )}>
              {draggingTask.title}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Day Tasks Drawer */}
      <DayTasksDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        date={selectedDay}
        tasks={selectedDay ? getTasksForDay(selectedDay) : []}
        onTaskClick={onTaskClick}
        onAddTask={onAddTask}
      />
    </>
  );
};
