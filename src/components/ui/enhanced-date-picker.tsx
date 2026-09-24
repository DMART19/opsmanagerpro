import { useState, useEffect, useRef } from "react";
import { format, addDays, addMonths, addYears, setMonth, setYear, parse, isValid } from "date-fns";
import { CalendarIcon, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const YEARS_PER_PAGE = 12;

interface QuickAction {
  label: string;
  getDate: () => Date | undefined;
}

interface EnhancedDatePickerProps {
  date: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  /** Show quick-action shortcut buttons */
  showQuickActions?: boolean;
  /** Show manual text input */
  showManualInput?: boolean;
  /** Custom quick actions to add */
  extraQuickActions?: QuickAction[];
  className?: string;
}

type PickerView = "calendar" | "months" | "years";

export const EnhancedDatePicker = ({
  date,
  onDateChange,
  placeholder = "Select date",
  disabled = false,
  minDate,
  showQuickActions = true,
  showManualInput = true,
  extraQuickActions,
  className,
}: EnhancedDatePickerProps) => {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<PickerView>("calendar");
  const [viewDate, setViewDate] = useState(() => date || new Date());
  const [yearRangeStart, setYearRangeStart] = useState(() => {
    const y = (date || new Date()).getFullYear();
    return y - Math.floor(YEARS_PER_PAGE / 2);
  });
  const [manualInput, setManualInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync viewDate when date changes externally
  useEffect(() => {
    if (date) setViewDate(date);
  }, [date]);

  // Reset view when popover opens
  useEffect(() => {
    if (open) {
      setView("calendar");
      setManualInput(date ? format(date, "MM/dd/yyyy") : "");
      const y = (date || new Date()).getFullYear();
      setYearRangeStart(y - Math.floor(YEARS_PER_PAGE / 2));
    }
  }, [open, date]);

  const quickActions: QuickAction[] = [
    { label: "Today", getDate: () => new Date() },
    { label: "+30d", getDate: () => addDays(new Date(), 30) },
    { label: "+90d", getDate: () => addDays(new Date(), 90) },
    { label: "+6mo", getDate: () => addMonths(new Date(), 6) },
    { label: "+1yr", getDate: () => addYears(new Date(), 1) },
    ...(extraQuickActions || []),
  ];

  const handleQuickAction = (action: QuickAction) => {
    const d = action.getDate();
    onDateChange(d);
    if (d) setViewDate(d);
    setOpen(false);
  };

  const handleMonthSelect = (monthIndex: number) => {
    setViewDate(setMonth(viewDate, monthIndex));
    setView("calendar");
  };

  const handleYearSelect = (year: number) => {
    setViewDate(setYear(viewDate, year));
    setView("months");
  };

  const handleManualInput = (val: string) => {
    setManualInput(val);
    // Auto-parse when complete
    if (val.length === 10) {
      const parsed = parse(val, "MM/dd/yyyy", new Date());
      if (isValid(parsed)) {
        onDateChange(parsed);
        setViewDate(parsed);
      }
    }
  };

  const handleCalendarSelect = (d: Date | undefined) => {
    onDateChange(d);
    if (d) setManualInput(format(d, "MM/dd/yyyy"));
    setOpen(false);
  };

  const years = Array.from({ length: YEARS_PER_PAGE }, (_, i) => yearRangeStart + i);
  const currentMonth = viewDate.getMonth();
  const currentYear = viewDate.getFullYear();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal h-11",
            !date && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          {date ? format(date, "PPP") : placeholder}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="start" sideOffset={4}>
        {/* Quick actions strip */}
        {showQuickActions && view === "calendar" && (
          <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/30">
            {quickActions.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={() => handleQuickAction(a)}
                className="px-2.5 py-1 text-xs font-medium rounded-md bg-background border border-border hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                {a.label}
              </button>
            ))}
          </div>
        )}

        {/* Manual input */}
        {showManualInput && view === "calendar" && (
          <div className="px-3 pt-2">
            <Input
              ref={inputRef}
              type="text"
              placeholder="MM/DD/YYYY"
              value={manualInput}
              onChange={(e) => handleManualInput(e.target.value)}
              className="h-8 text-xs font-mono"
              maxLength={10}
            />
          </div>
        )}

        {/* Header with clickable month/year */}
        {view === "calendar" && (
          <div className="flex items-center justify-between px-3 pt-2 pb-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewDate(addMonths(viewDate, -1))}
              type="button"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setView("months")}
                className="text-sm font-semibold hover:text-primary transition-colors px-1.5 py-0.5 rounded hover:bg-accent"
              >
                {format(viewDate, "MMMM")}
              </button>
              <button
                type="button"
                onClick={() => setView("years")}
                className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors px-1.5 py-0.5 rounded hover:bg-accent"
              >
                {format(viewDate, "yyyy")}
              </button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewDate(addMonths(viewDate, 1))}
              type="button"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Calendar view */}
        {view === "calendar" && (
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleCalendarSelect}
            month={viewDate}
            onMonthChange={setViewDate}
            className="p-3 pointer-events-auto"
            disabled={minDate ? (d) => d < minDate : undefined}
            classNames={{
              caption: "hidden", // We use custom header above
            }}
          />
        )}

        {/* Month selector */}
        {view === "months" && (
          <div className="p-3 w-[280px]">
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => setView("calendar")}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => setView("years")}
                className="text-sm font-semibold hover:text-primary transition-colors flex items-center gap-1"
              >
                {currentYear}
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {MONTHS.map((m, i) => {
                const isActive = i === currentMonth;
                const isNow = i === new Date().getMonth() && currentYear === new Date().getFullYear();
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleMonthSelect(i)}
                    className={cn(
                      "py-2.5 rounded-lg text-sm font-medium transition-all",
                      "hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring/30",
                      isActive && "bg-primary text-primary-foreground hover:bg-primary/90",
                      !isActive && isNow && "ring-1 ring-primary/30",
                      !isActive && !isNow && "text-foreground",
                    )}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Year selector */}
        {view === "years" && (
          <div className="p-3 w-[280px]">
            <div className="flex items-center justify-between mb-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setYearRangeStart((p) => p - YEARS_PER_PAGE)}
                type="button"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <button
                type="button"
                onClick={() => setView("months")}
                className="text-sm font-semibold hover:text-primary transition-colors"
              >
                {yearRangeStart}–{yearRangeStart + YEARS_PER_PAGE - 1}
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setYearRangeStart((p) => p + YEARS_PER_PAGE)}
                type="button"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {years.map((y) => {
                const isActive = y === currentYear;
                const isNow = y === new Date().getFullYear();
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => handleYearSelect(y)}
                    className={cn(
                      "py-2.5 rounded-lg text-sm font-medium transition-all",
                      "hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring/30",
                      isActive && "bg-primary text-primary-foreground hover:bg-primary/90",
                      !isActive && isNow && "ring-1 ring-primary/30",
                      !isActive && !isNow && "text-foreground",
                    )}
                  >
                    {y}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
