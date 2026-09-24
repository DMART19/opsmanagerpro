import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Navigation } from "@/components/Navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { LegalFooter } from "@/components/LegalFooter";
import { PageTransitionWrapper } from "@/components/PageTransitionWrapper";
import { Employees } from "@/components/people/Employees";
import { InlineAlertBanner } from "@/components/alerts";
// Walkthrough removed
import { InlineHint } from "@/components/ui/inline-hint";
import { FeatureDiscoveryCard } from "@/components/discovery";
import { TeamFilterProvider } from "@/contexts/TeamFilterContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePageAlerts } from "@/hooks/use-guardrail-alerts";
import { useEmployeesData } from "@/hooks/use-employees-data";
import { PermissionGuardedPage } from "@/components/permissions/PermissionGuardedPage";
import { GuidanceHeader } from "@/components/guidance/GuidanceHeader";



const People = () => {
  const isMobile = useIsMobile();

  const { alerts: teamAlerts, loading: alertsLoading, refetch: refetchAlerts } = usePageAlerts("team");
  const { employees, loading: employeesLoading, refetch } = useEmployeesData();
  const [inviteOpen, setInviteOpen] = useState(false);
  
  const hasMembers = !employeesLoading && employees.length > 0;

  return (
    <PermissionGuardedPage
      permission="view_team"
      moduleName="Team management"
      requiredRoles="Viewer, Safety Manager, or Workspace Admin"
    >
    <Helmet>
      <title>Team — OpsManagerPro</title>
      <meta name="description" content="Manage your team: members, roles, credentials, and compliance status — all in one place." />
      <link rel="canonical" href="https://opsmanagerpro.com/people" />
      <meta property="og:title" content="Team — OpsManagerPro" />
      <meta property="og:description" content="Manage members, roles, and credentials across your operations team." />
      <meta property="og:url" content="https://opsmanagerpro.com/people" />
    </Helmet>
    <div className="min-h-screen min-h-[100dvh] bg-background flex flex-col">
      <Navigation />
      
      <PageTransitionWrapper>
        <main className="flex-1 max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 safe-area-inset-bottom w-full">
        {!isMobile && (
          <>
            <div className="mb-4 sm:mb-6">
              <Breadcrumbs items={[
                { label: "Dashboard", href: "/dashboard" },
                { label: "Team" }
              ]} />
            </div>

            <div className="mb-6">
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground tracking-tight">Team</h1>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  Manage your team directory, roles, and credentials.
                </p>
              </div>
            </div>
          </>
        )}

        <TeamFilterProvider>
          <GuidanceHeader group="team" />
          
          {hasMembers && (
            <>
              <InlineHint hintKey="team_credentials_hint" autoFadeMs={15000} className="mb-4" action={{ label: "+ Assign Credential", onClick: () => setInviteOpen(true) }}>
                Assign credentials to team members to track certifications, licenses, and compliance requirements.
              </InlineHint>
              <FeatureDiscoveryCard
                discoveryKey="team_roles"
                tip="Assign roles to control what each team member can view and edit across your workspace."
                showAfterVisits={3}
                className="mb-4"
              />
            </>
          )}
          
          {teamAlerts.length > 0 && (
            <div className="mb-4">
              <InlineAlertBanner 
                alerts={teamAlerts} 
                loading={alertsLoading}
                maxVisible={3}
                onAlertResolved={refetchAlerts}
              />
            </div>
          )}

          <Employees externalInviteOpen={inviteOpen} onExternalInviteChange={setInviteOpen} />
        </TeamFilterProvider>
        </main>
      </PageTransitionWrapper>
      
      <LegalFooter />
    </div>
    </PermissionGuardedPage>
  );
};

export default People;
