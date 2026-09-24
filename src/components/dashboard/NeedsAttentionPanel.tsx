/**
 * NeedsAttentionPanel – shows actionable items requiring attention.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  AlertTriangle,
  Clock,
  Package,
  FileText,
  ArrowRight,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnifiedStats, useLowStockItems } from "@/hooks/use-unified-stats";
import { useTasks } from "@/hooks/use-tasks";
import { useCheckouts } from "@/hooks/use-checkouts";
import { useDemoPath } from "@/hooks/use-demo-path";

interface AttentionItem {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: "destructive" | "warning" | "primary";
  route: string;
  count: number;
}

export const NeedsAttentionPanel = () => {
  const navigate = useNavigate();
  const { getPath } = useDemoPath();
  const { credentials, maintenance, loading: statsLoading } = useUnifiedStats();
  const { lowStockItems, criticalStockItems, loading: stockLoading } = useLowStockItems();
  const { tasks, isLoading: tasksLoading } = useTasks();
  const { checkouts, loading: checkoutsLoading } = useCheckouts();

  const loading = statsLoading || stockLoading || tasksLoading || checkoutsLoading;

  const items = useMemo((): AttentionItem[] => {
    if (loading) return [];
    const result: AttentionItem[] = [];

    // Expired credentials
    if (credentials.expired > 0) {
      result.push({
        id: "expired-creds",
        title: "Expired Credentials",
        description: `${credentials.expired} credential${credentials.expired > 1 ? "s" : ""} need renewal`,
        icon: AlertCircle,
        color: "destructive",
        route: "/people?tab=requirements&status=expired",
        count: credentials.expired,
      });
    }

    // Expiring soon
    if (credentials.expiringSoon > 0) {
      result.push({
        id: "expiring-creds",
        title: "Expiring Soon",
        description: `${credentials.expiringSoon} credential${credentials.expiringSoon > 1 ? "s" : ""} expiring within 60 days`,
        icon: FileText,
        color: "warning",
        route: "/people?tab=requirements&status=expiring",
        count: credentials.expiringSoon,
      });
    }

    // Overdue returns
    const overdueCheckouts = checkouts.filter(c => c.due_date && new Date(c.due_date) < new Date());
    if (overdueCheckouts.length > 0) {
      result.push({
        id: "overdue-returns",
        title: "Overdue Returns",
        description: `${overdueCheckouts.length} item${overdueCheckouts.length > 1 ? "s" : ""} past due date`,
        icon: Clock,
        color: "destructive",
        route: "/inventory?status=in-use",
        count: overdueCheckouts.length,
      });
    }

    // Critical + low stock
    const totalLowStock = criticalStockItems.length + lowStockItems.length;
    if (totalLowStock > 0) {
      result.push({
        id: "low-stock",
        title: "Low Stock Items",
        description: `${totalLowStock} item${totalLowStock > 1 ? "s" : ""} below threshold`,
        icon: Package,
        color: criticalStockItems.length > 0 ? "destructive" : "warning",
        route: "/inventory",
        count: totalLowStock,
      });
    }

    // Overdue tasks
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const overdueTasks = tasks.filter(t => t.start_date && new Date(t.start_date) < now && t.status !== "completed");
    if (overdueTasks.length > 0) {
      result.push({
        id: "overdue-tasks",
        title: "Overdue Tasks",
        description: `${overdueTasks.length} task${overdueTasks.length > 1 ? "s" : ""} past due`,
        icon: AlertTriangle,
        color: "warning",
        route: "/calendar",
        count: overdueTasks.length,
      });
    }

    // Maintenance due
    if (maintenance.dueThisWeek > 0) {
      result.push({
        id: "maintenance-due",
        title: "Maintenance Due",
        description: `${maintenance.dueThisWeek} scheduled this week`,
        icon: Clock,
        color: "primary",
        route: "/calendar",
        count: maintenance.dueThisWeek,
      });
    }

    return result;
  }, [loading, credentials, checkouts, lowStockItems, criticalStockItems, tasks, maintenance]);

  if (loading) {
    return (
      <Card className="p-5" style={{ boxShadow: "var(--shadow-card)" }}>
        <Skeleton className="h-5 w-36 mb-4" />
        <div className="space-y-2">
          {[0, 1, 2].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5 sm:p-6" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/40">
        <h3 className="text-lg font-semibold tracking-tight text-foreground">Needs Attention</h3>
        {items.length > 0 && (
          <Badge variant="secondary" className="text-xs">{items.length}</Badge>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-success/8 flex items-center justify-center">
            <CheckCircle className="h-5 w-5 text-success/60" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-medium text-foreground/75">Nothing needs attention</p>
          <p className="text-xs text-muted-foreground mt-1">Everything is on track 🎉</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {items.map(item => {
            const Icon = item.icon;
            const colorStyles = {
              destructive: "border-l-destructive bg-destructive/[0.03] hover:bg-destructive/[0.06]",
              warning: "border-l-warning bg-warning/[0.03] hover:bg-warning/[0.06]",
              primary: "border-l-primary bg-primary/[0.03] hover:bg-primary/[0.06]",
            };
            const iconStyles = {
              destructive: "text-destructive bg-destructive/10",
              warning: "text-warning bg-warning/10",
              primary: "text-primary bg-primary/10",
            };

            return (
              <button
                key={item.id}
                onClick={() => navigate(getPath(item.route))}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg border-l-[3px] transition-all text-left group",
                  colorStyles[item.color]
                )}
              >
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", iconStyles[item.color])}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="text-xs font-bold">{item.count}</Badge>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
};
