import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium",
    "transition-all duration-200 ease-apple",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    "select-none touch-target",
    // Subtle press animation for all buttons
    "active:scale-[0.97] active:duration-100",
  ].join(" "),
  {
    variants: {
      variant: {
        // Primary: filled, prominent - use sparingly (one per screen ideally)
        default: [
          "bg-primary text-primary-foreground",
          "shadow-sm hover:shadow-[0_2px_12px_-3px_hsl(var(--primary)/0.4)]",
          "hover:bg-primary/92 hover:brightness-105",
          "active:bg-primary/88 active:shadow-sm",
        ].join(" "),
        // Destructive: filled, for dangerous actions
        destructive: [
          "bg-destructive text-destructive-foreground",
          "shadow-sm hover:shadow-[0_2px_12px_-3px_hsl(var(--destructive)/0.4)]",
          "hover:bg-destructive/92 hover:brightness-105",
          "active:bg-destructive/88 active:shadow-sm",
        ].join(" "),
        // Secondary: outlined - for secondary actions
        outline: [
          "border border-input bg-background text-foreground",
          "hover:bg-muted/50 hover:border-muted-foreground/25",
          "active:bg-muted/70",
        ].join(" "),
        // Tertiary: subtle background - for less important actions
        secondary: [
          "bg-secondary text-secondary-foreground",
          "hover:bg-secondary/75",
          "active:bg-secondary/60",
        ].join(" "),
        // Ghost: text only with hover - for inline/minimal actions
        ghost: [
          "text-foreground",
          "hover:bg-muted/50",
          "active:bg-muted/70",
        ].join(" "),
        // Link: underlined text - for navigation-style actions
        link: "text-primary underline-offset-4 hover:underline p-0 h-auto active:scale-100",
        // Success variant for confirmations
        success: [
          "bg-success text-success-foreground",
          "shadow-sm hover:shadow-[0_2px_12px_-3px_hsl(var(--success)/0.4)]",
          "hover:bg-success/92 hover:brightness-105",
          "active:bg-success/88 active:shadow-sm",
        ].join(" "),
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3 text-xs",
        lg: "h-11 px-6 text-base",
        icon: "h-10 w-10",
        // Mobile-optimized touch target
        touch: "h-12 px-5 py-3 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };