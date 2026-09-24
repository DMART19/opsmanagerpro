import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { BillingLifecycleSection } from "@/components/billing/BillingLifecycleSection";
import { PricingTable } from "@/components/billing/PricingTable";
import { UsageLimitIndicator } from "@/components/subscription/UsageLimitIndicator";
import { LegalFooter } from "@/components/LegalFooter";
import { GuidanceTooltip } from "@/components/guidance";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { toast } from "sonner";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { parsePlanId } from "@/lib/pending-plan";


export default function Billing() {
  const { plan, refreshPlan } = useSubscription();
  const [searchParams, setSearchParams] = useSearchParams();
  const [portalLoading, setPortalLoading] = useState(false);

  const openCustomerPortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      } else {
        throw new Error("No portal URL returned");
      }
    } catch (err) {
      console.error("Portal error:", err);
      toast.error("Couldn't open subscription management. Please try again.");
    } finally {
      setPortalLoading(false);
    }
  };


  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (checkout === "success") {
      toast.success("Subscription activated! Your plan will update shortly.");
      // Refresh plan after a short delay to allow webhook to process
      setTimeout(() => refreshPlan(), 3000);
      setSearchParams({}, { replace: true });
    } else if (checkout === "canceled") {
      toast.info("Checkout canceled. No changes were made.");
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, refreshPlan]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      <main className="flex-1 pt-8 sm:pt-10 px-4 sm:px-6 lg:px-8 pb-12">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight">Billing & Plan</h1>
            <p className="text-muted-foreground mt-1">
              Manage your subscription, usage limits, and plan features.
            </p>
          </div>

          <GuidanceTooltip
            guidanceId="billing_intro"
            message="Your workspace starts with a 14-day free trial. You can upgrade anytime to unlock more features and higher limits."
            action={{ label: "View Plans", onClick: () => document.getElementById("plan-section")?.scrollIntoView({ behavior: "smooth" }) }}
          />

          <div className="space-y-8">
            {/* Lifecycle banners (trial, past due, etc.) */}
            <BillingLifecycleSection />

            {/* Current usage + subscription management */}
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-3">Current Usage</h2>
                <UsageLimitIndicator />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-3">Manage Subscription</h2>
                <div className="rounded-xl border bg-card p-4 space-y-3">
                  <Button
                    onClick={openCustomerPortal}
                    disabled={portalLoading}
                    className="w-full gap-2"
                  >
                    <SettingsIcon className="h-4 w-4" />
                    {portalLoading ? "Opening…" : "Manage Subscription"}
                    <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                  </Button>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Update your payment method, download invoices, upgrade, downgrade,
                    or cancel your subscription from the secure customer portal.
                  </p>
                </div>
              </div>
            </div>

            {/* Pricing table */}
            <div>
              <PricingTable currentPlan={plan.plan} preselectedPlan={parsePlanId(searchParams.get("plan"))} />
            </div>
          </div>
        </div>
      </main>
      <LegalFooter />
    </div>
  );
}
