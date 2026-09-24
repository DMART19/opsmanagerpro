/**
 * DashboardHeroInsight - The single most important insight
 * 
 * Shows one focused message based on operational state.
 * Calm, elegant, purpose-driven.
 */

import { Skeleton } from "@/components/ui/skeleton";

import { useNavigate } from "react-router-dom";
import { 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Package,
  ArrowRight,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardAssetStats, useDashboardCredentialStats } from "@/hooks/use-dashboard-stats";
import { useGuardrailAlerts } from "@/hooks/use-guardrail-alerts";

type InsightType = "all-clear" | "attention" | "action-needed" | "getting-started";

interface Insight {
  type: InsightType;
  icon: React.ElementType;
  title: string;
  description: string;
  action?: {
    label: string;
    route: string;
  };
  metric?: {
    value: number | string;
    label: string;
  };
}

export const DashboardHeroInsight = ({ hideAllClear = false, onAddAsset }: { hideAllClear?: boolean; onAddAsset?: () => void }) => {
  const navigate = useNavigate();
  const { data: assetsData, isLoading: loadingAssets } = useDashboardAssetStats();
  const { data: credsData, isLoading: loadingCreds } = useDashboardCredentialStats();
  const { summary: alertSummary } = useGuardrailAlerts();

  const loading = loadingAssets && loadingCreds;
  const assets = assetsData ?? { total: 0, available: 0, lowStock: 0, criticalStock: 0 };
  const credentials = credsData ?? { total: 0, expiringSoon: 0, expired: 0 };

  // Determine the most important insight based on system state
  const getInsight = (): Insight => {
    // Priority 1: Critical issues that need immediate attention
    if (credentials.expired > 0) {
      return {
        type: "action-needed",
        icon: AlertTriangle,
        title: `${credentials.expired} credential${credentials.expired > 1 ? 's' : ''} expired`,
        description: "These need attention to maintain compliance.",
        action: {
          label: "Review now",
          route: "/people?tab=requirements&status=expired",
        },
        metric: {
          value: credentials.expired,
          label: "expired",
        },
      };
    }

    // Priority 2: Expiring soon warnings
    if (credentials.expiringSoon >= 5) {
      return {
        type: "attention",
        icon: Clock,
        title: `${credentials.expiringSoon} credentials expiring soon`,
        description: "Review and renew to stay ahead of deadlines.",
        action: {
          label: "View expiring",
          route: "/people?tab=requirements&status=expiring",
        },
        metric: {
          value: credentials.expiringSoon,
          label: "due in 60 days",
        },
      };
    }

    // Priority 3: Getting started — suppressed; handled by OnboardingChecklist
    if (assets.total === 0) {
      return {
        type: "all-clear",
        icon: TrendingUp,
        title: "Your workspace is ready",
        description: "Add your first asset, team member or event below to start tracking operations.",
      };
    }

    // Default: All clear
    return {
      type: "all-clear",
      icon: CheckCircle,
      title: "Operations running smoothly",
      description: `${assets.total} assets tracked${credentials.total > 0 ? `, ${credentials.total - credentials.expired - credentials.expiringSoon} credentials current` : ""}.`,
      metric: assets.total > 0 ? {
        value: `${Math.round(((assets.available) / Math.max(assets.total, 1)) * 100)}%`,
        label: "available",
      } : undefined,
    };
  };

  if (loading) {
    return (
      <div className="h-full">
        <div className="flex items-center gap-4 p-6 rounded-xl bg-card border border-border/40 h-full" style={{ boxShadow: "var(--shadow-card)" }}>
          <Skeleton className="h-14 w-14 rounded-2xl flex-shrink-0" />
          <div className="flex-1 space-y-2.5">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-20 rounded-lg hidden sm:block" />
        </div>
      </div>
    );
  }

  const insight = getInsight();

  if (hideAllClear && insight.type === "all-clear") {
    return null;
  }
  const Icon = insight.icon;

  const typeStyles = {
    "all-clear": {
      bg: "bg-success/5 dark:bg-success/8",
      iconBg: "bg-success/10",
      iconColor: "text-success",
      border: "border-success/10",
    },
    "attention": {
      bg: "bg-warning/5 dark:bg-warning/8",
      iconBg: "bg-warning/10",
      iconColor: "text-warning",
      border: "border-warning/15",
    },
    "action-needed": {
      bg: "bg-destructive/5 dark:bg-destructive/8",
      iconBg: "bg-destructive/10",
      iconColor: "text-destructive",
      border: "border-destructive/15",
    },
    "getting-started": {
      bg: "bg-primary/5 dark:bg-primary/8",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      border: "border-primary/10",
    },
  };

  const styles = typeStyles[insight.type];

  return (
    <div 
      className={cn(
        "rounded-2xl border transition-all duration-300 ease-apple animate-fade-in h-full",
        styles.bg,
        styles.border,
        insight.action && "cursor-pointer hover:shadow-md hover:-translate-y-0.5"
      )}
      onClick={() => {
        if (insight.type === "getting-started" && onAddAsset) {
          onAddAsset();
        } else if (insight.action) {
          navigate(insight.action.route);
        }
      }}
    >
      <div className="p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center gap-5">
        {/* Icon */}
        <div className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform duration-300",
          styles.iconBg,
          insight.action && "group-hover:scale-105"
        )}>
          <Icon className={cn("h-7 w-7", styles.iconColor)} strokeWidth={1.5} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-foreground leading-tight tracking-tight">
            {insight.title}
          </h2>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            {insight.description}
          </p>
        </div>

        {/* Metric or Action */}
        <div className="flex items-center gap-6 sm:flex-shrink-0">
          {insight.metric && (
            <div className="text-right hidden sm:block">
              <p className="text-3xl font-bold tabular-nums text-foreground tracking-tight">
                {insight.metric.value}
              </p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                {insight.metric.label}
              </p>
            </div>
          )}

          {insight.action && (
            <button className="flex items-center gap-2 text-sm font-medium text-primary hover:gap-2.5 transition-all duration-200 whitespace-nowrap group/btn">
              {insight.action.label}
              <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-0.5 transition-transform duration-200" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
