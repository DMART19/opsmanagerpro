/**
 * StepWalkthrough — Short 2–3 step inline guide
 * 
 * Non-blocking numbered steps. Dismissible, persisted.
 */

import { useGuidance } from "@/hooks/use-guidance";
import { X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface WalkthroughStep {
  title: string;
  description: string;
  icon?: LucideIcon;
}

interface StepWalkthroughProps {
  guidanceId: string;
  title: string;
  steps: WalkthroughStep[];
  showWhen?: boolean;
  className?: string;
}

export const StepWalkthrough = ({
  guidanceId,
  title,
  steps,
  showWhen = true,
  className,
}: StepWalkthroughProps) => {
  const { visible, markComplete } = useGuidance(guidanceId);

  if (!visible || !showWhen) return null;

  return (
    <div
      className={cn(
        "relative rounded-xl border border-border bg-card p-4 shadow-sm",
        "animate-in fade-in-0 slide-in-from-top-2 duration-300",
        className
      )}
    >
      <button
        onClick={markComplete}
        className="absolute top-3 right-3 p-1 rounded-md hover:bg-muted transition-colors"
        aria-label="Dismiss guide"
        type="button"
      >
        <X className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      <h4 className="text-sm font-semibold text-foreground mb-3 pr-6">
        {title}
      </h4>

      <div className="space-y-2.5">
        {steps.map((step, i) => {
          const StepIcon = step.icon;
          return (
            <div key={i} className="flex items-start gap-2.5">
              <div className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold mt-0.5">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground leading-tight">
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={markComplete}
        className="mt-3 h-7 text-xs text-muted-foreground gap-1.5"
      >
        <CheckCircle2 className="h-3 w-3" />
        Got it
      </Button>
    </div>
  );
};
