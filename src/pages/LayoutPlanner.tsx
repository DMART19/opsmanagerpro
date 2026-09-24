import { lazy, Suspense, useEffect, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { LegalFooter } from "@/components/LegalFooter";
import { PageLoader } from "@/components/PageLoader";
import { WorkflowTabs, useActiveLayoutPlannerTab } from "@/components/layout-planner/WorkflowTabs";
import { LoadPlanSummaryTab } from "@/components/layout-planner/LoadPlanSummaryTab";
import { LayoutPlannerProvider } from "@/components/layout-planner/LayoutPlannerContext";
import { PlannerSummaryBar } from "@/components/layout-planner/PlannerSummaryBar";

const PalletBuilder = lazy(() => import("./PalletBuilder"));
const TrailerBuilder = lazy(() => import("./TrailerBuilder"));

const LayoutPlanner = () => {
  const [active, setActive] = useActiveLayoutPlannerTab();

  const headerByTab: Record<string, { title: string; subtitle: string }> = {
    pallets: { title: "Build Pallets", subtitle: "How should inventory be organized onto pallets?" },
    trailers: { title: "Build Load", subtitle: "Place pallets into a trailer, box truck, flatbed, pickup truck, van, or container." },
    summary: { title: "Ready to Ship", subtitle: "Is this shipment ready to leave the warehouse?" },
  };
  const header = headerByTab[active] || { title: "Layout Planner", subtitle: "" };

  return (
    <LayoutPlannerProvider>
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />

      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-[1920px] mx-auto px-4 lg:px-8 py-2">
          <Breadcrumbs items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Layout Planner" },
          ]} />
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-lg font-semibold">{header.title}</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                {header.subtitle}
              </p>
            </div>
          </div>
        </div>
      </div>

      <WorkflowTabs active={active} onChange={setActive} />
      {active !== "trailers" && <PlannerSummaryBar />}

      <main className="flex-1 flex flex-col min-h-0">
        {/* Keep each tab mounted once visited so state survives switches.
            `hidden` removes from layout/painting but keeps React tree alive. */}
        <TabPane visible={active === "pallets"}>
          <Suspense fallback={<PageLoader />}>
            <PalletBuilder embedded />
          </Suspense>
        </TabPane>
        <TabPane visible={active === "trailers"}>
          <Suspense fallback={<PageLoader />}>
            <TrailerBuilder embedded />
          </Suspense>
        </TabPane>
        <TabPane visible={active === "summary"}>
          <LoadPlanSummaryTab />
        </TabPane>
      </main>

      <LegalFooter />
    </div>
    </LayoutPlannerProvider>
  );
};

export default LayoutPlanner;

/**
 * Renders children lazily on first visit, then keeps them mounted but
 * hidden when not active. Prevents losing in-progress pallet/trailer state
 * while still avoiding the initial cost of mounting every tab upfront.
 */
const TabPane = ({ visible, children }: { visible: boolean; children: React.ReactNode }) => {
  const [mounted, setMounted] = useState(visible);
  useEffect(() => {
    if (visible && !mounted) setMounted(true);
  }, [visible, mounted]);
  if (!mounted) return null;
  return (
    <div className={visible ? "flex flex-col flex-1 min-h-0" : "hidden"} aria-hidden={!visible}>
      {children}
    </div>
  );
};