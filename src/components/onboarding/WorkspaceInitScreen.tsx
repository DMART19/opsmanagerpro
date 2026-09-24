import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  "Creating your workspace",
  "Preparing your dashboard",
  "Configuring your operations environment",
];

const STEP_DELAY = 500; // ms between each step appearing
const DONE_DELAY = 600; // ms after last step before calling onComplete

interface WorkspaceInitScreenProps {
  onComplete: () => void;
}

export function WorkspaceInitScreen({ onComplete }: WorkspaceInitScreenProps) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (visibleCount < STEPS.length) {
      const timer = setTimeout(() => setVisibleCount((c) => c + 1), STEP_DELAY);
      return () => clearTimeout(timer);
    }

    // All steps shown → fire completion
    const done = setTimeout(onComplete, DONE_DELAY);
    return () => clearTimeout(done);
  }, [visibleCount, onComplete]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="w-full max-w-sm animate-fade-in text-center space-y-8">
        {/* Heading */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Setting up your workspace…
          </h2>
          <p className="text-sm text-muted-foreground">This will only take a moment</p>
        </div>

        {/* Animated checklist */}
        <div className="space-y-3 text-left mx-auto max-w-xs">
          {STEPS.map((label, i) => {
            const isVisible = i < visibleCount;
            return (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-3 text-sm transition-all duration-300",
                  isVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-2 pointer-events-none"
                )}
              >
                <CheckCircle2
                  className={cn(
                    "h-4.5 w-4.5 shrink-0 transition-colors duration-300",
                    isVisible ? "text-primary" : "text-muted"
                  )}
                  strokeWidth={2}
                />
                <span className="text-foreground">{label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
