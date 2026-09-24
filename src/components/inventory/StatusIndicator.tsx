import { AlertTriangle, Wrench, Package, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface StatusIndicatorProps {
  status: string | null;
  quantityAvailable?: number | null;
  quantityOut?: number | null;
  dateExpire?: string | null;
  className?: string;
}

export const StatusIndicator = ({
  status,
  quantityAvailable,
  quantityOut,
  dateExpire,
  className,
}: StatusIndicatorProps) => {
  const indicators: React.ReactNode[] = [];

  // Check for low stock (quantity available <= 2)
  const isLowStock = quantityAvailable !== null && quantityAvailable !== undefined && quantityAvailable <= 2 && quantityAvailable > 0;
  const isOutOfStock = quantityAvailable === 0;

  // Check for maintenance status
  const isMaintenance = status?.toUpperCase() === "MAINT";
  const isRetired = status?.toUpperCase() === "RETIRED";
  const isOut = status?.toUpperCase() === "OUT";

  // Check for expiration - matches alert thresholds (7 days critical, 30 days warning)
  const isExpired = dateExpire && new Date(dateExpire) < new Date();
  const isExpiringSoon = dateExpire && !isExpired && 
    new Date(dateExpire) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const isExpiringCritical = dateExpire && !isExpired &&
    new Date(dateExpire) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Priority indicators (most important first)
  if (isOutOfStock) {
    indicators.push(
      <Tooltip key="out-of-stock" delayDuration={100}>
        <TooltipTrigger>
          <Badge 
            variant="destructive" 
            className="gap-1 h-5 px-1.5 text-xs font-medium"
          >
            <AlertCircle className="h-3 w-3" />
            Out
          </Badge>
        </TooltipTrigger>
        <TooltipContent>No stock available</TooltipContent>
      </Tooltip>
    );
  } else if (isLowStock) {
    indicators.push(
      <Tooltip key="low-stock" delayDuration={100}>
        <TooltipTrigger>
          <Badge 
            variant="outline" 
            className="gap-1 h-5 px-1.5 text-xs font-medium bg-warning/10 text-warning border-warning/30"
          >
            <AlertTriangle className="h-3 w-3" />
            Low ({quantityAvailable})
          </Badge>
        </TooltipTrigger>
        <TooltipContent>Low stock: only {quantityAvailable} available</TooltipContent>
      </Tooltip>
    );
  }

  if (isMaintenance) {
    indicators.push(
      <Tooltip key="maintenance" delayDuration={100}>
        <TooltipTrigger>
          <Badge 
            variant="outline" 
            className="gap-1 h-5 px-1.5 text-xs font-medium bg-orange-500/10 text-orange-600 border-orange-500/30"
          >
            <Wrench className="h-3 w-3" />
            Maint
          </Badge>
        </TooltipTrigger>
        <TooltipContent>Item is under maintenance</TooltipContent>
      </Tooltip>
    );
  }

  if (isRetired) {
    indicators.push(
      <Tooltip key="retired" delayDuration={100}>
        <TooltipTrigger>
          <Badge 
            variant="outline" 
            className="gap-1 h-5 px-1.5 text-xs font-medium bg-muted text-muted-foreground"
          >
            Retired
          </Badge>
        </TooltipTrigger>
        <TooltipContent>Item has been retired</TooltipContent>
      </Tooltip>
    );
  }

  if (isExpired) {
    indicators.push(
      <Tooltip key="expired" delayDuration={100}>
        <TooltipTrigger>
          <Badge 
            variant="destructive" 
            className="gap-1 h-5 px-1.5 text-xs font-medium"
          >
            Expired
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          Expired on {new Date(dateExpire!).toLocaleDateString()}
        </TooltipContent>
      </Tooltip>
    );
  } else if (isExpiringSoon) {
    // Critical expiring (within 7 days) uses destructive/red styling
    const badgeClasses = isExpiringCritical
      ? "gap-1 h-5 px-1.5 text-xs font-medium bg-destructive/10 text-destructive border-destructive/30"
      : "gap-1 h-5 px-1.5 text-xs font-medium bg-warning/10 text-warning border-warning/30";
    
    const daysUntil = Math.ceil((new Date(dateExpire!).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    indicators.push(
      <Tooltip key="expiring" delayDuration={100}>
        <TooltipTrigger>
          <Badge 
            variant="outline" 
            className={badgeClasses}
          >
            {isExpiringCritical ? `Expires in ${daysUntil}d` : "Expiring"}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          Expires on {new Date(dateExpire!).toLocaleDateString()}
          {isExpiringCritical && ` (${daysUntil} day${daysUntil !== 1 ? 's' : ''})`}
        </TooltipContent>
      </Tooltip>
    );
  }

  if (indicators.length === 0) {
    // Show normal status
    if (status) {
      const statusColor = isOut
        ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
        : "bg-success/10 text-success border-success/30";

      return (
        <Badge 
          variant="outline" 
          className={cn("h-5 px-1.5 text-xs font-medium", statusColor, className)}
        >
          {status}
        </Badge>
      );
    }
    return null;
  }

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {indicators}
    </div>
  );
};
