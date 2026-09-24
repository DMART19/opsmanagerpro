import { Check, Circle, Package, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  number: number;
  label: string;
  description: string;
  icon: React.ElementType;
  completed: boolean;
  active: boolean;
}

interface PalletStepIndicatorProps {
  hasTypes: boolean;
  hasPallets: boolean;
}

export const PalletStepIndicator = ({ hasTypes, hasPallets }: PalletStepIndicatorProps) => {
  const steps: Step[] = [
    {
      number: 1,
      label: "Define Pallet Types",
      description: "Create reusable specifications",
      icon: Package,
      completed: hasTypes,
      active: !hasTypes,
    },
    {
      number: 2,
      label: "Build & Manage Pallets",
      description: "Create and track inventory",
      icon: Layers,
      completed: hasPallets,
      active: hasTypes && !hasPallets,
    },
  ];

  return (
    <div className="flex items-center justify-center gap-4 py-4">
      {steps.map((step, index) => (
        <div key={step.number} className="flex items-center">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300",
                step.completed
                  ? "bg-primary border-primary text-primary-foreground"
                  : step.active
                  ? "border-primary text-primary bg-primary/10"
                  : "border-muted-foreground/30 text-muted-foreground"
              )}
            >
              {step.completed ? (
                <Check className="h-5 w-5" />
              ) : (
                <step.icon className="h-5 w-5" />
              )}
            </div>
            <div className="hidden sm:block">
              <p
                className={cn(
                  "text-sm font-medium",
                  step.active || step.completed
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                Step {step.number}: {step.label}
              </p>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
          </div>
          
          {index < steps.length - 1 && (
            <div
              className={cn(
                "w-12 lg:w-24 h-0.5 mx-4",
                step.completed ? "bg-primary" : "bg-muted"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
};
