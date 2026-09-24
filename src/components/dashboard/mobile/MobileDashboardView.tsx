import { useMemo } from "react";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { Package, Users, Clock, AlertCircle, CheckCircle, Plus, Archive, CalendarCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMaintenance } from "@/hooks/use-maintenance";
import { useUnifiedStats } from "@/hooks/use-unified-stats";
import { useTasks } from "@/hooks/use-tasks";
import { useGuardrailAlerts } from "@/hooks/use-guardrail-alerts";
import { useDashboardConfig } from "@/components/dashboard/DashboardCustomization";
import { MobileKPIGrid } from "./MobileKPIGrid";
import { MobileAttentionAlerts } from "@/components/alerts";
import { MobileTodayTasks } from "./MobileTodayTasks";
import { MobileSystemOverview } from "./MobileSystemOverview";
import { cn } from "@/lib/utils";
interface MobileDashboardViewProps {
  onAddAsset?: () => void;
  onAddMember?: () => void;
  onAddContainer?: () => void;
  onAddTask?: () => void;
}

export const MobileDashboardView = ({ onAddAsset, onAddMember, onAddContainer, onAddTask }: MobileDashboardViewProps) => {
  const {
    isSectionVisible
  } = useDashboardConfig();
  const navigate = useNavigate();
  const {
    assets,
    team,
    credentials,
    loading
  } = useUnifiedStats();
  const {
    summary: alertSummary
  } = useGuardrailAlerts();
  const {
    maintenanceRecords
  } = useMaintenance();
  const {
    tasks: calendarTasks
  } = useTasks();

  // Hero insight - single most important message
  const heroInsight = useMemo(() => {
    if (credentials.expired > 0) {
      return {
        type: "action-needed" as const,
        icon: AlertCircle,
        title: `${credentials.expired} expired credential${credentials.expired > 1 ? 's' : ''}`,
        route: "/people?tab=requirements&status=expired",
        color: "destructive"
      };
    }
    if (credentials.expiringSoon >= 5) {
      return {
        type: "attention" as const,
        icon: Clock,
        title: `${credentials.expiringSoon} expiring soon`,
        route: "/people?tab=requirements&status=expiring",
        color: "warning"
      };
    }
    if (assets.total === 0) {
      return {
        type: "getting-started" as const,
        icon: Package,
        title: "Add your first asset",
        action: onAddAsset,
        color: "primary"
      };
    }
    return {
      type: "all-clear" as const,
      icon: CheckCircle,
      title: "All systems healthy",
      route: "/dashboard",
      color: "success"
    };
  }, [credentials, assets]);

  // KPI metrics
  const metrics = [{
    label: "Assets",
    value: assets.total,
    icon: Package,
    route: "/inventory?action=add",
    status: "healthy" as const,
    zeroHint: "Add equipment to track"
  }, {
    label: "Team",
    value: team.total,
    icon: Users,
    route: "/people?action=add",
    status: "healthy" as const,
    zeroHint: "Add team members"
  }, {
    label: "Due Soon",
    value: credentials.expiringSoon,
    icon: Clock,
    route: "/people?tab=requirements&status=expiring",
    status: credentials.expiringSoon > 10 ? "attention" as const : "healthy" as const,
    zeroHint: "No upcoming renewals"
  }, {
    label: "Expired",
    value: credentials.expired,
    icon: AlertCircle,
    route: "/people?tab=requirements&status=expired",
    status: credentials.expired > 0 ? "urgent" as const : "healthy" as const,
    zeroHint: "All valid"
  }];

  // Compute today's and upcoming calendar tasks
  const {
    todayCalendarTasks,
    upcomingCalendarTasks
  } = useMemo(() => {
    const now = new Date();
    const todayStr = now.toDateString();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const today: typeof calendarTasks = [];
    const upcoming: typeof calendarTasks = [];
    calendarTasks.forEach(task => {
      if (!task.start_date) return;
      const taskDate = new Date(task.start_date);
      if (taskDate.toDateString() === todayStr) {
        today.push(task);
      } else if (taskDate > now && taskDate <= nextWeek) {
        upcoming.push(task);
      }
    });
    return {
      todayCalendarTasks: today,
      upcomingCalendarTasks: upcoming
    };
  }, [calendarTasks]);

  // Today's tasks
  const todayTasks = useMemo(() => {
    const now = new Date();
    const tasks: Array<{
      id: string;
      title: string;
      dueTime?: string;
      status: "pending" | "completed";
    }> = [];
    maintenanceRecords.filter(r => {
      if (!r.scheduled_date) return false;
      const date = new Date(r.scheduled_date);
      return date.toDateString() === now.toDateString();
    }).slice(0, 3).forEach(r => {
      tasks.push({
        id: r.id,
        title: r.equipment?.name || r.description,
        dueTime: r.scheduled_date ? new Date(r.scheduled_date).toLocaleTimeString([], {
          hour: 'numeric',
          minute: '2-digit'
        }) : undefined,
        status: r.status === "completed" ? "completed" : "pending"
      });
    });
    todayCalendarTasks.slice(0, 3).forEach(task => {
      tasks.push({
        id: task.id,
        title: task.title,
        dueTime: task.start_time || undefined,
        status: task.status === "complete" || task.status === "completed" ? "completed" : "pending"
      });
    });
    return tasks.slice(0, 5);
  }, [maintenanceRecords, todayCalendarTasks]);

  // Upcoming tasks
  const upcomingTasks = useMemo(() => {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const tasks: Array<{
      id: string;
      title: string;
      dueTime?: string;
      status: "pending" | "completed";
    }> = [];
    maintenanceRecords.filter(r => {
      if (!r.scheduled_date) return false;
      const date = new Date(r.scheduled_date);
      return date > now && date <= nextWeek && date.toDateString() !== now.toDateString();
    }).slice(0, 3).forEach(r => {
      tasks.push({
        id: r.id,
        title: r.equipment?.name || r.description,
        dueTime: r.scheduled_date ? new Date(r.scheduled_date).toLocaleDateString([], {
          weekday: 'short'
        }) : undefined,
        status: r.status === "completed" ? "completed" : "pending"
      });
    });
    upcomingCalendarTasks.slice(0, 3).forEach(task => {
      tasks.push({
        id: task.id,
        title: task.title,
        dueTime: task.start_date ? new Date(task.start_date).toLocaleDateString([], {
          weekday: 'short'
        }) : undefined,
        status: task.status === "complete" || task.status === "completed" ? "completed" : "pending"
      });
    });
    return tasks.slice(0, 5);
  }, [maintenanceRecords, upcomingCalendarTasks]);
  const systemStats = {
    available: assets.available,
    inUse: assets.inUse,
    underService: assets.underService,
    credentialHealth: credentials.total > 0 ? Math.round((credentials.total - credentials.expired - credentials.expiringSoon) / credentials.total * 100) : 100
  };
  const HeroIcon = heroInsight.icon;

  const quickActions = [
    { label: "Add Item", icon: Package, onClick: onAddAsset },
    { label: "Add Member", icon: Users, onClick: onAddMember },
    { label: "Container", icon: Archive, onClick: onAddContainer },
    { label: "Add Event", icon: CalendarCheck, onClick: onAddTask },
  ];

  return <div className="pb-6 space-y-4 min-w-0">
      {/* Onboarding Checklist */}
      <OnboardingChecklist onAddAsset={onAddAsset} onAddContainer={onAddContainer} />

      {/* Quick Actions — compact 2x2 grid */}
      <div className="grid grid-cols-2 gap-2">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              type="button"
              className={cn(
                "flex items-center justify-center gap-2 h-12 rounded-xl",
                "bg-primary text-primary-foreground font-semibold text-sm",
                "active:scale-[0.97] transition-transform",
                "min-w-0 px-3",
              )}
              onClick={action.onClick}
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="truncate">{action.label}</span>
            </button>
          );
        })}
      </div>

      {/* KPI Grid */}
      {isSectionVisible("stat-cards") && <MobileKPIGrid metrics={metrics} loading={loading} />}

      {/* Needs Attention */}
      {isSectionVisible("activity-alerts") && <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Attention
          </h2>
          <MobileAttentionAlerts />
        </div>}

      {/* Today's Tasks */}
      {isSectionVisible("tasks") && <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Tasks
          </h2>
          <MobileTodayTasks todayTasks={todayTasks} upcomingTasks={upcomingTasks} loading={loading} />
        </div>}

      {/* System Overview */}
      {isSectionVisible("asset-status") && <MobileSystemOverview stats={systemStats} loading={loading} />}
    </div>;
};