import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkflowStep {
  number: number;
  label: string;
  completed: boolean;
  active: boolean;
}

interface PalletWorkflowHeaderProps {
  palletSelected: boolean;
  itemsPlaced: boolean;
  saved: boolean;
}

export const PalletWorkflowHeader = ({
  palletSelected,
  itemsPlaced,
  saved,
}: PalletWorkflowHeaderProps) => {
  const steps: WorkflowStep[] = [
    { number: 1, label: "Select Pallet", completed: palletSelected, active: !palletSelected },
    { number: 2, label: "Add Items", completed: itemsPlaced, active: palletSelected && !itemsPlaced },
    { number: 3, label: "Review & Save", completed: saved, active: palletSelected && itemsPlaced && !saved },
  ];

  return (
    <div className="flex items-center justify-center gap-0 py-2">
      {steps.map((step, i) => (
        <div key={step.number} className="flex items-center">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
                step.completed
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                  : step.active
                  ? "bg-primary/15 text-primary ring-2 ring-primary/30"
                  : "bg-muted text-muted-foreground/40"
              )}
            >
              {step.completed ? <Check className="h-3.5 w-3.5" /> : step.number}
            </div>
            <span
              className={cn(
                "text-sm font-medium transition-colors whitespace-nowrap",
                step.completed
                  ? "text-primary"
                  : step.active
                  ? "text-foreground"
                  : "text-muted-foreground/40"
              )}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                "w-12 h-0.5 mx-3 rounded-full transition-colors duration-300",
                steps[i + 1].completed || steps[i + 1].active
                  ? "bg-primary/30"
                  : "bg-border/40"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
};
