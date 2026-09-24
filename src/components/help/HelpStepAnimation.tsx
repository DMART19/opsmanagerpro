/**
 * HelpStepAnimation — Interactive step cards with walkthrough mode.
 * Quoted strings ('like this') render as inline UI button previews.
 * Includes progress bar, hover animations, and step-by-step navigation.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Play,
  RotateCcw,
  MousePointerClick,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface HelpStepAnimationProps {
  steps: string[];
  stepTitles?: string[];
  articleId: string;
}

/** Render quoted strings as interactive UI button previews */
const renderWithChips = (text: string) => {
  const parts = text.split(/('[^']+')/).filter(Boolean);
  return parts.map((part, i) => {
    if (part.startsWith("'") && part.endsWith("'")) {
      const label = part.slice(1, -1);
      return (
        <span
          key={i}
          className="inline-flex items-center gap-1 px-2.5 py-1 mx-0.5 rounded-lg bg-primary/10 text-primary text-[12px] font-semibold border border-primary/20 shadow-sm shadow-primary/5 transition-all hover:bg-primary/15 hover:shadow-md hover:shadow-primary/10"
        >
          <MousePointerClick className="h-3 w-3 opacity-70" />
          {label}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
};

export const HelpStepAnimation = ({ steps, stepTitles, articleId }: HelpStepAnimationProps) => {
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const isPlaying = activeStep !== null;

  const start = () => setActiveStep(0);
  const next = () => {
    if (activeStep !== null) {
      setCompletedSteps(prev => new Set(prev).add(activeStep));
      if (activeStep < steps.length - 1) setActiveStep(activeStep + 1);
    }
  };
  const prev = () => {
    if (activeStep !== null && activeStep > 0) setActiveStep(activeStep - 1);
  };
  const reset = () => {
    setActiveStep(null);
    setCompletedSteps(new Set());
  };

  // Default step card grid view
  if (!isPlaying) {
    return (
      <div className="space-y-4">
        {/* Header with step count and progress */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground">
              {steps.length} steps
            </span>
            {completedSteps.size > 0 && (
              <span className="text-[10px] text-primary font-medium bg-primary/10 px-2 py-0.5 rounded-full">
                {completedSteps.size} / {steps.length} completed
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5 border-primary/20 text-primary hover:bg-primary/5 hover:border-primary/40 transition-all"
            onClick={start}
          >
            <Play className="h-3 w-3" />
            Walk Through
          </Button>
        </div>

        {/* Progress bar */}
        {completedSteps.size > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
          >
            <Progress
              value={(completedSteps.size / steps.length) * 100}
              className="h-1.5"
            />
          </motion.div>
        )}

        {/* Step cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {steps.map((step, i) => {
            const isCompleted = completedSteps.has(i);
            return (
              <motion.button
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, ease: "easeOut" }}
                onClick={() => setActiveStep(i)}
                className={cn(
                  "group relative flex items-start gap-3.5 p-4 rounded-xl border text-left",
                  "transition-all duration-200 ease-out",
                  "hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30",
                  "active:scale-[0.98] active:translate-y-0",
                  isCompleted
                    ? "bg-primary/[0.03] border-primary/20"
                    : "bg-card border-border/50"
                )}
              >
                {/* Step number with pulse on hover */}
                <span
                  className={cn(
                    "relative flex items-center justify-center h-8 w-8 rounded-xl text-xs font-bold shrink-0",
                    "transition-all duration-200",
                    isCompleted
                      ? "bg-primary text-primary-foreground"
                      : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-lg group-hover:shadow-primary/20"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <>
                      {i + 1}
                      <span className="absolute inset-0 rounded-xl bg-primary/20 opacity-0 group-hover:opacity-100 group-hover:animate-ping pointer-events-none" />
                    </>
                  )}
                </span>

                <div className="flex-1 min-w-0 pt-0.5">
                  {stepTitles?.[i] && (
                    <p className="text-[13px] font-semibold text-foreground leading-tight mb-1">
                      {renderWithChips(stepTitles[i])}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {renderWithChips(step)}
                  </p>
                </div>

                {/* Hover arrow */}
                <ChevronRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground/50 transition-all shrink-0 mt-1" />
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── Walkthrough Mode ───────────────────────────────────────────────
  const progressPercent = ((activeStep + 1) / steps.length) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.03] to-transparent p-6 space-y-5 shadow-sm"
    >
      {/* Top: Progress bar + step counter */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-primary">
            Step {activeStep + 1} of {steps.length}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[11px] text-muted-foreground hover:text-foreground gap-1"
            onClick={reset}
          >
            <RotateCcw className="h-3 w-3" />
            View All
          </Button>
        </div>
        <div className="flex gap-1.5">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveStep(i)}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-all duration-300 cursor-pointer",
                i < activeStep
                  ? "bg-primary"
                  : i === activeStep
                  ? "bg-primary shadow-sm shadow-primary/30"
                  : "bg-border/50 hover:bg-border"
              )}
            />
          ))}
        </div>
      </div>

      {/* Active step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeStep}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.2 }}
          className="min-h-[90px]"
        >
          <div className="flex items-start gap-4">
            <motion.span
              initial={{ scale: 0.5, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="flex items-center justify-center h-12 w-12 rounded-2xl bg-primary text-primary-foreground text-lg font-bold shrink-0 shadow-lg shadow-primary/20"
            >
              {activeStep + 1}
            </motion.span>
            <div className="pt-1">
              {stepTitles?.[activeStep] && (
                <motion.p
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="text-base font-semibold text-foreground mb-1.5"
                >
                  {renderWithChips(stepTitles[activeStep])}
                </motion.p>
              )}
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-sm text-muted-foreground leading-relaxed"
              >
                {renderWithChips(steps[activeStep])}
              </motion.p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation controls */}
      <div className="flex items-center justify-between pt-2 border-t border-border/20">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {completedSteps.size > 0 && (
            <span className="text-primary font-medium">
              {completedSteps.size} completed
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 rounded-lg"
            onClick={prev}
            disabled={activeStep === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs rounded-lg gap-1 min-w-[80px]"
            onClick={activeStep === steps.length - 1 ? () => { next(); reset(); } : next}
          >
            {activeStep === steps.length - 1 ? (
              <>
                <CheckCircle2 className="h-3 w-3" /> Done
              </>
            ) : (
              <>
                Next <ChevronRight className="h-3 w-3" />
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
};
