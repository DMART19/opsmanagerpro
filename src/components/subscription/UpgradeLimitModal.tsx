/**
 * Upgrade Limit Modal - Shown when user hits a usage or feature limit
 * Links to /billing for plan upgrade.
 * Supports both legacy GatedFeature and new FeatureFlag system.
 */

import { AlertTriangle, Package, Lock, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useNavigate } from "react-router-dom";
import { type FeatureFlag, FEATURE_META, getRequiredPlanName } from "@/config/feature-flags";
import { useSuperAdmin } from "@/hooks/use-super-admin";

interface UpgradeLimitModalProps {
  open: boolean;
  onClose: () => void;
  limitType: "assets" | "team" | "readonly" | "feature" | "trial";
  featureName?: string;
  requiredPlanName?: string;
  /** New: pass a feature flag for automatic label + plan resolution */
  featureFlag?: FeatureFlag;
}

export const UpgradeLimitModal = ({
  open,
  onClose,
  limitType,
  featureName,
  requiredPlanName,
  featureFlag,
}: UpgradeLimitModalProps) => {
  const { usageLimits } = useSubscription();
  const navigate = useNavigate();
  const { isSuperAdmin } = useSuperAdmin();

  // Super admins bypass all plan/usage limits — never show upgrade prompts.
  if (isSuperAdmin) return null;

  // Resolve names from feature flag if provided
  const resolvedName = featureName || (featureFlag ? (FEATURE_META.find((m) => m.flag === featureFlag)?.label ?? featureFlag) : undefined);
  const resolvedPlan = requiredPlanName || (featureFlag ? getRequiredPlanName(featureFlag) : undefined);

  const getContent = () => {
    switch (limitType) {
      case "assets":
        return {
          icon: Package,
          title: "Upgrade to Operations",
          description: "Unlock higher asset limits by upgrading your plan.",
          hint: `Current usage: ${usageLimits.currentAssets} / ${usageLimits.maxAssets} assets`,
        };
      case "team":
        return {
          icon: Users,
          title: "Upgrade to Operations",
          description: "Unlock team management and compliance tools by upgrading your plan.",
          hint: `Current usage: ${usageLimits.currentTeamMembers} / ${usageLimits.maxTeamMembers} team members`,
        };
      case "readonly":
        return {
          icon: Lock,
          title: "Upgrade to Operations",
          description: "This workspace is in read-only mode. Upgrade to regain full access.",
          hint: "Your data is safe and will be available after upgrade.",
        };
      case "feature":
        return {
          icon: Sparkles,
          title: "Upgrade to Operations",
          description: `Unlock ${resolvedName || "this feature"} and compliance tools by upgrading your plan.`,
          hint: `Available on the ${resolvedPlan || "Operations"} plan.`,
        };
      case "trial":
        return {
          icon: AlertTriangle,
          title: "Trial Limit Reached",
          description: `You've reached the trial limit for ${resolvedName || "this resource"}. Upgrade to a paid plan to continue.`,
          hint: "Upgrade now to unlock unlimited usage.",
        };
    }
  };

  const content = getContent();
  const Icon = content.icon;

  const handleViewPlans = () => {
    onClose();
    navigate("/billing");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center mb-2">
            <Icon className="h-6 w-6 text-warning" />
          </div>
          <DialogTitle className="text-center">{content.title}</DialogTitle>
          <DialogDescription className="text-center">
            {content.description}
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/50 rounded-lg p-3 text-center text-sm text-muted-foreground">
          {content.hint}
        </div>

        <div className="bg-primary/5 rounded-lg p-4 space-y-2">
          <p className="text-sm font-medium text-foreground">Higher plans include:</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Higher asset and team limits</li>
            <li>• Pallet Builder & Calendar</li>
            <li>• Advanced operations tools</li>
          </ul>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button className="w-full" onClick={handleViewPlans}>
            Upgrade Plan
          </Button>
          <Button variant="outline" className="w-full" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>

        <p className="text-xs text-center text-muted-foreground">
          Questions? <a href="mailto:support@opsmanagerpro.com" className="underline">Contact support</a>
        </p>
      </DialogContent>
    </Dialog>
  );
};
