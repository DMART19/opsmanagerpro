import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { 
  Package, 
  Users, 
  ClipboardCheck, 
  LogIn, 
  LogOut,
  FileText,
  Wrench,
  Wifi,
  ExternalLink,
  UserPlus,
  CheckCircle,
  PlusCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import { useDemoPath } from "@/hooks/use-demo-path";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useCheckouts } from "@/hooks/use-checkouts";
import { useMaintenance } from "@/hooks/use-maintenance";
import { useStaff } from "@/hooks/use-staff";
import { useEquipment } from "@/hooks/use-equipment";

interface ActivityItem {
  id: string;
  type: "checkout" | "checkin" | "maintenance" | "employee" | "task" | "inventory" | "task_complete" | "new_member";
  title: string;
  description: string;
  timestamp: Date;
  user?: string;
  navigateTo: string;
}

const getActivityIcon = (type: ActivityItem["type"]) => {
  switch (type) {
    case "checkout":
      return LogOut;
    case "checkin":
      return LogIn;
    case "maintenance":
      return Wrench;
    case "employee":
      return Users;
    case "new_member":
      return UserPlus;
    case "task":
      return PlusCircle;
    case "task_complete":
      return CheckCircle;
    case "inventory":
      return Package;
    default:
      return FileText;
  }
};

const getActivityStyles = (type: ActivityItem["type"]) => {
  switch (type) {
    case "checkout":
      return { bg: "bg-amber-500/10", icon: "text-amber-600 dark:text-amber-400" };
    case "checkin":
      return { bg: "bg-emerald-500/10", icon: "text-emerald-600 dark:text-emerald-400" };
    case "maintenance":
      return { bg: "bg-blue-500/10", icon: "text-blue-600 dark:text-blue-400" };
    case "employee":
      return { bg: "bg-violet-500/10", icon: "text-violet-600 dark:text-violet-400" };
    case "new_member":
      return { bg: "bg-indigo-500/10", icon: "text-indigo-600 dark:text-indigo-400" };
    case "task":
      return { bg: "bg-cyan-500/10", icon: "text-cyan-600 dark:text-cyan-400" };
    case "task_complete":
      return { bg: "bg-green-500/10", icon: "text-green-600 dark:text-green-400" };
    case "inventory":
      return { bg: "bg-orange-500/10", icon: "text-orange-600 dark:text-orange-400" };
    default:
      return { bg: "bg-muted/50", icon: "text-muted-foreground" };
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

export const RecentActivity = () => {
  const navigate = useNavigate();
  const { getPath } = useDemoPath();
  const [loading, setLoading] = useState(true);
  
  // Real data hooks
  const { checkouts } = useCheckouts();
  const { maintenanceRecords } = useMaintenance();
  const { staff } = useStaff();
  const { equipment } = useEquipment();
  
  // Additional data for recent activity
  const [recentCertifications, setRecentCertifications] = useState<any[]>([]);
  const [recentEquipmentUpdates, setRecentEquipmentUpdates] = useState<any[]>([]);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [recentStaffCreations, setRecentStaffCreations] = useState<any[]>([]);

  const fetchAdditionalData = useCallback(async () => {
    try {
      const [certsResult, equipResult, tasksResult, staffResult] = await Promise.all([
        // Fetch recent certifications with staff info — only needed fields
        supabase
          .from("certifications")
          .select(`id, name, created_at, updated_at, staff:staff_id (id, first_name, last_name)`)
          .order("updated_at", { ascending: false })
          .limit(10),
        // Fetch recently updated equipment — only needed fields
        supabase
          .from("equipment")
          .select("id, name, asset_tag, updated_at, created_at")
          .order("updated_at", { ascending: false })
          .limit(10),
        // Fetch recent tasks — only needed fields
        supabase
          .from("tasks")
          .select("id, title, status, created_at, updated_at, assigned_to")
          .order("updated_at", { ascending: false })
          .limit(15),
        // Fetch recently created staff — only needed fields
        supabase
          .from("staff")
          .select("id, first_name, last_name, position, created_at")
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      setRecentCertifications(certsResult.data || []);
      setRecentEquipmentUpdates(equipResult.data || []);
      setRecentTasks(tasksResult.data || []);
      setRecentStaffCreations(staffResult.data || []);
    } catch (error) {
      console.error("Error fetching activity data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdditionalData();

    // Debounced realtime — batch rapid changes into single refetch
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedFetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(fetchAdditionalData, 2000);
    };

    const channel = supabase
      .channel("recent-activity-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "equipment" }, debouncedFetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "certifications" }, debouncedFetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, debouncedFetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "staff" }, debouncedFetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "equipment_checkouts" }, debouncedFetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "maintenance_records" }, debouncedFetch)
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [fetchAdditionalData]);

  // Build activities from real data only
  const activities = useMemo(() => {
    const items: ActivityItem[] = [];

    // Active checkouts
    checkouts.forEach(checkout => {
      const equipmentName = checkout.equipment?.name || "Unknown Equipment";
      const assetTag = checkout.equipment?.asset_tag || "";
      const staffName = checkout.staff 
        ? `${checkout.staff.first_name} ${checkout.staff.last_name}`
        : checkout.checked_out_by || "Unknown";
      
      items.push({
        id: `checkout-${checkout.id}`,
        type: "checkout",
        title: "Asset Checked Out",
        description: `${equipmentName}${assetTag ? ` (${assetTag})` : ""} assigned for use`,
        timestamp: new Date(checkout.checkout_date),
        user: staffName,
        navigateTo: `/inventory?highlight=${checkout.equipment_id}`
      });
    });

    // Maintenance records
    maintenanceRecords.forEach(record => {
      const equipmentName = record.equipment?.name || "Unknown Equipment";
      items.push({
        id: `maintenance-${record.id}`,
        type: "maintenance",
        title: record.status === "completed" ? "Maintenance Completed" : "Maintenance Scheduled",
        description: `${equipmentName}: ${record.description || record.maintenance_type}`,
        timestamp: new Date(record.updated_at || record.created_at),
        user: record.performed_by || "System",
        navigateTo: `/inventory?highlight=${record.equipment_id}`
      });
    });

    // Certifications (credential assignments)
    recentCertifications.forEach(cert => {
      const staffName = cert.staff 
        ? `${cert.staff.first_name} ${cert.staff.last_name}`
        : "Unknown";
      const staffId = cert.staff?.id;
      
      items.push({
        id: `cert-${cert.id}`,
        type: "employee",
        title: "Credential Assigned",
        description: `${cert.name} for ${staffName}`,
        timestamp: new Date(cert.updated_at || cert.created_at),
        user: staffName,
        navigateTo: staffId 
          ? `/people?member=${staffId}&tab=certifications`
          : "/people"
      });
    });

    // Equipment updates (asset creation & edits)
    recentEquipmentUpdates.forEach(equip => {
      const isNewlyCreated = equip.created_at === equip.updated_at;
      items.push({
        id: `equip-${equip.id}`,
        type: "inventory",
        title: isNewlyCreated ? "Asset Created" : "Asset Edited",
        description: `${equip.name}${equip.asset_tag ? ` (${equip.asset_tag})` : ""} ${isNewlyCreated ? "added to inventory" : "details updated"}`,
        timestamp: new Date(equip.updated_at),
        user: "System",
        navigateTo: `/inventory?highlight=${equip.id}`
      });
    });

    // Tasks (creation & completion)
    recentTasks.forEach(task => {
      const isCompleted = task.status === "completed" || task.status === "done";
      const isNewlyCreated = task.created_at === task.updated_at;
      
      if (isCompleted) {
        items.push({
          id: `task-done-${task.id}`,
          type: "task_complete",
          title: "Task Completed",
          description: task.title,
          timestamp: new Date(task.updated_at),
          user: task.assigned_to?.[0] || "System",
          navigateTo: "/calendar"
        });
      }
      
      // Always show creation event
      items.push({
        id: `task-new-${task.id}`,
        type: "task",
        title: "Task Created",
        description: task.title,
        timestamp: new Date(task.created_at),
        user: "System",
        navigateTo: "/calendar"
      });
    });

    // Team member creation
    recentStaffCreations.forEach(member => {
      items.push({
        id: `member-${member.id}`,
        type: "new_member",
        title: "Team Member Added",
        description: `${member.first_name} ${member.last_name}${member.position ? ` — ${member.position}` : ""}`,
        timestamp: new Date(member.created_at),
        user: "System",
        navigateTo: `/people?member=${member.id}`
      });
    });

    // Sort all by timestamp (most recent first) and limit to 15
    return items
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 15);
  }, [checkouts, maintenanceRecords, recentCertifications, recentEquipmentUpdates, recentTasks, recentStaffCreations]);

  // Handle activity click
  const handleActivityClick = (activity: ActivityItem) => {
    navigate(getPath(activity.navigateTo));
  };

  // Handle user name click
  const handleUserClick = (e: React.MouseEvent, userName: string) => {
    e.stopPropagation();
    const staffMember = staff.find(s => 
      `${s.first_name} ${s.last_name}`.toLowerCase() === userName.toLowerCase()
    );
    if (staffMember) {
      navigate(getPath(`/people?member=${staffMember.id}`));
    } else {
      navigate(getPath(`/people?search=${encodeURIComponent(userName)}`));
    }
  };

  const isDataLoading = loading && activities.length === 0;

  return (
    <Card className="p-5 sm:p-6 flex flex-col animate-fade-in" style={{ boxShadow: "var(--shadow-card)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-border/40">
        <div className="flex items-baseline gap-3">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">Recent Activity</h3>
          {activities.length > 0 && (
            <span className="text-[13px] text-muted-foreground/60 tabular-nums font-medium">
              {activities.length} events
            </span>
          )}
        </div>
        {activities.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/8 px-2.5 py-1.5 rounded-full font-medium">
            <Wifi className="h-3 w-3" />
            <span>Live</span>
          </div>
        )}
      </div>

      {isDataLoading ? (
        <div className="flex-1 space-y-1">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3.5 p-3 rounded-lg">
              <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2 py-0.5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-52" />
              </div>
              <Skeleton className="h-3 w-10 mt-1" />
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="flex items-center justify-center text-center py-8">
          <div>
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-muted/60 flex items-center justify-center">
              <ClipboardCheck className="h-6 w-6 text-muted-foreground/40" strokeWidth={1.5} />
            </div>
            <p className="font-semibold text-foreground/75 text-[15px]">No recent activity</p>
            <p className="text-[13px] mt-1.5 text-muted-foreground/55">Activity will appear here as you use the system</p>
          </div>
        </div>
      ) : (
        <ScrollArea className="max-h-[400px] -mx-2 px-2">
          <div className="space-y-0.5">
            {activities.map((activity) => {
              const Icon = getActivityIcon(activity.type);
              const styles = getActivityStyles(activity.type);
              
              return (
                <div
                  key={activity.id}
                  onClick={() => handleActivityClick(activity)}
                  className={cn(
                    "group flex gap-3.5 p-3 rounded-lg",
                    "hover:bg-muted/40 transition-all duration-150 cursor-pointer",
                    "focus:outline-none focus:ring-2 focus:ring-primary/20"
                  )}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleActivityClick(activity);
                    }
                  }}
                >
                  {/* Icon Container */}
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                    "transition-transform duration-150 group-hover:scale-[1.03]",
                    styles.bg
                  )}>
                    <Icon className={cn("h-[18px] w-[18px]", styles.icon)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 py-0.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-foreground leading-tight group-hover:text-primary transition-colors">
                          {activity.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-1">
                          {activity.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[11px] text-muted-foreground/70 tabular-nums font-medium pt-0.5">
                          {formatRelativeTime(activity.timestamp)}
                        </span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    {activity.user && activity.user !== "System" && activity.user !== "HR System" && (
                      <button
                        onClick={(e) => handleUserClick(e, activity.user!)}
                        className="inline-block mt-1.5 text-[10px] uppercase tracking-wider text-primary/80 font-semibold hover:text-primary hover:underline transition-colors"
                      >
                        {activity.user}
                      </button>
                    )}
                    {activity.user && (activity.user === "System" || activity.user === "HR System") && (
                      <span className="inline-block mt-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
                        {activity.user}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </Card>
  );
};
