import { Navigation } from "@/components/Navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { CalendarView } from "@/components/calendar/CalendarView";
import { LegalFooter } from "@/components/LegalFooter";
import { PageTransitionWrapper } from "@/components/PageTransitionWrapper";
// Walkthrough removed
import { FeatureDiscoveryCard } from "@/components/discovery";
import { GuidanceHeader } from "@/components/guidance/GuidanceHeader";
import { useIsMobile } from "@/hooks/use-mobile";
import { useIsDesktop } from "@/hooks/use-desktop";
import { useSettingsOptional } from "@/contexts/SettingsContext";
import { PermissionGuardedPage } from "@/components/permissions/PermissionGuardedPage";


const Calendar = () => {
  const isMobile = useIsMobile();
  const isDesktop = useIsDesktop();
  const settings = useSettingsOptional();
  const workspaceName = settings?.workspaceSettings?.workspace_name || "My Workspace";


  return (
    <PermissionGuardedPage
      permission="use_calendar"
      moduleName="Calendar scheduling"
      requiredRoles="Supervisor or Workspace Admin"
    >
    <div className="min-h-screen min-h-[100dvh] bg-background flex flex-col">
      <Navigation />
      
      <PageTransitionWrapper>
        <main className="flex-1 max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 sm:pb-8 safe-area-inset-bottom w-full">
        {isDesktop && (
          <Breadcrumbs items={[
            { label: workspaceName },
            { label: "Dashboard", href: "/dashboard" },
            { label: "Calendar" }
          ]} />
        )}

        <div className="mb-4 sm:mb-6 lg:mb-8 animate-fade-in">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground tracking-tight">Calendar</h1>
          {isDesktop && (
            <p className="text-sm sm:text-base text-muted-foreground mt-1.5 sm:mt-2 leading-relaxed">
              Click any date to add an event. Use filters to find specific entries.
            </p>
          )}
        </div>

        {/* Adaptive guidance header for calendar module */}
        <GuidanceHeader group="calendar" className="mb-4" />


        <FeatureDiscoveryCard
          discoveryKey="calendar_recurring"
          tip="Set tasks as recurring to automatically schedule repeating events on your calendar."
          showAfterVisits={2}
          className="mb-4"
        />
        
        <div data-tour="calendar-grid">
          <CalendarView />
        </div>
        </main>
      </PageTransitionWrapper>
      
      <LegalFooter />
    </div>
    </PermissionGuardedPage>
  );
};

export default Calendar;
