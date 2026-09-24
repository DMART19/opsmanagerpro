import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Eye, Plus } from "lucide-react";

interface ComplianceProgressProps {
  compliant: number;
  expiringSoon: number;
  missingExpired: number;
  total: number;
  showLabel?: boolean;
  size?: "sm" | "md";
  showViewHint?: boolean;
  onClick?: () => void;
}

export const ComplianceProgress = ({
  compliant,
  expiringSoon,
  missingExpired,
  total,
  showLabel = true,
  size = "md",
  showViewHint = false,
  onClick,
}: ComplianceProgressProps) => {
  // Empty state - no credentials assigned
  if (total === 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className={cn(
                "flex items-center gap-1.5 cursor-pointer group",
                onClick && "hover:bg-accent/50 rounded px-1.5 py-0.5 -mx-1.5 transition-colors"
              )}
              onClick={onClick}
            >
              <span className="text-xs text-muted-foreground italic">
                Setup required
              </span>
              {showViewHint && (
                <Plus className="h-3 w-3 text-muted-foreground/50 group-hover:text-primary transition-colors" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-popover border shadow-lg">
            <div className="text-xs p-1">
              <p className="font-medium text-foreground mb-1">No credentials assigned</p>
              <p className="text-muted-foreground">Assign credentials to start tracking progress</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const compliantPercent = (compliant / total) * 100;
  const expiringPercent = (expiringSoon / total) * 100;
  const missingPercent = (missingExpired / total) * 100;

  const barHeight = size === "sm" ? "h-1.5" : "h-2";
  
  // Determine summary text
  const getSummaryText = () => {
    if (compliant === total) {
      return `${compliant} of ${total} complete`;
    }
    if (missingExpired > 0 && expiringSoon > 0) {
      return `${compliant} of ${total}`;
    }
    if (expiringSoon > 0) {
      return `${compliant} of ${total}, ${expiringSoon} expiring`;
    }
    if (missingExpired > 0) {
      return `${compliant} of ${total}, ${missingExpired} missing`;
    }
    return `${compliant} of ${total} complete`;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={cn(
              "flex items-center gap-2 min-w-[100px] cursor-pointer group",
              onClick && "hover:bg-accent/50 rounded px-1.5 py-0.5 -mx-1.5 transition-colors"
            )}
            onClick={onClick}
          >
            <div className={cn("flex-1 flex rounded-full overflow-hidden bg-muted", barHeight)}>
              {compliantPercent > 0 && (
                <div
                  className="bg-success transition-all"
                  style={{ width: `${compliantPercent}%` }}
                />
              )}
              {expiringPercent > 0 && (
                <div
                  className="bg-warning transition-all"
                  style={{ width: `${expiringPercent}%` }}
                />
              )}
              {missingPercent > 0 && (
                <div
                  className="bg-destructive transition-all"
                  style={{ width: `${missingPercent}%` }}
                />
              )}
            </div>
            {showLabel && (
              <span className={cn(
                "font-medium whitespace-nowrap",
                size === "sm" ? "text-xs" : "text-sm",
                compliant === total
                  ? "text-success"
                  : missingExpired > 0
                  ? "text-destructive"
                  : expiringSoon > 0
                  ? "text-warning"
                  : "text-foreground"
              )}>
                {compliant}/{total}
              </span>
            )}
            {showViewHint && (
              <Eye className="h-3 w-3 text-muted-foreground/50 group-hover:text-primary transition-colors" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-popover border shadow-lg">
          <div className="text-xs space-y-1.5 p-1">
            <p className="font-medium text-foreground mb-2">{getSummaryText()}</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-success" />
              <span className="text-foreground">Complete: {compliant}</span>
            </div>
            {expiringSoon > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-warning" />
                <span className="text-foreground">Expiring Soon: {expiringSoon}</span>
              </div>
            )}
            {missingExpired > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-destructive" />
                <span className="text-foreground">Missing: {missingExpired}</span>
              </div>
            )}
            <p className="text-muted-foreground pt-1 border-t mt-2">Click to view details</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
