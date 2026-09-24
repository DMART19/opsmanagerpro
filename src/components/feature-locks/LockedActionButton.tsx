/**
 * LockedActionButton - Wraps a button/control to show a lock state when feature is gated.
 * Shows a lock icon, tooltip, and opens upgrade modal on click.
 */

import { ReactNode, useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FeatureLockModal } from "./FeatureLockModal";
import { cn } from "@/lib/utils";

interface LockedActionButtonProps {
  locked: boolean;
  planName: string;
  featureName: string;
  featureDescription?: string;
  /** The normal button content when unlocked */
  children: ReactNode;
  /** If locked, render this instead of children. Falls back to a disabled version of children. */
  className?: string;
  variant?: "default" | "outline" | "ghost" | "secondary" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  /** onClick when NOT locked */
  onClick?: () => void;
  icon?: ReactNode;
}

export const LockedActionButton = ({
  locked,
  planName,
  featureName,
  featureDescription,
  children,
  className,
  variant = "default",
  size = "default",
  onClick,
  icon,
}: LockedActionButtonProps) => {
  const [modalOpen, setModalOpen] = useState(false);

  if (!locked) {
    return (
      <Button variant={variant} size={size} className={className} onClick={onClick}>
        {icon && <span className="mr-2">{icon}</span>}
        {children}
      </Button>
    );
  }

  return (
    <>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            className={cn("opacity-60 gap-2", className)}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setModalOpen(true);
            }}
          >
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Available on {planName} plan
        </TooltipContent>
      </Tooltip>

      <FeatureLockModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        featureName={featureName}
        description={featureDescription || `${featureName} is available on the ${planName} plan.`}
        requiredPlan={planName}
      />
    </>
  );
};
