import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ClipboardCheck,
  Loader2,
  MapPin,
  Package,
  Sparkles,
  Users,
  Warehouse,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { seedSampleData } from "@/lib/seed-sample-data";
import { WorkspaceInitScreen } from "@/components/onboarding/WorkspaceInitScreen";
import { trackEvent } from "@/lib/track-event";

const STORAGE_KEY = "opsmanagerpro:first-run-onboarding";
const TOTAL_STEPS = 5;

type StepStatus = "pending" | "active" | "complete";

type OnboardingDraft = {
  displayName: string;
  workspaceName: string;
  locationName: string;
  locationCode: string;
  locationDetails: string;
  useSampleData: boolean;
  inventoryName: string;
  inventoryQuantity: string;
  inventorySection: string;
  teammateFirstName: string;
  teammateLastName: string;
  teammateEmail: string;
  workflowTitle: string;
  workflowNotes: string;
};

const initialDraft: OnboardingDraft = {
  displayName: "",
  workspaceName: "",
  locationName: "",
  locationCode: "",
  locationDetails: "",
  useSampleData: false,
  inventoryName: "",
  inventoryQuantity: "1",
  inventorySection: "Receiving",
  teammateFirstName: "",
  teammateLastName: "",
  teammateEmail: "",
  workflowTitle: "Receive first inventory item",
  workflowNotes: "Confirm quantity, location, and next action for the first item.",
};

const steps = [
  { label: "Workspace", icon: Warehouse, description: "Name the operating hub." },
  { label: "Location", icon: MapPin, description: "Add the first warehouse or worksite." },
  { label: "Inventory", icon: Package, description: "Add one item or load sample data." },
  { label: "Team", icon: Users, description: "Invite a teammate or continue solo." },
  { label: "Workflow", icon: ClipboardCheck, description: "Complete one operational action." },
] as const;

const getStepStatus = (index: number, currentStep: number): StepStatus => {
  if (index + 1 < currentStep) return "complete";
  if (index + 1 === currentStep) return "active";
  return "pending";
};

const readStoredDraft = (): { draft: OnboardingDraft; step: number } => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { draft: initialDraft, step: 1 };

    const parsed = JSON.parse(raw) as Partial<OnboardingDraft> & { step?: number };
    return {
      draft: { ...initialDraft, ...parsed },
      step: Math.min(Math.max(parsed.step ?? 1, 1), TOTAL_STEPS),
    };
  } catch {
    return { draft: initialDraft, step: 1 };
  }
};

const makeLocationCode = (name: string) =>
  name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 12) || "MAIN";

export default function QuickSetup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<OnboardingDraft>(initialDraft);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [showInitScreen, setShowInitScreen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate("/auth", { replace: true });
        return;
      }

      const identities = session.user.identities ?? [];
      const hasOAuth = identities.some((identity) => identity.provider !== "email");
      const pendingInvite = localStorage.getItem("pending_workspace_invite");
      let detectedSource = "direct";
      if (pendingInvite) detectedSource = "invite";
      else if (hasOAuth) detectedSource = "oauth";
      else if (session.user.app_metadata?.provider === "email") detectedSource = "direct";

      void supabase
        .from("profiles")
        .update({ signup_source: detectedSource })
        .eq("id", session.user.id);

      supabase
        .from("profiles")
        .select("display_name, onboarding_complete")
        .eq("id", session.user.id)
        .single()
        .then(({ data }) => {
          if (data?.onboarding_complete) {
            navigate("/dashboard", { replace: true });
            return;
          }

          const stored = readStoredDraft();
          setDraft({
            ...stored.draft,
            displayName: stored.draft.displayName || data?.display_name || "",
          });
          setStep(stored.step);
          setCheckingAuth(false);
        });
    });
  }, [navigate]);

  useEffect(() => {
    if (checkingAuth) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...draft, step }));
  }, [checkingAuth, draft, step]);

  const completedCount = step - 1;
  const progressPercent = Math.round((completedCount / TOTAL_STEPS) * 100);

  const canAdvance = useMemo(() => {
    if (step === 1) return draft.workspaceName.trim().length > 1 && draft.displayName.trim().length > 1;
    if (step === 2) return draft.locationName.trim().length > 1;
    if (step === 3) return draft.useSampleData || draft.inventoryName.trim().length > 1;
    if (step === 4) return true;
    if (step === 5) return draft.workflowTitle.trim().length > 1;
    return false;
  }, [draft, step]);

  const updateDraft = <K extends keyof OnboardingDraft>(key: K, value: OnboardingDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrorMessage(null);
  };

  const handleNext = () => {
    if (!canAdvance) return;
    setStep((current) => Math.min(current + 1, TOTAL_STEPS));
  };

  const handleBack = () => {
    setStep((current) => Math.max(current - 1, 1));
  };

  const handleComplete = async () => {
    if (!canAdvance) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/auth", { replace: true });
        return;
      }

      const userId = session.user.id;
      const locationCode = (draft.locationCode.trim() || makeLocationCode(draft.locationName)).toUpperCase();
      const quantity = Number.parseInt(draft.inventoryQuantity, 10);

      const [profileResult, workspaceResult] = await Promise.all([
        supabase
          .from("profiles")
          .update({
            display_name: draft.displayName.trim(),
            primary_use_case: "warehouse_operations",
          })
          .eq("id", userId),
        supabase
          .from("workspace_settings")
          .update({ workspace_name: draft.workspaceName.trim() })
          .eq("user_id", userId),
      ]);

      if (profileResult.error) throw profileResult.error;
      if (workspaceResult.error) throw workspaceResult.error;

      await supabase.auth.updateUser({
        data: {
          display_name: draft.displayName.trim(),
          management_type: "warehouse_operations",
        },
      });

      void trackEvent("workspace_created", { onboarding_step: "workspace" });

      const { error: warehouseError } = await supabase.from("warehouses").insert({
        name: draft.locationName.trim(),
        code: locationCode,
        location: draft.locationDetails.trim() || null,
        active: true,
      });
      if (warehouseError) throw warehouseError;
      void trackEvent("first_location_created", { onboarding_step: "location" });

      if (draft.useSampleData) {
        await seedSampleData(userId);
      } else {
        const { error: inventoryError } = await supabase.from("cache_inventory").insert({
          description: draft.inventoryName.trim(),
          asset_type: "item",
          quantity_available: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
          quantity_out: 0,
          section: draft.inventorySection.trim() || draft.locationName.trim(),
          user_id: userId,
        });
        if (inventoryError) throw inventoryError;
      }
      void trackEvent("first_inventory_created", {
        onboarding_step: "inventory",
        used_sample_data: draft.useSampleData,
      });

      const teammateFirstName = draft.teammateFirstName.trim();
      const teammateLastName = draft.teammateLastName.trim();
      const teammateEmail = draft.teammateEmail.trim();
      if (teammateFirstName || teammateLastName || teammateEmail) {
        const { error: employeeError } = await supabase.from("employees").insert({
          user_id: userId,
          first_name: teammateFirstName || "Team",
          last_name: teammateLastName || "Member",
          email: teammateEmail || null,
          position: "Operations team",
          status: "Active",
        });
        if (employeeError) throw employeeError;
        void trackEvent("first_team_member_added", { onboarding_step: "team" });
      }

      const { error: taskError } = await supabase.from("tasks").insert({
        user_id: userId,
        title: draft.workflowTitle.trim(),
        description: draft.workflowNotes.trim() || "Created during first-run onboarding.",
        start_date: new Date().toISOString(),
        status: "completed",
      });
      if (taskError) throw taskError;
      void trackEvent("first_operation_completed", { onboarding_step: "workflow" });

      const { error: completeError } = await supabase
        .from("profiles")
        .update({ onboarding_complete: true })
        .eq("id", userId);
      if (completeError) throw completeError;

      localStorage.removeItem(STORAGE_KEY);
      toast.success("Workspace ready", {
        description: "Your first location, inventory, and workflow are set up.",
      });
      setShowInitScreen(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";
      setErrorMessage(message);
      toast.error("Setup could not be completed", { description: message });
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 px-4 py-6 sm:py-10">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-xl border border-border bg-card p-5 shadow-sm lg:sticky lg:top-6 lg:self-start">
          <div className="mb-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">First-run setup</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Get to value fast</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Set up the minimum working operation: workspace, location, inventory, team, and one workflow.
            </p>
          </div>

          <div className="mb-5 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="space-y-3">
            {steps.map((item, index) => {
              const Icon = item.icon;
              const status = getStepStatus(index, step);
              return (
                <div
                  key={item.label}
                  className={cn(
                    "flex gap-3 rounded-lg border p-3 transition-colors",
                    status === "active" && "border-primary/40 bg-primary/5",
                    status === "complete" && "border-success/30 bg-success/5",
                    status === "pending" && "border-border bg-background/60",
                  )}
                >
                  <div className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    status === "complete" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
                    status === "active" && "bg-primary/15 text-primary",
                  )}>
                    {status === "complete" ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        <main className="rounded-xl border border-border bg-card p-5 shadow-lg sm:p-8">
          {errorMessage && (
            <div className="mb-5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {errorMessage}
            </div>
          )}

          {step === 1 && (
            <section className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Name your workspace</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  This creates the shared operations home your team will use every day.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Your name</Label>
                  <Input
                    id="displayName"
                    value={draft.displayName}
                    onChange={(event) => updateDraft("displayName", event.target.value)}
                    placeholder="David Martinez"
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workspaceName">Workspace name</Label>
                  <Input
                    id="workspaceName"
                    value={draft.workspaceName}
                    onChange={(event) => updateDraft("workspaceName", event.target.value)}
                    placeholder="Sacramento Operations"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Add your first location</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Start with the warehouse, stockroom, yard, or shop floor where inventory is handled.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="locationName">Location name</Label>
                  <Input
                    id="locationName"
                    value={draft.locationName}
                    onChange={(event) => {
                      updateDraft("locationName", event.target.value);
                      if (!draft.locationCode.trim()) {
                        updateDraft("locationCode", makeLocationCode(event.target.value));
                      }
                    }}
                    placeholder="Main Warehouse"
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="locationCode">Location code</Label>
                  <Input
                    id="locationCode"
                    value={draft.locationCode}
                    onChange={(event) => updateDraft("locationCode", event.target.value.toUpperCase())}
                    placeholder="MAIN"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="locationDetails">Location details</Label>
                  <Input
                    id="locationDetails"
                    value={draft.locationDetails}
                    onChange={(event) => updateDraft("locationDetails", event.target.value)}
                    placeholder="West Sacramento, receiving area, or building notes"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Add inventory or load a guided demo</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Prospects and new teams should understand the product without building a warehouse from scratch.
                </p>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <Label htmlFor="sampleData" className="text-sm font-medium">Load sample workspace data</Label>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Adds example containers and items so the dashboard is useful immediately.
                    </p>
                  </div>
                </div>
                <Switch
                  id="sampleData"
                  checked={draft.useSampleData}
                  onCheckedChange={(checked) => updateDraft("useSampleData", checked)}
                  disabled={isLoading}
                />
              </div>

              {!draft.useSampleData && (
                <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
                  <div className="space-y-2">
                    <Label htmlFor="inventoryName">First inventory item</Label>
                    <Input
                      id="inventoryName"
                      value={draft.inventoryName}
                      onChange={(event) => updateDraft("inventoryName", event.target.value)}
                      placeholder="Pallet jack, case of gloves, replacement part"
                      disabled={isLoading}
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inventoryQuantity">Quantity</Label>
                    <Input
                      id="inventoryQuantity"
                      type="number"
                      min="1"
                      value={draft.inventoryQuantity}
                      onChange={(event) => updateDraft("inventoryQuantity", event.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="inventorySection">Where is it stored?</Label>
                    <Input
                      id="inventorySection"
                      value={draft.inventorySection}
                      onChange={(event) => updateDraft("inventorySection", event.target.value)}
                      placeholder="Receiving, Rack A, cold storage, tool cage"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              )}
            </section>
          )}

          {step === 4 && (
            <section className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Add a teammate</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add someone now if you have their details, or skip this and complete setup as a one-person workspace.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="teammateFirstName">First name</Label>
                  <Input
                    id="teammateFirstName"
                    value={draft.teammateFirstName}
                    onChange={(event) => updateDraft("teammateFirstName", event.target.value)}
                    placeholder="Alex"
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teammateLastName">Last name</Label>
                  <Input
                    id="teammateLastName"
                    value={draft.teammateLastName}
                    onChange={(event) => updateDraft("teammateLastName", event.target.value)}
                    placeholder="Rivera"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="teammateEmail">Email</Label>
                  <Input
                    id="teammateEmail"
                    type="email"
                    value={draft.teammateEmail}
                    onChange={(event) => updateDraft("teammateEmail", event.target.value)}
                    placeholder="alex@example.com"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </section>
          )}

          {step === 5 && (
            <section className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Complete one operational workflow</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create a completed receiving, movement, assignment, or shipping action so the workspace starts with a real operational record.
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="workflowTitle">Workflow completed</Label>
                  <Input
                    id="workflowTitle"
                    value={draft.workflowTitle}
                    onChange={(event) => updateDraft("workflowTitle", event.target.value)}
                    placeholder="Receive first inventory item"
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workflowNotes">Notes</Label>
                  <Textarea
                    id="workflowNotes"
                    value={draft.workflowNotes}
                    onChange={(event) => updateDraft("workflowNotes", event.target.value)}
                    placeholder="What happened, where it moved, who owns the next step?"
                    disabled={isLoading}
                    rows={4}
                  />
                </div>
              </div>
            </section>
          )}

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={step === 1 || isLoading}
              className="sm:w-auto"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            <div className="flex items-center gap-3">
              <p className="hidden text-sm text-muted-foreground sm:block">Step {step} of {TOTAL_STEPS}</p>
              {step < TOTAL_STEPS ? (
                <Button type="button" onClick={handleNext} disabled={!canAdvance || isLoading}>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button type="button" onClick={handleComplete} disabled={!canAdvance || isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating workspace...
                    </>
                  ) : (
                    <>
                      Finish setup
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
