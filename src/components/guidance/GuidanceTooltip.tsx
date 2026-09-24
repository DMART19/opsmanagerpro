/**
 * GuidanceTooltip — Small contextual hint that appears once
 * 
 * Non-blocking, dismissible, persisted via useGuidance.
 * Supports optional pulse animations, help center links, idle-detection, and action buttons.
 */

import { useGuidance } from "@/hooks/use-guidance";
import { X, Lightbulb, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GuidanceTooltipProps {
  /** Unique identifier for persistence */
  guidanceId: string;
  /** Main message */
  message: string;
  /** Optional icon override */
  icon?: LucideIcon;
  /** Extra condition: only show when true */
  showWhen?: boolean;
  /** Optional Help Center article link */
  learnMoreHref?: string;
  /** Show a subtle pulse on the icon */
  pulse?: boolean;
  /** Variant: default or minimal */
  variant?: "default" | "minimal" | "glow";
  /** Optional primary action */
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  className?: string;
}

export const GuidanceTooltip = ({
  guidanceId,
  message,
  icon: Icon = Lightbulb,
  showWhen = true,
  learnMoreHref,
  pulse = false,
  variant = "default",
  action,
  className,
}: GuidanceTooltipProps) => {
  const { visible, markComplete } = useGuidance(guidanceId);

  if (!visible || !showWhen) return null;

  const ActionIcon = action?.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className={cn(
          "flex items-start gap-2.5 px-3 py-2.5 rounded-lg",
          variant === "default" && "bg-primary/5 border border-primary/10",
          variant === "minimal" && "bg-muted/40",
          variant === "glow" && "bg-primary/5 border border-primary/15 shadow-[0_0_12px_-4px_hsl(var(--primary)/0.2)]",
          className
        )}
      >
        <div className={cn(
          "flex-shrink-0 p-1 rounded-md mt-0.5",
          variant === "glow" ? "bg-primary/15" : "bg-primary/10",
          pulse && "animate-pulse"
        )}>
          <Icon className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {message}
          </p>
          <div className="flex items-center gap-3 mt-1">
            {action && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); action.onClick(); markComplete(); }}
                className="h-6 px-2 text-[11px] font-medium text-primary hover:text-primary gap-1 p-0"
              >
                {ActionIcon && <ActionIcon className="h-3 w-3" />}
                {action.label}
              </Button>
            )}
            {learnMoreHref && (
              <a
                href={learnMoreHref}
                className="inline-flex items-center gap-1 text-[10px] font-medium text-primary/70 hover:text-primary transition-colors"
              >
                Learn more
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}
          </div>
        </div>
        <button
          onClick={markComplete}
          className="flex-shrink-0 p-0.5 rounded hover:bg-muted transition-colors mt-0.5"
          aria-label="Dismiss"
          type="button"
        >
          <X className="h-3 w-3 text-muted-foreground/60" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};
