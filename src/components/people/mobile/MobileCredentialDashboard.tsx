import { Users, Clock, FileX, AlertTriangle } from "lucide-react";
import { useRequirementsData } from "@/hooks/use-requirements-data";
import { useEmployeesData } from "@/hooks/use-employees-data";
import { useUnifiedStats } from "@/hooks/use-unified-stats";
import { Skeleton } from "@/components/ui/skeleton";
import { useTeamFilter, TeamFilterType } from "@/contexts/TeamFilterContext";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

export const MobileCredentialDashboard = () => {
  const { requirements, loading: reqLoading } = useRequirementsData();
  const { employees, loading: empLoading } = useEmployeesData();
  const { team, credentials, loading: statsLoading } = useUnifiedStats();
  const { activeFilter, setActiveFilter } = useTeamFilter();

  const loading = reqLoading || empLoading || statsLoading;

  // Compute missing vs expired member counts
  const { missingCount, expiredCount } = useMemo(() => {
    let missing = 0;
    let expired = 0;
    employees.forEach((emp: any) => {
      const stats = emp.requirements_stats || {};
      if (stats.total > 0) {
        // Check individual requirement statuses if available
        const hasMissing = (stats.missing ?? 0) > 0;
        const hasExpired = (stats.expired ?? 0) > 0;
        // Fallback: missing_expired is the combined count
        if (hasMissing || hasExpired) {
          if (hasExpired) expired++;
          if (hasMissing) missing++;
        } else if (stats.missing_expired > 0) {
          // Can't distinguish — count as missing
          missing++;
        }
      }
    });
    return { missingCount: missing, expiredCount: expired };
  }, [employees]);

  const hasCredentials = useMemo(() =>
    requirements.length > 0 &&
    employees.some((emp: any) => emp.requirements_stats?.total > 0),
  [requirements, employees]);

  // Compliance progress bar data (must be before early returns)
  const complianceData = useMemo(() => {
    if (!hasCredentials || team.total === 0) return null;
    const compliant = team.compliant ?? (team.total - team.expiringSoon - (missingCount + expiredCount));
    const expiring = team.expiringSoon;
    const actionNeeded = missingCount + expiredCount;
    const total = team.total;
    const compliantPct = Math.round((Math.max(0, compliant) / total) * 100);
    const expiringPct = Math.round((expiring / total) * 100);
    const actionPct = Math.round((actionNeeded / total) * 100);
    return { compliantPct, expiringPct, actionPct, total };
  }, [hasCredentials, team, missingCount, expiredCount]);

  if (!loading && employees.length === 0) return null;

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-2.5 mb-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[72px] rounded-2xl" />
        ))}
      </div>
    );
  }

  const handleClick = (filter: TeamFilterType) => {
    setActiveFilter(activeFilter === filter ? null : filter);
  };

  const cards: {
    label: string;
    value: number;
    icon: typeof Users;
    colorClass: string;
    bgClass: string;
    filter: TeamFilterType;
    hide?: boolean;
  }[] = [
    {
      label: "Members",
      value: team.total,
      icon: Users,
      colorClass: "text-primary",
      bgClass: "bg-primary/8",
      filter: "all",
    },
    {
      label: "Expiring",
      value: team.expiringSoon,
      icon: Clock,
      colorClass: team.expiringSoon > 0 ? "text-warning" : "text-muted-foreground/50",
      bgClass: team.expiringSoon > 0 ? "bg-warning/8" : "bg-muted/30",
      filter: "expiring-soon",
      hide: !hasCredentials,
    },
    {
      label: "Missing",
      value: missingCount,
      icon: FileX,
      colorClass: missingCount > 0 ? "text-orange-500" : "text-muted-foreground/50",
      bgClass: missingCount > 0 ? "bg-orange-500/8" : "bg-muted/30",
      filter: "incomplete",
      hide: !hasCredentials,
    },
    {
      label: "Expired",
      value: expiredCount,
      icon: AlertTriangle,
      colorClass: expiredCount > 0 ? "text-destructive" : "text-muted-foreground/50",
      bgClass: expiredCount > 0 ? "bg-destructive/8" : "bg-muted/30",
      filter: "incomplete",
      hide: !hasCredentials,
    },
  ];

  const visibleCards = cards.filter((c) => !c.hide);

  return (
    <div className="space-y-3 mb-3">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-2.5">
        {visibleCards.map((card) => {
          const isActive = activeFilter === card.filter;
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              onClick={() => handleClick(card.filter)}
              className={cn(
                "flex flex-col items-start gap-1 p-3.5 rounded-2xl text-left transition-all duration-150",
                "active:scale-[0.97]",
                isActive
                  ? "bg-primary/10 ring-1 ring-primary/25 shadow-sm"
                  : cn(card.bgClass, "border border-border/10")
              )}
            >
              <div className="flex items-center justify-between w-full">
                <span className={cn(
                  "text-2xl font-bold tabular-nums leading-none",
                  isActive ? "text-primary" : card.colorClass
                )}>
                  {card.value}
                </span>
                <Icon className={cn(
                  "h-4 w-4",
                  isActive ? "text-primary/60" : cn(card.colorClass, "opacity-50")
                )} />
              </div>
              <span className={cn(
                "text-xs font-medium",
                isActive ? "text-primary/80" : "text-muted-foreground/70"
              )}>
                {card.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Compliance progress bar */}
      {complianceData && (
        <div className="rounded-2xl border border-border/10 bg-card p-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-foreground">
              Team Credential Compliance
            </span>
            <span className={cn(
              "text-sm font-bold tabular-nums",
              complianceData.compliantPct >= 80
                ? "text-emerald-600 dark:text-emerald-400"
                : complianceData.compliantPct >= 50
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-destructive"
            )}>
              {complianceData.compliantPct}% compliant
            </span>
          </div>
          <div className="h-3 w-full rounded-full bg-muted overflow-hidden flex">
            {complianceData.compliantPct > 0 && (
              <div
                className="h-full bg-emerald-500 dark:bg-emerald-400 transition-all duration-500 ease-out first:rounded-l-full"
                style={{ width: `${complianceData.compliantPct}%` }}
              />
            )}
            {complianceData.expiringPct > 0 && (
              <div
                className="h-full bg-amber-400 dark:bg-amber-500 transition-all duration-500 ease-out"
                style={{ width: `${complianceData.expiringPct}%` }}
              />
            )}
            {complianceData.actionPct > 0 && (
              <div
                className="h-full bg-destructive transition-all duration-500 ease-out last:rounded-r-full"
                style={{ width: `${complianceData.actionPct}%` }}
              />
            )}
          </div>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400" />
              <span className="text-[10px] text-muted-foreground">Compliant</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-amber-400 dark:bg-amber-500" />
              <span className="text-[10px] text-muted-foreground">Expiring</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-destructive" />
              <span className="text-[10px] text-muted-foreground">Missing</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
