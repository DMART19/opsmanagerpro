import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDemoPath } from "@/hooks/use-demo-path";
import { AlertCircle, CheckCircle, Clock, AlertTriangle, ExternalLink, Calendar, Bell, Package, ArrowRight, Settings2, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCheckouts } from "@/hooks/use-checkouts";
import { useCertifications } from "@/hooks/use-certifications";
import { useMaintenance } from "@/hooks/use-maintenance";
import { useTasks } from "@/hooks/use-tasks";
import { useLowStockItems } from "@/hooks/use-unified-stats";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Alert {
  id: string;
  type: string;
  title: string;
  message: string;
  time: string;
  icon: any;
  color: string;
  priority: "high" | "medium" | "low";
  navigateTo: string;
  entityName?: string;
  primaryAction?: { label: string; route: string };
  secondaryAction?: { label: string; route: string };
}

const getAlertStyles = (color: string) => {
  switch (color) {
    case "destructive":
      return { bg: "bg-red-50 dark:bg-red-500/10", icon: "text-red-600 dark:text-red-400", border: "border-l-red-500" };
    case "warning":
      return { bg: "bg-amber-50 dark:bg-amber-500/10", icon: "text-amber-600 dark:text-amber-400", border: "border-l-amber-500" };
    case "success":
      return { bg: "bg-emerald-50 dark:bg-emerald-500/10", icon: "text-emerald-600 dark:text-emerald-400", border: "border-l-emerald-500" };
    case "primary":
    default:
      return { bg: "bg-blue-50 dark:bg-blue-500/10", icon: "text-blue-600 dark:text-blue-400", border: "border-l-blue-500" };
  }
};

const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

const formatDaysUntil = (date: Date): string => {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  if (days < 0) return `${Math.abs(days)} days overdue`;
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
};

export const AlertFeed = () => {
  const navigate = useNavigate();
  const { getPath } = useDemoPath();
  const { checkouts, loading: loadingCheckouts } = useCheckouts();
  const { certifications, loading: loadingCerts } = useCertifications();
  const { maintenanceRecords, loading: loadingMaintenance } = useMaintenance();
  const { tasks, isLoading: loadingTasks } = useTasks();
  const { lowStockItems, criticalStockItems, loading: loadingStock } = useLowStockItems();
  const [employeeRequirements, setEmployeeRequirements] = useState<any[]>([]);
  const [loadingRequirements, setLoadingRequirements] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const loadAllRequirements = async () => {
      try {
        setLoadingRequirements(true);
        const { data, error } = await supabase
          .from("employee_requirements")
          .select(`
            *,
            requirement:requirement_id (
              id,
              title,
              requirement_type_ref:requirement_type_id(name)
            ),
            employee:employee_id (
              id,
              first_name,
              last_name
            )
          `)
          .not("expire_date", "is", null)
          .order("expire_date", { ascending: true });

        if (error) throw error;
        setEmployeeRequirements(data || []);
      } catch (error) {
        console.error("Error loading employee requirements:", error);
      } finally {
        setLoadingRequirements(false);
      }
    };

    loadAllRequirements();
  }, []);

  const loading = loadingCheckouts || loadingCerts || loadingMaintenance || loadingRequirements || loadingTasks || loadingStock;

  useEffect(() => {
    if (!loading) {
      setLastUpdated(new Date());
    }
  }, [loading]);

  // Generate alerts from REAL data only — memoized to avoid recomputation on unrelated re-renders
  const alerts = useMemo(() => {
  const items: Alert[] = [];

  // 1. Overdue checkouts
  checkouts.forEach(checkout => {
    if (checkout.due_date) {
      const dueDate = new Date(checkout.due_date);
      const now = new Date();
      if (dueDate < now) {
        const equipmentName = checkout.equipment?.name || "Equipment";
        const staffName = checkout.staff 
          ? `${checkout.staff.first_name} ${checkout.staff.last_name}` 
          : "Unknown";
        
        items.push({
          id: `checkout-${checkout.id}`,
          type: "Overdue",
          title: "Overdue Return",
          message: `${equipmentName} was due ${formatDaysUntil(dueDate)} from ${staffName}`,
          time: formatRelativeTime(dueDate),
          icon: AlertCircle,
          color: "destructive",
          priority: "high",
          navigateTo: `/inventory?highlight=${checkout.equipment_id}`,
          entityName: equipmentName,
          primaryAction: { label: "View Item", route: `/inventory?highlight=${checkout.equipment_id}` },
        });
      }
    }
  });

  // 2. Expiring/expired certifications
  certifications.forEach(cert => {
    if (cert.expiry_date) {
      const expiryDate = new Date(cert.expiry_date);
      const now = new Date();
      const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
      
      const isExpired = expiryDate <= now;
      const isExpiringSoon = expiryDate > now && expiryDate <= sixtyDaysFromNow;
      
      if (isExpired || isExpiringSoon) {
        const staffName = cert.staff 
          ? `${cert.staff.first_name} ${cert.staff.last_name}` 
          : "Team member";
        
        items.push({
          id: `cert-${cert.id}`,
          type: "Credential",
          title: isExpired ? "Credential Expired" : "Credential Expiring",
          message: `${cert.name} for ${staffName} ${isExpired ? 'expired' : 'expires'} ${formatDaysUntil(expiryDate)}`,
          time: formatRelativeTime(new Date(cert.updated_at)),
          icon: isExpired ? AlertCircle : AlertTriangle,
          color: isExpired ? "destructive" : "warning",
          priority: isExpired ? "high" : "medium",
          navigateTo: `/people?member=${cert.staff_id}&tab=certifications`,
          entityName: staffName,
          primaryAction: { label: "View Profile", route: `/people?member=${cert.staff_id}&tab=certifications` },
        });
      }
    }
  });

  // 3. Expiring/expired employee requirements
  employeeRequirements.forEach(req => {
    if (req.expire_date) {
      const expiryDate = new Date(req.expire_date);
      const now = new Date();
      const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
      
      const isExpired = expiryDate <= now;
      const isExpiringSoon = expiryDate > now && expiryDate <= sixtyDaysFromNow;
      
      if (isExpired || isExpiringSoon) {
        const employeeName = req.employee 
          ? `${req.employee.first_name} ${req.employee.last_name}` 
          : "Team member";
        const requirementTitle = req.requirement?.title || "Requirement";
        
        items.push({
          id: `req-${req.id}`,
          type: "Credential",
          title: isExpired ? "Requirement Expired" : "Requirement Expiring",
          message: `${requirementTitle} for ${employeeName} ${isExpired ? 'expired' : 'expires'} ${formatDaysUntil(expiryDate)}`,
          time: formatRelativeTime(new Date(req.updated_at || req.created_at || new Date())),
          icon: isExpired ? AlertCircle : AlertTriangle,
          color: isExpired ? "destructive" : "warning",
          priority: isExpired ? "high" : "medium",
          navigateTo: `/people?member=${req.employee_id}&tab=requirements`,
          entityName: employeeName,
          primaryAction: { label: "View Member", route: `/people?member=${req.employee_id}&tab=requirements` },
        });
      }
    }
  });

  // 4. Upcoming maintenance
  maintenanceRecords.forEach(record => {
    if (record.next_maintenance_date) {
      const maintenanceDate = new Date(record.next_maintenance_date);
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      if (maintenanceDate >= now && maintenanceDate <= sevenDaysFromNow) {
        const equipmentName = record.equipment?.name || "Equipment";
        
        items.push({
          id: `maint-${record.id}`,
          type: "Service",
          title: "Maintenance Due",
          message: `${equipmentName} ${record.maintenance_type || 'maintenance'} scheduled ${formatDaysUntil(maintenanceDate)}`,
          time: formatRelativeTime(new Date(record.updated_at)),
          icon: Clock,
          color: maintenanceDate.toDateString() === now.toDateString() ? "warning" : "primary",
          priority: maintenanceDate.toDateString() === now.toDateString() ? "medium" : "low",
          navigateTo: `/inventory?highlight=${record.equipment_id}`,
          entityName: equipmentName,
          primaryAction: { label: "View Asset", route: `/inventory?highlight=${record.equipment_id}` },
        });
      }
    }
  });

  // 5. Task reminders
  tasks.forEach(task => {
    if (task.start_date && task.reminder_enabled) {
      const taskDate = new Date(task.start_date);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
      
      const isToday = taskDate >= now && taskDate < tomorrow;
      const isTomorrow = taskDate >= tomorrow && taskDate < dayAfterTomorrow;
      const isOverdue = taskDate < now && task.status !== "completed";
      
      if ((isToday || isTomorrow || isOverdue) && task.status !== "completed") {
        const timeInfo = task.start_time ? ` at ${task.start_time}` : "";
        
        items.push({
          id: `task-${task.id}`,
          type: "Task",
          title: isOverdue ? "Overdue Task" : (isToday ? "Task Due Today" : "Task Due Tomorrow"),
          message: `${task.title}${timeInfo}`,
          time: formatRelativeTime(new Date(task.updated_at)),
          icon: isOverdue ? AlertCircle : (isToday ? Bell : Calendar),
          color: isOverdue ? "destructive" : (isToday ? "warning" : "primary"),
          priority: isOverdue ? "high" : (isToday ? "medium" : "low"),
          navigateTo: `/calendar?task=${task.id}`,
          entityName: task.title,
          primaryAction: { label: "Open Task", route: `/calendar?task=${task.id}` },
        });
      }
    }
  });

  // 6. Critical stock alerts
  criticalStockItems.forEach(item => {
    const itemName = item.description || item.subcategory || "Item";
    const qty = item.quantity_available ?? 0;
    const threshold = item.critical_stock_threshold ?? 0;

    items.push({
      id: `critical-stock-${item.id}`,
      type: "Stock",
      title: "Critical Stock Level",
      message: `${itemName} has only ${qty} units (threshold: ${threshold})`,
      time: formatRelativeTime(new Date(item.updated_at || new Date())),
      icon: AlertCircle,
      color: "destructive",
      priority: "high",
      navigateTo: `/inventory?highlight=${item.id}`,
      entityName: itemName,
      primaryAction: { label: "View Item", route: `/inventory?highlight=${item.id}` },
      secondaryAction: { label: "Adjust Threshold", route: `/inventory?highlight=${item.id}&edit=true` },
    });
  });

  // 7. Low stock alerts
  lowStockItems.forEach(item => {
    const itemName = item.description || item.subcategory || "Item";
    const qty = item.quantity_available ?? 0;
    const threshold = item.low_stock_threshold ?? 0;

    items.push({
      id: `low-stock-${item.id}`,
      type: "Stock",
      title: "Low Stock Warning",
      message: `${itemName} has ${qty} units remaining (threshold: ${threshold})`,
      time: formatRelativeTime(new Date(item.updated_at || new Date())),
      icon: Package,
      color: "warning",
      priority: "medium",
      navigateTo: `/inventory?highlight=${item.id}`,
      entityName: itemName,
      primaryAction: { label: "View Item", route: `/inventory?highlight=${item.id}` },
      secondaryAction: { label: "Adjust Threshold", route: `/inventory?highlight=${item.id}&edit=true` },
    });
  });

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return items;
  }, [checkouts, certifications, maintenanceRecords, employeeRequirements, tasks, criticalStockItems, lowStockItems]);

  if (loading) {
    return (
      <Card className="p-6 h-full bg-card/80 backdrop-blur-sm">
        <Skeleton className="h-6 w-48 mb-4" />
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        </ScrollArea>
      </Card>
    );
  }

  const highPriorityCount = alerts.filter(a => a.priority === "high").length;

  return (
    <Card className="p-5 sm:p-6 h-full flex flex-col animate-fade-in" style={{ boxShadow: "var(--shadow-card)" }}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      {/* Header */}
      <CollapsibleTrigger asChild>
      <button className="flex items-center justify-between w-full mb-5 pb-4 border-b border-border/40 text-left cursor-pointer group">
        <div className="flex items-baseline gap-3">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">Alerts & Notifications</h3>
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-muted-foreground/60 tabular-nums font-medium">
              {alerts.length} active
            </span>
            {highPriorityCount > 0 && (
              <span className="text-[10px] font-semibold text-destructive bg-destructive/8 px-1.5 py-0.5 rounded-full">
                {highPriorityCount} urgent
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && !isOpen && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/50">
              <Clock className="h-3 w-3" />
              <span className="font-medium tabular-nums">{formatRelativeTime(lastUpdated)}</span>
            </div>
          )}
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground/50 transition-transform duration-200 group-hover:text-muted-foreground", isOpen && "rotate-180")} />
        </div>
      </button>
      </CollapsibleTrigger>

      <CollapsibleContent>

      {alerts.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center py-10">
          <div>
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-success/8 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-success/60" strokeWidth={1.5} />
            </div>
            <p className="font-semibold text-foreground/80 text-[15px]">Nothing needs attention</p>
            <p className="text-[13px] mt-2 max-w-[260px] mx-auto text-muted-foreground/60 leading-relaxed">
              You'll see alerts here if credentials expire, maintenance is overdue, or tasks are blocked.
            </p>
          </div>
        </div>
      ) : (
        <ScrollArea className="flex-1 -mx-2 px-2">
          <div className="space-y-1">
            {alerts.slice(0, 20).map((alert) => {
              const Icon = alert.icon;
              const styles = getAlertStyles(alert.color);
              const isHighPriority = alert.priority === "high";
              
              return (
                <div
                  key={alert.id}
                  className={cn(
                    "group flex gap-3.5 p-3.5 rounded-lg border-l-[3px] transition-all duration-150",
                    "hover:bg-muted/40 cursor-pointer",
                    styles.border,
                    isHighPriority && "bg-destructive/[0.03]"
                  )}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(getPath(alert.navigateTo))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(getPath(alert.navigateTo));
                    }
                  }}
                >
                  {/* Icon */}
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                    "transition-transform duration-150 group-hover:scale-[1.03]",
                    styles.bg
                  )}>
                    <Icon className={cn("h-[18px] w-[18px]", styles.icon)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 py-0.5">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-medium text-foreground leading-tight group-hover:text-primary transition-colors">
                        {alert.title}
                      </p>
                      {isHighPriority && (
                        <span className="h-1.5 w-1.5 rounded-full bg-destructive flex-shrink-0 animate-pulse" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mt-0.5">
                      {alert.message}
                    </p>
                    {/* Action buttons */}
                    <div className="flex items-center gap-2 mt-2">
                      {alert.primaryAction && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-[11px] px-2.5 gap-1 font-medium"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(getPath(alert.primaryAction!.route));
                          }}
                        >
                          {alert.primaryAction.label}
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      )}
                      {alert.secondaryAction && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[11px] px-2 gap-1 font-medium text-muted-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(getPath(alert.secondaryAction!.route));
                          }}
                        >
                          <Settings2 className="h-3 w-3" />
                          {alert.secondaryAction.label}
                        </Button>
                      )}
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-medium tabular-nums ml-auto">
                        {alert.time}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
      </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
