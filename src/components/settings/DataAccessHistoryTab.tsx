import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Eye,
  Download,
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  Package,
  Box,
  Users,
  ShieldCheck,
  CalendarDays,
  Layers,
  Settings,
  RefreshCw,
  History,
  ShieldAlert,
  Crown,
  Bell,
  Save,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

// ─── Types ───

interface AccessLog {
  id: string;
  user_id: string;
  object_type: string;
  object_id: string | null;
  action_type: string;
  source_ip: string | null;
  user_agent: string | null;
  page_route: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  is_admin_access: boolean;
  admin_user_id: string | null;
  admin_email: string | null;
  access_reason: string | null;
}

type ObjectTypeFilter = "all" | "assets" | "containers" | "team_members" | "credentials" | "workspace_settings" | "calendar_tasks" | "pallet_layouts";
type ActionTypeFilter = "all" | "view" | "read" | "export" | "admin_access";
type DateRangeFilter = "24h" | "7d" | "30d" | "90d" | "all";

// ─── Constants ───

const OBJECT_TYPE_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  assets: { label: "Assets", icon: Package, color: "bg-blue-500/10 text-blue-600" },
  containers: { label: "Containers", icon: Box, color: "bg-amber-500/10 text-amber-600" },
  team_members: { label: "Team Members", icon: Users, color: "bg-emerald-500/10 text-emerald-600" },
  credentials: { label: "Credentials", icon: ShieldCheck, color: "bg-violet-500/10 text-violet-600" },
  workspace_settings: { label: "Settings", icon: Settings, color: "bg-slate-500/10 text-slate-600" },
  calendar_tasks: { label: "Tasks", icon: CalendarDays, color: "bg-rose-500/10 text-rose-600" },
  pallet_layouts: { label: "Pallets", icon: Layers, color: "bg-orange-500/10 text-orange-600" },
};

const ACTION_TYPE_META: Record<string, { label: string; icon: React.ElementType }> = {
  view: { label: "Viewed", icon: Eye },
  read: { label: "Read", icon: FileText },
  export: { label: "Exported", icon: Download },
  admin_view: { label: "Admin Viewed", icon: ShieldAlert },
  admin_action: { label: "Admin Action", icon: ShieldAlert },
};

const PAGE_SIZE = 25;

// ─── Sub-components ───

const AdminAccessBanner = ({ log }: { log: AccessLog }) => (
  <div className="flex items-center gap-2 px-3 py-1.5 -mx-3 -my-0.5 bg-amber-500/5 border-l-2 border-amber-500 rounded-r">
    <Crown className="h-3.5 w-3.5 text-amber-600 shrink-0" />
    <div className="min-w-0 flex-1">
      <p className="text-xs font-semibold text-amber-700">Platform Admin Access</p>
      <p className="text-[11px] text-amber-600/80 truncate">
        {log.admin_email || "Admin"}
        {log.access_reason && <> · {log.access_reason}</>}
      </p>
    </div>
  </div>
);

// ─── Component ───

export const DataAccessHistoryTab = () => {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [adminAccessCount, setAdminAccessCount] = useState(0);

  // Filters
  const [objectTypeFilter, setObjectTypeFilter] = useState<ObjectTypeFilter>("all");
  const [actionTypeFilter, setActionTypeFilter] = useState<ActionTypeFilter>("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>("30d");
  const [searchQuery, setSearchQuery] = useState("");

  // Alert settings
  const [alertSettings, setAlertSettings] = useState({
    data_access_alerts: false,
    admin_access_alerts: true,
    large_export_alerts: false,
    large_export_threshold: 100,
  });
  const [alertSettingsLoading, setAlertSettingsLoading] = useState(true);
  const [alertSettingsSaving, setAlertSettingsSaving] = useState(false);
  const [showAlertSettings, setShowAlertSettings] = useState(false);

  // Load alert settings
  useEffect(() => {
    const loadAlertSettings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await (supabase as any)
          .from("notification_settings")
          .select("data_access_alerts, admin_access_alerts, large_export_alerts, large_export_threshold")
          .eq("user_id", user.id)
          .maybeSingle();
        if (data) {
          setAlertSettings({
            data_access_alerts: data.data_access_alerts ?? false,
            admin_access_alerts: data.admin_access_alerts ?? true,
            large_export_alerts: data.large_export_alerts ?? false,
            large_export_threshold: data.large_export_threshold ?? 100,
          });
        }
      } catch {
        // ignore
      } finally {
        setAlertSettingsLoading(false);
      }
    };
    loadAlertSettings();
  }, []);

  const saveAlertSettings = async () => {
    setAlertSettingsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await (supabase as any)
        .from("notification_settings")
        .upsert({
          user_id: user.id,
          ...alertSettings,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      if (error) throw error;
      toast({ title: "Alert settings saved", description: "Your data access alert preferences are now active." });
    } catch (err: any) {
      toast({ title: "Error saving settings", description: err.message, variant: "destructive" });
    } finally {
      setAlertSettingsSaving(false);
    }
  };

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = (supabase as any)
        .from("data_access_logs")
        .select("*", { count: "exact" })
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      // Object type filter
      if (objectTypeFilter !== "all") {
        query = query.eq("object_type", objectTypeFilter);
      }

      // Action type filter
      if (actionTypeFilter === "admin_access") {
        query = query.eq("is_admin_access", true);
      } else if (actionTypeFilter !== "all") {
        query = query.eq("action_type", actionTypeFilter);
      }

      // Date range filter
      if (dateRangeFilter !== "all") {
        const now = new Date();
        const msMap: Record<string, number> = {
          "24h": 24 * 60 * 60 * 1000,
          "7d": 7 * 24 * 60 * 60 * 1000,
          "30d": 30 * 24 * 60 * 60 * 1000,
          "90d": 90 * 24 * 60 * 60 * 1000,
        };
        const cutoff = new Date(now.getTime() - msMap[dateRangeFilter]);
        query = query.gte("created_at", cutoff.toISOString());
      }

      // Search by page route, object id, or admin email
      if (searchQuery.trim()) {
        query = query.or(`page_route.ilike.%${searchQuery.trim()}%,object_id.ilike.%${searchQuery.trim()}%,admin_email.ilike.%${searchQuery.trim()}%`);
      }

      const { data, count, error } = await query;
      if (error) throw error;

      setLogs(data || []);
      setTotalCount(count || 0);

      // Count admin access events for the summary badge
      const adminCount = (data || []).filter((l: AccessLog) => l.is_admin_access).length;
      setAdminAccessCount(adminCount);
    } catch (err) {
      console.error("Failed to fetch access logs:", err);
    } finally {
      setLoading(false);
    }
  }, [page, objectTypeFilter, actionTypeFilter, dateRangeFilter, searchQuery]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [objectTypeFilter, actionTypeFilter, dateRangeFilter, searchQuery]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const renderObjectBadge = (type: string) => {
    const meta = OBJECT_TYPE_META[type];
    if (!meta) return <Badge variant="outline" className="text-xs">{type}</Badge>;
    const Icon = meta.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${meta.color}`}>
        <Icon className="h-3 w-3" />
        {meta.label}
      </span>
    );
  };

  const renderActionBadge = (log: AccessLog) => {
    if (log.is_admin_access) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge className="text-xs gap-1 bg-amber-500/15 text-amber-700 border-amber-500/30 hover:bg-amber-500/20">
                <ShieldAlert className="h-3 w-3" />
                Admin
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="text-xs font-medium">Platform Admin Access</p>
              {log.admin_email && <p className="text-xs text-muted-foreground">{log.admin_email}</p>}
              {log.access_reason && <p className="text-xs text-muted-foreground mt-0.5">Reason: {log.access_reason}</p>}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    const meta = ACTION_TYPE_META[log.action_type];
    if (!meta) return <Badge variant="secondary" className="text-xs">{log.action_type}</Badge>;
    const Icon = meta.icon;
    return (
      <Badge variant={log.action_type === "export" ? "default" : "secondary"} className="text-xs gap-1">
        <Icon className="h-3 w-3" />
        {meta.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <History className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-foreground">Data Access History</h3>
          <p className="text-xs text-muted-foreground">
            Full record of when workspace data was accessed
          </p>
        </div>
        {adminAccessCount > 0 && (
          <Badge
            variant="outline"
            className="gap-1.5 bg-amber-500/10 text-amber-700 border-amber-500/25 cursor-pointer hover:bg-amber-500/15 transition-colors"
            onClick={() => setActionTypeFilter("admin_access")}
          >
            <Crown className="h-3 w-3" />
            {adminAccessCount} admin access{adminAccessCount > 1 ? "es" : ""}
          </Badge>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAlertSettings(!showAlertSettings)}
          className="gap-1.5 h-9 shrink-0"
        >
          <Bell className="h-3.5 w-3.5" />
          Alerts
        </Button>
      </div>

      {/* Alert Settings Panel */}
      {showAlertSettings && (
        <Card className="p-4 border-primary/20">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground">Data Access Alerts</h4>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Receive notifications when important data access events occur in your workspace.
          </p>
          {alertSettingsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label className="text-sm font-medium">Admin Access Alerts</Label>
                  <p className="text-xs text-muted-foreground">Notify when a platform admin accesses your workspace</p>
                </div>
                <Switch
                  checked={alertSettings.admin_access_alerts}
                  onCheckedChange={(v) => setAlertSettings(prev => ({ ...prev, admin_access_alerts: v }))}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label className="text-sm font-medium">Large Export Alerts</Label>
                  <p className="text-xs text-muted-foreground">Notify when large data exports are performed</p>
                </div>
                <Switch
                  checked={alertSettings.large_export_alerts}
                  onCheckedChange={(v) => setAlertSettings(prev => ({ ...prev, large_export_alerts: v }))}
                />
              </div>
              {alertSettings.large_export_alerts && (
                <div className="pl-4 border-l-2 border-muted">
                  <Label className="text-xs font-medium">Export threshold (records)</Label>
                  <div className="flex items-center gap-3 mt-1">
                    <Slider
                      value={[alertSettings.large_export_threshold]}
                      onValueChange={([v]) => setAlertSettings(prev => ({ ...prev, large_export_threshold: v }))}
                      min={10}
                      max={1000}
                      step={10}
                      className="flex-1"
                    />
                    <span className="text-xs font-mono text-muted-foreground w-12 text-right">
                      {alertSettings.large_export_threshold}
                    </span>
                  </div>
                </div>
              )}
              <Separator />
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label className="text-sm font-medium">All Data Access Alerts</Label>
                  <p className="text-xs text-muted-foreground">Notify on any data read or export event</p>
                </div>
                <Switch
                  checked={alertSettings.data_access_alerts}
                  onCheckedChange={(v) => setAlertSettings(prev => ({ ...prev, data_access_alerts: v }))}
                />
              </div>
              <Button size="sm" onClick={saveAlertSettings} disabled={alertSettingsSaving} className="w-full gap-1.5">
                {alertSettingsSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save Alert Settings
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Admin Access Info Banner */}
      {actionTypeFilter === "admin_access" && (
        <Card className="p-3 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">Platform Admin Access Events</p>
              <p className="text-xs text-amber-600/80 mt-0.5">
                These events are recorded whenever a platform administrator views or accesses your workspace data.
                This ensures full transparency of administrative actions on your account.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card className="p-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by route, object ID, or admin email…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
          <Select value={objectTypeFilter} onValueChange={(v) => setObjectTypeFilter(v as ObjectTypeFilter)}>
            <SelectTrigger className="w-full sm:w-[150px] h-9 text-sm">
              <SelectValue placeholder="Data type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="assets">Assets</SelectItem>
              <SelectItem value="containers">Containers</SelectItem>
              <SelectItem value="team_members">Team Members</SelectItem>
              <SelectItem value="credentials">Credentials</SelectItem>
              <SelectItem value="workspace_settings">Settings</SelectItem>
              <SelectItem value="calendar_tasks">Tasks</SelectItem>
              <SelectItem value="pallet_layouts">Pallets</SelectItem>
            </SelectContent>
          </Select>
          <Select value={actionTypeFilter} onValueChange={(v) => setActionTypeFilter(v as ActionTypeFilter)}>
            <SelectTrigger className="w-full sm:w-[150px] h-9 text-sm">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              <SelectItem value="view">View</SelectItem>
              <SelectItem value="read">Read</SelectItem>
              <SelectItem value="export">Export</SelectItem>
              <SelectItem value="admin_access">
                <span className="flex items-center gap-1.5">
                  <Crown className="h-3 w-3 text-amber-600" />
                  Admin Access
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateRangeFilter} onValueChange={(v) => setDateRangeFilter(v as DateRangeFilter)}>
            <SelectTrigger className="w-full sm:w-[130px] h-9 text-sm">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchLogs} className="h-9 gap-1.5 shrink-0">
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <History className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No access logs found</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Access events will appear here as you use the platform
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-[140px]">Data Type</TableHead>
                    <TableHead className="text-xs w-[110px]">Action</TableHead>
                    <TableHead className="text-xs">Accessed By</TableHead>
                    <TableHead className="text-xs w-[160px]">Date & Time</TableHead>
                    <TableHead className="text-xs w-[100px]">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const metadata = log.metadata as Record<string, unknown> | null;
                    const recordCount = metadata?.count ?? metadata?.recordCount;
                    return (
                      <TableRow
                        key={log.id}
                        className={`h-[3.5rem] ${log.is_admin_access ? "bg-amber-500/[0.03]" : ""}`}
                      >
                        <TableCell className="py-2">
                          {renderObjectBadge(log.object_type)}
                        </TableCell>
                        <TableCell className="py-2">
                          {renderActionBadge(log)}
                        </TableCell>
                        <TableCell className="py-2">
                          {log.is_admin_access ? (
                            <AdminAccessBanner log={log} />
                          ) : (
                            <span className="text-xs text-muted-foreground font-mono truncate block max-w-[200px]">
                              {log.page_route || "—"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-2">
                          <div className="text-xs">
                            <p className="font-medium">{format(new Date(log.created_at), "MMM d, yyyy")}</p>
                            <p className="text-muted-foreground">{format(new Date(log.created_at), "h:mm:ss a")}</p>
                          </div>
                        </TableCell>
                        <TableCell className="py-2">
                          {recordCount !== undefined && recordCount !== null ? (
                            <Badge variant="outline" className="text-xs">
                              {String(recordCount)} records
                            </Badge>
                          ) : log.access_reason ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-500/30 cursor-help">
                                    Reason
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="left">
                                  <p className="text-xs max-w-[200px]">{log.access_reason}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount.toLocaleString()}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={page === 0}
                    onClick={() => setPage(p => p - 1)}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <span className="text-xs text-muted-foreground px-2">
                    Page {page + 1} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(p => p + 1)}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
};
