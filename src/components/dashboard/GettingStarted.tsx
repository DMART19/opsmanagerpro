/**
 * GettingStarted - Elegant onboarding checklist
 * 
 * Shows only when user has no data.
 * Clean, minimal, easily dismissible.
 */

import { Package, Users, Calendar, X, ArrowRight, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useDemoPath } from "@/hooks/use-demo-path";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useUnifiedStats } from "@/hooks/use-unified-stats";

const GETTING_STARTED_KEY = "ops_mgmt_pro_getting_started_dismissed";

interface Step {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  route?: string;
  action?: () => void;
  isComplete: boolean;
}

interface GettingStartedProps {
  onAddAsset?: () => void;
}

export const GettingStarted = ({ onAddAsset }: GettingStartedProps = {}) => {
  const navigate = useNavigate();
  const { getPath } = useDemoPath();
  const [dismissed, setDismissed] = useState(false);
  const { assets, team, loading } = useUnifiedStats();

  useEffect(() => {
    const isDismissed = localStorage.getItem(GETTING_STARTED_KEY);
    if (isDismissed) {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(GETTING_STARTED_KEY, "true");
    setDismissed(true);
  };

  // Calculate completion
  const steps: Step[] = [
    {
      id: "assets",
      icon: Package,
      title: "Add your first asset",
      description: "Track equipment, inventory, or resources",
      action: onAddAsset,
      isComplete: assets.total > 0,
    },
    {
      id: "team",
      icon: Users,
      title: "Add a team member",
      description: "Assign assets and track credentials",
      route: "/people",
      isComplete: team.total > 0,
    },
    {
      id: "tasks",
      icon: Calendar,
      title: "Schedule a task",
      description: "Set reminders for maintenance or deadlines",
      route: "/calendar",
      isComplete: false, // Could track this but keeping simple
    },
  ];

  const completedCount = steps.filter(s => s.isComplete).length;
  const allComplete = completedCount === steps.length;

  // Don't show if dismissed or loading
  if (dismissed || loading) {
    return null;
  }

  // Don't show if all steps complete
  if (allComplete) {
    return null;
  }

  return (
    <Card className="relative overflow-hidden mb-6">
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1.5 rounded-md text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50 transition-colors z-10"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="p-5">
        {/* Header */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-foreground">
            Get started
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {completedCount} of {steps.length} complete
          </p>
        </div>

        {/* Progress bar */}
        <div className="h-1 w-full bg-muted rounded-full mb-4 overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${(completedCount / steps.length) * 100}%` }}
          />
        </div>

        {/* Steps - horizontal on desktop, vertical on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <button
                key={step.id}
                onClick={() => {
                  if (step.isComplete) return;
                  if (step.action) step.action();
                  else if (step.route) navigate(getPath(step.route));
                }}
                disabled={step.isComplete}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg text-left transition-all",
                  step.isComplete 
                    ? "bg-success/5 cursor-default" 
                    : "bg-muted/30 hover:bg-muted/50 cursor-pointer"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                  step.isComplete ? "bg-success/10" : "bg-primary/10"
                )}>
                  {step.isComplete ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <Icon className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium",
                    step.isComplete ? "text-muted-foreground line-through" : "text-foreground"
                  )}>
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {step.description}
                  </p>
                </div>
                {!step.isComplete && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground/50 flex-shrink-0 mt-2" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
