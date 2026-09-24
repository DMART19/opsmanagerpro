/**
 * GuidanceHighlight — Wraps a target element to apply visual emphasis
 *
 * Only highlights when this element's resolveKey matches the engine's active target.
 * STRICT: Only ONE element is ever highlighted.
 */

import { useGuidanceContext } from "@/contexts/GuidanceContext";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface GuidanceHighlightProps {
  /** Must match a requirement's `resolve` key */
  resolveKey: string;
  children: ReactNode;
  className?: string;
}

export const GuidanceHighlight = ({ resolveKey, children, className }: GuidanceHighlightProps) => {
  const { targetResolveKey, level } = useGuidanceContext();

  const isTarget = targetResolveKey === resolveKey && level === "strong";

  if (!isTarget) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ boxShadow: "0 0 0 0px hsl(var(--primary) / 0)" }}
      animate={{
        boxShadow: [
          "0 0 0 2px hsl(var(--primary) / 0.3)",
          "0 0 0 4px hsl(var(--primary) / 0.15)",
          "0 0 0 2px hsl(var(--primary) / 0.3)",
        ],
      }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      className={cn("relative rounded-lg", className)}
      role="status"
      aria-label="Recommended next action"
    >
      {children}
    </motion.div>
  );
};
