/**
 * InlineHint — Ultra-lightweight contextual micro-hint
 * 
 * One sentence. Fades in, dismissible with ×, fades out.
 * Uses useFirstTimeHint so it only appears once per key.
 * Supports an optional action button for instant user engagement.
 */

import { useFirstTimeHint } from "@/hooks/use-first-time-hint";
import { X, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InlineHintProps {
  /** Unique key for localStorage persistence */
  hintKey: string;
  /** Single sentence hint text */
  children: React.ReactNode;
  /** Auto-dismiss after N ms (optional) */
  autoFadeMs?: number;
  /** Optional icon */
  icon?: LucideIcon;
  /** Optional Help Center link */
  learnMoreHref?: string;
  /** Optional primary action */
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  className?: string;
}

export const InlineHint = ({ hintKey, children, autoFadeMs = 12000, icon: Icon, learnMoreHref, action, className }: InlineHintProps) => {
  const { visible, dismiss } = useFirstTimeHint(hintKey, autoFadeMs);

  if (!visible) return null;

  const ActionIcon = action?.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -3 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-muted-foreground",
          "text-xs leading-relaxed",
          className
        )}
      >
        {Icon && <Icon className="h-3.5 w-3.5 text-primary/60 flex-shrink-0" />}
        <span className="flex-1">{children}</span>
        {action && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); action.onClick(); dismiss(); }}
            className="h-6 px-2 text-[11px] font-medium text-primary hover:text-primary gap-1 flex-shrink-0"
          >
            {ActionIcon && <ActionIcon className="h-3 w-3" />}
            {action.label}
          </Button>
        )}
        {learnMoreHref && (
          <a
            href={learnMoreHref}
            className="flex-shrink-0 inline-flex items-center gap-0.5 text-[10px] font-medium text-primary/60 hover:text-primary transition-colors"
          >
            Learn more
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        )}
        <button
          onClick={dismiss}
          className="flex-shrink-0 p-0.5 rounded hover:bg-muted transition-colors"
          aria-label="Dismiss"
          type="button"
        >
          <X className="h-3 w-3" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};
