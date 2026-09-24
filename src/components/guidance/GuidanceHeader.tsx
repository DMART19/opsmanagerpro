/**
 * GuidanceHeader — Page-level contextual banner
 *
 * Shows the current requirement's label + explanation when guidance is active.
 * Strong = visible banner. Soft = subtle inline hint. Off = hidden.
 */

import { useGuidanceContext } from "@/contexts/GuidanceContext";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, CheckCircle2 } from "lucide-react";

interface GuidanceHeaderProps {
  /** Only show guidance for this group */
  group: "assets" | "calendar" | "team";
  className?: string;
}

export const GuidanceHeader = ({ group, className }: GuidanceHeaderProps) => {
  const { activeRequirement, level, isGroupComplete, systemComplete, completedCount, totalRequired } = useGuidanceContext();

  // Show success briefly when group completes
  const groupDone = isGroupComplete(group);

  // Only show for matching group
  const show = activeRequirement?.group === group && !groupDone;

  if (level === "off" && !groupDone) return null;

  return (
    <AnimatePresence mode="wait">
      {groupDone
















      }

      {show && level === "strong" &&
      <motion.div
        key="strong"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "flex items-start gap-3 px-4 py-3 rounded-xl bg-primary/5 border border-primary/10",
          className
        )}
        role="status"
        aria-live="polite">
        
          <div className="flex-shrink-0 p-1.5 rounded-lg bg-primary/10 mt-0.5">
            <Lightbulb className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {activeRequirement!.label}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              {activeRequirement!.explanation}
            </p>
          </div>
          <span className="text-[10px] font-medium text-muted-foreground/60 tabular-nums flex-shrink-0 mt-1">
            {completedCount}/{totalRequired}
          </span>
        </motion.div>
      }

      {show && level === "soft" &&
      <motion.div
        key="soft"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40",
          className
        )}>
        
          <Lightbulb className="h-3 w-3 text-muted-foreground/60 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            {activeRequirement!.explanation}
          </p>
        </motion.div>
      }
    </AnimatePresence>);

};