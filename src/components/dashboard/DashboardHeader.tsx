import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DashboardCustomization, useDashboardConfig } from "@/components/dashboard/DashboardCustomization";
import { useSettingsOptional } from "@/contexts/SettingsContext";
import { useUnifiedStats } from "@/hooks/use-unified-stats";
import { cn } from "@/lib/utils";
import { CheckCircle, AlertTriangle, AlertCircle } from "lucide-react";

interface DashboardHeaderProps {
  config: ReturnType<typeof useDashboardConfig>['config'];
  onSectionToggle: (sectionId: string, visible: boolean) => void;
  onMetricToggle: (metricId: string, visible: boolean) => void;
  onShowWhenEmptyToggle: (id: string, show: boolean) => void;
  onReset: () => void;
}

export const DashboardHeader = ({
  config,
  onSectionToggle,
  onMetricToggle,
  onShowWhenEmptyToggle,
  onReset,
}: DashboardHeaderProps) => {
  const settings = useSettingsOptional();
  const workspaceName = settings?.workspaceSettings?.workspace_name || "My Workspace";
  const { assets, credentials, maintenance, loading } = useUnifiedStats();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  // Build system summary line
  const getSystemSummary = () => {
    if (loading) return null;

    const issues: string[] = [];
    
    if (credentials.expired > 0) {
      issues.push(`${credentials.expired} credential${credentials.expired > 1 ? 's' : ''} expired`);
    }
    if (credentials.expiringSoon > 0) {
      issues.push(`${credentials.expiringSoon} expiring soon`);
    }
    if (maintenance.dueThisWeek > 0) {
      issues.push(`${maintenance.dueThisWeek} task${maintenance.dueThisWeek > 1 ? 's' : ''} due this week`);
    }

    if (issues.length === 0) {
      return {
        text: "All systems operational — nothing needs attention.",
        icon: CheckCircle,
        color: "text-success" as const,
      };
    }

    const hasCritical = credentials.expired > 0;
    return {
      text: issues.join(" · "),
      icon: hasCritical ? AlertCircle : AlertTriangle,
      color: hasCritical ? "text-destructive" as const : "text-warning" as const,
    };
  };

  const summary = getSystemSummary();

  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4 pt-4" data-tour="dashboard">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {getGreeting()}
        </h1>
        <p className="text-sm text-muted-foreground">
          Here's what's happening in {workspaceName}.
        </p>
      </div>
      
      <div className="flex items-center gap-2 shrink-0">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <DashboardCustomization 
                  config={config} 
                  onSectionToggle={onSectionToggle} 
                  onMetricToggle={onMetricToggle} 
                  onShowWhenEmptyToggle={onShowWhenEmptyToggle}
                  onReset={onReset} 
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">Customize which sections appear on your dashboard.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};
