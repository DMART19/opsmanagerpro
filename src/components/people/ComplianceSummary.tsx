import { Card } from "@/components/ui/card";
import { Users, TrendingUp, AlertCircle, XCircle, CheckCircle2 } from "lucide-react";
import { useRequirementsData } from "@/hooks/use-requirements-data";
import { useEmployeesData } from "@/hooks/use-employees-data";
import { useUnifiedStats } from "@/hooks/use-unified-stats";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TEAM_TOOLTIPS } from "@/lib/tooltip-content";
import { useTeamFilter, TeamFilterType } from "@/contexts/TeamFilterContext";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

export const ComplianceSummary = () => {
  const { requirements, loading: reqLoading } = useRequirementsData();
  const { employees, loading: empLoading } = useEmployeesData();
  const { team, loading: statsLoading } = useUnifiedStats();
  const { activeFilter, setActiveFilter } = useTeamFilter();

  const loading = reqLoading || empLoading || statsLoading;

  // Don't show anything if no employees exist
  if (!loading && employees.length === 0) {
    return null;
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }

  // Check if there are any requirement definitions AND any employees with assigned requirements
  const hasCredentialDefinitions = requirements.length > 0;
  
  // Count how many employees actually have credentials assigned
  const employeesWithCredentials = employees.filter(emp => 
    emp.requirements_stats && emp.requirements_stats.total > 0
  ).length;
  
  // Only show credential data if there are both definitions AND assignments
  const hasCredentials = hasCredentialDefinitions && employeesWithCredentials > 0;
  
  // Calculate totals from actual data
  let totalAssignments = 0;
  let totalCompliant = 0;
  let totalExpired = 0;
  let totalMissing = 0;
  let totalExpiringSoon = 0;

  if (hasCredentials) {
    totalAssignments = requirements.reduce((sum, req) => sum + (req.xTOTotal || 0), 0);
    totalCompliant = requirements.reduce((sum, req) => sum + (req.xCurrentTotal || 0), 0);
    totalExpired = requirements.reduce((sum, req) => sum + (req.xExpiredTotal || 0), 0);
    totalMissing = requirements.reduce((sum, req) => sum + (req.xMissingTotal || 0), 0);
    
    employees.forEach(emp => {
      if (emp.requirements_stats) {
        totalExpiringSoon += emp.requirements_stats.expiring_soon || 0;
      }
    });
  }

  const complianceRate = totalAssignments > 0 ? Math.round((totalCompliant / totalAssignments) * 100) : 0;
  
  // Use unified stats for member counts - this ensures sync across all components
  const employeeCount = team.total;
  const compliantMembers = team.compliant;
  const expiringSoonMembers = team.expiringSoon;
  const incompleteMembers = team.incomplete;

  const handleCardClick = (filter: TeamFilterType) => {
    if (activeFilter === filter) {
      setActiveFilter(null);
    } else {
      setActiveFilter(filter);
      // Scroll to the team table so filtered results are visible
      setTimeout(() => {
        const table = document.querySelector('[data-team-table], [data-tour="team-filters"]');
        if (table) {
          table.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  };

  const stats = [
    {
      title: "Total Members",
      value: employeeCount,
      subtitle: "Active roster",
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
      filter: "all" as TeamFilterType,
      memberCount: employeeCount,
    },
    {
      title: "Credentials Up to Date",
      value: hasCredentials ? `${complianceRate}%` : null,
      emptyText: "No credentials added yet",
      subtitle: hasCredentials 
        ? `${compliantMembers} member${compliantMembers !== 1 ? "s" : ""} fully compliant` 
        : null,
      icon: hasCredentials && complianceRate >= 90 ? CheckCircle2 : TrendingUp,
      color: hasCredentials 
        ? (complianceRate >= 90 ? "text-success" : complianceRate >= 70 ? "text-warning" : "text-muted-foreground") 
        : "text-muted-foreground",
      bgColor: hasCredentials 
        ? (complianceRate >= 90 ? "bg-success/10" : complianceRate >= 70 ? "bg-warning/10" : "bg-muted") 
        : "bg-muted",
      progress: hasCredentials && totalAssignments > 0 ? complianceRate : undefined,
      filter: "compliant" as TeamFilterType,
      memberCount: compliantMembers,
      disabled: !hasCredentials,
    },
    {
      title: "Expiring Soon",
      value: hasCredentials ? expiringSoonMembers : null,
      emptyText: "All credentials are up to date",
      subtitle: hasCredentials && expiringSoonMembers > 0 
        ? `${totalExpiringSoon} credential${totalExpiringSoon !== 1 ? "s" : ""} within 60 days`
        : null,
      icon: expiringSoonMembers > 0 ? AlertCircle : CheckCircle2,
      color: expiringSoonMembers > 0 ? "text-warning" : "text-success",
      bgColor: expiringSoonMembers > 0 ? "bg-warning/10" : "bg-success/10",
      filter: "expiring-soon" as TeamFilterType,
      memberCount: expiringSoonMembers,
      disabled: !hasCredentials || expiringSoonMembers === 0,
    },
    {
      title: "Action Required",
      value: hasCredentials ? incompleteMembers : null,
      emptyText: "All credentials are up to date",
      subtitle: hasCredentials && incompleteMembers > 0 
        ? `${totalExpired} credential${totalExpired !== 1 ? "s" : ""} expired`
        : null,
      icon: incompleteMembers > 0 ? XCircle : CheckCircle2,
      color: incompleteMembers > 0 
        ? (incompleteMembers <= 5 ? "text-warning" : "text-destructive") 
        : "text-success",
      bgColor: incompleteMembers > 0 
        ? (incompleteMembers <= 5 ? "bg-warning/10" : "bg-destructive/10") 
        : "bg-success/10",
      filter: "incomplete" as TeamFilterType,
      memberCount: incompleteMembers,
      disabled: !hasCredentials || incompleteMembers === 0,
    },
  ];

  const tooltips: Record<string, string> = {
    "Total Members": TEAM_TOOLTIPS.totalMembers,
    "Credentials Up to Date": TEAM_TOOLTIPS.credentialsComplete,
    "Expiring Soon": "Credentials expiring within 60 days.",
    "Action Required": "Expired credentials requiring renewal.",
  };

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" data-tour="team-metrics">
        {stats.map((stat) => {
          const isActive = activeFilter === stat.filter;
          const isClickable = !stat.disabled;
          
          return (
            <Card 
              key={stat.title} 
              className={cn(
                "p-5 bg-card border-border/50 transition-all duration-200",
                isClickable && "cursor-pointer hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5",
                isActive && "ring-2 ring-primary border-primary shadow-lg -translate-y-0.5",
                stat.disabled && "opacity-80"
              )}
              style={{ boxShadow: isActive ? undefined : "var(--shadow-metric)" }}
              onClick={() => isClickable && handleCardClick(stat.filter)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild>
                      <p className="text-xs text-muted-foreground/70 mb-1.5 cursor-help font-medium uppercase tracking-wide">
                        {stat.title}
                      </p>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-sm">
                      {tooltips[stat.title]}
                    </TooltipContent>
                  </Tooltip>
                  
                  {stat.value !== null ? (
                    <>
                      <p className={`text-[2rem] font-extrabold tracking-tight ${stat.color}`}>{stat.value}</p>
                      {stat.subtitle && (
                        <p className="text-xs text-muted-foreground/55 mt-1">{stat.subtitle}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-2">{stat.emptyText}</p>
                  )}
                  
                  {stat.progress !== undefined && (
                    <div className="mt-2">
                      <Progress value={stat.progress} className="h-1.5" />
                    </div>
                  )}
                </div>
                <div className={cn("p-2.5 rounded-xl", stat.bgColor)}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
              
              {isActive && (
                <div className="mt-3 pt-3 border-t border-primary/20">
                  <p className="text-xs text-primary font-medium">
                    Showing {stat.memberCount} member{stat.memberCount !== 1 ? "s" : ""} →
                  </p>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </TooltipProvider>
  );
};
