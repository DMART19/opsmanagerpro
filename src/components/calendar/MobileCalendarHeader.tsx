import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, List, CalendarDays, ChevronDown, Plus } from "lucide-react";
import { format, setMonth, setYear } from "date-fns";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { ViewType, taskTypeLabels, taskTypeColors } from "./types";
import { ViewSegmentedControl } from "./ViewSegmentedControl";
import { MobileFilterSheet } from "./MobileFilterSheet";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MobileCalendarHeaderProps {
  currentDate: Date;
  view: ViewType;
  selectedFilter: string;
  searchQuery: string;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewChange: (view: ViewType) => void;
  onFilterChange: (filter: string) => void;
  onSearchChange: (query: string) => void;
  priorityFilter?: string;
  onPriorityChange?: (priority: string) => void;
  statusFilter?: string;
  onStatusChange?: (status: string) => void;
  onDateChange?: (date: Date) => void;
  isTablet?: boolean;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export const MobileCalendarHeader = ({
  currentDate,
  view,
  selectedFilter,
  searchQuery,
  onPrevious,
  onNext,
  onToday,
  onViewChange,
  onFilterChange,
  onSearchChange,
  priorityFilter = "all",
  onPriorityChange,
  statusFilter = "all",
  onStatusChange,
  onDateChange,
  isTablet = false,
}: MobileCalendarHeaderProps) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  // Count active filters
  const activeFilterCount = 
    (selectedFilter !== "all" ? 1 : 0) + 
    (searchQuery ? 1 : 0) + 
    (priorityFilter !== "all" ? 1 : 0) + 
    (statusFilter !== "all" ? 1 : 0);

  // Generate years range
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 21 }, (_, i) => currentYear - 10 + i);

  const handleMonthSelect = (monthIndex: number) => {
    if (onDateChange) {
      const newDate = setYear(setMonth(currentDate, monthIndex), selectedYear);
      onDateChange(newDate);
    }
    setPickerOpen(false);
  };

  const handleTodayPress = () => {
    onToday();
    setPickerOpen(false);
  };

  const isToday = () => {
    const today = new Date();
    return (
      currentDate.getDate() === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  return (
    <div className="space-y-3">
      {/* Row 1: Nav + Date + View + Actions */}
      <div data-tour="calendar-actions" className="flex items-center gap-2">
        {/* Navigation */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onPrevious}
          className="h-9 w-9 shrink-0 active:scale-95 transition-all duration-150"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        {/* Date - Opens month/year picker sheet */}
        <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
          <SheetTrigger asChild>
            <button 
              className={cn(
                "flex items-center justify-center gap-1.5 min-w-0 py-1 rounded-lg active:bg-accent/50 transition-all duration-150",
                isTablet ? "px-3" : "flex-1"
              )}
            >
              <span className={cn(
                "font-semibold text-foreground truncate",
                isTablet ? "text-base" : "text-sm"
              )}>
                {isTablet ? format(currentDate, "MMMM yyyy") : format(currentDate, "MMM yyyy")}
              </span>
              <ChevronDown className={cn(
                "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                pickerOpen && "rotate-180"
              )} />
            </button>
          </SheetTrigger>
          
          <SheetContent side="bottom" className="h-[70vh] px-4">
            <SheetHeader className="pb-4">
              <SheetTitle className="flex items-center justify-between">
                <span>Jump to Date</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleTodayPress}
                  className={cn(
                    "h-8 text-sm",
                    isToday() ? "text-muted-foreground" : "text-primary"
                  )}
                >
                  Today
                </Button>
              </SheetTitle>
            </SheetHeader>

            {/* Year selector - horizontal scroll */}
            <div className="mb-4">
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                Year
              </p>
              <ScrollArea className="w-full" orientation="horizontal">
                <div className="flex gap-2 pb-2">
                  {years.map((year) => (
                    <button
                      key={year}
                      onClick={() => setSelectedYear(year)}
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                        "min-w-[60px] shrink-0 active:scale-95",
                        selectedYear === year
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : year === currentYear
                            ? "bg-primary/10 text-primary"
                            : "bg-muted/50 text-foreground hover:bg-muted"
                      )}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Month grid */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                Month
              </p>
              <div className={cn("grid gap-2", isTablet ? "grid-cols-4" : "grid-cols-3")}>
                {MONTHS.map((month, index) => {
                  const isCurrentMonth = 
                    index === currentDate.getMonth() && 
                    selectedYear === currentDate.getFullYear();
                  const isThisMonth = 
                    index === new Date().getMonth() && 
                    selectedYear === new Date().getFullYear();

                  return (
                    <button
                      key={month}
                      onClick={() => handleMonthSelect(index)}
                      className={cn(
                        "py-4 rounded-xl text-sm font-medium transition-all duration-150",
                        "active:scale-95",
                        isCurrentMonth
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : isThisMonth
                            ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                            : "bg-muted/40 text-foreground hover:bg-muted/60"
                      )}
                    >
                      {month}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Current selection preview */}
            <div className="mt-6 p-3 bg-muted/30 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Selected</p>
              <p className="text-lg font-semibold text-foreground">
                {format(setYear(setMonth(new Date(), currentDate.getMonth()), selectedYear), "MMMM yyyy")}
              </p>
            </div>
          </SheetContent>
        </Sheet>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onNext}
          className="h-9 w-9 shrink-0 active:scale-95 transition-all duration-150"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Spacer on tablet to push view controls right */}
        {isTablet && <div className="flex-1" />}

        {/* View Toggle */}
        {isTablet ? (
          <ViewSegmentedControl
            view={view}
            onViewChange={onViewChange}
          />
        ) : (
          <div className="flex bg-muted/60 rounded-lg p-0.5 shrink-0">
            <button
              onClick={() => onViewChange("agenda")}
              className={cn(
                "h-8 w-8 flex items-center justify-center rounded-md transition-all duration-150",
                "active:scale-95",
                view === "agenda" 
                  ? "bg-background shadow-sm text-foreground" 
                  : "text-muted-foreground"
              )}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => onViewChange("day")}
              className={cn(
                "h-8 w-8 flex items-center justify-center rounded-md transition-all duration-150",
                "active:scale-95",
                (view === "day" || view === "week")
                  ? "bg-background shadow-sm text-foreground" 
                  : "text-muted-foreground"
              )}
            >
              <CalendarDays className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Filter Button */}
        <MobileFilterSheet
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          selectedFilter={selectedFilter}
          onFilterChange={onFilterChange}
          activeFilterCount={activeFilterCount}
          priorityFilter={priorityFilter}
          onPriorityChange={onPriorityChange}
          statusFilter={statusFilter}
          onStatusChange={onStatusChange}
        />

        {/* Add Event button on tablet */}
        {isTablet && (
          <Button 
            onClick={() => onFilterChange("all")} // Will be overridden by parent
            className="gap-1.5 shadow-sm transition-all duration-200 active:scale-95 shrink-0"
            style={{ display: 'none' }} // Hidden - FAB handles this on tablet
          />
        )}
      </div>

      {/* Compact Category Pills - Horizontal scroll */}
      <div className={cn(
        "flex gap-1.5 overflow-x-auto scrollbar-hide -mx-1 px-1",
        isTablet && "gap-2"
      )}>
        {Object.entries(taskTypeLabels).map(([key, label]) => (
          <button
            key={key}
            onClick={() => onFilterChange(key)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-150 shrink-0",
              "min-h-[28px] active:scale-95",
              isTablet && "px-4 py-1.5 min-h-[32px] text-sm",
              selectedFilter === key
                ? key === "all"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : `${taskTypeColors[key as keyof typeof taskTypeColors]?.bg} text-white shadow-sm`
                : "bg-muted/60 text-muted-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};
