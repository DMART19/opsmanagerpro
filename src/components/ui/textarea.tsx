import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Show error state */
  error?: boolean;
  /** Success state */
  success?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, value, error, success, ...props }, ref) => {
    // Only coerce value when explicitly provided (controlled mode)
    const valueProps = value !== undefined 
      ? { value: value === null ? "" : value }
      : {};
    
    return (
      <textarea
        className={cn(
          // Base styles
          "flex min-h-[100px] w-full rounded-lg border bg-background px-3 py-2.5 text-sm",
          // Transition for smooth state changes
          "transition-all duration-200 ease-out",
          // Placeholder
          "placeholder:text-muted-foreground/50",
          // Default border
          "border-input",
          // Hover state
          "hover:border-muted-foreground/40",
          // Focus state - refined
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:border-primary/60",
          "focus-visible:shadow-[0_0_0_3px_hsl(var(--ring)/0.1)]",
          // Disabled
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/50 disabled:hover:border-input",
          // Resize
          "resize-none",
          // Error state
          error && "border-destructive/60 focus-visible:border-destructive focus-visible:ring-destructive/30",
          // Success state
          success && "border-success/60 focus-visible:border-success focus-visible:ring-success/30",
          className,
        )}
        ref={ref}
        aria-invalid={error ? "true" : undefined}
        {...valueProps}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };