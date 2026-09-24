/**
 * PulseButton — Wraps a target element with a subtle pulse ring
 * 
 * Shows once per key on first encounter. Gentle animation draws attention
 * to an important action without blocking anything.
 */

import { useFirstTimeHint } from "@/hooks/use-first-time-hint";
import { cn } from "@/lib/utils";

interface PulseButtonProps {
  hintKey: string;
  children: React.ReactNode;
  /** Auto-dismiss after ms */
  autoFadeMs?: number;
  className?: string;
}

export const PulseButton = ({ hintKey, children, autoFadeMs = 8000, className }: PulseButtonProps) => {
  const { visible, dismiss } = useFirstTimeHint(hintKey, autoFadeMs);

  return (
    <div className={cn("relative inline-flex", className)} onClick={dismiss}>
      {children}
      {visible && (
        <span
          className="absolute inset-0 rounded-[inherit] ring-2 ring-primary/30 animate-pulse pointer-events-none"
          aria-hidden="true"
        />
      )}
    </div>
  );
};
