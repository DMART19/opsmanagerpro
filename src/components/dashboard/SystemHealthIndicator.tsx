import { CheckCircle2, Activity, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
interface SystemHealthIndicatorProps {
  lastSyncTime?: Date | null;
  isLive?: boolean;
  className?: string;
}
export const SystemHealthIndicator = ({
  lastSyncTime,
  isLive = true,
  className
}: SystemHealthIndicatorProps) => {
  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit'
    });
  };
  return <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          <span>
            System healthy • {lastSyncTime ? `Updated ${formatTime(lastSyncTime)}` : "Real-time sync active"}
          </span>
        </div>
      </TooltipContent>
    </Tooltip>;
};

// Compact version for cards
export const DataSyncBadge = ({
  lastUpdated,
  className
}: {
  lastUpdated?: Date | null;
  className?: string;
}) => {
  if (!lastUpdated) return null;
  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    return date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit'
    });
  };
  return <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <div className={cn("flex items-center gap-1.5 text-[10px] text-muted-foreground/60 font-medium", className)}>
          <RefreshCw className="h-3 w-3" />
          <span className="tabular-nums">{formatTime(lastUpdated)}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        Last synchronized with database
      </TooltipContent>
    </Tooltip>;
};