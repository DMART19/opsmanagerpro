/**
 * OnboardingChecklist — Dashboard Activation Panel
 *
 * Persistent activation panel that guides new users through workspace setup.
 * Steps complete ONLY when live DB record counts > 0.
 * Steps unlock sequentially (Step 2 requires Step 1, etc.).
 */
import { useState, useEffect, useRef } from "react";
import {
  CheckCircle2, Package, Box, Calendar, ArrowRight, X,
  Wrench, Warehouse, Rocket, Sparkles, ChevronDown, Lock,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useOnboardingEngine } from "@/hooks/use-onboarding-engine";
import { useOnboardingContext, type PrimaryUseCase } from "@/hooks/use-onboarding-context";
import { useActivationPanel } from "@/hooks/use-activation-panel";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface OnboardingChecklistProps {
  onAddAsset?: () => void;
  onAddContainer?: () => void;
  onAddTask?: () => void;
}

export const OnboardingChecklist = ({ onAddAsset, onAddContainer, onAddTask }: OnboardingChecklistProps) => {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionShown, setCompletionShown] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const { state, loading: engineLoading, completedCount, totalTasks, allComplete, refresh } = useOnboardingEngine();
  const { shouldShow, loading: activationLoading, markFirstLoginCompleted } = useActivationPanel();
  const { profile: onboardingProfile, isInvitedUser } = useOnboardingContext();
  const useCase = (onboardingProfile?.primary_use_case || "") as PrimaryUseCase;

  const loading = engineLoading || activationLoading;

  // Track previous completion state for success toasts
  const prevState = useRef<Record<string, boolean>>({});
  const initializedPrevState = useRef(false);

  useEffect(() => {
    if (loading) return;
    const feedbackMap: Record<string, { field: keyof typeof state; msg: string; next: string }> = {
      asset: { field: "asset_created", msg: "Asset added!", next: "Now organize it inside a container." },
      container: { field: "container_created", msg: "Container created!", next: "Schedule your first task to stay on track." },
      event: { field: "event_created", msg: "Task scheduled!", next: "Your workspace is fully activated!" },
    };
    // Skip toasts on initial mount — only fire when a step transitions to complete
    // during this session, not for steps already completed previously.
    if (initializedPrevState.current) {
      for (const [key, { field, msg, next }] of Object.entries(feedbackMap)) {
        if (state[field] && !prevState.current[key]) {
          toast.success(msg, { description: next, duration: 4000 });
        }
      }
    } else {
      initializedPrevState.current = true;
    }
    prevState.current = {
      asset: state.asset_created,
      container: state.container_created,
      event: state.event_created,
    };
  }, [loading, state.asset_created, state.container_created, state.event_created]);

  type StepDef = {
    id: string;
    step: number;
    label: string;
    description: string;
    why: string;
    buttonLabel: string;
    icon: typeof Package;
    isComplete: boolean;
    isLocked: boolean;
    action?: () => void;
  };

  const steps: StepDef[] = [
    {
      id: "asset",
      step: 1,
      label: "Add Your First Asset",
      description: "Track equipment, tools, or inventory items.",
      why: "Assets are the foundation of your workspace.",
      buttonLabel: "Add Asset",
      icon: useCase === "equipment" ? Wrench : Package,
      isComplete: state.asset_created,
      isLocked: false,
      action: onAddAsset,
    },
    {
      id: "container",
      step: 2,
      label: "Organize into a Container",
      description: "Group assets into shelves, pallets, or locations.",
      why: "Containers make your assets easy to find and manage.",
      buttonLabel: "Create Container",
      icon: useCase === "warehouse_operations" ? Warehouse : Box,
      isComplete: state.container_created,
      isLocked: !state.asset_created,
      action: onAddContainer,
    },
    {
      id: "event",
      step: 3,
      label: "Schedule a Task",
      description: "Plan inspections, maintenance, or compliance checks.",
      why: "Stay on schedule — nothing falls through the cracks.",
      buttonLabel: "Schedule Task",
      icon: Calendar,
      isComplete: state.event_created,
      isLocked: !state.container_created,
      action: onAddTask,
    },
  ];

  // Auto-mark first_login_completed when any task is done
  useEffect(() => {
    if (!loading && completedCount > 0) markFirstLoginCompleted();
  }, [completedCount, loading]);

  // Auto-collapse and show completion modal when all steps done (once)
  useEffect(() => {
    if (allComplete && !completionShown && !loading) {
      setCompletionShown(true);
      setCollapsed(true);
      const timer = setTimeout(() => setShowCompletionModal(true), 600);
      return () => clearTimeout(timer);
    }
  }, [allComplete, completionShown, loading]);

  // Refresh on window focus
  useEffect(() => {
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  const handleDismiss = () => {
    setDismissed(true);
    markFirstLoginCompleted();
  };

  const handleCompletionClose = async () => {
    setShowCompletionModal(false);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ first_login_completed: true } as any)
        .eq("id", user.id);
    }
    markFirstLoginCompleted();
  };

  if (dismissed || loading || !shouldShow) return null;

  const nextStep = steps.find(s => !s.isComplete && !s.isLocked);
  const progressPct = Math.round((completedCount / totalTasks) * 100);

  return (
    <>
      <Card className="relative overflow-hidden mb-6 border-border/50" style={{ boxShadow: "var(--shadow-card)" }}>
        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1 rounded-md text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50 transition-colors z-10"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground">
                {allComplete
                  ? "Workspace Activated"
                  : isInvitedUser
                    ? "Welcome to the team!"
                    : "Activate your workspace"}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {allComplete
                  ? "All steps completed — you're ready to go!"
                  : "Complete these steps to begin tracking assets, containers, and operational tasks."}
              </p>
            </div>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1 rounded-md text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              aria-label={collapsed ? "Expand" : "Collapse"}
            >
              <ChevronDown className={cn("h-4 w-4 transition-transform", collapsed && "-rotate-90")} />
            </button>
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-muted-foreground">
                {completedCount} / {totalTasks} steps completed
              </span>
              <span className="text-[11px] font-medium text-muted-foreground">
                {progressPct}%
              </span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700 ease-out",
                  allComplete ? "bg-success" : "bg-primary"
                )}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Steps */}
          {!collapsed && (
            <div className="space-y-2.5">
              {steps.map((step) => {
                const Icon = step.isComplete ? CheckCircle2 : step.isLocked ? Lock : step.icon;
                const isNext = step.id === nextStep?.id;

                return (
                  <div
                    key={step.id}
                    className={cn(
                      "rounded-lg border p-3.5 transition-all duration-300",
                      step.isComplete
                        ? "border-primary/20 bg-primary/[0.03]"
                        : step.isLocked
                          ? "border-border/30 bg-muted/20 opacity-50"
                          : isNext
                            ? "border-primary/30 bg-card shadow-sm ring-1 ring-primary/10"
                            : "border-border/40 bg-card/40 opacity-60"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
                        step.isComplete ? "bg-primary/15" : step.isLocked ? "bg-muted" : isNext ? "bg-primary/10" : "bg-muted"
                      )}>
                        <Icon className={cn(
                          "h-4 w-4",
                          step.isComplete ? "text-primary" : step.isLocked ? "text-muted-foreground/50" : isNext ? "text-primary" : "text-muted-foreground"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "text-[10px] font-medium px-1.5 py-0.5 rounded",
                            step.isComplete
                              ? "bg-primary/10 text-primary"
                              : isNext
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                          )}>
                            Step {step.step}
                          </span>
                          {step.isComplete && (
                            <span className="text-[10px] text-primary font-medium">Complete</span>
                          )}
                          {step.isLocked && (
                            <span className="text-[10px] text-muted-foreground font-medium">Locked</span>
                          )}
                        </div>
                        <span className={cn(
                          "text-sm font-medium block mt-0.5",
                          step.isComplete
                            ? "text-muted-foreground line-through decoration-muted-foreground/30"
                            : step.isLocked
                              ? "text-muted-foreground"
                              : "text-foreground"
                        )}>
                          {step.label}
                        </span>
                        {!step.isComplete && !step.isLocked && (
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                            {isNext ? step.why : step.description}
                          </p>
                        )}
                      </div>
                    </div>
                    {!step.isComplete && step.action && (
                      <div className="mt-2.5 pl-11">
                        {step.isLocked ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span tabIndex={0}>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-xs font-medium"
                                  disabled
                                >
                                  {step.buttonLabel}
                                  <Lock className="ml-1.5 h-3 w-3" />
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Complete the previous step to unlock this action.</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Button
                            size="sm"
                            variant={isNext ? "default" : "outline"}
                            className="h-8 text-xs font-medium"
                            onClick={() => step.action?.()}
                          >
                            {step.buttonLabel}
                            <ArrowRight className="ml-1.5 h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Completion Modal */}
      <Dialog open={showCompletionModal} onOpenChange={setShowCompletionModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center items-center">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Rocket className="h-8 w-8 text-primary" />
            </div>
            <DialogTitle className="text-xl">Your Workspace is Ready!</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-2 leading-relaxed">
              You now have:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <div className="flex items-center gap-3 text-sm text-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
              <span>Assets being tracked</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
              <span>Containers organizing your equipment</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
              <span>Tasks scheduled for inspections</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-2">
            <Button onClick={handleCompletionClose}>Go to Dashboard</Button>
            <Button
              variant="outline"
              onClick={() => { handleCompletionClose(); navigate("/inventory"); }}
            >
              View Assets
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => { handleCompletionClose(); navigate("/inventory"); }}
            >
              Create Another Item
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
