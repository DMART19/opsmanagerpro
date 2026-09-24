import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { format, setMonth, setYear, startOfYear, addYears, subYears } from "date-fns";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MonthYearPickerProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  className?: string;
}

const MONTHS = [
  "January", "February", "March", "April",
  "May", "June", "July", "August",
  "September", "October", "November", "December"
];

const YEARS_RANGE = 12; // Show 12 years at a time

export const MonthYearPicker = ({ 
  currentDate, 
  onDateChange,
  className 
}: MonthYearPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<"month" | "year">("month");
  const [yearRangeStart, setYearRangeStart] = useState(() => {
    const currentYear = currentDate.getFullYear();
    return currentYear - Math.floor(YEARS_RANGE / 2);
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset to month view when opened
  useEffect(() => {
    if (isOpen) {
      setPickerMode("month");
      const currentYear = currentDate.getFullYear();
      setYearRangeStart(currentYear - Math.floor(YEARS_RANGE / 2));
    }
  }, [isOpen, currentDate]);

  const handleMonthSelect = (monthIndex: number) => {
    onDateChange(setMonth(currentDate, monthIndex));
    setIsOpen(false);
  };

  const handleYearSelect = (year: number) => {
    onDateChange(setYear(currentDate, year));
    setPickerMode("month");
  };

  const handlePrevYearRange = () => {
    setYearRangeStart(prev => prev - YEARS_RANGE);
  };

  const handleNextYearRange = () => {
    setYearRangeStart(prev => prev + YEARS_RANGE);
  };

  const years = Array.from({ length: YEARS_RANGE }, (_, i) => yearRangeStart + i);
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "group flex items-center gap-1.5 transition-all duration-200",
            "hover:bg-accent/50 rounded-lg px-2 py-1 -mx-2",
            className
          )}
        >
          <span className="text-lg font-semibold text-foreground">
            {format(currentDate, "MMMM")}
          </span>
          <span className="text-lg font-medium text-muted-foreground">
            {format(currentDate, "yyyy")}
          </span>
          <ChevronDown className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )} />
        </button>
      </PopoverTrigger>

      <PopoverContent 
        className="w-[280px] p-0 overflow-hidden" 
        align="start"
        sideOffset={8}
      >
        {/* Header with mode toggle */}
        <div className="flex items-center justify-between p-3 border-b bg-muted/30">
          {pickerMode === "year" ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handlePrevYearRange}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <button
                onClick={() => setPickerMode("month")}
                className="text-sm font-semibold hover:text-primary transition-colors"
              >
                {yearRangeStart} – {yearRangeStart + YEARS_RANGE - 1}
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleNextYearRange}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <button
              onClick={() => setPickerMode("year")}
              className="flex items-center gap-1.5 text-sm font-semibold hover:text-primary transition-colors mx-auto"
            >
              {currentYear}
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-3">
          {pickerMode === "month" ? (
            // Month grid with smooth animation
            <div className="grid grid-cols-3 gap-1.5 animate-fade-in">
              {MONTHS.map((month, index) => {
                const isCurrentMonth = index === currentMonth;
                const isToday = index === new Date().getMonth() && 
                              currentYear === new Date().getFullYear();
                
                return (
                  <button
                    key={month}
                    onClick={() => handleMonthSelect(index)}
                    className={cn(
                      "py-2.5 px-2 rounded-lg text-sm font-medium transition-all duration-150",
                      "hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary/20",
                      isCurrentMonth && "bg-primary text-primary-foreground hover:bg-primary/90",
                      !isCurrentMonth && isToday && "ring-1 ring-primary/30",
                      !isCurrentMonth && !isToday && "text-foreground"
                    )}
                  >
                    {month.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          ) : (
            // Year grid with smooth animation
            <div className="grid grid-cols-3 gap-1.5 animate-fade-in">
              {years.map((year) => {
                const isCurrentYear = year === currentYear;
                const isThisYear = year === new Date().getFullYear();
                
                return (
                  <button
                    key={year}
                    onClick={() => handleYearSelect(year)}
                    className={cn(
                      "py-2.5 px-2 rounded-lg text-sm font-medium transition-all duration-150",
                      "hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary/20",
                      isCurrentYear && "bg-primary text-primary-foreground hover:bg-primary/90",
                      !isCurrentYear && isThisYear && "ring-1 ring-primary/30",
                      !isCurrentYear && !isThisYear && "text-foreground"
                    )}
                  >
                    {year}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick actions footer */}
        <div className="flex items-center justify-between p-2 border-t bg-muted/20">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={() => {
              onDateChange(new Date());
              setIsOpen(false);
            }}
          >
            Today
          </Button>
          <span className="text-xs text-muted-foreground">
            {format(currentDate, "MMM d, yyyy")}
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
};
