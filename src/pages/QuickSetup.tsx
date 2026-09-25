import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Loader2,
  ArrowRight,
  ArrowLeft,
  Package,
  Wrench,
  ShieldCheck,
  Warehouse,
  User,
  Building2,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { seedSampleData } from "@/lib/seed-sample-data";
import { WorkspaceInitScreen } from "@/components/onboarding/WorkspaceInitScreen";
import { trackEvent } from "@/lib/track-event";

const USE_CASE_OPTIONS = [
  { value: "inventory", label: "Inventory", icon: Package, description: "Track stock levels and items" },
  { value: "equipment", label: "Equipment", icon: Wrench, description: "Manage tools and gear" },
  { value: "compliance", label: "Compliance", icon: ShieldCheck, description: "Certifications and audits" },
  { value: "warehouse_operations", label: "Warehouse Operations", icon: Warehouse, description: "Full warehouse management" },
] as const;

type UseCase = typeof USE_CASE_OPTIONS[number]["value"];

const TOTAL_STEPS = 3;

export default function QuickSetup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [useCase, setUseCase] = useState<UseCase | "">("");
  const [isLoading, setIsLoading] = useState(false);
  const [showInitScreen, setShowInitScreen] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate("/auth", { replace: true });
        return;
      }

      // Detect signup source from session metadata
      const identities = session.user.identities ?? [];
      const hasOAuth = identities.some((identity) => identity.provider !== "email");
      const pendingInvite = localStorage.getItem("pending_workspace_invite");
      let detectedSource: string = "direct";
      if (pendingInvite) detectedSource = "invite";
      else if (hasOAuth) detectedSource = "oauth";
      else if (session.user.app_metadata?.provider === "email") detectedSource = "direct";

      // Save signup source silently
      supabase
        .from("profiles")
        .update({ signup_source: detectedSource })
        .eq("id", session.user.id)
        .then(() => {});

      supabase
        .from("profiles")
        .select("display_name, onboarding_complete")
        .eq("id", session.user.id)
        .single()
        .then(({ data }) => {
          if (data?.onboarding_complete) {
            navigate("/dashboard", { replace: true });
          } else {
            setCheckingAuth(false);
          }
        });
    });
  }, [navigate]);

  const canAdvance = () => {
    if (step === 1) return displayName.trim().length > 0;
    if (step === 2) return workspaceName.trim().length > 0;
    if (step === 3) return useCase !== "";
    return false;
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!canAdvance()) return;
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/auth", { replace: true });
        return;
      }

      const userId = session.user.id;

      const [profileResult, workspaceResult] = await Promise.all([
        supabase
          .from("profiles")
          .update({
            display_name: displayName.trim(),
            primary_use_case: useCase,
            onboarding_complete: true,
          })
          .eq("id", userId),
        supabase
          .from("workspace_settings")
          .update({ workspace_name: workspaceName.trim() })
          .eq("user_id", userId),
      ]);

      if (profileResult.error) throw profileResult.error;
      if (workspaceResult.error) throw workspaceResult.error;

      void trackEvent("workspace_created");

      await supabase.auth.updateUser({
        data: {
          display_name: displayName.trim(),
          management_type: useCase || undefined,
        },
      });

      await seedSampleData(userId);

      toast.success("Welcome to OpsManagerPro!", {
        description: "Your workspace is ready.",
        duration: 4000,
      });
      setShowInitScreen(true);
    } catch (error) {
      console.error("Setup error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitComplete = useCallback(() => {
    navigate("/dashboard", { replace: true });
  }, [navigate]);

  if (showInitScreen) {
    return <WorkspaceInitScreen onComplete={handleInitComplete} />;
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const stepIcons = [User, Building2, LayoutGrid];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i + 1 <= step ? "bg-primary w-8" : "bg-muted w-6"
              )}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-lg">
          {/* Step header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                {(() => {
                  const Icon = stepIcons[step - 1];
                  return <Icon className="h-6 w-6 text-primary" strokeWidth={1.5} />;
                })()}
              </div>
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {step === 1 && "What should we call you?"}
              {step === 2 && "Name your workspace"}
              {step === 3 && "What will you manage?"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              {step === 1 && "This is how you'll appear to your team."}
              {step === 2 && "Your team's shared home for operations."}
              {step === 3 && "We'll tailor your experience to fit."}
            </p>
          </div>

          {/* Step body */}
          <div className="space-y-5">
            {step === 1 && (
              <div className="space-y-1.5">
                <Label htmlFor="displayName" className="text-xs font-medium">
                  Your Name
                </Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Jane Cooper"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={isLoading}
                  autoFocus
                  className="h-11"
                  onKeyDown={(e) => e.key === "Enter" && canAdvance() && handleNext()}
                />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-1.5">
                <Label htmlFor="workspaceName" className="text-xs font-medium">
                  Workspace Name
                </Label>
                <Input
                  id="workspaceName"
                  type="text"
                  placeholder={displayName ? `${displayName}'s Warehouse` : "Acme Warehouse"}
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  disabled={isLoading}
                  autoFocus
                  className="h-11"
                  onKeyDown={(e) => e.key === "Enter" && canAdvance() && handleNext()}
                />
              </div>
            )}

            {step === 3 && (
              <div className="grid grid-cols-1 gap-2">
                {USE_CASE_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const selected = useCase === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={isLoading}
                      onClick={() => setUseCase(option.value)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border px-4 py-3 text-left transition-all duration-150",
                        "hover:border-primary/40 hover:bg-primary/5",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
                        "disabled:opacity-50 disabled:pointer-events-none",
                        selected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border bg-background"
                      )}
                    >
                      <div className={cn(
                        "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                        selected ? "bg-primary/15" : "bg-muted"
                      )}>
                        <Icon
                          className={cn(
                            "h-4.5 w-4.5",
                            selected ? "text-primary" : "text-muted-foreground"
                          )}
                          strokeWidth={1.5}
                        />
                      </div>
                      <div>
                        <span className={cn(
                          "text-sm font-medium block",
                          selected ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {option.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {option.description}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex gap-2 pt-2">
              {step > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={isLoading}
                  className="h-10"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              {step < TOTAL_STEPS ? (
                <Button
                  type="button"
                  className="flex-1 h-10 text-sm font-medium"
                  disabled={!canAdvance() || isLoading}
                  onClick={handleNext}
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  className="flex-1 h-10 text-sm font-medium"
                  disabled={!canAdvance() || isLoading}
                  onClick={handleSubmit}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating workspace...
                    </>
                  ) : (
                    <>
                      Enter Workspace
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Step {step} of {TOTAL_STEPS} · 14-day free trial
        </p>
      </div>
    </div>
  );
}
