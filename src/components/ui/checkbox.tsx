import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      // Base
      "peer h-3 w-3 shrink-0 rounded-[3px] border",
      // Transition - smoother
      "transition-all duration-200 ease-out",
      // Default state
      "border-input bg-background",
      // Hover
      "hover:border-muted-foreground/50 hover:bg-muted/30",
      // Focus
      "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2",
      // Checked state with animation trigger
      "data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-primary-foreground",
      "data-[state=checked]:shadow-sm",
      // Disabled
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator 
      className={cn(
        "flex items-center justify-center text-current",
        // Animate the check appearing
        "data-[state=checked]:animate-scale-in"
      )}
    >
      <Check className="h-2 w-2" strokeWidth={3.5} />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };