import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useComplianceSettings } from "@/hooks/use-compliance-settings";

interface SmartStatusBadgeProps {
  employee: any;
}

export const SmartStatusBadge = ({ employee }: SmartStatusBadgeProps) => {
  const { warningThresholdDays } = useComplianceSettings();
  
  const stats = employee.requirements_stats || {};
  const total = stats.total || 0;
  const compliant = stats.compliant || 0;
  const expiringSoon = stats.expiring_soon || 0;
  const missingExpired = stats.missing_expired || 0;

  // No credentials assigned - return null to let the column be hidden if all are empty
  if (total === 0) {
    return null;
  }

  // Action required (expired only — "Assigned" is neutral)
  if (missingExpired > 0) {
    return (
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-destructive/10 cursor-help">
            <XCircle className="h-4 w-4 text-destructive" />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {missingExpired} credential{missingExpired !== 1 ? "s" : ""} expired
        </TooltipContent>
      </Tooltip>
    );
  }

  // Expiring soon (within user-configured warning threshold)
  if (expiringSoon > 0) {
    return (
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-warning/10 cursor-help">
            <AlertCircle className="h-4 w-4 text-warning" />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {expiringSoon} credential{expiringSoon !== 1 ? "s" : ""} expiring within {warningThresholdDays} days
        </TooltipContent>
      </Tooltip>
    );
  }

  // All complete
  return (
    <Tooltip delayDuration={100}>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-success/10 cursor-help">
          <CheckCircle2 className="h-4 w-4 text-success" />
        </span>
      </TooltipTrigger>
      <TooltipContent>
        All {total} credential{total !== 1 ? "s" : ""} up to date
      </TooltipContent>
    </Tooltip>
  );
};
