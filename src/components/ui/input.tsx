import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.ComponentProps<"input"> {
  /** Show error state */
  error?: boolean;
  /** Success state (e.g., validation passed) */
  success?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, value, error, success, ...props }, ref) => {
    // Only coerce value when explicitly provided (controlled mode)
    // Leave it undefined for uncontrolled mode (e.g., react-hook-form register)
    const valueProps = value !== undefined 
      ? { value: value === null ? "" : value }
      : {};
    
    return (
      <input
        type={type}
        className={cn(
          // Base styles
          "flex h-10 w-full rounded-lg border bg-background px-3 py-2 text-sm",
          // Transition for smooth state changes
          "transition-all duration-200 ease-out",
          // Placeholder
          "placeholder:text-muted-foreground/50",
          // Default border
          "border-input",
          // Hover state
          "hover:border-muted-foreground/40",
          // Focus state - refined ring animation
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:border-primary/60",
          "focus-visible:shadow-[0_0_0_3px_hsl(var(--ring)/0.1)]",
          // Disabled state
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/50 disabled:hover:border-input",
          // File inputs
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          // Error state
          error && "border-destructive/60 focus-visible:border-destructive focus-visible:ring-destructive/30",
          // Success state
          success && "border-success/60 focus-visible:border-success focus-visible:ring-success/30",
          // Touch-friendly on mobile
          "touch-target",
          className,
        )}
        ref={ref}
        aria-invalid={error ? "true" : undefined}
        {...valueProps}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };