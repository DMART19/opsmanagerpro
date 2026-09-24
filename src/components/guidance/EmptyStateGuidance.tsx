/**
 * EmptyStateGuidance — Contextual help when a page has no data
 * 
 * Shows icon, title, description, and optional action button.
 * Persisted via useGuidance so it only shows once after data exists.
 */

import { useGuidance } from "@/hooks/use-guidance";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface EmptyStateGuidanceProps {
  guidanceId: string;
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Only show when empty — pass true when data count is 0 */
  isEmpty: boolean;
  className?: string;
}

export const EmptyStateGuidance = ({
  guidanceId,
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  isEmpty,
  className,
}: EmptyStateGuidanceProps) => {
  const { visible, markComplete } = useGuidance(guidanceId);

  // Show if empty (even if "completed") or if first time
  if (!isEmpty) return null;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-4 text-center",
        "animate-in fade-in-0 duration-300",
        className
      )}
    >
      <div className="p-4 rounded-2xl bg-primary/10 mb-5">
        <Icon className="h-8 w-8 text-primary" />
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-1.5">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-5 leading-relaxed">
        {description}
      </p>

      {actionLabel && onAction && (
        <Button
          onClick={() => {
            markComplete();
            onAction();
          }}
          size="lg"
          className="gap-2"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
