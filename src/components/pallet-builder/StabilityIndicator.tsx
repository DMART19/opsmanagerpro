import { Shield, ShieldAlert, ShieldCheck, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { calculateStabilityScore } from "@/lib/pallet-stability";
import { PlacedCase } from "@/types/pallet-builder";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface StabilityIndicatorProps {
  placedCases: PlacedCase[];
}

export const StabilityIndicator = ({ placedCases }: StabilityIndicatorProps) => {
  const stability = calculateStabilityScore(placedCases);

  const getIcon = () => {
    switch (stability.score) {
      case "stable":
        return <ShieldCheck className="h-5 w-5" />;
      case "moderate":
        return <Shield className="h-5 w-5" />;
      case "high-risk":
        return <ShieldAlert className="h-5 w-5" />;
    }
  };

  const getLabel = () => {
    switch (stability.score) {
      case "stable":
        return "Stable";
      case "moderate":
        return "Moderate Risk";
      case "high-risk":
        return "High Risk";
    }
  };

  const getDescription = () => {
    switch (stability.score) {
      case "stable":
        return "All containers are well-supported. This pallet is safe for transport.";
      case "moderate":
        return "Some containers have partial support. Review upper layer placements.";
      case "high-risk":
        return "Multiple containers lack proper support. This pallet may be unstable.";
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card
            className="px-4 py-2 flex items-center gap-3 cursor-help"
            style={{ borderColor: stability.color }}
          >
            <div style={{ color: stability.color }}>{getIcon()}</div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground">
                Stability Score
              </span>
              <span className="text-xs" style={{ color: stability.color }}>
                {getLabel()} ({stability.percentage.toFixed(0)}%)
              </span>
            </div>
          </Card>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p>{getDescription()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
