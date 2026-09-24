import { taskTypeColors, taskTypeLabels } from "./types";
import { cn } from "@/lib/utils";

export const CalendarLegend = () => {
  return (
    <div className="flex flex-wrap items-center gap-4 py-2 text-xs text-muted-foreground/70">
      {Object.entries(taskTypeLabels)
        .filter(([key]) => key !== "all")
        .map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div
              className={cn(
                "w-2 h-2 rounded-full opacity-70",
                taskTypeColors[key as keyof typeof taskTypeColors]?.dot
              )}
            />
            <span>{label}</span>
          </div>
        ))}
    </div>
  );
};
