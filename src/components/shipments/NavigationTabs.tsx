import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavigationTabsProps {
  currentStep: number;
  onStepChange: (step: number) => void;
}

const steps = [
  { id: 1, label: "Overview", description: "Basic information" },
  { id: 2, label: "Contents", description: "Add items & build" },
  { id: 3, label: "Packaging", description: "Review structure" },
  { id: 4, label: "Signatures", description: "Verify & sign" },
];

export const NavigationTabs = ({ currentStep, onStepChange }: NavigationTabsProps) => {
  return (
    <div className="mb-6">
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 rounded-full">
          <div 
            className="h-full bg-gradient-to-r from-[#2F5FFF] to-[#0D1321] rounded-full transition-all duration-500"
            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          />
        </div>

        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            const isUpcoming = currentStep < step.id;

            return (
              <button
                key={step.id}
                onClick={() => onStepChange(step.id)}
                className={cn(
                  "flex flex-col items-center group cursor-pointer transition-all",
                  isCurrent && "scale-110"
                )}
              >
                {/* Circle */}
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all duration-300",
                    isCompleted && "bg-[#2F5FFF] border-[#2F5FFF] shadow-lg shadow-[#2F5FFF]/50",
                    isCurrent && "bg-[#2F5FFF] border-[#2F5FFF] ring-4 ring-[#2F5FFF]/30 shadow-xl shadow-[#2F5FFF]/50",
                    isUpcoming && "bg-white border-gray-300 group-hover:border-[#2F5FFF]/50"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5 text-white" />
                  ) : (
                    <span
                      className={cn(
                        "font-bold transition-colors",
                        isCurrent && "text-white text-lg",
                        isUpcoming && "text-gray-400 group-hover:text-[#2F5FFF]"
                      )}
                    >
                      {step.id}
                    </span>
                  )}
                </div>

                {/* Label */}
                <div className="mt-3 text-center">
                  <p
                    className={cn(
                      "font-semibold text-sm transition-colors",
                      isCompleted && "text-[#2F5FFF]",
                      isCurrent && "text-[#0D1321] text-base",
                      isUpcoming && "text-gray-400 group-hover:text-[#2F5FFF]"
                    )}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
