import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ExpirationLabelProps {
  dateExpire: string | null | undefined;
  className?: string;
}

export const ExpirationLabel = ({ dateExpire, className }: ExpirationLabelProps) => {
  if (!dateExpire) return null;

  const expDate = new Date(dateExpire);
  const today = new Date();
  const daysUntil = Math.floor((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  let label: string;
  let colorClass: string;

  if (daysUntil < 0) {
    label = "Expired";
    colorClass = "text-destructive font-medium";
  } else if (daysUntil === 0) {
    label = "Expires today";
    colorClass = "text-destructive font-medium";
  } else if (daysUntil === 1) {
    label = "Expires tomorrow";
    colorClass = "text-destructive font-medium";
  } else if (daysUntil <= 7) {
    label = `Expires in ${daysUntil}d`;
    colorClass = "text-destructive font-medium";
  } else if (daysUntil <= 30) {
    label = `Expires in ${daysUntil}d`;
    colorClass = "text-amber-600 dark:text-amber-400 font-medium";
  } else if (daysUntil <= 90) {
    label = `${daysUntil}d`;
    colorClass = "text-muted-foreground";
  } else {
    label = format(expDate, "MMM d");
    colorClass = "text-muted-foreground";
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("text-sm cursor-help whitespace-nowrap", colorClass, className)}>
          {label}
        </span>
      </TooltipTrigger>
      <TooltipContent className="text-xs">
        {daysUntil < 0
          ? `Expired on ${format(expDate, "MMM d, yyyy")}`
          : `Expires ${format(expDate, "MMM d, yyyy")}`}
      </TooltipContent>
    </Tooltip>
  );
};
