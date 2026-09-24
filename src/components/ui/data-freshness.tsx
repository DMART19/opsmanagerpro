import { useState, useEffect } from "react";
import { Clock, RefreshCw, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DataFreshnessProps {
  lastUpdated?: Date | null;
  isRealtime?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  className?: string;
}

/**
 * A subtle indicator showing when data was last updated.
 * Shows "Real-time" for live data or "Last updated: X minutes ago" for static data.
 */
export const DataFreshness = ({
  lastUpdated,
  isRealtime = false,
  onRefresh,
  isRefreshing = false,
  className,
}: DataFreshnessProps) => {
  const [now, setNow] = useState(new Date());

  // Update the "now" timestamp every minute for relative time display
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const getRelativeTime = (date: Date): string => {
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);

    if (diffSecs < 30) return "Just now";
    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  if (isRealtime) {
    return (
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-1.5 text-xs text-muted-foreground",
              className
            )}
          >
            <Wifi className="h-3 w-3 text-success" />
            <span>Real-time</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-sm">Data updates automatically</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs text-muted-foreground",
        className
      )}
    >
      <Clock className="h-3 w-3" />
      <span>
        {lastUpdated ? `Updated ${getRelativeTime(lastUpdated)}` : "Loading..."}
      </span>
      {onRefresh && (
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-0.5 rounded hover:bg-muted transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={cn("h-3 w-3", isRefreshing && "animate-spin")}
              />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-sm">Refresh data</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
};
