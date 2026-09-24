/**
 * AnimatedList - List items with staggered entrance animations
 * 
 * Wraps list items to provide smooth entrance/exit animations.
 * Uses CSS animations for performance.
 */

import { ReactNode, Children, cloneElement, isValidElement } from "react";
import { cn } from "@/lib/utils";

interface AnimatedListProps {
  children: ReactNode;
  className?: string;
  /** Base delay between items in ms */
  staggerDelay?: number;
  /** Animation type */
  animation?: "fade" | "slide-up" | "slide-left" | "scale";
}

export const AnimatedList = ({
  children,
  className,
  staggerDelay = 40,
  animation = "fade",
}: AnimatedListProps) => {
  const animationClass = {
    fade: "animate-fade-in",
    "slide-up": "animate-slide-up",
    "slide-left": "animate-list-item",
    scale: "animate-scale-in",
  }[animation];

  return (
    <div className={cn("space-y-2", className)}>
      {Children.map(children, (child, index) => {
        if (!isValidElement(child)) return child;
        
        return cloneElement(child as React.ReactElement<any>, {
          className: cn(
            (child.props as any).className,
            animationClass,
            "opacity-0" // Start hidden, animation fills to 1
          ),
          style: {
            ...(child.props as any).style,
            animationDelay: `${index * staggerDelay}ms`,
            animationFillMode: "forwards",
          },
        });
      })}
    </div>
  );
};

/**
 * AnimatedListItem - Individual list item wrapper
 * 
 * Use when you need more control over individual items.
 */
interface AnimatedListItemProps {
  children: ReactNode;
  className?: string;
  index?: number;
  staggerDelay?: number;
}

export const AnimatedListItem = ({
  children,
  className,
  index = 0,
  staggerDelay = 40,
}: AnimatedListItemProps) => {
  return (
    <div
      className={cn("animate-fade-in opacity-0", className)}
      style={{
        animationDelay: `${index * staggerDelay}ms`,
        animationFillMode: "forwards",
      }}
    >
      {children}
    </div>
  );
};
