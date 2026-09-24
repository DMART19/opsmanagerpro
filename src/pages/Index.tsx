import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardQuickActions } from "@/components/dashboard/DashboardQuickActions";
import { DashboardHeroInsight } from "@/components/dashboard/DashboardHeroInsight";
import { SecondaryMetrics } from "@/components/dashboard/SecondaryMetrics";
import { LayoutPlannerWidgets } from "@/components/dashboard/LayoutPlannerWidgets";
import { TodaysTasks } from "@/components/dashboard/TodaysTasks";
import { CheckoutsTable } from "@/components/dashboard/CheckoutsTable";
import { AlertFeed } from "@/components/dashboard/AlertFeed";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { EquipmentStatusChart } from "@/components/dashboard/EquipmentStatusChart";
import { NeedsAttentionPanel } from "@/components/dashboard/NeedsAttentionPanel";
import { WorkspaceInsightsPanel } from "@/components/dashboard/WorkspaceInsightsPanel";
import { useDashboardConfig, DashboardCustomization, DashboardConfigProvider } from "@/components/dashboard/DashboardCustomization";
import { MobileDashboardLoadingSkeleton } from "@/components/dashboard/DashboardLoadingSkeleton";
import { MobileDashboardView } from "@/components/dashboard/mobile";
import { LegalFooter } from "@/components/LegalFooter";
import { UpgradeLimitModal } from "@/components/subscription";
import { PageTransitionWrapper } from "@/components/PageTransitionWrapper";
import { InlineHint } from "@/components/ui/inline-hint";
import { FeatureDiscoveryCard } from "@/components/discovery";
import { GuidanceTooltip } from "@/components/guidance";
import { AddCacheItemModal } from "@/components/inventory/AddCacheItemModal";
import { AddTeamMemberModal } from "@/components/people/AddTeamMemberModal";
import { AddBoxModal } from "@/components/inventory/AddBoxModal";

import { AddTaskModal } from "@/components/calendar/AddTaskModal";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";



import { useIsMobile } from "@/hooks/use-mobile";
import { useCheckouts } from "@/hooks/use-checkouts";
import { useMaintenance } from "@/hooks/use-maintenance";
import { useTasks } from "@/hooks/use-tasks";
import { useLowStockItems, useInUseAssets } from "@/hooks/use-unified-stats";
import { useDashboardReady } from "@/hooks/use-dashboard-stats";
import { useAccessControl } from "@/hooks/use-access-control";
import { useDashboardRealtime } from "@/hooks/use-dashboard-realtime";
import { useOnboardingContext } from "@/hooks/use-onboarding-context";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

// Lightweight skeleton for KPI row while individual queries resolve
const MetricRowSkeleton = () => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 mb-5">
    {[0, 1, 2, 3].map((i) => (
      <div
        key={i}
        className="rounded-2xl border border-border/50 bg-card p-5 lg:p-6 animate-fade-in"
        style={{ boxShadow: "var(--shadow-metric)", animationDelay: `${i * 60}ms`, animationFillMode: "both" }}
      >
        <div className="flex items-center justify-between mb-5">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="h-4 w-4 rounded" />
        </div>
        <Skeleton className="h-8 w-16 mb-2" />
        <Skeleton className="h-4 w-24" />
      </div>
    ))}
  </div>
);

const HeroSkeleton = () => (
  <div className="mb-10">
    <div className="flex items-center gap-4 p-6 rounded-xl bg-card border border-border/40" style={{ boxShadow: "var(--shadow-card)" }}>
      <Skeleton className="h-14 w-14 rounded-2xl flex-shrink-0" />
      <div className="flex-1 space-y-2.5">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-10 w-20 rounded-lg hidden sm:block" />
    </div>
  </div>
);

const DashboardContent = () => {
  const isMobile = useIsMobile();
  const [addAssetOpen, setAddAssetOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addContainerOpen, setAddContainerOpen] = useState(false);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [showFullDashboard, setShowFullDashboard] = useState(false);
  const { isFirstSession, loading: onboardingLoading } = useOnboardingContext();
  const heroOnlyMode = !isMobile && !onboardingLoading && isFirstSession && !showFullDashboard;

  const {
    tryAddAsset,
    tryAddTeamMember,
    showLimitModal,
    limitType,
    featureName,
    closeLimitModal,
  } = useAccessControl();

  const handleAddAsset = () => {
    if (tryAddAsset()) setAddAssetOpen(true);
  };
  const handleAddMember = () => {
    if (tryAddTeamMember()) setAddMemberOpen(true);
  };

  const {
    config,
    updateSectionVisibility,
    updateMetricVisibility,
    updateShowWhenEmpty,
    resetToDefault,
    isSectionVisible,
    shouldShowWhenEmpty,
  } = useDashboardConfig();

  // Fast-path: only used to drive mobile skeleton — desktop renders immediately
  const { loading: dashboardLoading } = useDashboardReady();
  useDashboardRealtime();

  // Data hooks for section visibility (load in parallel, non-blocking)
  const { checkouts, loading: loadingCheckouts } = useCheckouts();
  const { maintenanceRecords, loading: loadingMaintenance } = useMaintenance();
  const { tasks, isLoading: loadingTasks } = useTasks();
  const { lowStockItems, criticalStockItems, loading: loadingStock } = useLowStockItems();
  const { inUseItems, loading: loadingInUse } = useInUseAssets();

  const alertsLoading = loadingCheckouts || loadingMaintenance || loadingTasks || loadingStock;
  const hasAlerts = alertsLoading ? null : (
    checkouts.some(c => c.due_date && new Date(c.due_date) < new Date()) ||
    maintenanceRecords.some(r => r.next_maintenance_date && new Date(r.next_maintenance_date) < new Date()) ||
    lowStockItems.length > 0 || criticalStockItems.length > 0
  );

  const tasksLoading = loadingMaintenance || loadingTasks;
  const hasTasks = tasksLoading ? null : (maintenanceRecords.length > 0 || tasks.length > 0);
  const hasCheckouts = loadingInUse ? null : inUseItems.length > 0;

  const shouldRenderSection = (id: string, hasData: boolean | null) => {
    if (!isSectionVisible(id)) return false;
    if (hasData === null) return true;
    if (hasData) return true;
    return shouldShowWhenEmpty(id);
  };

  return (
    <main className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 pt-0 pb-12 safe-area-inset-bottom">
      {isMobile ? (
        dashboardLoading ? (
          <MobileDashboardLoadingSkeleton />
        ) : (
          <>
            <div className="flex items-center justify-between mb-4 pt-3">
              <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
              <DashboardCustomization
                config={config}
                onSectionToggle={updateSectionVisibility}
                onMetricToggle={updateMetricVisibility}
                onShowWhenEmptyToggle={updateShowWhenEmpty}
                onReset={resetToDefault}
              />
            </div>
            <MobileDashboardView
              onAddAsset={handleAddAsset}
              onAddMember={handleAddMember}
              onAddContainer={() => setAddContainerOpen(true)}
              onAddTask={() => setAddTaskOpen(true)}
            />
          </>
        )
      ) : (
        // Desktop: render shell immediately, sections populate as data arrives
        <>
          <DashboardHeader
            config={config}
            onSectionToggle={updateSectionVisibility}
            onMetricToggle={updateMetricVisibility}
            onShowWhenEmptyToggle={updateShowWhenEmpty}
            onReset={resetToDefault}
          />

          {heroOnlyMode ? (
            <div className="animate-fade-in">
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" strokeWidth={1.75} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Welcome — start here</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Your most important item is below. Handle it first, then explore the full dashboard.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFullDashboard(true)}
                  className="flex-shrink-0"
                >
                  Show full dashboard
                </Button>
              </div>

              <div className="mb-6">
                <DashboardHeroInsight onAddAsset={handleAddAsset} />
              </div>

              <div className="mb-6">
                <NeedsAttentionPanel />
              </div>

              <DashboardQuickActions
                onAddAsset={handleAddAsset}
                onAddMember={handleAddMember}
                onAddContainer={() => setAddContainerOpen(true)}
                onAddTask={() => setAddTaskOpen(true)}
              />
            </div>
          ) : (
          <>

          {/* Feature Discovery */}

          {/* Feature Discovery */}
          <FeatureDiscoveryCard
            discoveryKey="dashboard_customize"
            tip="Customize your dashboard layout — toggle sections and metrics using the gear icon in the header."
            showAfterVisits={3}
            className="mb-4"
          />

          {/* System Status */}
          <div className="mb-4 animate-fade-in">
            {isSectionVisible("insights") && <DashboardHeroInsight hideAllClear onAddAsset={handleAddAsset} />}
          </div>

          {/* 1️⃣ Primary Actions — instant, no data needed */}
          <GuidanceTooltip
            guidanceId="dashboard_quick_actions"
            message="Use these buttons to quickly add assets, team members, containers, or tasks without navigating away."
            variant="minimal"
            action={{ label: "+ Add Asset", onClick: handleAddAsset }}
          />
          <DashboardQuickActions
            onAddAsset={handleAddAsset}
            onAddMember={handleAddMember}
            onAddContainer={() => setAddContainerOpen(true)}
            onAddTask={() => setAddTaskOpen(true)}
          />

          {/* Needs Attention + Alerts */}
          {shouldRenderSection("activity-alerts", hasAlerts) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5 mb-5 animate-fade-in" style={{ animationDelay: "60ms", animationFillMode: "both" }}>
              <NeedsAttentionPanel />
              <AlertFeed />
            </div>
          )}

          {/* 3️⃣ KPI Cards — independent data, renders own skeleton */}
          <InlineHint hintKey="dashboard_nav" className="mb-3" action={{ label: "View Assets", onClick: () => window.location.assign("/inventory") }}>
            Click any metric card to jump directly to that section.
          </InlineHint>

          {isSectionVisible("stat-cards") && <div data-tour="stat-cards"><SecondaryMetrics /></div>}

          <div className="mb-5"><LayoutPlannerWidgets /></div>

          {/* ── Main Dashboard Grid: 2-column on desktop ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5 mb-5 animate-fade-in" style={{ animationDelay: "100ms", animationFillMode: "both" }}>
            {/* Left column */}
            <div className="space-y-4 lg:space-y-5">
              {isSectionVisible("asset-status") && (
                <EquipmentStatusChart onAddAsset={handleAddAsset} />
              )}
              {isSectionVisible("activity-alerts") && (
                <RecentActivity />
              )}
            </div>

            {/* Right column */}
            <div className="space-y-4 lg:space-y-5">
              <WorkspaceInsightsPanel />

              {shouldRenderSection("tasks", hasTasks) && (
                <TodaysTasks />
              )}

              {shouldRenderSection("checkouts", hasCheckouts) && (
                <CheckoutsTable />
              )}
            </div>
          </div>
          </>
          )}
        </>
      )}

      
      <AddCacheItemModal open={addAssetOpen} onOpenChange={setAddAssetOpen} onAdded={() => {}} />
      <AddTeamMemberModal open={addMemberOpen} onOpenChange={setAddMemberOpen} onSuccess={() => {}} />
      <AddBoxModal isOpen={addContainerOpen} onClose={() => setAddContainerOpen(false)} onCreateAnother={() => { setAddContainerOpen(false); setTimeout(() => setAddContainerOpen(true), 150); }} />
      <AddTaskModal open={addTaskOpen} onOpenChange={setAddTaskOpen} />
      <UpgradeLimitModal open={showLimitModal} onClose={closeLimitModal} limitType={limitType} featureName={featureName} />
    </main>
  );
};

const Index = () => {
  return (
    <div className="min-h-screen min-h-[100dvh] bg-background">
      <Navigation />

      <PageTransitionWrapper>
        <DashboardConfigProvider>
          <DashboardContent />
        </DashboardConfigProvider>
      </PageTransitionWrapper>

      <LegalFooter />
    </div>
  );
};

export default Index;
