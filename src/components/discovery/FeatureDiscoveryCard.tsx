/**
 * FeatureDiscoveryCard — Contextual feature discovery hint.
 *
 * Small, subtle, dismissible card that appears inline.
 * Uses useFirstTimeHint so it shows only once per key.
 * Supports an optional visit-count gate (only show after N visits).
 */

import { useFirstTimeHint } from "@/hooks/use-first-time-hint";
import { X, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { useEffect, useRef } from "react";

const VISIT_PREFIX = "omp_visit_count_";

interface FeatureDiscoveryCardProps {
  /** Unique persistence key */
  discoveryKey: string;
  /** Brief tip — one sentence */
  tip: string;
  /** Optional icon (defaults to Lightbulb) */
  icon?: LucideIcon;
  /** Only show after the user has visited this page N times (default 1) */
  showAfterVisits?: number;
  /** Auto-dismiss after N ms (default 20s) */
  autoFadeMs?: number;
  className?: string;
}

export const FeatureDiscoveryCard = ({
  discoveryKey,
  tip,
  icon: Icon = Lightbulb,
  showAfterVisits = 1,
  autoFadeMs = 20000,
  className,
}: FeatureDiscoveryCardProps) => {
  const { visible, dismiss } = useFirstTimeHint(`discovery_${discoveryKey}`, autoFadeMs);
  const hasIncrementedRef = useRef(false);

  // Track page visits for this key
  const visitKey = `${VISIT_PREFIX}${discoveryKey}`;
  const visitCount = (() => {
    try {
      return parseInt(localStorage.getItem(visitKey) || "0", 10);
    } catch {
      return 0;
    }
  })();

  useEffect(() => {
    if (hasIncrementedRef.current) return;
    hasIncrementedRef.current = true;
    try {
      localStorage.setItem(visitKey, String(visitCount + 1));
    } catch {
      // silent
    }
  }, [visitKey, visitCount]);

  // Don't show if dismissed or not enough visits yet
  if (!visible || visitCount < showAfterVisits) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className={cn(
          "flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg",
          "bg-primary/[0.04] border border-primary/10",
          "text-xs leading-relaxed",
          className
        )}
      >
        <Icon className="h-3.5 w-3.5 text-primary/50 flex-shrink-0 mt-0.5" />
        <span className="flex-1 text-muted-foreground">
          <span className="font-medium text-foreground/80">Tip: </span>
          {tip}
        </span>
        <button
          onClick={dismiss}
          className="flex-shrink-0 p-0.5 rounded hover:bg-muted transition-colors mt-0.5"
          aria-label="Dismiss tip"
          type="button"
        >
          <X className="h-3 w-3 text-muted-foreground" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};
