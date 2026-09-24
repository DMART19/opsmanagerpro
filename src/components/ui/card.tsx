import * as React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Make card interactive with hover/press states */
  interactive?: boolean;
  /** Add subtle entrance animation */
  animate?: boolean;
  /** Stagger index for staggered animations (1-8) */
  staggerIndex?: number;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive, animate, staggerIndex, ...props }, ref) => (
    <div 
      ref={ref} 
      className={cn(
        "rounded-xl bg-card text-card-foreground border border-border/[0.03]",
        "transition-all duration-250 ease-apple",
        interactive && [
          "cursor-pointer",
          "hover:shadow-card-hover hover:-translate-y-0.5",
          "active:scale-[0.995] active:translate-y-0",
        ].join(" "),
        animate && "animate-fade-in",
        staggerIndex && `animate-stagger-${Math.min(staggerIndex, 8)}`,
        className
      )} 
      style={{
        boxShadow: "var(--shadow-card)",
      }}
      {...props} 
    />
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1 p-5 pb-4", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-base font-medium leading-tight", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground leading-relaxed", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-5 pt-0", className)} {...props} />,
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-5 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };