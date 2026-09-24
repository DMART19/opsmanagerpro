import { useState, useEffect, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsiblePanelProps {
  children: ReactNode;
  side: "left" | "right";
  storageKey: string;
  defaultOpen?: boolean;
  className?: string;
}

export const CollapsiblePanel = ({
  children,
  side,
  storageKey,
  defaultOpen = true,
  className,
}: CollapsiblePanelProps) => {
  const [isOpen, setIsOpen] = useState(() => {
    const stored = sessionStorage.getItem(storageKey);
    return stored !== null ? stored === "true" : defaultOpen;
  });

  useEffect(() => {
    sessionStorage.setItem(storageKey, String(isOpen));
  }, [isOpen, storageKey]);

  const toggleOpen = () => setIsOpen(!isOpen);

  const Icon = side === "left" 
    ? (isOpen ? ChevronLeft : ChevronRight)
    : (isOpen ? ChevronRight : ChevronLeft);

  return (
    <div 
      className={cn(
        "relative transition-all duration-300 ease-in-out",
        isOpen ? "lg:col-span-3" : "lg:col-span-0 w-0",
        className
      )}
    >
      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleOpen}
        className={cn(
          "absolute top-4 z-20 h-8 w-6 p-0 bg-card border shadow-sm hover:bg-accent transition-all",
          side === "left" 
            ? (isOpen ? "-right-3" : "right-0") 
            : (isOpen ? "-left-3" : "left-0"),
          !isOpen && "rounded-full w-8 h-8"
        )}
        aria-label={isOpen ? "Collapse panel" : "Expand panel"}
      >
        <Icon className="h-4 w-4" />
      </Button>

      {/* Panel Content */}
      <div 
        className={cn(
          "transition-all duration-300 ease-in-out overflow-hidden",
          isOpen ? "opacity-100 w-full" : "opacity-0 w-0 pointer-events-none"
        )}
      >
        {children}
      </div>
    </div>
  );
};
