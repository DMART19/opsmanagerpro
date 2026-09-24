/**
 * Onboarding Page — Guided Activation Flow
 *
 * Steps derive completion from live DB record counts and unlock sequentially.
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useOnboardingEngine } from "@/hooks/use-onboarding-engine";
import { useOnboardingContext } from "@/hooks/use-onboarding-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  Package,
  Box,
  Calendar,
  ArrowRight,
  Rocket,
  Loader2,
  Sparkles,
  Shield,
  Layers,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AddCacheItemModal } from "@/components/inventory/AddCacheItemModal";
import { AddBoxModal } from "@/components/inventory/AddBoxModal";
import { toast } from "sonner";

export default function Onboarding() {
  const navigate = useNavigate();
  const { state, loading, completedCount, totalTasks, allComplete, refresh } = useOnboardingEngine();
  const { profile } = useOnboardingContext();

  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [addAssetOpen, setAddAssetOpen] = useState(false);
  const [addContainerOpen, setAddContainerOpen] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [prevCompleted, setPrevCompleted] = useState<Record<string, boolean>>({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) navigate("/auth", { replace: true });
      setCheckingAuth(false);
    });
  }, [navigate]);

  useEffect(() => {
    if (!loading && allComplete) navigate("/dashboard", { replace: true });
  }, [loading, allComplete, navigate]);

  useEffect(() => {
    if (loading) return;
    const map: Record<string, { field: keyof typeof state; msg: string; next: string }> = {
      asset: { field: "asset_created", msg: "Asset added!", next: "Now organize it inside a container." },
      container: { field: "container_created", msg: "Container created!", next: "Schedule your first inspection or task." },
      event: { field: "event_created", msg: "Event scheduled!", next: "Your workspace is fully activated!" },
    };
    for (const [key, { field, msg, next }] of Object.entries(map)) {
      if (state[field] && !prevCompleted[key]) {
        toast.success(msg, { description: next, duration: 4000 });
      }
    }
    setPrevCompleted({
      asset: state.asset_created,
      container: state.container_created,
      event: state.event_created,
    });
  }, [loading, state.asset_created, state.container_created, state.event_created]);

  useEffect(() => {
    if (!loading && state.asset_created && state.container_created && state.event_created && !showCompletionModal) {
      const timer = setTimeout(() => setShowCompletionModal(true), 600);
      return () => clearTimeout(timer);
    }
  }, [loading, state, showCompletionModal]);

  const handleAssetAdded = useCallback(() => {
    setAddAssetOpen(false);
    setTimeout(() => refresh(), 500);
  }, [refresh]);

  const handleContainerAdded = useCallback(() => {
    setAddContainerOpen(false);
    setTimeout(() => refresh(), 500);
  }, [refresh]);

  const handleAddEvent = useCallback(() => {
    navigate("/calendar?onboarding=true");
  }, [navigate]);

  const handleCompletionClose = async () => {
    setShowCompletionModal(false);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ first_login_completed: true } as any)
        .eq("id", user.id);
    }
    navigate("/dashboard", { replace: true });
  };

  if (checkingAuth || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const progressPct = Math.round((completedCount / totalTasks) * 100);

  const steps = [
    {
      id: "asset",
      step: 1,
      label: "Add Your First Asset",
      description: "Track equipment, tools, or inventory items inside your workspace.",
      why: "Assets are the core of your operations — everything flows from here.",
      buttonLabel: "Add Asset",
      icon: Package,
      successIcon: Shield,
      isComplete: state.asset_created,
      isLocked: false,
      action: () => setAddAssetOpen(true),
    },
    {
      id: "container",
      step: 2,
      label: "Organize into a Container",
      description: "Group assets into shelves, pallets, or storage locations.",
      why: "Containers give your assets structure and make them easy to find.",
      buttonLabel: "Create Container",
      icon: Box,
      successIcon: Layers,
      isComplete: state.container_created,
      isLocked: !state.asset_created,
      action: () => setAddContainerOpen(true),
    },
    {
      id: "event",
      step: 3,
      label: "Schedule Your First Task",
      description: "Plan inspections, maintenance, or compliance checks.",
      why: "Tasks keep your operations on schedule and nothing falls through the cracks.",
      buttonLabel: "Schedule Task",
      icon: Calendar,
      successIcon: Sparkles,
      isComplete: state.event_created,
      isLocked: !state.container_created,
      action: handleAddEvent,
    },
  ];

  const nextStep = steps.find((s) => !s.isComplete && !s.isLocked);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
            <Sparkles className="h-3 w-3" />
            Workspace Setup
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {profile?.display_name
              ? `Let's activate your workspace, ${profile.display_name}`
              : "Activate Your Workspace"}
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
            Complete these 3 steps to set up a fully operational workspace. It only takes a few minutes.
          </p>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-muted-foreground font-medium">
              {completedCount === 0
                ? "Let's get started"
                : completedCount === totalTasks
                  ? "All steps completed!"
                  : `${completedCount} of ${totalTasks} steps completed`}
            </span>
            <span className={cn(
              "font-semibold tabular-nums",
              progressPct === 100 ? "text-primary" : "text-foreground"
            )}>
              {progressPct}%
            </span>
          </div>
          <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <Card className="p-5 border-border/50">
          <div className="space-y-3">
            {steps.map((step) => {
              const Icon = step.isComplete ? CheckCircle2 : step.isLocked ? Lock : step.icon;
              const isNext = step.id === nextStep?.id;

              return (
                <div
                  key={step.id}
                  className={cn(
                    "rounded-xl border p-4 transition-all duration-300",
                    step.isComplete
                      ? "border-primary/30 bg-primary/[0.04]"
                      : step.isLocked
                        ? "border-border/30 bg-muted/20 opacity-50"
                        : isNext
                          ? "border-primary/40 bg-card shadow-sm ring-1 ring-primary/10"
                          : "border-border/40 bg-card/40 opacity-60"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors",
                      step.isComplete
                        ? "bg-primary/15"
                        : step.isLocked
                          ? "bg-muted"
                          : isNext
                            ? "bg-primary/10"
                            : "bg-muted"
                    )}>
                      <Icon className={cn(
                        "h-4.5 w-4.5",
                        step.isComplete
                          ? "text-primary"
                          : step.isLocked
                            ? "text-muted-foreground/50"
                            : isNext
                              ? "text-primary"
                              : "text-muted-foreground"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-xs font-medium px-1.5 py-0.5 rounded",
                          step.isComplete
                            ? "bg-primary/10 text-primary"
                            : isNext
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                        )}>
                          Step {step.step}
                        </span>
                        {step.isComplete && (
                          <span className="text-xs text-primary font-medium">Done</span>
                        )}
                        {step.isLocked && (
                          <span className="text-xs text-muted-foreground font-medium">Locked</span>
                        )}
                      </div>
                      <span className={cn(
                        "text-sm font-medium block mt-1",
                        step.isComplete
                          ? "text-muted-foreground line-through decoration-muted-foreground/30"
                          : step.isLocked
                            ? "text-muted-foreground"
                            : "text-foreground"
                      )}>
                        {step.label}
                      </span>
                      {!step.isComplete && !step.isLocked && (
                        <>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {step.description}
                          </p>
                          {isNext && (
                            <p className="text-xs text-primary/70 mt-1 italic">
                              {step.why}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  {!step.isComplete && step.action && (
                    <div className="mt-3 pl-12">
                      {step.isLocked ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span tabIndex={0}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-9 text-xs font-medium"
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
                          className="h-9 text-xs font-medium"
                          onClick={step.action}
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
        </Card>

        {/* Skip */}
        <div className="text-center mt-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/dashboard")}
          >
            Skip for now
          </Button>
        </div>
      </div>

      {/* Asset Modal */}
      <AddCacheItemModal
        open={addAssetOpen}
        onOpenChange={setAddAssetOpen}
        onAdded={handleAssetAdded}
      />

      {/* Container Modal */}
      <AddBoxModal
        isOpen={addContainerOpen}
        onClose={() => {
          setAddContainerOpen(false);
          setTimeout(() => refresh(), 500);
        }}
      />

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
            <Button onClick={handleCompletionClose}>
              Go to Dashboard
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                handleCompletionClose();
                navigate("/inventory");
              }}
            >
              View Assets
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => {
                handleCompletionClose();
                navigate("/inventory");
              }}
            >
              Create Another Item
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
