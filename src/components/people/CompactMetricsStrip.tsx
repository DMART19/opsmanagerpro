import { Users, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { useRequirementsData } from "@/hooks/use-requirements-data";
import { useEmployeesData } from "@/hooks/use-employees-data";
import { useUnifiedStats } from "@/hooks/use-unified-stats";
import { Skeleton } from "@/components/ui/skeleton";
import { useTeamFilter, TeamFilterType } from "@/contexts/TeamFilterContext";
import { cn } from "@/lib/utils";

export const CompactMetricsStrip = () => {
  const { requirements, loading: reqLoading } = useRequirementsData();
  const { employees, loading: empLoading } = useEmployeesData();
  const { team, loading: statsLoading } = useUnifiedStats();
  const { activeFilter, setActiveFilter } = useTeamFilter();

  const loading = reqLoading || empLoading || statsLoading;

  if (!loading && employees.length === 0) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-4 mb-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-8 w-28" />
        ))}
      </div>
    );
  }

  const hasCredentials =
    requirements.length > 0 &&
    employees.some((emp) => emp.requirements_stats?.total > 0);

  const handleClick = (filter: TeamFilterType) => {
    setActiveFilter(activeFilter === filter ? null : filter);
  };

  const items = [
    {
      label: "Members",
      value: team.total,
      icon: Users,
      color: "text-primary",
      filter: "all" as TeamFilterType,
    },
    {
      label: "Up to Date",
      value: hasCredentials ? team.compliant : 0,
      icon: CheckCircle2,
      color: "text-success",
      filter: "compliant" as TeamFilterType,
      hide: !hasCredentials,
    },
    {
      label: "Expiring Soon",
      value: team.expiringSoon,
      icon: Clock,
      color: team.expiringSoon > 0 ? "text-warning" : "text-muted-foreground",
      filter: "expiring-soon" as TeamFilterType,
      hide: !hasCredentials,
    },
    {
      label: "Action Required",
      value: team.incomplete,
      icon: AlertCircle,
      color: team.incomplete > 0 ? "text-destructive" : "text-muted-foreground",
      filter: "incomplete" as TeamFilterType,
      hide: !hasCredentials,
    },
  ];

  return (
    <div className="flex items-center gap-1 mb-4 flex-wrap" data-tour="team-metrics">
      {items
        .filter((i) => !i.hide)
        .map((item, idx) => {
          const isActive = activeFilter === item.filter;
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => handleClick(item.filter)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150",
                "hover:bg-muted/80 active:scale-95",
                isActive
                  ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                  : "bg-muted/50 text-muted-foreground"
              )}
            >
              <Icon className={cn("h-3.5 w-3.5", isActive ? "text-primary" : item.color)} />
              <span className="tabular-nums font-semibold">{item.value}</span>
              <span className="text-xs opacity-70">{item.label}</span>
            </button>
          );
        })}
    </div>
  );
};

/** Mobile version – horizontally scrollable chip bar */
export const CompactMetricsStripMobile = () => {
  const { requirements, loading: reqLoading } = useRequirementsData();
  const { employees, loading: empLoading } = useEmployeesData();
  const { team, loading: statsLoading } = useUnifiedStats();
  const { activeFilter, setActiveFilter } = useTeamFilter();

  const loading = reqLoading || empLoading || statsLoading;

  if (!loading && employees.length === 0) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-1 px-1">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-8 w-24 flex-shrink-0 rounded-full" />
        ))}
      </div>
    );
  }

  const hasCredentials =
    requirements.length > 0 &&
    employees.some((emp) => emp.requirements_stats?.total > 0);

  const handleClick = (filter: TeamFilterType) => {
    setActiveFilter(activeFilter === filter ? null : filter);
  };

  const items = [
    { label: "Members", value: team.total, icon: Users, color: "text-primary", filter: "all" as TeamFilterType },
    { label: "Up to Date", value: hasCredentials ? team.compliant : 0, icon: CheckCircle2, color: "text-success", filter: "compliant" as TeamFilterType, hide: !hasCredentials },
    { label: "Expiring", value: team.expiringSoon, icon: Clock, color: team.expiringSoon > 0 ? "text-warning" : "text-muted-foreground", filter: "expiring-soon" as TeamFilterType, hide: !hasCredentials },
    { label: "Action", value: team.incomplete, icon: AlertCircle, color: team.incomplete > 0 ? "text-destructive" : "text-muted-foreground", filter: "incomplete" as TeamFilterType, hide: !hasCredentials },
  ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
      {items
        .filter((i) => !i.hide)
        .map((item) => {
          const isActive = activeFilter === item.filter;
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => handleClick(item.filter)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all flex-shrink-0",
                "active:scale-95",
                isActive
                  ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                  : "bg-muted/60 text-muted-foreground"
              )}
            >
              <Icon className={cn("h-3.5 w-3.5", isActive ? "text-primary" : item.color)} />
              <span className="tabular-nums font-semibold">{item.value}</span>
              <span className="text-xs opacity-70">{item.label}</span>
            </button>
          );
        })}
    </div>
  );
};
