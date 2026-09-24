import { useState } from "react";
import { Plus, X, Package, Users, Box, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MobileDashboardFABProps {
  className?: string;
  onAddAsset?: () => void;
  onAddMember?: () => void;
  onAddContainer?: () => void;
  onAddTask?: () => void;
}

export const MobileDashboardFAB = ({ className, onAddAsset, onAddMember, onAddContainer, onAddTask }: MobileDashboardFABProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    { icon: Package, label: "Add Asset", handler: onAddAsset, color: "bg-primary" },
    { icon: Users, label: "Add Member", handler: onAddMember, color: "bg-emerald-600" },
    { icon: Box, label: "Create Container", handler: onAddContainer, color: "bg-amber-600" },
    { icon: CalendarPlus, label: "Add Event", handler: onAddTask, color: "bg-blue-600" },
  ];

  const handleAction = (handler?: () => void) => {
    setIsOpen(false);
    handler?.();
  };

  return (
    <div className={cn("fixed bottom-6 right-4 z-50 lg:hidden", className)}>
      <div className={cn(
        "flex flex-col-reverse gap-3 mb-3 transition-all duration-300",
        isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
      )}>
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <div
              key={action.label}
              className="flex items-center justify-end gap-3 animate-in slide-in-from-bottom-2"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <span className="text-sm font-medium text-foreground bg-background/95 backdrop-blur px-3 py-1.5 rounded-lg shadow-lg border">
                {action.label}
              </span>
              <Button
                size="icon"
                className={cn(
                  "h-12 w-12 rounded-full shadow-lg",
                  action.color,
                  "hover:opacity-90 active:scale-95"
                )}
                onClick={() => handleAction(action.handler)}
              >
                <Icon className="h-5 w-5" />
              </Button>
            </div>
          );
        })}
      </div>

      <Button
        size="icon"
        className={cn(
          "h-14 w-14 rounded-full shadow-2xl transition-all duration-300",
          isOpen 
            ? "bg-muted-foreground rotate-45" 
            : "bg-primary hover:bg-primary/90"
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Plus className="h-6 w-6" />
        )}
      </Button>

      {isOpen && (
        <div
          className="fixed inset-0 bg-background/50 backdrop-blur-sm -z-10"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};
