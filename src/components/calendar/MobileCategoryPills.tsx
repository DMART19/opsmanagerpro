import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { taskTypeLabels, taskTypeColors } from "./types";

interface MobileCategoryPillsProps {
  selectedFilter: string;
  onFilterChange: (filter: string) => void;
}

export const MobileCategoryPills = ({
  selectedFilter,
  onFilterChange,
}: MobileCategoryPillsProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll selected item into view
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    
    const selectedButton = container.querySelector(`[data-filter="${selectedFilter}"]`);
    if (selectedButton) {
      selectedButton.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [selectedFilter]);

  return (
    <div 
      ref={scrollRef}
      className="flex gap-2 overflow-x-auto scrollbar-hide py-1 -mx-1 px-1"
    >
      {Object.entries(taskTypeLabels).map(([key, label]) => (
        <button
          key={key}
          data-filter={key}
          onClick={() => onFilterChange(key)}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200",
            "min-h-[40px] min-w-[80px] shrink-0",
            "active:scale-95",
            selectedFilter === key
              ? key === "all"
                ? "bg-primary text-primary-foreground shadow-md"
                : `${taskTypeColors[key as keyof typeof taskTypeColors]?.bg} text-white shadow-md`
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
};
