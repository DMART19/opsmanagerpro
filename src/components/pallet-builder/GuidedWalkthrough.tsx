import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ChevronRight, MousePointer2, Package, BarChart3, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WalkthroughStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector to highlight
  icon: React.ElementType;
}

const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: "select-pallet",
    title: "Step 1: Select a Pallet Size",
    description: "Choose from standard pallet sizes or create a custom size with your own dimensions.",
    icon: MousePointer2,
  },
  {
    id: "drag-cases",
    title: "Step 2: Drag Items from the Library",
    description: "Browse the item library on the left. Click or drag items onto the canvas to place them.",
    icon: Package,
  },
  {
    id: "observe-indicators",
    title: "Step 3: Check Weight & Stability",
    description: "Watch the real-time weight distribution and safety indicators in the specs panel. The system warns you about overweight or unstable configurations.",
    icon: BarChart3,
  },
  {
    id: "complete",
    title: "You're Ready!",
    description: "Use Smart Arrange to auto-optimize, then Save or Export your layout configuration.",
    icon: CheckCircle,
  },
];

const STORAGE_KEY = "layout_builder_walkthrough_complete";

interface GuidedWalkthroughProps {
  onComplete: () => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const GuidedWalkthrough = ({ onComplete, isOpen, onOpenChange }: GuidedWalkthroughProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  const handleNext = () => {
    if (currentStep < WALKTHROUGH_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      localStorage.setItem(STORAGE_KEY, "true");
      onComplete();
      onOpenChange(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    onOpenChange(false);
  };

  const step = WALKTHROUGH_STEPS[currentStep];
  const Icon = step.icon;
  const isLastStep = currentStep === WALKTHROUGH_STEPS.length - 1;

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="relative bg-card border border-border rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 animate-in fade-in-0 zoom-in-95">
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-1 rounded hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* Step indicator */}
        <div className="flex items-center gap-1.5 mb-4">
          {WALKTHROUGH_STEPS.map((_, index) => (
            <div
              key={index}
              className={cn(
                "h-1.5 rounded-full transition-all",
                index === currentStep
                  ? "w-8 bg-primary"
                  : index < currentStep
                  ? "w-3 bg-primary/50"
                  : "w-3 bg-muted"
              )}
            />
          ))}
        </div>

        {/* Icon */}
        <div className="p-3 bg-primary/10 rounded-xl w-fit mb-4">
          <Icon className="h-8 w-8 text-primary" />
        </div>

        {/* Content */}
        <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
          {step.description}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted-foreground">
            Skip Tutorial
          </Button>
          <Button onClick={handleNext} className="gap-2">
            {isLastStep ? "Start Building" : "Next"}
            {!isLastStep && <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export const useGuidedWalkthrough = () => {
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  
  const hasCompletedWalkthrough = () => {
    return localStorage.getItem(STORAGE_KEY) === "true";
  };

  const startWalkthrough = () => {
    setShowWalkthrough(true);
  };

  return {
    showWalkthrough,
    setShowWalkthrough,
    hasCompletedWalkthrough,
    startWalkthrough,
  };
};
