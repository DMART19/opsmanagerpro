/**
 * SecondaryMetrics - Hero-level metric cards
 * 
 * Clean, modern cards with explicit borders and backgrounds
 * that guarantee visibility on all themes.
 */

import { Skeleton } from "@/components/ui/skeleton";

import { useNavigate } from "react-router-dom";
import { Package, Users, FileText, Wrench, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnifiedStats } from "@/hooks/use-unified-stats";
import { useDemoPath } from "@/hooks/use-demo-path";
import { useDashboardConfig } from "@/components/dashboard/DashboardCustomization";

interface MetricItem {
  label: string;
  value: number;
  icon: React.ElementType;
  route: string;
  highlight?: boolean;
  sublabel?: string;
}

export const SecondaryMetrics = () => {
  const navigate = useNavigate();
  const { getPath } = useDemoPath();
  const { assets, team, credentials, maintenance, loading: unifiedLoading } = useUnifiedStats();
  const { isMetricVisible } = useDashboardConfig();

  const loading = unifiedLoading;

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 mb-5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-border/50 bg-card p-5 lg:p-6 animate-fade-in"
            style={{ 
              boxShadow: "var(--shadow-metric)",
              animationDelay: `${i * 60}ms`,
              animationFillMode: "both",
            }}
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
  }

  const allMetrics: (MetricItem & { metricId: string })[] = [
    {
      metricId: "total-assets",
      label: "Total Assets",
      value: assets.total,
      icon: Package,
      route: "/inventory",
      sublabel: assets.available > 0 ? `${assets.available} available` : "Items and containers tracked",
    },
    {
      metricId: "team-members",
      label: "Team Members",
      value: team.total,
      icon: Users,
      route: "/people",
      sublabel: team.total > 0 ? `${team.compliant} compliant` : "Employees in your workspace",
    },
    {
      metricId: "under-review",
      label: "Active Credentials",
      value: Math.max(0, credentials.total - credentials.expired),
      icon: FileText,
      route: "/people?tab=requirements",
      sublabel: credentials.expired > 0 ? `${credentials.expired} expired` : "Certifications and licenses",
      highlight: credentials.expired > 0,
    },
    {
      metricId: "credentials-due",
      label: "Scheduled Tasks",
      value: maintenance.dueThisWeek + maintenance.dueNextWeek,
      icon: Wrench,
      route: "/calendar",
      sublabel: maintenance.dueThisWeek > 0 ? `${maintenance.dueThisWeek} this week` : "Maintenance and calendar events",
      highlight: maintenance.dueThisWeek > 0,
    },
  ];

  const metrics = allMetrics.filter(m => isMetricVisible(m.metricId));

  if (metrics.length === 0) return null;

  const gridCols = metrics.length <= 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-2 lg:grid-cols-4";

  return (
    <div data-tour="dashboard-kpis" className={`grid ${gridCols} gap-4 lg:gap-5 mb-5`}>
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        
        return (
          <button
            key={metric.label}
            onClick={() => navigate(getPath(metric.route))}
            className={cn(
              "group text-left rounded-2xl transition-all duration-300 ease-apple",
              "bg-card border border-border/50",
              "p-5 lg:p-6",
              "hover:-translate-y-1.5 active:scale-[0.97] active:translate-y-0",
              "animate-fade-in"
            )}
            style={{ 
              animationDelay: `${index * 60}ms`,
              animationFillMode: "both",
              boxShadow: "var(--shadow-metric)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-metric-hover)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-metric)"; }}
          >
            {/* Icon row */}
            <div className="flex items-center justify-between mb-5">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-300",
                "bg-primary/6 group-hover:bg-primary/10"
              )}>
                <Icon 
                  className="h-5 w-5 text-primary/70 group-hover:text-primary transition-colors duration-300" 
                  strokeWidth={1.5} 
                />
              </div>
              <ChevronRight 
                className="h-4 w-4 text-transparent group-hover:text-muted-foreground/50 group-hover:translate-x-0.5 transition-all duration-300" 
              />
            </div>

            {/* Value — dominant */}
            <div className={cn(
              "text-[2.25rem] font-extrabold tabular-nums tracking-tighter leading-none mb-1.5",
              metric.value === 0 ? "text-muted-foreground/25" : "text-foreground"
            )}>
              {metric.value.toLocaleString()}
            </div>

            {/* Label — receded */}
            <div className="text-[13px] text-muted-foreground/55 font-medium tracking-wide">
              {metric.label}
            </div>

            {/* Sublabel — quiet context */}
            {metric.sublabel && (
              <div className={cn(
                "text-xs mt-2 font-medium",
                metric.highlight ? "text-warning" : "text-muted-foreground/45"
              )}>
                {metric.sublabel}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};
