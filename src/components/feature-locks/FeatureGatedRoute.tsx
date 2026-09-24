/**
 * FeatureGatedRoute — Blocking route-level feature gate.
 * If the current plan does not include the feature, the child route is not
 * rendered and the user sees a blocking upgrade prompt instead. This prevents
 * direct-URL bypass of premium routes.
 */

import { ReactNode, createContext, useContext } from "react";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { useSubscriptionOptional, GatedFeature, PLAN_DISPLAY_NAMES } from "@/contexts/SubscriptionContext";
import { useTourMode } from "@/contexts/TourModeContext";
import { useSuperAdmin } from "@/hooks/use-super-admin";
import { Button } from "@/components/ui/button";

/** Context so child components can check if their parent route is locked */
interface FeatureGateState {
  isLocked: boolean;
  requiredPlan: string;
  feature: GatedFeature;
}

const FeatureGateContext = createContext<FeatureGateState | null>(null);

export const useFeatureGate = () => useContext(FeatureGateContext);

interface FeatureGatedRouteProps {
  feature: GatedFeature;
  children: ReactNode;
}

export const FeatureGatedRoute = ({ feature, children }: FeatureGatedRouteProps) => {
  const subscriptionContext = useSubscriptionOptional();
  const { isTourMode } = useTourMode();
  const { isSuperAdmin } = useSuperAdmin();

  // Demo mode or super admin: always allow
  if (isTourMode || isSuperAdmin) return <>{children}</>;

  // No context or still loading: render children
  if (!subscriptionContext || subscriptionContext.plan.loading) return <>{children}</>;

  const isLocked = !subscriptionContext.hasFeatureAccess(feature);
  const requiredPlan = isLocked
    ? PLAN_DISPLAY_NAMES[subscriptionContext.getRequiredPlan(feature)]
    : "";

  return (
    <FeatureGateContext.Provider value={{ isLocked, requiredPlan, feature }}>
      {isLocked ? (
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6">
          <div className="max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <h1 className="mb-2 text-xl font-semibold">{feature} is a {requiredPlan} feature</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              Upgrade to {requiredPlan} to unlock {feature.toLowerCase()} and continue.
            </p>
            <div className="flex justify-center gap-3">
              <Button asChild>
                <Link to="/billing">Upgrade plan</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/dashboard">Back to dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      ) : (
        children
      )}
    </FeatureGateContext.Provider>
  );
};
