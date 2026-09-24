import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Navigation } from "@/components/Navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { LegalFooter } from "@/components/LegalFooter";
import { PageTransitionWrapper } from "@/components/PageTransitionWrapper";
import { SimplifiedInventoryTable } from "@/components/inventory/SimplifiedInventoryTable";
import { BoxDetailsDrawer } from "@/components/inventory/BoxDetailsDrawer";
import { InlineAlertBanner } from "@/components/alerts";
import { InlineHint } from "@/components/ui/inline-hint";
import { FeatureDiscoveryCard } from "@/components/discovery";
import { GuidanceHeader } from "@/components/guidance/GuidanceHeader";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAccessControl } from "@/hooks/use-access-control";
import { usePageAlerts } from "@/hooks/use-guardrail-alerts";
import { useCacheInventory } from "@/hooks/use-cache-inventory";
import { UsageLimitIndicator, UpgradeLimitModal } from "@/components/subscription";
import { supabase } from "@/integrations/supabase/client";
import { PermissionGuardedPage } from "@/components/permissions/PermissionGuardedPage";


const Inventory = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();


  // Container drawer state lifted for alert actions
  const [alertOpenedContainer, setAlertOpenedContainer] = useState<any>(null);
  const [isAlertDrawerOpen, setIsAlertDrawerOpen] = useState(false);

  // Access control
  const {
    tryAddAsset,
    canAddAsset,
    showLimitModal,
    limitType,
    featureName,
    closeLimitModal,
    isReadOnly
  } = useAccessControl();

  // Page alerts — unified (items + containers)
  const { alerts: itemAlerts, loading: itemAlertsLoading } = usePageAlerts("item");
  const { alerts: containerAlerts, loading: containerAlertsLoading } = usePageAlerts("container");
  const allAlerts = [...itemAlerts, ...containerAlerts];
  const { items, loading: inventoryLoading } = useCacheInventory();

  const hasAssets = !inventoryLoading && items.length > 0;

  
  useEffect(() => {
    // Handle container highlight from global search
    const tab = searchParams.get('tab');
    const highlightId = searchParams.get('highlight');
    if (tab === 'containers' && highlightId) {
      (async () => {
        const { data } = await supabase.
        from("cache_boxes").
        select("*").
        eq("id", highlightId).
        maybeSingle();
        if (data) {
          setAlertOpenedContainer(data);
          setIsAlertDrawerOpen(true);
        }
      })();
      searchParams.delete('tab');
      searchParams.delete('highlight');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Handle opening container drawer from alert action
  const handleOpenContainerDrawer = (container: any) => {
    if (container) {
      setAlertOpenedContainer(container);
      setIsAlertDrawerOpen(true);
    }
  };

  return (
    <PermissionGuardedPage
      permission="view_assets"
      moduleName="Asset management"
      requiredRoles="Inventory Clerk, Supervisor, or Workspace Admin">
      <Helmet>
        <title>Inventory — OpsManagerPro</title>
        <meta name="description" content="Track every asset, container, and unit across your warehouse in real time. Search, filter, and manage your inventory from one place." />
        <link rel="canonical" href="https://opsmanagerpro.com/inventory" />
        <meta property="og:title" content="Inventory — OpsManagerPro" />
        <meta property="og:description" content="Real-time inventory tracking for warehouse teams." />
        <meta property="og:url" content="https://opsmanagerpro.com/inventory" />
      </Helmet>
    <div className="min-h-screen min-h-[100dvh] bg-background flex flex-col">
      <Navigation />
      
      <PageTransitionWrapper>
        <main className="flex-1 max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 safe-area-inset-bottom w-full">
        

          {/* Hide header on mobile for full-width mobile experience */}
          {!isMobile &&
            <>
              <div className="mb-3">
                <Breadcrumbs items={[
                { label: "Dashboard", href: "/dashboard" },
                { label: "Assets" }]
                } />
              </div>
              
              <UpgradeLimitModal
                open={showLimitModal}
                onClose={closeLimitModal}
                limitType={limitType}
                featureName={featureName} />
              
              
              <div className="mb-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h1 className="text-xl font-bold tracking-tight">Assets</h1>
                </div>
              </div>

              {/* Adaptive guidance header for assets module */}
              <GuidanceHeader group="assets" className="mb-3" />
            </>
            }

          {/* Unified Alerts */}
          {allAlerts.length > 0








            }

          {/* Move item hint — shows once when user has assets */}
          {hasAssets &&
            <InlineHint hintKey="inventory_move_hint" autoFadeMs={15000} className="mb-3" action={{ label: "View Items", onClick: () => navigate("/inventory") }}>
              Use the ••• menu on any item to move it between containers or storage areas.
            </InlineHint>
            }

          {/* Feature discovery: containers */}
          {hasAssets &&
            <FeatureDiscoveryCard
              discoveryKey="asset_containers"
              tip="Group related items into containers to keep your inventory organized and easy to find."
              showAfterVisits={2}
              className="mb-3" />

            }

          {/* Single unified inventory view */}
          <div data-tour="inventory-table">
            <SimplifiedInventoryTable />
          </div>
        </main>
      </PageTransitionWrapper>
      
      {/* Container drawer opened from alert action */}
      <BoxDetailsDrawer
          box={alertOpenedContainer}
          isOpen={isAlertDrawerOpen}
          onClose={() => {
            setIsAlertDrawerOpen(false);
            setAlertOpenedContainer(null);
          }} />
        
      
      <LegalFooter />
    </div>
    </PermissionGuardedPage>);

};

export default Inventory;