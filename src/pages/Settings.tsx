import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { GuidanceTooltip } from "@/components/guidance";
import { Navigation } from "@/components/Navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { LegalFooter } from "@/components/LegalFooter";
import { PageTransitionWrapper } from "@/components/PageTransitionWrapper";
import { PermissionGuardedPage } from "@/components/permissions/PermissionGuardedPage";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Building2, Bell, Lock, ChevronRight, Settings as SettingsIcon, Check, Loader2, AlertCircle, ShieldCheck, ScrollText, Database, Shield, Clock, History, Wand2 } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useWorkspacePermissions } from "@/hooks/use-workspace-permissions";

// Tab Components
import { WorkspaceTab } from "@/components/settings/WorkspaceTab";
import { NotificationsTab } from "@/components/settings/NotificationsTab";
import { SecurityTab } from "@/components/settings/SecurityTab";
import { TeamPermissionsTab } from "@/components/settings/TeamPermissionsTab";
import { SecurityLogTab } from "@/components/settings/SecurityLogTab";
import { SystemLogsTab } from "@/components/settings/SystemLogsTab";
import { DataExportTab } from "@/components/settings/DataExportTab";
import { TimeMachineTab } from "@/components/settings/TimeMachineTab";

import { DataAccessHistoryTab } from "@/components/settings/DataAccessHistoryTab";
import { DataHealthPanel } from "@/components/settings/DataHealthPanel";


type SaveStatus = "idle" | "saving" | "saved" | "error";

const SaveIndicator = ({ status }: { status: SaveStatus }) => {
  if (status === "idle") return null;
  return (
    <div className={cn(
      "flex items-center gap-1.5 text-xs font-medium transition-opacity duration-300",
      status === "saving" && "text-muted-foreground",
      status === "saved" && "text-primary",
      status === "error" && "text-destructive",
    )}>
      {status === "saving" && <><Loader2 className="h-3 w-3 animate-spin" /> Saving…</>}
      {status === "saved" && <><Check className="h-3 w-3" /> Saved</>}
      {status === "error" && <><AlertCircle className="h-3 w-3" /> Unsaved changes</>}
    </div>
  );
};

interface TabDef {
  id: string;
  label: string;
  icon: any;
  description: string;
  section?: string;
}

const Settings = () => {
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState(() => searchParams.get("tab") || "workspace");
  const [showTabList, setShowTabList] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  
  const {
    workspaceSettings,
    notificationSettings,
    loading,
    saving,
    saveWorkspaceSettings,
    saveNotificationSettings,
  } = useSettings();

  const { hasPermission } = useWorkspacePermissions();

  const handleSave = async (saveFn: () => Promise<boolean>) => {
    setSaveStatus("saving");
    const success = await saveFn();
    setSaveStatus(success ? "saved" : "error");
    if (success) {
      setTimeout(() => setSaveStatus("idle"), 2000);
    }
    return success;
  };

  const handleSaveWorkspace = async (settings: typeof workspaceSettings) => {
    return handleSave(() => saveWorkspaceSettings(settings));
  };

  const handleSaveNotifications = async (settings: typeof notificationSettings) => {
    return handleSave(() => saveNotificationSettings(settings));
  };

  const tabs: TabDef[] = [
    { id: "workspace", label: "Workspace", icon: Building2, description: "Name and preferences", section: "General" },
    { id: "notifications", label: "Notifications", icon: Bell, description: "Alert preferences", section: "General" },
    { id: "security", label: "Security", icon: Lock, description: "Password and sessions", section: "General" },
    { id: "time-machine", label: "Time Machine", icon: Clock, description: "Restore workspace state", section: "Data Protection" },
    { id: "data-health", label: "Data Health", icon: Wand2, description: "Detect & fix misplaced data", section: "Data Protection" },
    { id: "data-export", label: "Data Export", icon: Database, description: "Export workspace data", section: "Data Protection" },
    { id: "access-history", label: "Access History", icon: History, description: "Data access audit trail", section: "Data Protection" },
    ...(hasPermission("assign_roles")
      ? [
          { id: "permissions", label: "Team Permissions", icon: ShieldCheck, description: "Assign workspace roles", section: "Administration" },
          { id: "security-log", label: "Security Log", icon: ScrollText, description: "Permission change history", section: "Administration" },
          { id: "audit-log", label: "Audit Log", icon: ScrollText, description: "Record changes with export", section: "Administration" },
        ]
      : []),
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "workspace":
        return <WorkspaceTab settings={workspaceSettings} onSave={handleSaveWorkspace} saving={saving} />;
      case "notifications":
        return <NotificationsTab settings={notificationSettings} onSave={handleSaveNotifications} saving={saving} />;
      case "security":
        return <SecurityTab />;
      case "time-machine":
        return <TimeMachineTab />;
      case "data-health":
        return <DataHealthPanel />;
      case "data-export":
      case "data-export":
        return <DataExportTab />;
      case "access-history":
        return <DataAccessHistoryTab />;
      case "permissions":
        return <TeamPermissionsTab />;
      case "security-log":
        return <SecurityLogTab />;
      case "audit-log":
        return <SystemLogsTab />;
      default:
        return null;
    }
  };

  const handleTabSelect = (tabId: string) => {
    setActiveTab(tabId);
    setSaveStatus("idle");
    if (isMobile) setShowTabList(false);
  };

  // Group tabs by section for display
  const sections = tabs.reduce<Record<string, TabDef[]>>((acc, tab) => {
    const section = tab.section || "General";
    if (!acc[section]) acc[section] = [];
    acc[section].push(tab);
    return acc;
  }, {});

  return (
    <PermissionGuardedPage
      permission="manage_settings"
      moduleName="Workspace settings"
      requiredRoles="Workspace Admin"
    >
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      
      <PageTransitionWrapper>
        <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-24 w-full">
          {/* Header */}
          <div className="mb-4">
            {!isMobile && (
              <Breadcrumbs items={[
                { label: "Dashboard", href: "/dashboard" },
                { label: "Settings" }
              ]} />
            )}
            
            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center gap-2.5">
                <SettingsIcon className="h-5 w-5 text-muted-foreground" />
                <h1 className="text-lg sm:text-xl font-semibold text-foreground">
                  {isMobile && !showTabList ? tabs.find(t => t.id === activeTab)?.label : "Settings"}
                </h1>
              </div>
              <SaveIndicator status={saveStatus} />
            </div>
          </div>

          <GuidanceTooltip
            guidanceId="settings_intro"
            message="Customize your workspace name, notification preferences, and team permissions here. Changes save automatically."
          />

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          ) : (
            <>
              {/* Mobile: Tab List with sections */}
              {isMobile && showTabList && (
                <div className="space-y-5">
                  {Object.entries(sections).map(([sectionName, sectionTabs]) => (
                    <div key={sectionName} className="space-y-2">
                      <div className="flex items-center gap-2 px-1">
                        {sectionName === "Data Protection" && <Shield className="h-3.5 w-3.5 text-muted-foreground" />}
                        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{sectionName}</h2>
                      </div>
                      {sectionTabs.map((tab, index) => {
                        const Icon = tab.icon;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => handleTabSelect(tab.id)}
                            className="w-full flex items-center gap-3 p-3.5 bg-card rounded-lg border border-border/50 hover:border-border active:scale-[0.99] transition-all duration-150 animate-fade-in"
                            style={{ animationDelay: `${index * 40}ms` }}
                          >
                            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="flex-1 text-left">
                              <p className="text-sm font-medium">{tab.label}</p>
                              <p className="text-xs text-muted-foreground">{tab.description}</p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}

              {/* Mobile: Content with Back */}
              {isMobile && !showTabList && (
                <div className="space-y-3">
                  <button
                    onClick={() => { setShowTabList(true); setSaveStatus("idle"); }}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronRight className="h-3.5 w-3.5 rotate-180" />
                    Back
                  </button>
                  {renderTabContent()}
                </div>
              )}

              {/* Desktop: Tabs */}
              {!isMobile && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    {Object.entries(sections).map(([sectionName, sectionTabs]) => (
                      <div key={sectionName} className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider whitespace-nowrap">{sectionName}</span>
                        <div className="flex gap-0.5 p-0.5 bg-muted/50 rounded-lg">
                          {sectionTabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                              <button
                                key={tab.id}
                                onClick={() => handleTabSelect(tab.id)}
                                className={cn(
                                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150",
                                  isActive 
                                    ? "bg-background text-foreground shadow-sm" 
                                    : "text-muted-foreground hover:text-foreground"
                                )}
                              >
                                <Icon className="h-3.5 w-3.5" />
                                {tab.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="animate-fade-in">
                    {renderTabContent()}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </PageTransitionWrapper>
      
      <LegalFooter />
    </div>
    </PermissionGuardedPage>
  );
};

export default Settings;
