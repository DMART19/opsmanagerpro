import { cn } from "@/lib/utils";
import { ViewType } from "./types";

interface ViewSegmentedControlProps {
  view: ViewType;
  onViewChange: (view: ViewType) => void;
  isMobile?: boolean;
}

export const ViewSegmentedControl = ({
  view,
  onViewChange,
  isMobile = false,
}: ViewSegmentedControlProps) => {
  const views: ViewType[] = isMobile
    ? ["agenda", "day", "week"]
    : ["month", "week", "day", "agenda"];

  return (
    <div className="inline-flex items-center bg-muted/50 rounded-lg p-0.5">
      {views.map((v) => (
        <button
          key={v}
          onClick={() => onViewChange(v)}
          className={cn(
            "px-3 py-1.5 text-sm font-medium rounded-md capitalize transition-all duration-200",
            view === v
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {v}
        </button>
      ))}
    </div>
  );
};
