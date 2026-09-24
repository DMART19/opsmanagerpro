import { TrendingUp, PartyPopper, Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComplianceMomentumProps {
  complianceRate: number;
  previousRate?: number;
  totalMembers: number;
}

export const ComplianceMomentum = ({
  complianceRate,
  previousRate = 0,
  totalMembers,
}: ComplianceMomentumProps) => {
  // Only show if compliance is good (≥90%) and we have data
  if (complianceRate < 90 || totalMembers === 0) return null;

  const improvement = previousRate > 0 ? complianceRate - previousRate : 0;
  const isImproving = improvement > 0;
  const isPerfect = complianceRate >= 98;

  // Determine the message to show
  let message = "";
  let Icon = TrendingUp;
  let color = "text-success";

  if (isPerfect) {
    message = "Outstanding! Your team is at peak compliance.";
    Icon = Award;
    color = "text-success";
  } else if (isImproving) {
    message = `Team compliance improved +${improvement.toFixed(1)}% this period`;
    Icon = TrendingUp;
    color = "text-success";
  } else if (complianceRate >= 95) {
    message = "Excellent compliance! Keep up the great work.";
    Icon = PartyPopper;
    color = "text-success";
  } else {
    message = "Good compliance rate maintained.";
    Icon = TrendingUp;
    color = "text-primary";
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg",
        "bg-success/5 border border-success/20",
        "animate-in fade-in-50 slide-in-from-top-2 duration-500"
      )}
    >
      <Icon className={cn("h-4 w-4 flex-shrink-0", color)} />
      <span className={cn("text-sm font-medium", color)}>
        {message}
      </span>
    </div>
  );
};
