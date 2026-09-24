import { Package, Users, Box, CalendarPlus, ListChecks } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useDashboardAssetStats, useDashboardCredentialStats } from "@/hooks/use-dashboard-stats";
import { useTasks } from "@/hooks/use-tasks";
import { useNavigate } from "react-router-dom";
import { useDemoPath } from "@/hooks/use-demo-path";
import { useMemo, memo } from "react";

interface DashboardQuickActionsProps {
  onAddAsset: () => void;
  onAddMember: () => void;
  onAddContainer: () => void;
  onAddTask: () => void;
}

interface QuickAction {
  key: string;
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  urgent?: boolean;
  badge?: string;
}

const defaultActions = [
  { key: "asset", label: "Add Asset", icon: Package },
  { key: "member", label: "Add Team Member", icon: Users },
  { key: "container", label: "Create Container", icon: Box },
  { key: "task", label: "Add Event", icon: CalendarPlus },
] as const;

export const DashboardQuickActions = memo(({
  onAddAsset,
  onAddMember,
  onAddContainer,
  onAddTask,
}: DashboardQuickActionsProps) => {
  const navigate = useNavigate();
  const { getPath } = useDemoPath();
  const { data: assetStats, isLoading: loadingAssets } = useDashboardAssetStats();
  const { data: credentialStats, isLoading: loadingCredentials } = useDashboardCredentialStats();
  const { tasks } = useTasks();

  const loading = loadingAssets || loadingCredentials;

  const defaultHandlers: Record<string, () => void> = {
    asset: onAddAsset,
    member: onAddMember,
    container: onAddContainer,
    task: onAddTask,
  };

  // Build context-aware actions based on system state
  const actions: QuickAction[] = useMemo(() => {
    if (loading) {
      return defaultActions.map(a => ({
        key: a.key,
        label: a.label,
        icon: a.icon,
        onClick: defaultHandlers[a.key],
      }));
    }

    const contextActions: QuickAction[] = [];
    const credentials = credentialStats || { expired: 0, expiringSoon: 0 };
    
    // Count today's pending tasks
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const todaysTasks = tasks.filter(t => {
      const d = new Date(t.start_date);
      return d >= now && d < tomorrow && t.status !== "completed";
    });
    const hasTodayTasks = todaysTasks.length > 0;

    // Slot 1: Always Add Asset
    contextActions.push({
      key: "asset",
      label: "Add Asset",
      icon: Package,
      onClick: onAddAsset,
    });

    // Slot 2: Always Add Team Member
    contextActions.push({
      key: "member",
      label: "Add Team Member",
      icon: Users,
      onClick: onAddMember,
    });

    // Slot 3: Today's tasks → Start Tasks, else Create Container
    if (hasTodayTasks) {
      contextActions.push({
        key: "today-tasks",
        label: "Today's Tasks",
        icon: ListChecks,
        onClick: () => navigate(getPath("/calendar")),
        badge: `${todaysTasks.length}`,
      });
    } else {
      contextActions.push({
        key: "container",
        label: "Create Container",
        icon: Box,
        onClick: onAddContainer,
      });
    }

    // Slot 4: Always Add Event
    contextActions.push({
      key: "task",
      label: "Add Event",
      icon: CalendarPlus,
      onClick: onAddTask,
    });

    return contextActions;
  }, [loading, credentialStats, tasks, navigate, getPath, onAddAsset, onAddMember, onAddContainer, onAddTask]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Card
            key={action.key}
            data-tour={
              action.key === "asset" ? "add-asset" :
              action.key === "member" ? "add-team-member" :
              action.key === "container" ? "create-container" :
              action.key === "task" ? "add-event" :
              action.key === "today-tasks" ? "add-event" :
              undefined
            }
            className={cn(
              "group flex items-center gap-3 p-4 cursor-pointer",
              "border-2 border-dashed",
              action.urgent 
                ? "border-destructive/30 hover:border-destructive/50 hover:bg-destructive/5" 
                : "border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/5",
              "active:scale-[0.98] transition-all duration-150"
            )}
            onClick={action.onClick}
          >
            <div className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
              action.urgent
                ? "bg-destructive/10 text-destructive group-hover:bg-destructive/20"
                : "bg-primary/10 text-primary group-hover:bg-primary/20"
            )}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold text-foreground truncate">
                {action.label}
              </span>
              {action.badge && (
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-[10px] h-5 px-1.5 shrink-0",
                    action.urgent && "bg-destructive/10 text-destructive border-destructive/20"
                  )}
                >
                  {action.badge}
                </Badge>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
});

DashboardQuickActions.displayName = "DashboardQuickActions";
