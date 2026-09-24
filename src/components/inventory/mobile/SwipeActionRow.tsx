import { useState, useRef, useCallback, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SwipeAction {
  key: string;
  icon: ReactNode;
  label: string;
  bgClass: string;       // Tailwind bg class e.g. "bg-primary"
  textClass?: string;     // Tailwind text class e.g. "text-primary-foreground"
  onAction: () => void;
}

interface SwipeActionRowProps {
  leftActions?: SwipeAction[];   // revealed on swipe-right
  rightActions?: SwipeAction[];  // revealed on swipe-left
  children: ReactNode;
  className?: string;
  onTap?: () => void;
}

const ACTION_WIDTH = 72;  // width per action button
const SNAP_THRESHOLD = 0.4; // % of total revealed width to snap open

export const SwipeActionRow = ({
  leftActions = [],
  rightActions = [],
  children,
  className,
  onTap,
}: SwipeActionRowProps) => {
  const [offset, setOffset] = useState(0);
  const [snapped, setSnapped] = useState<'left' | 'right' | null>(null);
  const isSwiping = useRef(false);
  const isHorizontal = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const startOffset = useRef(0);
  const didSwipe = useRef(false);

  const maxLeft = leftActions.length * ACTION_WIDTH;
  const maxRight = rightActions.length * ACTION_WIDTH;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    isSwiping.current = true;
    isHorizontal.current = false;
    didSwipe.current = false;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    startOffset.current = offset;
  }, [offset]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwiping.current) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    if (!isHorizontal.current && Math.abs(dx) > 8) {
      isHorizontal.current = Math.abs(dx) > Math.abs(dy);
    }
    if (!isHorizontal.current) return;

    didSwipe.current = true;
    const raw = startOffset.current + dx;
    // Clamp: positive = reveal left actions, negative = reveal right actions
    const clamped = Math.max(-maxRight, Math.min(maxLeft, raw));
    // Add rubber-band resistance past bounds
    setOffset(clamped);
  }, [maxLeft, maxRight]);

  const handleTouchEnd = useCallback(() => {
    isSwiping.current = false;
    isHorizontal.current = false;

    if (offset > 0 && maxLeft > 0) {
      // Swiped right → reveal left actions
      if (offset > maxLeft * SNAP_THRESHOLD) {
        setOffset(maxLeft);
        setSnapped('left');
      } else {
        setOffset(0);
        setSnapped(null);
      }
    } else if (offset < 0 && maxRight > 0) {
      // Swiped left → reveal right actions
      if (Math.abs(offset) > maxRight * SNAP_THRESHOLD) {
        setOffset(-maxRight);
        setSnapped('right');
      } else {
        setOffset(0);
        setSnapped(null);
      }
    } else {
      setOffset(0);
      setSnapped(null);
    }
  }, [offset, maxLeft, maxRight]);

  const handleClick = useCallback(() => {
    if (didSwipe.current) return;
    if (snapped) {
      // Close on tap when open
      setOffset(0);
      setSnapped(null);
      return;
    }
    onTap?.();
  }, [snapped, onTap]);

  const handleActionClick = useCallback((action: SwipeAction) => {
    action.onAction();
    setOffset(0);
    setSnapped(null);
  }, []);

  // Calculate individual action widths based on reveal progress
  const leftReveal = Math.max(0, offset);
  const rightReveal = Math.max(0, -offset);

  return (
    <div className={cn("relative overflow-hidden rounded-xl", className)}>
      {/* Left actions (revealed on swipe right) */}
      {leftActions.length > 0 && (
        <div
          className="absolute inset-y-0 left-0 flex rounded-l-xl overflow-hidden"
          style={{ width: leftReveal }}
        >
          {leftActions.map((action, i) => {
            const w = leftReveal / leftActions.length;
            return (
              <button
                key={action.key}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 transition-opacity duration-100",
                  action.bgClass,
                  action.textClass || "text-white",
                  leftReveal > 30 ? "opacity-100" : "opacity-0"
                )}
                style={{ width: w }}
                onClick={() => handleActionClick(action)}
              >
                {action.icon}
                <span className="text-[10px] font-medium leading-none">{action.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Right actions (revealed on swipe left) */}
      {rightActions.length > 0 && (
        <div
          className="absolute inset-y-0 right-0 flex rounded-r-xl overflow-hidden"
          style={{ width: rightReveal }}
        >
          {rightActions.map((action, i) => {
            const w = rightReveal / rightActions.length;
            return (
              <button
                key={action.key}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 transition-opacity duration-100",
                  action.bgClass,
                  action.textClass || "text-white",
                  rightReveal > 30 ? "opacity-100" : "opacity-0"
                )}
                style={{ width: w }}
                onClick={() => handleActionClick(action)}
              >
                {action.icon}
                <span className="text-[10px] font-medium leading-none">{action.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main card content */}
      <div
        className="relative z-10 bg-card rounded-xl"
        style={{
          transform: `translateX(${offset}px)`,
          transition: isSwiping.current ? 'none' : 'transform 280ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
      >
        {children}
      </div>
    </div>
  );
};
