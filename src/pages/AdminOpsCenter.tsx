import { useState, useMemo, useEffect } from "react";
import { RequirementsAdminTab } from "@/components/settings/RequirementsAdminTab";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GuidanceTooltip, AdminGuidanceControls } from "@/components/guidance";
import { Navigation } from "@/components/Navigation";
import { LegalFooter } from "@/components/LegalFooter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductImpactRadar } from "@/components/admin/ProductImpactRadar";
import { UserFrictionDashboard } from "@/components/admin/UserFrictionDashboard";
import { WorkflowCompletionTracker } from "@/components/admin/WorkflowCompletionTracker";
import { FeatureUsageAnalytics } from "@/components/admin/FeatureUsageAnalytics";
import { FeatureUsageAnalyticsPanel } from "@/components/admin/FeatureUsageAnalyticsPanel";
import { PerformanceMonitor } from "@/components/admin/PerformanceMonitor";
import { ProductImprovementSuggestions } from "@/components/admin/ProductImprovementSuggestions";
import { TopPrioritiesPanel } from "@/components/admin/TopPrioritiesPanel";
import { ProductGrowthSignals } from "@/components/admin/ProductGrowthSignals";
import { RootCauseAnalysis } from "@/components/admin/RootCauseAnalysis";
import { PredictiveAlerts } from "@/components/admin/PredictiveAlerts";
import { UpgradeIntelligencePanel, UpgradeHotLeadsWidget } from "@/components/admin/UpgradeIntelligencePanel";
import { GrowthRadarPanel } from "@/components/admin/GrowthRadarPanel";
import { LiveWorkspaceMap } from "@/components/admin/LiveWorkspaceMap";
import { WorkspaceRecoveryPanel } from "@/components/admin/WorkspaceRecoveryPanel";
import { SecurityEventsPanel } from "@/components/admin/SecurityEventsPanel";
import { DisasterRecoveryPanel } from "@/components/admin/DisasterRecoveryPanel";
import { SecurityConfigPanel } from "@/components/admin/SecurityConfigPanel";
import { ChangeHistoryPanel } from "@/components/admin/ChangeHistoryPanel";
import { SecretsIntegrityPanel } from "@/components/admin/SecretsIntegrityPanel";
import { IncidentManagementPanel } from "@/components/admin/IncidentManagementPanel";
import { DataGovernancePanel } from "@/components/admin/DataGovernancePanel";
import { FeatureFlagsPanel } from "@/components/admin/FeatureFlagsPanel";
import { SystemReliabilityPanel } from "@/components/admin/SystemReliabilityPanel";
import { DatabaseIntegrityMonitor } from "@/components/admin/DatabaseIntegrityMonitor";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertTriangle,
  Search,
  LogOut,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Copy,
  Inbox,
  BarChart3,
  Radio,
  Shield,
  FileText,
  Bell,
  Zap,
  ShieldAlert,
  Lock,
  Navigation2,
  MousePointerClick,
  Globe,
  ArrowRight,
  ChevronRight,
  Lightbulb,
  TrendingUp,
  Stethoscope,
  RotateCcw,
  HardDrive,
  History as HistoryIcon,
  KeyRound,
  Activity,
   Database,
   ToggleLeft,
   Gauge,
   PieChart,
   ShieldCheck,
   Sparkles,
} from "lucide-react";
import { format, isAfter, subHours, subMinutes, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useErrorLogs, useResolveError, useUpdateErrorStatus, ErrorLog, ReplayBundle, ERROR_STATUSES, ErrorStatus } from "@/hooks/use-error-logs";
import { diagnoseError, getCategoryLabel, getCategoryColor } from "@/lib/error-diagnostics";
import { ProductEventsDashboard } from "@/components/admin/ProductEventsDashboard";
import { AuditLogsPanel } from "@/components/admin/AuditLogsPanel";
import { AdminWorkspaceUsagePanel } from "@/components/admin/AdminWorkspaceUsagePanel";
import { AnnouncementsManager } from "@/components/admin/AnnouncementsManager";
import { useAdminAlerts, useDismissAlert, useCheckSpikes, AdminAlert } from "@/hooks/use-admin-alerts";
import { ErrorGroupingTable } from "@/components/admin/ErrorGroupingTable";
import { DataIntegrityPanel } from "@/components/admin/DataIntegrityPanel";
import { ErrorTrendChart } from "@/components/admin/ErrorTrendChart";
import { WorkspaceHealthPanel } from "@/components/admin/WorkspaceHealthPanel";
import { PageHealthDetail } from "@/components/admin/PageHealthDetail";
import { WorkspaceHealthDetail } from "@/components/admin/WorkspaceHealthDetail";
import { SystemHealthSummary } from "@/components/admin/SystemHealthSummary";
import { SystemHealthDashboard } from "@/components/admin/SystemHealthDashboard";

import { AutoDiagnosisPanel } from "@/components/admin/AutoDiagnosisPanel";
import { OpsMetricCards } from "@/components/admin/OpsMetricCards";
import { motion } from "framer-motion";
import { toast } from "sonner";

const SEVERITY_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  critical: { label: "Critical", color: "bg-red-500/10 text-red-600 border-red-500/30", icon: XCircle },
  error: { label: "Error", color: "bg-orange-500/10 text-orange-600 border-orange-500/30", icon: AlertCircle },
  warn: { label: "Warn", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30", icon: AlertTriangle },
  info: { label: "Info", color: "bg-blue-500/10 text-blue-600 border-blue-500/30", icon: AlertCircle },
};

const PAGE_SIZE = 25;

// ─── Status Pills ───
const StatusPill = ({
  label,
  count,
  active,
  onClick,
  variant = "default",
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  variant?: "default" | "critical" | "warn";
}) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all border",
      active
        ? variant === "critical"
          ? "bg-red-500/15 text-red-600 border-red-500/40"
          : variant === "warn"
          ? "bg-orange-500/15 text-orange-600 border-orange-500/40"
          : "bg-primary/10 text-primary border-primary/30"
        : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
    )}
  >
    <span>{label}</span>
    <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs font-bold">
      {count}
    </Badge>
  </button>
);

// ─── Error Detail Drawer ───
const ErrorDetailDrawer = ({
  error,
  open,
  onOpenChange,
  onResolve,
  onUpdateStatus,
}: {
  error: ErrorLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolve: (id: string, notes?: string) => void;
  onUpdateStatus: (id: string, status: ErrorStatus, notes?: string) => void;
}) => {
  const [notes, setNotes] = useState("");

  if (!error) return null;
  const sev = SEVERITY_CONFIG[error.severity] || SEVERITY_CONFIG.error;
  const SevIcon = sev.icon;
  const diag = diagnoseError(error.message, error.stack_trace, {
    api_endpoint: error.api_endpoint,
    api_status_code: error.api_status_code,
    page_route: error.page_route,
    request_method: error.request_method,
    hit_count: error.hit_count,
  });

  const replay = error.replay_bundle as ReplayBundle | null;
  const breadcrumbs = replay?.breadcrumbs || [];

  const CRUMB_ICONS: Record<string, React.ElementType> = {
    navigation: Navigation2,
    click: MousePointerClick,
    api: Globe,
    custom: ArrowRight,
  };

  const replayText = [
    `Error ID: ${error.id}`,
    `Severity: ${error.severity}`,
    `Status: ${error.status}`,
    `Time: ${error.created_at}`,
    `Route: ${error.page_route || "N/A"}`,
    `Browser: ${error.browser_info || "N/A"}`,
    replay?.app_version ? `App Version: ${replay.app_version}` : null,
    replay?.viewport ? `Viewport: ${replay.viewport}` : null,
    error.api_endpoint ? `API: ${error.api_endpoint} (${error.api_status_code || "?"})` : null,
    `Hits: ${error.hit_count}`,
    `\n--- Diagnosis ---\nCause: ${diag.likelyCause}\nFix: ${diag.suggestedFix}\nCategory: ${getCategoryLabel(diag.category)}`,
    `\n--- Message ---\n${error.message}`,
    error.stack_trace ? `\n--- Stack Trace ---\n${error.stack_trace}` : null,
    error.action_context
      ? `\n--- Action Context ---\nAction: ${error.action_context.action}${error.action_context.inputs ? `\nInputs: ${JSON.stringify(error.action_context.inputs, null, 2)}` : ""}`
      : null,
    breadcrumbs.length > 0
      ? `\n--- Breadcrumb Timeline ---\n${breadcrumbs.map((b) => `[${b.timestamp}] ${b.type}: ${b.data}`).join("\n")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const currentStatusConfig = ERROR_STATUSES.find(s => s.value === error.status) || ERROR_STATUSES[0];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl w-full overflow-y-auto">
        <SheetHeader className="pr-10">
          <div className="flex items-center gap-3">
            <div className={cn("h-10 w-10 rounded-full flex items-center justify-center shrink-0", sev.color)}>
              <SevIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-left truncate">{sev.label} Error</SheetTitle>
              <p className="text-xs text-muted-foreground">
                First: {format(new Date(error.created_at), "MMM d, yyyy 'at' h:mm:ss a")}
              </p>
              {error.last_seen_at && error.hit_count > 1 && (
                <p className="text-xs text-muted-foreground">
                  Last: {format(new Date(error.last_seen_at), "MMM d, yyyy 'at' h:mm:ss a")}
                </p>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-5 mt-6">
          {/* Workflow Status */}
          <div className="flex items-center gap-3">
            <p className="text-xs font-medium text-muted-foreground shrink-0">Status:</p>
            <Select
              value={error.status}
              onValueChange={(v) => onUpdateStatus(error.id, v as ErrorStatus, notes || undefined)}
            >
              <SelectTrigger className="w-[180px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ERROR_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    <Badge variant="outline" className={cn("text-xs", s.color)}>
                      {s.label}
                    </Badge>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Root Cause Diagnosis */}
          <div className="grid grid-cols-1 gap-3">
            <div className="bg-muted/30 rounded-lg border p-3">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", getCategoryColor(diag.category))}>
                  {getCategoryLabel(diag.category)}
                </Badge>
                <Badge variant="outline" className={cn(
                  "text-[10px] px-1.5 py-0",
                  diag.severity === "critical" ? "text-destructive border-destructive/30" :
                  diag.severity === "high" ? "text-orange-600 border-orange-500/30" :
                  "text-muted-foreground"
                )}>
                  {diag.severity}
                </Badge>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Likely Cause</p>
                  <p className="text-sm font-medium">{diag.likelyCause}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Affected Component</p>
                  <p className="text-sm font-medium">{diag.affectedComponent}</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Suggested Fix</p>
                  <p className="text-sm font-medium">{diag.suggestedFix}</p>
                </div>
              </div>
            </div>

            {/* Investigation Steps */}
            <div className="bg-card rounded-lg border p-3">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-2">Investigation Steps</p>
              <ol className="space-y-1.5">
                {diag.investigationSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <span className="font-bold text-primary/60 shrink-0 w-4">{i + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Diagnostic Query */}
            {diag.relatedQuery && (
              <div className="bg-muted/50 rounded-lg border p-3">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Diagnostic Query</p>
                <code className="text-xs font-mono break-all">{diag.relatedQuery}</code>
              </div>
            )}
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">Route</p>
              <p className="font-mono text-xs bg-muted/50 rounded px-2 py-1 truncate">{error.page_route || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">Hits</p>
              <p className="font-bold">{error.hit_count}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-0.5">User</p>
              <p className="font-mono text-xs truncate">{error.user_email || error.user_id?.slice(0, 8) || "Anonymous"}</p>
            </div>
            {error.workspace_id && (
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Workspace</p>
                <p className="font-mono text-xs truncate">{error.workspace_id.slice(0, 8)}</p>
              </div>
            )}
            {replay?.app_version && (
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">App Version</p>
                <p className="font-mono text-xs bg-muted/50 rounded px-2 py-1 truncate">{replay.app_version}</p>
              </div>
            )}
            {replay?.viewport && (
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Viewport</p>
                <p className="font-mono text-xs bg-muted/50 rounded px-2 py-1">{replay.viewport}</p>
              </div>
            )}
            {error.api_endpoint && (
              <>
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">API Endpoint</p>
                  <p className="font-mono text-xs truncate">{error.api_endpoint}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-0.5">Status Code</p>
                  <p className="font-mono text-xs">{error.api_status_code || "—"}</p>
                </div>
              </>
            )}
          </div>

          <Separator />

          {/* Action Context */}
          {error.action_context && (
            <>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5" /> Action Context
                </p>
                <div className="bg-muted/30 rounded-lg border p-3 space-y-2">
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Action Performed</p>
                    <p className="text-sm font-medium font-mono">{error.action_context.action}</p>
                  </div>
                  {error.action_context.inputs && Object.keys(error.action_context.inputs).length > 0 && (
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Input Values (sanitized)</p>
                      <div className="bg-muted/40 rounded p-2 text-xs font-mono space-y-1 max-h-40 overflow-y-auto">
                        {Object.entries(error.action_context.inputs).map(([key, val]) => (
                          <div key={key} className="flex gap-2">
                            <span className="text-muted-foreground shrink-0">{key}:</span>
                            <span className="break-all">{String(val)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Breadcrumb Timeline */}
          {breadcrumbs.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> User Timeline ({breadcrumbs.length} events)
              </p>
              <div className="bg-muted/30 rounded-lg border border-border/50 divide-y divide-border/30 max-h-52 overflow-y-auto">
                {breadcrumbs.map((crumb, i) => {
                  const CrumbIcon = CRUMB_ICONS[crumb.type] || ArrowRight;
                  return (
                    <div key={i} className="flex items-start gap-2.5 px-3 py-2 text-xs">
                      <CrumbIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="font-mono truncate">{crumb.data}</p>
                        <p className="text-muted-foreground text-[10px]">
                          {format(new Date(crumb.timestamp), "h:mm:ss.SSS a")}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 capitalize">
                        {crumb.type}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {breadcrumbs.length > 0 && <Separator />}

          {/* Full message */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Message</p>
            <div className="bg-muted/40 rounded-lg p-3 text-sm font-mono whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
              {error.message}
            </div>
          </div>

          {/* Stack trace */}
          {error.stack_trace && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Stack Trace</p>
              <ScrollArea className="h-48">
                <div className="bg-muted/40 rounded-lg p-3 text-xs font-mono whitespace-pre-wrap break-all">
                  {error.stack_trace}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Browser */}
          {error.browser_info && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Browser / Device</p>
              <p className="text-xs font-mono bg-muted/40 rounded px-2 py-1 break-all">
                {error.browser_info}
              </p>
            </div>
          )}

          <Separator />

          {/* Self-Healing Actions */}
          {error.api_endpoint && error.status !== "resolved" && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" /> Quick Actions
              </p>
              <div className="flex gap-2 flex-wrap">
                {error.api_endpoint && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-xs"
                    onClick={() => {
                      toast.info("Retry request queued for: " + error.api_endpoint);
                    }}
                  >
                    <RefreshCw className="h-3 w-3" /> Retry Request
                  </Button>
                )}
                {diag.category === "schema" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-xs"
                    onClick={() => toast.info("Cache rebuild initiated")}
                  >
                    <Radio className="h-3 w-3" /> Rebuild Cache
                  </Button>
                )}
              </div>
            </div>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                navigator.clipboard.writeText(replayText);
                toast.success("Full replay bundle copied");
              }}
            >
              <Copy className="h-3.5 w-3.5" /> Copy Replay Bundle
            </Button>
            {error.status !== "resolved" && (
              <Button
                size="sm"
                className="gap-2"
                onClick={() => {
                  onUpdateStatus(error.id, "resolved", notes || undefined);
                  onOpenChange(false);
                }}
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Mark Resolved
              </Button>
            )}
          </div>

          {/* Internal note */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" /> Internal Note (optional)
            </p>
            <Textarea
              placeholder="Add context or notes…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px] resize-none text-sm"
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

// ─── Main Content ───
const TRIGGER_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  error_spike: { label: "Error Spike", icon: Zap, color: "text-red-600 bg-red-500/10 border-red-500/30" },
  endpoint_failure: { label: "Endpoint Failure", icon: ShieldAlert, color: "text-orange-600 bg-orange-500/10 border-orange-500/30" },
  auth_failure: { label: "Auth Failure", icon: Lock, color: "text-yellow-600 bg-yellow-500/10 border-yellow-500/30" },
};

const OpsContent = () => {
  const navigate = useNavigate();
  const { data: errors, isLoading, refetch } = useErrorLogs();
  const resolveError = useResolveError();
  const updateErrorStatus = useUpdateErrorStatus();
  const { data: alerts, isLoading: alertsLoading } = useAdminAlerts();
  const dismissAlert = useDismissAlert();
  const checkSpikes = useCheckSpikes();

  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pageFilter, setPageFilter] = useState("all");
  const [workspaceFilter, setWorkspaceFilter] = useState("all");
  const [activePill, setActivePill] = useState<string | null>(null);
  const [selectedError, setSelectedError] = useState<ErrorLog | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasNewErrors, setHasNewErrors] = useState(false);
  const [activeTab, setActiveTab] = useState("errors");
  const [pageHealthRoute, setPageHealthRoute] = useState<string | null>(null);
  const [pageHealthOpen, setPageHealthOpen] = useState(false);
  const [wsHealthId, setWsHealthId] = useState<string | null>(null);
  const [wsHealthOpen, setWsHealthOpen] = useState(false);

  const activeAlerts = useMemo(() => (alerts || []).filter(a => a.status === "active"), [alerts]);

  // Auto-check spikes every 2 minutes
  useEffect(() => {
    checkSpikes.mutate();
    const interval = setInterval(() => checkSpikes.mutate(), 120_000);
    return () => clearInterval(interval);
  }, []);

  // Derived stats
  const now = new Date();
  const last24h = subHours(now, 24);
  const last60min = subMinutes(now, 60);

  const stats = useMemo(() => {
    if (!errors) return { errors24h: 0, critical24h: 0, unresolved: 0, last60: 0 };
    // Use last_seen_at for time-based metrics — matches deduplication model
    // where a single error record can recur across multiple time windows
    const errors24h = errors.filter((e) => isAfter(new Date(e.last_seen_at), last24h)).length;
    const critical24h = errors.filter(
      (e) => e.severity === "critical" && isAfter(new Date(e.last_seen_at), last24h)
    ).length;
    const unresolved = errors.filter((e) => e.status === "unresolved").length;
    const last60 = errors.filter((e) => isAfter(new Date(e.last_seen_at), last60min)).length;
    return { errors24h, critical24h, unresolved, last60 };
  }, [errors]);

  // Top problem pages with error rate
  const topPages = useMemo(() => {
    if (!errors) return [];
    const map = new Map<string, { total: number; unresolved: number }>();
    errors.forEach((e) => {
      if (!e.page_route) return;
      const existing = map.get(e.page_route) || { total: 0, unresolved: 0 };
      existing.total += e.hit_count;
      if (e.status === "unresolved") existing.unresolved += e.hit_count;
      map.set(e.page_route, existing);
    });
    return Array.from(map.entries())
      .map(([page, stats]) => ({
        page,
        total: stats.total,
        unresolved: stats.unresolved,
        errorRate: errors.length > 0 ? Math.round((stats.total / errors.reduce((s, e) => s + e.hit_count, 0)) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [errors]);

  // Unique pages for filter
  const uniquePages = useMemo(() => {
    if (!errors) return [];
    return [...new Set(errors.map((e) => e.page_route).filter(Boolean))] as string[];
  }, [errors]);

  // Apply pill filter
  const handlePillClick = (pill: string) => {
    if (activePill === pill) {
      setActivePill(null);
      setSeverityFilter("all");
      setStatusFilter("all");
    } else {
      setActivePill(pill);
      if (pill === "errors24h") { setSeverityFilter("all"); setStatusFilter("all"); }
      if (pill === "critical24h") { setSeverityFilter("critical"); setStatusFilter("all"); }
      if (pill === "unresolved") { setSeverityFilter("all"); setStatusFilter("unresolved"); }
      if (pill === "last60") { setSeverityFilter("all"); setStatusFilter("all"); }
    }
    setCurrentPage(0);
  };

  // Filter
  const filtered = useMemo(() => {
    if (!errors) return [];
    return errors.filter((e) => {
      // Pill time filters — use last_seen_at to match stats calculation
      if (activePill === "errors24h" && !isAfter(new Date(e.last_seen_at), last24h)) return false;
      if (activePill === "last60" && !isAfter(new Date(e.last_seen_at), last60min)) return false;

      const matchSearch =
        !searchQuery ||
        e.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.page_route?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.user_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.user_email?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchSeverity = severityFilter === "all" || e.severity === severityFilter;
      const matchStatus = statusFilter === "all" || e.status === statusFilter;
      const matchPage = pageFilter === "all" || e.page_route === pageFilter;
      const matchWorkspace = workspaceFilter === "all" || e.workspace_id === workspaceFilter || e.user_id === workspaceFilter;
      return matchSearch && matchSeverity && matchStatus && matchPage && matchWorkspace;
    });
  }, [errors, searchQuery, severityFilter, statusFilter, pageFilter, workspaceFilter, activePill]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const handleResolve = (id: string, notes?: string) => {
    resolveError.mutate({ id, admin_notes: notes }, {
      onSuccess: () => toast.success("Error marked as resolved"),
      onError: () => toast.error("Failed to resolve error"),
    });
  };

  const handleUpdateStatus = (id: string, status: ErrorStatus, notes?: string) => {
    updateErrorStatus.mutate({ id, status, admin_notes: notes }, {
      onSuccess: () => toast.success(`Status updated to ${ERROR_STATUSES.find(s => s.value === status)?.label}`),
      onError: () => toast.error("Failed to update status"),
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <GuidanceTooltip
          guidanceId="admin_ops_intro"
          message="Monitor system health and unresolved issues. Use Impact Score and Friction Tracking to identify the most important problems."
          className="mb-4"
          action={{ label: "View Errors", onClick: () => document.getElementById("error-log-section")?.scrollIntoView({ behavior: "smooth" }) }}
        />
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              Ops Control Center
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5">Product intelligence & system health</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/admin/inbox")} className="gap-2">
              <Inbox className="h-4 w-4" /> Messages
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/admin/feedback")} className="gap-2">
              <BarChart3 className="h-4 w-4" /> Analytics
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" /> Logout
            </Button>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 sm:grid-cols-10 lg:grid-cols-20 h-auto">
            <TabsTrigger value="errors" className="text-xs gap-1.5">
              <Shield className="h-3.5 w-3.5" /> Errors
            </TabsTrigger>
            <TabsTrigger value="diagnosis" className="text-xs gap-1.5">
              <Stethoscope className="h-3.5 w-3.5" /> Diagnosis
            </TabsTrigger>
            <TabsTrigger value="health" className="text-xs gap-1.5">
              <Zap className="h-3.5 w-3.5" /> Health
            </TabsTrigger>
            <TabsTrigger value="livemap" className="text-xs gap-1.5">
              <Radio className="h-3.5 w-3.5" /> Live Map
            </TabsTrigger>
            <TabsTrigger value="audit" className="text-xs gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Audit
            </TabsTrigger>
            <TabsTrigger value="workspaces" className="text-xs gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" /> Workspaces
            </TabsTrigger>
            <TabsTrigger value="recovery" className="text-xs gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" /> Recovery
            </TabsTrigger>
            <TabsTrigger value="security" className="text-xs gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5" /> Security
            </TabsTrigger>
            <TabsTrigger value="intelligence" className="text-xs gap-1.5">
              <Lightbulb className="h-3.5 w-3.5" /> Intelligence
            </TabsTrigger>
            <TabsTrigger value="upgrade" className="text-xs gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" /> Upgrades
            </TabsTrigger>
            <TabsTrigger value="growth" className="text-xs gap-1.5">
              <Navigation2 className="h-3.5 w-3.5" /> Growth
            </TabsTrigger>
            <TabsTrigger value="disaster-recovery" className="text-xs gap-1.5">
              <HardDrive className="h-3.5 w-3.5" /> DR
            </TabsTrigger>
            <TabsTrigger value="sec-config" className="text-xs gap-1.5">
              <Lock className="h-3.5 w-3.5" /> Sec Config
            </TabsTrigger>
            <TabsTrigger value="changes" className="text-xs gap-1.5">
              <HistoryIcon className="h-3.5 w-3.5" /> Changes
            </TabsTrigger>
            <TabsTrigger value="secrets" className="text-xs gap-1.5">
              <KeyRound className="h-3.5 w-3.5" /> Secrets
            </TabsTrigger>
            <TabsTrigger value="incidents" className="text-xs gap-1.5">
              <Activity className="h-3.5 w-3.5" /> Incidents
            </TabsTrigger>
            <TabsTrigger value="governance" className="text-xs gap-1.5">
              <Database className="h-3.5 w-3.5" /> Governance
            </TabsTrigger>
            
            <TabsTrigger value="reliability" className="text-xs gap-1.5">
              <Gauge className="h-3.5 w-3.5" /> Reliability
            </TabsTrigger>
            <TabsTrigger value="feature-analytics" className="text-xs gap-1.5">
              <PieChart className="h-3.5 w-3.5" /> Analytics
            </TabsTrigger>
            <TabsTrigger value="db-integrity" className="text-xs gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> Integrity
            </TabsTrigger>
            <TabsTrigger value="requirements" className="text-xs gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Engine
            </TabsTrigger>
          </TabsList>

          <TabsContent value="errors" className="space-y-6">

        {/* System Health Summary */}
        <SystemHealthSummary errors={errors || []} isLoading={isLoading} />

        {/* Metric Cards */}
        <OpsMetricCards stats={stats} activePill={activePill} onPillClick={handlePillClick} />

        {/* Section: Error Trends */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
        >
          <ErrorTrendChart errors={errors || []} isLoading={isLoading} />
        </motion.div>

        {/* Section: Error Groups */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2 }}
        >
          <ErrorGroupingTable
            errors={errors || []}
            isLoading={isLoading}
            onSelectError={(err) => { setSelectedError(err); setDrawerOpen(true); }}
          />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 2) Error Inbox (main) */}
          <div className="lg:col-span-3 space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="py-4">
                <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search message, page, user…"
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(0); }}
                      className="pl-9"
                    />
                  </div>
                  <Select value={severityFilter} onValueChange={(v) => { setSeverityFilter(v); setActivePill(null); setCurrentPage(0); }}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severity</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                      <SelectItem value="warn">Warn</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setActivePill(null); setCurrentPage(0); }}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      {ERROR_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {uniquePages.length > 1 && (
                    <Select value={pageFilter} onValueChange={(v) => { setPageFilter(v); setCurrentPage(0); }}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Page" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Pages</SelectItem>
                        {uniquePages.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Table */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  Error Inbox
                  <Badge variant="secondary">{filtered.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <CheckCircle2 className="h-12 w-12 text-green-500/50 mb-4" />
                    <p className="text-muted-foreground font-medium">All clear — no errors match your filters</p>
                  </div>
                ) : (
                  <>
                    <ScrollArea className="h-[520px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[140px]">Time</TableHead>
                            <TableHead className="w-[100px]">Severity</TableHead>
                            <TableHead>Message</TableHead>
                            <TableHead className="w-[150px]">User</TableHead>
                            <TableHead className="w-[120px]">Route</TableHead>
                            <TableHead className="w-[60px]">Hits</TableHead>
                            <TableHead className="w-[100px]">Status</TableHead>
                            <TableHead className="w-[90px]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginated.map((err) => {
                            const sev = SEVERITY_CONFIG[err.severity] || SEVERITY_CONFIG.error;
                            const SevIcon = sev.icon;
                            return (
                              <TableRow
                                key={err.id}
                                className={cn(
                                  "cursor-pointer hover:bg-muted/50",
                                  err.status === "unresolved" && err.severity === "critical" && "bg-red-500/5"
                                )}
                                onClick={() => { setSelectedError(err); setDrawerOpen(true); }}
                              >
                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                  {format(new Date(err.created_at), "MMM d, h:mm a")}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={cn("gap-1 text-xs", sev.color)}>
                                    <SevIcon className="h-3 w-3" />
                                    {sev.label}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <p className="truncate max-w-[280px] text-sm">{err.message}</p>
                                </TableCell>
                                <TableCell>
                                  <span className="text-xs font-mono text-muted-foreground truncate block max-w-[140px]">
                                    {err.user_email || err.user_id?.slice(0, 8) || "Anonymous"}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <span className="text-xs font-mono text-muted-foreground truncate block max-w-[110px]">
                                    {err.page_route || "—"}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary" className="text-xs">{err.hit_count}</Badge>
                                </TableCell>
                                <TableCell>
                                  {(() => {
                                    const sc = ERROR_STATUSES.find(s => s.value === err.status);
                                    return (
                                      <Badge variant="outline" className={cn("text-xs", sc?.color)}>
                                        {sc?.label || err.status}
                                      </Badge>
                                    );
                                  })()}
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedError(err);
                                        setDrawerOpen(true);
                                      }}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    {err.status !== "resolved" && err.status !== "ignored" && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleUpdateStatus(err.id, "resolved");
                                        }}
                                      >
                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </ScrollArea>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between pt-4">
                        <p className="text-xs text-muted-foreground">
                          Showing {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
                        </p>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === 0}
                            onClick={() => setCurrentPage((p) => p - 1)}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage >= totalPages - 1}
                            onClick={() => setCurrentPage((p) => p + 1)}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 4) Top Problem Pages & Workspace Health */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Page Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
                  </div>
                ) : topPages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No problem pages 🎉</p>
                ) : (
                  <div className="space-y-1.5">
                    {topPages.map((entry, i) => (
                      <button
                        key={entry.page}
                        className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-muted/50 transition-all hover:shadow-sm text-left group"
                        onClick={() => {
                          setPageHealthRoute(entry.page);
                          setPageHealthOpen(true);
                        }}
                      >
                        <span className="text-xs font-bold text-muted-foreground/60 w-4 shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <span className="font-mono text-xs truncate block">{entry.page}</span>
                          <div className="mt-1.5 w-full h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                entry.errorRate > 50 ? "bg-destructive" : entry.errorRate > 20 ? "bg-warning" : "bg-primary/60"
                              )}
                              style={{ width: `${Math.max(entry.errorRate, 4)}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant="secondary" className="text-xs tabular-nums">{entry.total}</Badge>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Workspace Health */}
            <WorkspaceHealthPanel
              errors={errors || []}
              isLoading={isLoading}
              onFilterWorkspace={(wsId) => {
                setWsHealthId(wsId);
                setWsHealthOpen(true);
              }}
            />

            {/* Data Integrity Checks */}
            <DataIntegrityPanel errors={errors || []} alerts={alerts || []} isLoading={isLoading} />

            {/* Quick links */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={() => {
                    setStatusFilter("unresolved");
                    setSeverityFilter("critical");
                    setActivePill(null);
                    setCurrentPage(0);
                  }}
                >
                  <XCircle className="h-4 w-4 text-destructive" /> Show Critical Only
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={() => {
                    setSeverityFilter("all");
                    setStatusFilter("all");
                    setPageFilter("all");
                    setWorkspaceFilter("all");
                    setSearchQuery("");
                    setActivePill(null);
                    setCurrentPage(0);
                  }}
                >
                  <RefreshCw className="h-4 w-4" /> Clear All Filters
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Upgrade Hot Leads Widget */}
        <div className="mt-8">
          <UpgradeHotLeadsWidget />
        </div>

        {/* System Announcements */}
        <div className="mt-8">
          <AnnouncementsManager />
        </div>

        {/* Product Events Dashboard */}
        <div className="mt-8">
          <ProductEventsDashboard />
        </div>

        {/* Guidance System Controls */}
        <div className="mt-8">
          <AdminGuidanceControls />
        </div>
          </TabsContent>

          <TabsContent value="diagnosis">
            <AutoDiagnosisPanel errors={errors || []} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="health">
            <SystemHealthDashboard
              errors={errors || []}
              isLoading={isLoading}
              onSelectError={(err) => { setSelectedError(err); setDrawerOpen(true); }}
              onFilterByEndpoint={(endpoint) => {
                setSearchQuery(endpoint);
                setSeverityFilter("all");
                setStatusFilter("all");
                setActiveTab("errors");
              }}
              onFilterByPage={(route) => {
                setPageHealthRoute(route);
                setPageHealthOpen(true);
              }}
              onSwitchToErrors={(filter) => {
                if (filter === "critical") {
                  setSeverityFilter("critical");
                  setStatusFilter("unresolved");
                } else if (filter === "5xx") {
                  setSearchQuery("500");
                  setSeverityFilter("all");
                } else if (filter === "api") {
                  setSearchQuery("");
                  setSeverityFilter("all");
                } else {
                  setSearchQuery("");
                  setSeverityFilter("all");
                  setStatusFilter("all");
                }
                setActiveTab("errors");
              }}
            />
          </TabsContent>

          <TabsContent value="livemap">
            <LiveWorkspaceMap />
          </TabsContent>


          <TabsContent value="audit">
            <AuditLogsPanel />
          </TabsContent>

          <TabsContent value="workspaces">
            <AdminWorkspaceUsagePanel />
          </TabsContent>

          <TabsContent value="recovery">
            <WorkspaceRecoveryPanel />
          </TabsContent>

          <TabsContent value="security">
            <SecurityEventsPanel />
          </TabsContent>

          <TabsContent value="disaster-recovery">
            <DisasterRecoveryPanel />
          </TabsContent>

          <TabsContent value="sec-config">
            <SecurityConfigPanel />
          </TabsContent>

          <TabsContent value="changes">
            <ChangeHistoryPanel />
          </TabsContent>

          <TabsContent value="secrets">
            <SecretsIntegrityPanel />
          </TabsContent>

          <TabsContent value="incidents">
            <IncidentManagementPanel />
          </TabsContent>

          <TabsContent value="governance">
            <DataGovernancePanel />
          </TabsContent>

          

          <TabsContent value="reliability">
            <SystemReliabilityPanel />
          </TabsContent>

          <TabsContent value="feature-analytics">
            <FeatureUsageAnalyticsPanel />
          </TabsContent>

          <TabsContent value="intelligence">
            <div className="space-y-6">
              {/* 1. Top Priorities — ranked by impact score */}
              <TopPrioritiesPanel errors={errors || []} isLoading={isLoading} />

              {/* 2. Predictive Alerts + Product Growth side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PredictiveAlerts errors={errors || []} />
                <ProductGrowthSignals />
              </div>

              {/* 3. Root Cause Analysis — grouped error clusters */}
              <RootCauseAnalysis errors={errors || []} isLoading={isLoading} />

              {/* 4. Improvement Suggestions */}
              <ProductImprovementSuggestions errors={errors || []} />

              {/* 5. Impact Radar + Friction side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ProductImpactRadar errors={errors || []} isLoading={isLoading} />
                <UserFrictionDashboard />
              </div>

              {/* 6. Workflow Completion + Feature Usage side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <WorkflowCompletionTracker />
                <FeatureUsageAnalytics />
              </div>

              {/* 7. Performance Monitor */}
              <PerformanceMonitor />
            </div>
          </TabsContent>

          <TabsContent value="upgrade">
            <UpgradeIntelligencePanel />
          </TabsContent>

          <TabsContent value="growth">
            <GrowthRadarPanel />
          </TabsContent>

          <TabsContent value="db-integrity">
            <DatabaseIntegrityMonitor />
          </TabsContent>

          <TabsContent value="requirements">
            <RequirementsAdminTab />
          </TabsContent>
        </Tabs>

        {/* Error Detail Drawer */}
        <ErrorDetailDrawer
          error={selectedError}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          onResolve={handleResolve}
          onUpdateStatus={handleUpdateStatus}
        />

        {/* Page Health Detail Drawer */}
        <PageHealthDetail
          open={pageHealthOpen}
          onOpenChange={setPageHealthOpen}
          pageRoute={pageHealthRoute}
          errors={errors || []}
          onSelectError={(err) => {
            setPageHealthOpen(false);
            setSelectedError(err);
            setDrawerOpen(true);
          }}
        />

        {/* Workspace Health Detail Drawer */}
        <WorkspaceHealthDetail
          open={wsHealthOpen}
          onOpenChange={setWsHealthOpen}
          workspaceId={wsHealthId}
          errors={errors || []}
          onSelectError={(err) => {
            setWsHealthOpen(false);
            setSelectedError(err);
            setDrawerOpen(true);
          }}
        />
      </main>
      <LegalFooter />
    </div>
  );
};

const AdminOpsCenter = () => <OpsContent />;

export default AdminOpsCenter;
