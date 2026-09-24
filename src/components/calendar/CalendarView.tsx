import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { useIsDesktop } from "@/hooks/use-desktop";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Task } from "@/hooks/use-tasks";
import { useExpiringItems, ExpiringCalendarItem } from "@/hooks/use-expiring-items";
import { useFeatureGate } from "@/components/feature-locks";
import { FeatureLockModal } from "@/components/feature-locks/FeatureLockModal";
import { cn } from "@/lib/utils";
import { useCalendarItems, CalendarFilters } from "@/hooks/use-calendar-items";

import { CalendarTask, ViewType } from "./types";
import { CalendarHeader } from "./CalendarHeader";
import { MobileCalendarHeader } from "./MobileCalendarHeader";
import { CalendarLegend } from "./CalendarLegend";
import { MonthView } from "./MonthView";
import { WeekView } from "./WeekView";
import { DayView } from "./DayView";
import { AgendaView } from "./AgendaView";
import { MobileCalendarView } from "./MobileCalendarView";
import { MobileAgendaView } from "./MobileAgendaView";
import { MobileFABMenu } from "./MobileFABMenu";
import { AddTaskModal } from "./AddTaskModal";
import { TaskDetailsDrawer } from "./TaskDetailsDrawer";
import { ExpiringItemDrawer } from "./ExpiringItemDrawer";

// Helper to find database task from CalendarTask (handles occurrences)
const findDbTask = (calendarTask: CalendarTask, dbTasks: Task[]): Task | null => {
  if (calendarTask.isOccurrence && calendarTask.masterTaskId) {
    return dbTasks.find(t => t.id === calendarTask.masterTaskId) || null;
  }
  return dbTasks.find(t => t.id === calendarTask.id) || null;
};

// Animation direction for transitions
type TransitionDirection = "left" | "right" | "none";

export const CalendarView = () => {
  const isMobile = useIsMobile();
  const isDesktop = useIsDesktop();
  const isTablet = !isMobile && !isDesktop;
  const useCompactHeader = isMobile || isTablet;
  
  const [searchParams, setSearchParams] = useSearchParams();
  const featureGate = useFeatureGate();
  const isCalendarLocked = featureGate?.isLocked ?? false;
  const lockedPlanName = featureGate?.requiredPlan ?? "";
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const { expiringItems: allExpiringItems } = useExpiringItems();
  const [dismissedExpiringIds, setDismissedExpiringIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("calendar_dismissed_expiring");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });
  
  const expiringItems = useMemo(() => 
    allExpiringItems.filter(item => !dismissedExpiringIds.has(item.id)),
    [allExpiringItems, dismissedExpiringIds]
  );
  
  const handleDismissExpiringItem = useCallback((itemId: string) => {
    setDismissedExpiringIds(prev => {
      const next = new Set(prev);
      next.add(itemId);
      localStorage.setItem("calendar_dismissed_expiring", JSON.stringify([...next]));
      return next;
    });
  }, []);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>(!isDesktop ? "agenda" : "month");
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [prefilledDate, setPrefilledDate] = useState<Date | undefined>(undefined);
  const [taskDetailsOpen, setTaskDetailsOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<CalendarTask | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  const [expiringItemDrawerOpen, setExpiringItemDrawerOpen] = useState(false);
  const [selectedExpiringItem, setSelectedExpiringItem] = useState<ExpiringCalendarItem | null>(null);
  
  const [transitionDirection, setTransitionDirection] = useState<TransitionDirection>("none");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const previousDateRef = useRef(currentDate);

  // ── Single source of truth: useCalendarItems ──
  const filters: CalendarFilters = useMemo(() => ({
    typeFilter: selectedFilter,
    priorityFilter,
    statusFilter,
    assigneeFilter,
    searchQuery,
  }), [selectedFilter, priorityFilter, statusFilter, assigneeFilter, searchQuery]);

  const {
    calendarItems: allTasks,
    filteredItems: filteredTasks,
    overdueCount,
    dbTasks,
    isLoading,
    updateTask,
    deleteTask,
  } = useCalendarItems(filters);

  // Handle deep-link to specific task via ?task={id}
  useEffect(() => {
    const taskId = searchParams.get("task");
    if (taskId && allTasks.length > 0) {
      const task = allTasks.find(t => t.id === taskId);
      if (task) {
        setSelectedTask(task);
        setTaskDetailsOpen(true);
        setCurrentDate(task.date);
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, allTasks, setSearchParams]);

  // Determine transition direction based on date change
  const animateTransition = useCallback((newDate: Date, direction?: TransitionDirection) => {
    if (direction) {
      setTransitionDirection(direction);
    } else {
      // Auto-detect direction based on date comparison
      const prevTime = previousDateRef.current.getTime();
      const newTime = newDate.getTime();
      setTransitionDirection(newTime > prevTime ? "left" : "right");
    }
    
    setIsTransitioning(true);
    previousDateRef.current = newDate;
    
    // Reset after animation
    setTimeout(() => {
      setIsTransitioning(false);
      setTransitionDirection("none");
    }, 200);
  }, []);

  const handlePrevious = () => {
    let newDate: Date;
    switch (view) {
      case "month":
        newDate = subMonths(currentDate, 1);
        break;
      case "week":
        newDate = subWeeks(currentDate, 1);
        break;
      case "day":
        newDate = subDays(currentDate, 1);
        break;
      case "agenda":
        newDate = subWeeks(currentDate, 1);
        break;
      default:
        newDate = currentDate;
    }
    animateTransition(newDate, "right");
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    let newDate: Date;
    switch (view) {
      case "month":
        newDate = addMonths(currentDate, 1);
        break;
      case "week":
        newDate = addWeeks(currentDate, 1);
        break;
      case "day":
        newDate = addDays(currentDate, 1);
        break;
      case "agenda":
        newDate = addWeeks(currentDate, 1);
        break;
      default:
        newDate = currentDate;
    }
    animateTransition(newDate, "left");
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    const today = new Date();
    animateTransition(today);
    setCurrentDate(today);
  };

  const handleDateChange = (newDate: Date) => {
    animateTransition(newDate);
    setCurrentDate(newDate);
  };

  const handleViewChange = (newView: ViewType) => {
    setView(newView);
  };

  const handleAddTask = (date?: Date) => {
    if (isCalendarLocked) {
      console.warn("Feature access blocked: Calendar requires " + lockedPlanName + " plan");
      setLockModalOpen(true);
      return;
    }
    setPrefilledDate(date || (useCompactHeader ? currentDate : undefined));
    setModalOpen(true);
  };

  const handleTaskClick = useCallback((task: CalendarTask) => {
    setSelectedTask(task);
    setTaskDetailsOpen(true);
  }, []);

  const handleExpiringItemClick = useCallback((item: ExpiringCalendarItem) => {
    setSelectedExpiringItem(item);
    setExpiringItemDrawerOpen(true);
  }, []);

  const handleEditTask = useCallback((task: CalendarTask) => {
    if (isCalendarLocked) {
      console.warn("Feature access blocked: Calendar edit requires " + lockedPlanName + " plan");
      setLockModalOpen(true);
      return;
    }
    // Find the database task to edit
    const dbTask = findDbTask(task, dbTasks);
    if (dbTask) {
      setEditingTask(dbTask);
      setModalOpen(true);
    }
  }, [dbTasks, isCalendarLocked, lockedPlanName]);

  const handleTaskReschedule = useCallback(async (taskId: string, newDate: Date) => {
    if (isCalendarLocked) { setLockModalOpen(true); return; }
    try {
      await updateTask.mutateAsync({
        id: taskId,
        start_date: format(newDate, "yyyy-MM-dd"),
      });
      const { toast } = await import("@/hooks/use-toast");
      toast({
        title: "Event rescheduled",
        description: `Moved to ${format(newDate, "MMM d, yyyy")}`,
      });
    } catch (error) {
      // Error handled by mutation
    }
  }, [updateTask, isCalendarLocked]);

  const handleDeleteTask = useCallback(async (task: CalendarTask) => {
    if (isCalendarLocked) { setLockModalOpen(true); return; }

    // For generated recurring occurrences, add an exception to the master
    // instead of deleting the master (which would remove the entire series).
    if (task.isOccurrence && task.masterTaskId) {
      const masterTask = dbTasks.find(t => t.id === task.masterTaskId);
      if (masterTask) {
        const dateStr = format(task.date, "yyyy-MM-dd");
        const existingExceptions = masterTask.recurrence_exceptions || [];
        if (!existingExceptions.includes(dateStr)) {
          try {
            await updateTask.mutateAsync({
              id: masterTask.id,
              recurrence_exceptions: [...existingExceptions, dateStr],
            });
            const { toast } = await import("@/hooks/use-toast");
            toast({ title: "Occurrence Removed", description: `Removed the ${format(task.date, "MMM d")} occurrence.` });
          } catch {
            // Error handled by mutation
          }
        }
      }
      return;
    }

    // For regular (non-occurrence) tasks, soft-delete normally
    const dbTask = dbTasks.find(t => t.id === task.id);
    if (dbTask) {
      try {
        await deleteTask.mutateAsync(dbTask.id);
      } catch {
        // Error handled by mutation
      }
    }
  }, [dbTasks, deleteTask, updateTask, isCalendarLocked]);

  const handleModalClose = useCallback((open: boolean) => {
    setModalOpen(open);
    if (!open) {
      setEditingTask(null);
      setPrefilledDate(undefined);
    }
  }, []);

  const handleDateClick = (date: Date, hasTasks: boolean) => {
    if (hasTasks) {
      setCurrentDate(date);
      setView("day");
    } else {
      handleAddTask(date);
    }
  };

  // Transition animation classes
  const getTransitionClasses = () => {
    if (!isTransitioning) return "animate-fade-in";
    
    return cn(
      "transition-all duration-200 ease-out",
      transitionDirection === "left" && "animate-slide-in-from-right",
      transitionDirection === "right" && "animate-slide-in-from-left"
    );
  };

  const renderMobileView = () => {
    // Agenda view - today-first with expandable day cards
    if (view === "agenda") {
      return (
        <MobileAgendaView
          tasks={filteredTasks}
          currentDate={currentDate}
          onTaskClick={handleTaskClick}
          onAddTask={handleAddTask}
          onDateSelect={setCurrentDate}
          expiringItems={expiringItems}
          onExpiringItemClick={handleExpiringItemClick}
          onDismissExpiringItem={handleDismissExpiringItem}
        />
      );
    }

    // Day/Week view - swipe-friendly day view
    return (
      <MobileCalendarView
        currentDate={currentDate}
        tasks={filteredTasks}
        onDateChange={setCurrentDate}
        onTaskClick={handleTaskClick}
        onAddTask={handleAddTask}
      />
    );
  };

  const renderDesktopView = () => {
    switch (view) {
      case "month":
        return (
           <MonthView
            currentDate={currentDate}
            tasks={filteredTasks}
            onDateClick={handleDateClick}
            onTaskClick={handleTaskClick}
            onAddTask={handleAddTask}
            onTaskReschedule={handleTaskReschedule}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            expiringItems={expiringItems}
            onExpiringItemClick={handleExpiringItemClick}
          />
        );
      case "week":
        return (
          <WeekView
            currentDate={currentDate}
            tasks={filteredTasks}
            onTaskClick={handleTaskClick}
            onAddTask={handleAddTask}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
          />
        );
      case "day":
        return (
          <DayView
            currentDate={currentDate}
            tasks={filteredTasks}
            onTaskClick={handleTaskClick}
            onAddTask={handleAddTask}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
          />
        );
      case "agenda":
        return (
          <AgendaView
            currentDate={currentDate}
            tasks={filteredTasks}
            onTaskClick={handleTaskClick}
            onAddTask={handleAddTask}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            expiringItems={expiringItems}
            onExpiringItemClick={handleExpiringItemClick}
            onDismissExpiringItem={handleDismissExpiringItem}
          />
        );
      default:
        return null;
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <Card className={cn(
          isMobile ? "p-3 pt-2" : isTablet ? "p-4" : "p-4 sm:p-6"
        )}>
          {/* Header - Compact (mobile/tablet) vs Full (desktop) */}
          <div>
          {useCompactHeader ? (
            <MobileCalendarHeader
              currentDate={currentDate}
              view={view}
              selectedFilter={selectedFilter}
              searchQuery={searchQuery}
              onPrevious={handlePrevious}
              onNext={handleNext}
              onToday={handleToday}
              onViewChange={handleViewChange}
              onFilterChange={setSelectedFilter}
              onSearchChange={setSearchQuery}
              priorityFilter={priorityFilter}
              onPriorityChange={setPriorityFilter}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              onDateChange={handleDateChange}
              isTablet={isTablet}
            />
          ) : (
            <>
              <CalendarHeader
                currentDate={currentDate}
                view={view}
                selectedFilter={selectedFilter}
                searchQuery={searchQuery}
                onPrevious={handlePrevious}
                onNext={handleNext}
                onToday={handleToday}
                onViewChange={handleViewChange}
                onFilterChange={setSelectedFilter}
                onSearchChange={setSearchQuery}
                onAddTask={() => handleAddTask()}
                isMobile={false}
                priorityFilter={priorityFilter}
                onPriorityChange={setPriorityFilter}
                statusFilter={statusFilter}
                onStatusChange={setStatusFilter}
                assigneeFilter={assigneeFilter}
                onAssigneeChange={setAssigneeFilter}
                allTasks={allTasks}
                onDateChange={handleDateChange}
              />

              {/* Legend (desktop only) */}
              <div className="mt-4">
                <CalendarLegend />
              </div>
            </>
          )}
          </div>

          {/* Calendar View with transitions */}
          <div 
            className={cn(
              isMobile ? "mt-3" : "mt-6",
              getTransitionClasses()
            )}
            key={`${view}-${currentDate.getMonth()}-${currentDate.getFullYear()}`}
          >
            {isMobile ? renderMobileView() : renderDesktopView()}
          </div>
        </Card>

        {/* Mobile/Tablet FAB with Quick Actions */}
        {useCompactHeader && (
          <MobileFABMenu
            onAddTask={() => handleAddTask()}
            selectedDate={currentDate}
          />
        )}

        {/* Add/Edit Task Modal */}
        <AddTaskModal 
          open={modalOpen} 
          onOpenChange={handleModalClose} 
          prefilledDate={prefilledDate}
          editTask={editingTask}
        />

        {/* Task Details Drawer */}
        <TaskDetailsDrawer
          open={taskDetailsOpen}
          onOpenChange={setTaskDetailsOpen}
          task={selectedTask}
          onEdit={handleEditTask}
        />

        {/* Expiring Item Drawer */}
        <ExpiringItemDrawer
          open={expiringItemDrawerOpen}
          onOpenChange={setExpiringItemDrawerOpen}
          expiringItem={selectedExpiringItem}
        />

        {/* Feature Lock Modal */}
        <FeatureLockModal
          open={lockModalOpen}
          onOpenChange={setLockModalOpen}
          featureName="Calendar"
          description={`Calendar is available on the ${lockedPlanName} plan. Upgrade to schedule tasks, events, and manage your operational calendar.`}
          requiredPlan={lockedPlanName}
        />
      </div>
    </TooltipProvider>
  );
};
