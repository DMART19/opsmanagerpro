/**
 * PageEmptyState - Reusable centered empty state for pages with no data.
 *
 * Renders an icon, title, description, and a primary CTA button.
 * Optionally accepts a secondary action (e.g. Import).
 */

import { type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  secondaryLabel?: string;
  secondaryIcon?: LucideIcon;
  onSecondary?: () => void;
  className?: string;
}

export const PageEmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  secondaryIcon: SecondaryIcon,
  onSecondary,
  className,
}: PageEmptyStateProps) => {
  return (
    <div className={cn("flex flex-col items-center justify-center py-20 px-4 text-center", className)}>
      <div className="p-5 rounded-2xl bg-primary/10 mb-6">
        <Icon className="h-10 w-10 text-primary" />
      </div>

      <h3 className="text-xl font-semibold text-foreground mb-2">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        {description}
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Button onClick={onAction} size="lg" className="gap-2">
          {actionLabel}
        </Button>

        {secondaryLabel && onSecondary && (
          <>
            <span className="text-muted-foreground text-sm hidden sm:block">or</span>
            <Button variant="outline" onClick={onSecondary} size="lg" className="gap-2">
              {SecondaryIcon && <SecondaryIcon className="h-4 w-4" />}
              {secondaryLabel}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
