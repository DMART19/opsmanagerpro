/**
 * ProgressiveProfileCard — Subtly prompts returning users to complete
 * optional profile fields (team size, industry) for better personalization.
 * Only appears after 2+ logins and when fields are missing.
 */
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOnboardingContext } from "@/hooks/use-onboarding-context";
import { toast } from "sonner";

const TEAM_SIZES = [
  { value: "solo", label: "Just me" },
  { value: "small", label: "2–10" },
  { value: "medium", label: "11–50" },
  { value: "large", label: "50+" },
];

const INDUSTRIES = [
  { value: "emergency_management", label: "Emergency Management" },
  { value: "logistics", label: "Logistics & Supply Chain" },
  { value: "construction", label: "Construction" },
  { value: "healthcare", label: "Healthcare" },
  { value: "government", label: "Government" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "other", label: "Other" },
];

const DISMISSED_KEY = "ops_progressive_profile_dismissed";

export function ProgressiveProfileCard() {
  const { needsProgressiveProfile, profile, updateProfileFields } = useOnboardingContext();
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === "true");
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedIndustry, setSelectedIndustry] = useState("");
  const [saving, setSaving] = useState(false);

  // Determine which field to ask — ask one at a time
  const needsTeamSize = !profile?.team_size;
  const needsIndustry = !profile?.industry;

  if (!needsProgressiveProfile || dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setDismissed(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const fields: { team_size?: string; industry?: string } = {};
      if (selectedSize) fields.team_size = selectedSize;
      if (selectedIndustry) fields.industry = selectedIndustry;

      await updateProfileFields(fields);
      toast.success("Profile updated — thanks!");
    } catch {
      toast.error("Could not save. Try again later.");
    } finally {
      setSaving(false);
    }
  };

  const askingField = needsTeamSize ? "team_size" : "industry";

  return (
    <Card className="relative overflow-hidden mb-5 border-primary/15 bg-primary/[0.02]" style={{ boxShadow: "var(--shadow-card)" }}>
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 rounded-md text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50 transition-colors z-10"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            {askingField === "team_size" ? "How big is your team?" : "What's your industry?"}
          </h3>
        </div>

        <p className="text-xs text-muted-foreground mb-4">
          This helps us personalize your experience and show relevant features.
        </p>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {(askingField === "team_size" ? TEAM_SIZES : INDUSTRIES).map((option) => {
            const isSelected = askingField === "team_size"
              ? selectedSize === option.value
              : selectedIndustry === option.value;

            return (
              <button
                key={option.value}
                onClick={() =>
                  askingField === "team_size"
                    ? setSelectedSize(option.value)
                    : setSelectedIndustry(option.value)
                }
                disabled={saving}
                className={cn(
                  "px-3 py-1.5 text-xs rounded-full border transition-all",
                  isSelected
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40"
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || (!selectedSize && !selectedIndustry)}
            className="text-xs h-8"
          >
            {saving ? "Saving..." : "Save"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            className="text-xs h-8 text-muted-foreground"
          >
            Skip
          </Button>
        </div>
      </div>
    </Card>
  );
}
