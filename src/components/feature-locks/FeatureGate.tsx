/**
 * FeatureGate — Declarative wrapper that gates children based on a feature flag.
 *
 * Three rendering modes:
 *   "full"    → renders children normally
 *   "partial" → renders `partialFallback` if provided, otherwise children + partial banner
 *   "none"    → renders `lockedFallback` if provided, otherwise shows upgrade prompt
 *
 * Usage:
 *   <FeatureGate flag={FEATURES.pallet_builder}>
 *     <PalletBuilderPage />
 *   </FeatureGate>
 *
 *   <FeatureGate
 *     flag={FEATURES.calendar_basic}
 *     partialFallback={<BasicCalendar />}
 *   >
 *     <FullCalendar />
 *   </FeatureGate>
 */

import { ReactNode, useState } from "react";
import { type FeatureFlag, FEATURE_META, getRequiredPlanName } from "@/config/feature-flags";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { FeatureLockBanner } from "@/components/feature-locks/FeatureLockBanner";
import { FeatureLockModal } from "@/components/feature-locks/FeatureLockModal";
import { GatedFeature } from "@/contexts/SubscriptionContext";
import { Lock, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

// Map feature flags to legacy GatedFeature for banner descriptions
const FLAG_TO_LEGACY: Partial<Record<FeatureFlag, GatedFeature>> = {
  team_directory: "Team",
  team_management: "Team",
  credential_assignment: "Credentials",
  compliance_matrix: "Credentials",
  calendar_basic: "Calendar",
  calendar_full: "Calendar",
  task_management_basic: "Calendar",
  task_management_full: "Calendar",
  pallet_builder: "Pallet Builder",
  trailer_planner: "Pallet Builder",
};

interface FeatureGateProps {
  flag: FeatureFlag;
  children: ReactNode;
  /** Rendered when user has partial access instead of full children */
  partialFallback?: ReactNode;
  /** Rendered when feature is fully locked. Defaults to an inline upgrade card. */
  lockedFallback?: ReactNode;
  /** If true, shows the banner above children for partial access instead of replacing */
  showPartialBanner?: boolean;
  /** Hide the default locked UI — useful when parent handles gating display */
  silent?: boolean;
}

export const FeatureGate = ({
  flag,
  children,
  partialFallback,
  lockedFallback,
  showPartialBanner = true,
  silent = false,
}: FeatureGateProps) => {
  const { isFull, isPartial, isLocked, partialLabel, requiredPlanName, loading } = useFeatureAccess(flag);

  // While loading, render nothing to avoid flash
  if (loading) return null;

  // Full access — render children
  if (isFull) return <>{children}</>;

  // Partial access
  if (isPartial) {
    if (partialFallback) return <>{partialFallback}</>;
    // Show banner + children if showPartialBanner
    const legacyFeature = FLAG_TO_LEGACY[flag];
    return (
      <>
        {showPartialBanner && legacyFeature && (
          <FeatureLockBanner feature={legacyFeature} requiredPlan={requiredPlanName} />
        )}
        {showPartialBanner && !legacyFeature && (
          <PartialAccessBanner
            partialLabel={partialLabel}
            requiredPlanName={requiredPlanName}
            flag={flag}
          />
        )}
        {children}
      </>
    );
  }

  // Locked
  if (silent) return null;
  if (lockedFallback) return <>{lockedFallback}</>;

  return <LockedFeatureCard flag={flag} requiredPlanName={requiredPlanName} />;
};

// ---------------------------------------------------------------------------
// Partial access banner (for flags without a legacy GatedFeature mapping)
// ---------------------------------------------------------------------------

function PartialAccessBanner(_props: {
  partialLabel?: string;
  requiredPlanName: string;
  flag: FeatureFlag;
}) {
  // Upgrade banners disabled globally.
  return null;
}

// ---------------------------------------------------------------------------
// Locked feature card (default fallback for locked features)
// ---------------------------------------------------------------------------

function LockedFeatureCard({
  flag,
  requiredPlanName,
}: {
  flag: FeatureFlag;
  requiredPlanName: string;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const navigate = useNavigate();
  const meta = FEATURE_META.find((m) => m.flag === flag);
  const label = meta?.label ?? flag;

  return (
    <>
      <div className="w-full rounded-xl border border-border bg-card shadow-sm p-8 text-center animate-in fade-in duration-300">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Lock className="h-7 w-7 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">{label}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          This feature is available on the {requiredPlanName} plan.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setModalOpen(true)}>
            Learn More
          </Button>
          <Button size="sm" onClick={() => navigate("/billing")} className="gap-1">
            Upgrade Plan <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <FeatureLockModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        featureName={label}
        description={`${label} is available on the ${requiredPlanName} plan. Upgrade to unlock this feature and other advanced tools.`}
        requiredPlan={requiredPlanName}
      />
    </>
  );
}
