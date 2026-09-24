/**
 * LiveWorkspaceMap — Real-time overview of platform-wide workspace activity.
 *
 * Sections:
 *  1. KPI summary cards
 *  2. Active workspace cards (with growth & error indicators)
 *  3. Live activity feed (realtime via product_events)
 *  4. Error hotspots
 */

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Map as MapIcon,
  Activity,
  Users,
  Package,
  Layers,
  Shield,
  AlertTriangle,
  TrendingUp,
  Clock,
  Search,
  Radio,
  Zap,
  ChevronRight,
  Eye,
  ArrowUpRight,
  Calendar,
  Award,
  ClipboardList,
  Flame,
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow, format, subHours, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ───

interface WorkspaceSnapshot {
  userId: string;
  name: string;
  email: string | null;
  plan: string | null;
  // Activity
  events24h: number;
  events7d: number;
  eventBreakdown: Record<string, number>;
  // Growth
  assetsAdded7d: number;
  teamAdded7d: number;
  // Errors
  errors24h: number;
  unresolvedErrors: number;
  topErrorPage: string | null;
  // Timing
  lastActivity: string | null;
  // Tags
  isHighActivity: boolean;
  isErrorHotspot: boolean;
}

interface LiveEvent {
  id: string;
  userId: string | null;
  workspaceName: string | null;
  userEmail: string | null;
  eventType: string;
  timestamp: string;
}

const EVENT_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  asset_created: { label: "Asset Created", icon: Package, color: "text-blue-600 bg-blue-500/10" },
  container_created: { label: "Container Created", icon: Layers, color: "text-indigo-600 bg-indigo-500/10" },
  team_member_added: { label: "Team Member Added", icon: Users, color: "text-emerald-600 bg-emerald-500/10" },
  credential_added: { label: "Credential Updated", icon: Award, color: "text-amber-600 bg-amber-500/10" },
  pallet_saved: { label: "Pallet Layout Saved", icon: ClipboardList, color: "text-purple-600 bg-purple-500/10" },
  calendar_event_created: { label: "Calendar Task Created", icon: Calendar, color: "text-pink-600 bg-pink-500/10" },
};

// ─── Data fetching ───

async function fetchWorkspaceSnapshots(): Promise<WorkspaceSnapshot[]> {
  const now = new Date();
  const twentyFourHoursAgo = subHours(now, 24);
  const sevenDaysAgo = subDays(now, 7);

  // Get workspace plans
  const { data: plans } = await supabase
    .from("workspace_plans")
    .select("user_id, plan")
    .limit(200);

  if (!plans?.length) return [];
  const userIds = plans.map(p => p.user_id);
  const planMap = new Map(plans.map(p => [p.user_id, p.plan]));

  // Parallel fetches
  const [
    profilesRes,
    settingsRes,
    events24hRes,
    events7dRes,
    assets7dRes,
    team7dRes,
    errors24hRes,
    unresolvedErrorsRes,
    lastEventRes,
  ] = await Promise.all([
    supabase.from("profiles").select("id, email, display_name").in("id", userIds),
    supabase.from("workspace_settings").select("user_id, workspace_name").in("user_id", userIds),
    supabase.from("product_events").select("user_id, event_type")
      .in("user_id", userIds).gte("created_at", twentyFourHoursAgo.toISOString()),
    supabase.from("product_events").select("user_id, event_type")
      .in("user_id", userIds).gte("created_at", sevenDaysAgo.toISOString()),
    supabase.from("cache_inventory").select("user_id")
      .in("user_id", userIds).gte("created_at", sevenDaysAgo.toISOString()),
    supabase.from("employees").select("user_id")
      .in("user_id", userIds).gte("created_at", sevenDaysAgo.toISOString()),
    supabase.from("error_logs").select("user_id, page_route, hit_count")
      .in("user_id", userIds).gte("created_at", twentyFourHoursAgo.toISOString()),
    supabase.from("error_logs").select("user_id, page_route, hit_count")
      .in("user_id", userIds).eq("status", "unresolved"),
    // Fetch last activity timestamp per user from product_events
    supabase.from("product_events").select("user_id, created_at")
      .in("user_id", userIds).order("created_at", { ascending: false }).limit(500),
  ]);

  const profileMap = new Map((profilesRes.data || []).map(p => [p.id, p]));
  const settingsMap = new Map((settingsRes.data || []).map(s => [s.user_id, s]));

  // Count events per user
  const countByUser = (rows: { user_id: string | null }[] | null) => {
    const m = new Map<string, number>();
    for (const r of rows || []) if (r.user_id) m.set(r.user_id, (m.get(r.user_id) || 0) + 1);
    return m;
  };

  const events24hMap = countByUser(events24hRes.data);
  const events7dMap = countByUser(events7dRes.data);
  const assets7dMap = countByUser(assets7dRes.data);
  const team7dMap = countByUser(team7dRes.data);

  // Event breakdown per user (24h)
  const breakdownMap = new Map<string, Record<string, number>>();
  for (const e of events24hRes.data || []) {
    if (!e.user_id) continue;
    if (!breakdownMap.has(e.user_id)) breakdownMap.set(e.user_id, {});
    const b = breakdownMap.get(e.user_id)!;
    b[e.event_type] = (b[e.event_type] || 0) + 1;
  }

  // Error counts and top error page
  const errors24hMap = new Map<string, number>();
  const errorPageMap = new Map<string, string>();
  for (const e of errors24hRes.data || []) {
    if (!e.user_id) continue;
    errors24hMap.set(e.user_id, (errors24hMap.get(e.user_id) || 0) + (e.hit_count || 1));
    if (e.page_route && !errorPageMap.has(e.user_id)) errorPageMap.set(e.user_id, e.page_route);
  }

  const unresolvedMap = new Map<string, number>();
  for (const e of unresolvedErrorsRes.data || []) {
    if (!e.user_id) continue;
    unresolvedMap.set(e.user_id, (unresolvedMap.get(e.user_id) || 0) + (e.hit_count || 1));
  }

  // Last activity per user (first occurrence per user in descending order)
  const lastActivityMap = new Map<string, string>();
  for (const e of lastEventRes.data || []) {
    if (e.user_id && !lastActivityMap.has(e.user_id)) {
      lastActivityMap.set(e.user_id, e.created_at);
    }
  }

  const results: WorkspaceSnapshot[] = [];

  for (const uid of userIds) {
    const profile = profileMap.get(uid);
    const settings = settingsMap.get(uid);
    const ev24h = events24hMap.get(uid) || 0;
    const ev7d = events7dMap.get(uid) || 0;
    const err24h = errors24hMap.get(uid) || 0;
    const unresolved = unresolvedMap.get(uid) || 0;
    const assetsAdded = assets7dMap.get(uid) || 0;
    const teamAdded = team7dMap.get(uid) || 0;

    results.push({
      userId: uid,
      name: settings?.workspace_name || profile?.display_name || profile?.email || uid.slice(0, 8),
      email: profile?.email || null,
      plan: planMap.get(uid) || null,
      events24h: ev24h,
      events7d: ev7d,
      eventBreakdown: breakdownMap.get(uid) || {},
      assetsAdded7d: assetsAdded,
      teamAdded7d: teamAdded,
      errors24h: err24h,
      unresolvedErrors: unresolved,
      topErrorPage: errorPageMap.get(uid) || null,
      lastActivity: lastActivityMap.get(uid) || null,
      isHighActivity: ev24h >= 10 || assetsAdded >= 10 || teamAdded >= 3,
      isErrorHotspot: err24h >= 5 || unresolved >= 10,
    });
  }

  // Sort: high activity first, then by events
  return results.sort((a, b) => {
    if (a.isHighActivity !== b.isHighActivity) return a.isHighActivity ? -1 : 1;
    if (a.isErrorHotspot !== b.isErrorHotspot) return a.isErrorHotspot ? -1 : 1;
    return b.events24h - a.events24h;
  });
}

// ─── Workspace Detail Drawer ───

const WorkspaceDetailDrawer = ({
  ws,
  open,
  onOpenChange,
}: {
  ws: WorkspaceSnapshot | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  if (!ws) return null;

  const breakdownEntries = Object.entries(ws.eventBreakdown).sort((a, b) => b[1] - a[1]);
  const maxCount = breakdownEntries.length > 0 ? breakdownEntries[0][1] : 1;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md w-full overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border",
              ws.isHighActivity ? "bg-emerald-500/10 border-emerald-500/30" :
              ws.isErrorHotspot ? "bg-destructive/10 border-destructive/30" :
              "bg-muted border-border"
            )}>
              <Activity className={cn("h-5 w-5",
                ws.isHighActivity ? "text-emerald-600" :
                ws.isErrorHotspot ? "text-destructive" :
                "text-muted-foreground"
              )} />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-left truncate">{ws.name}</SheetTitle>
              <p className="text-xs text-muted-foreground">{ws.email || ws.userId.slice(0, 12)}</p>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-5 mt-6">
          {/* Tags */}
          <div className="flex gap-2 flex-wrap">
            {ws.plan && <Badge variant="outline" className="capitalize">{ws.plan}</Badge>}
            {ws.isHighActivity && <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30">High Activity</Badge>}
            {ws.isErrorHotspot && <Badge variant="destructive">Error Hotspot</Badge>}
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="pt-3 pb-2 px-3 text-center">
                <Zap className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-xl font-bold">{ws.events24h}</p>
                <p className="text-[10px] text-muted-foreground">Events (24h)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 pb-2 px-3 text-center">
                <Activity className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-xl font-bold">{ws.events7d}</p>
                <p className="text-[10px] text-muted-foreground">Events (7d)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 pb-2 px-3 text-center">
                <Package className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-xl font-bold text-emerald-600">+{ws.assetsAdded7d}</p>
                <p className="text-[10px] text-muted-foreground">Assets (7d)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 pb-2 px-3 text-center">
                <Users className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-xl font-bold text-emerald-600">+{ws.teamAdded7d}</p>
                <p className="text-[10px] text-muted-foreground">Team (7d)</p>
              </CardContent>
            </Card>
          </div>

          {/* Errors */}
          {(ws.errors24h > 0 || ws.unresolvedErrors > 0) && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Error Summary
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs">Last 24h</span>
                  <p className="font-bold text-destructive">{ws.errors24h}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Unresolved</span>
                  <p className="font-bold text-destructive">{ws.unresolvedErrors}</p>
                </div>
              </div>
              {ws.topErrorPage && (
                <p className="text-xs text-muted-foreground">
                  Top affected page: <code className="bg-muted px-1 py-0.5 rounded text-[10px]">{ws.topErrorPage}</code>
                </p>
              )}
            </div>
          )}

          <Separator />

          {/* Feature usage breakdown */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
              Activity Breakdown (24h)
            </p>
            {breakdownEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3">No events in last 24h</p>
            ) : (
              <div className="space-y-2">
                {breakdownEntries.map(([type, count]) => {
                  const cfg = EVENT_CONFIG[type] || { label: type, icon: Activity, color: "text-muted-foreground bg-muted" };
                  const Icon = cfg.icon;
                  return (
                    <div key={type} className="flex items-center gap-3">
                      <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0", cfg.color)}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{cfg.label}</span>
                          <span className="text-muted-foreground tabular-nums">{count}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                          <div
                            className="h-full bg-primary/40 rounded-full transition-all"
                            style={{ width: `${(count / maxCount) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

// ─── Live Event Item ───

const LiveEventRow = ({ event }: { event: LiveEvent }) => {
  const cfg = EVENT_CONFIG[event.eventType] || { label: event.eventType, icon: Activity, color: "text-muted-foreground bg-muted" };
  const Icon = cfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="flex items-center gap-3 px-3 py-2.5 border-b border-border/40 last:border-0"
    >
      <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0", cfg.color)}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{cfg.label}</p>
        <p className="text-xs text-muted-foreground truncate">
          {event.workspaceName || event.userEmail || event.userId?.slice(0, 8) || "Unknown"}
        </p>
      </div>
      <span className="text-[10px] text-muted-foreground whitespace-nowrap tabular-nums">
        {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
      </span>
    </motion.div>
  );
};

// ─── Workspace Card ───

const WorkspaceCard = ({
  ws,
  onClick,
}: {
  ws: WorkspaceSnapshot;
  onClick: () => void;
}) => (
  <motion.button
    layout
    initial={{ opacity: 0, scale: 0.97 }}
    animate={{ opacity: 1, scale: 1 }}
    className={cn(
      "w-full text-left rounded-xl border p-4 transition-all hover:shadow-md group",
      ws.isHighActivity && "border-emerald-500/30 bg-emerald-500/[0.03]",
      ws.isErrorHotspot && !ws.isHighActivity && "border-destructive/30 bg-destructive/[0.03]",
      !ws.isHighActivity && !ws.isErrorHotspot && "bg-card"
    )}
    onClick={onClick}
  >
    <div className="flex items-start justify-between gap-2 mb-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold truncate">{ws.name}</p>
        <p className="text-xs text-muted-foreground truncate">{ws.email || "—"}</p>
      </div>
      <div className="flex gap-1 shrink-0">
        {ws.isHighActivity && (
          <Badge className="text-[9px] px-1.5 py-0 bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
            <Flame className="h-2.5 w-2.5 mr-0.5" /> High
          </Badge>
        )}
        {ws.isErrorHotspot && (
          <Badge variant="destructive" className="text-[9px] px-1.5 py-0">
            <AlertTriangle className="h-2.5 w-2.5 mr-0.5" /> Errors
          </Badge>
        )}
      </div>
    </div>

    <div className="grid grid-cols-3 gap-2 text-center">
      <div>
        <p className="text-lg font-bold tabular-nums">{ws.events24h}</p>
        <p className="text-[10px] text-muted-foreground">Events</p>
      </div>
      <div>
        <p className="text-lg font-bold tabular-nums text-emerald-600">
          {ws.assetsAdded7d > 0 ? `+${ws.assetsAdded7d}` : "0"}
        </p>
        <p className="text-[10px] text-muted-foreground">Assets</p>
      </div>
      <div>
        <p className={cn("text-lg font-bold tabular-nums", ws.errors24h > 0 ? "text-destructive" : "")}>
          {ws.errors24h}
        </p>
        <p className="text-[10px] text-muted-foreground">Errors</p>
      </div>
    </div>

    {/* Mini event breakdown */}
    {Object.keys(ws.eventBreakdown).length > 0 && (
      <div className="flex flex-wrap gap-1 mt-3">
        {Object.entries(ws.eventBreakdown).slice(0, 3).map(([type, count]) => {
          const cfg = EVENT_CONFIG[type];
          if (!cfg) return null;
          return (
            <span key={type} className={cn("text-[9px] font-medium px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5", cfg.color)}>
              <cfg.icon className="h-2.5 w-2.5" /> {count}
            </span>
          );
        })}
      </div>
    )}

    <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/40">
      <Badge variant="outline" className="capitalize text-[10px]">{ws.plan || "—"}</Badge>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
    </div>
  </motion.button>
);

// ─── Main Component ───

export const LiveWorkspaceMap = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "active" | "errors">("all");
  const [selectedWs, setSelectedWs] = useState<WorkspaceSnapshot | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [isLive, setIsLive] = useState(true);
  const profileCacheRef = useRef<Map<string, { email: string | null; name: string | null }>>(new Map());

  // Fetch snapshots
  const { data: snapshots, isLoading, refetch } = useQuery({
    queryKey: ["live-workspace-map"],
    queryFn: fetchWorkspaceSnapshots,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  // Build profile cache from snapshots
  useEffect(() => {
    if (!snapshots) return;
    const cache = profileCacheRef.current;
    for (const s of snapshots) {
      cache.set(s.userId, { email: s.email, name: s.name });
    }
  }, [snapshots]);

  // Seed initial live events from product_events
  useEffect(() => {
    const loadRecent = async () => {
      const { data } = await supabase
        .from("product_events")
        .select("id, user_id, event_type, created_at")
        .order("created_at", { ascending: false })
        .limit(30);

      if (data) {
        const cache = profileCacheRef.current;
        setLiveEvents(
          data.map(e => ({
            id: e.id,
            userId: e.user_id,
            workspaceName: cache.get(e.user_id || "")?.name || null,
            userEmail: cache.get(e.user_id || "")?.email || null,
            eventType: e.event_type,
            timestamp: e.created_at,
          }))
        );
      }
    };
    loadRecent();
  }, []);

  // Realtime subscription for product_events
  useEffect(() => {
    if (!isLive) return;

    const channel = supabase
      .channel("live-workspace-events")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "product_events" },
        (payload) => {
          const row = payload.new as { id: string; user_id: string | null; event_type: string; created_at: string };
          const cache = profileCacheRef.current;
          const newEvent: LiveEvent = {
            id: row.id,
            userId: row.user_id,
            workspaceName: cache.get(row.user_id || "")?.name || null,
            userEmail: cache.get(row.user_id || "")?.email || null,
            eventType: row.event_type,
            timestamp: row.created_at,
          };
          setLiveEvents(prev => [newEvent, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isLive]);

  // Derived
  const displayed = useMemo(() => {
    let list = snapshots || [];
    if (filterMode === "active") list = list.filter(s => s.isHighActivity);
    if (filterMode === "errors") list = list.filter(s => s.isErrorHotspot);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s =>
        [s.name, s.email, s.userId].filter(Boolean).join(" ").toLowerCase().includes(q)
      );
    }
    return list;
  }, [snapshots, filterMode, searchQuery]);

  const totalEvents24h = useMemo(() => (snapshots || []).reduce((s, w) => s + w.events24h, 0), [snapshots]);
  const highActivityCount = useMemo(() => (snapshots || []).filter(w => w.isHighActivity).length, [snapshots]);
  const errorHotspotCount = useMemo(() => (snapshots || []).filter(w => w.isErrorHotspot).length, [snapshots]);
  const totalErrors24h = useMemo(() => (snapshots || []).reduce((s, w) => s + w.errors24h, 0), [snapshots]);

  // Error hotspots sorted
  const errorHotspots = useMemo(() =>
    (snapshots || []).filter(w => w.isErrorHotspot).sort((a, b) => b.errors24h - a.errors24h).slice(0, 8),
    [snapshots]
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
          </div>
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilterMode("all")}>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <MapIcon className="h-4 w-4 text-primary" />
              Workspaces
            </div>
            <p className="text-2xl font-bold">{snapshots?.length || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">{totalEvents24h} events (24h)</p>
          </CardContent>
        </Card>
        <Card className={cn("cursor-pointer hover:shadow-md transition-shadow", filterMode === "active" && "ring-2 ring-emerald-500/30")}
          onClick={() => setFilterMode(filterMode === "active" ? "all" : "active")}>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Flame className="h-4 w-4 text-emerald-500" />
              High Activity
            </div>
            <p className="text-2xl font-bold text-emerald-600">{highActivityCount}</p>
            <p className="text-xs text-muted-foreground mt-1">≥10 events or rapid growth</p>
          </CardContent>
        </Card>
        <Card className={cn("cursor-pointer hover:shadow-md transition-shadow", filterMode === "errors" && "ring-2 ring-destructive/30")}
          onClick={() => setFilterMode(filterMode === "errors" ? "all" : "errors")}>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Error Hotspots
            </div>
            <p className="text-2xl font-bold text-destructive">{errorHotspotCount}</p>
            <p className="text-xs text-muted-foreground mt-1">{totalErrors24h} total errors (24h)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Radio className={cn("h-4 w-4", isLive ? "text-emerald-500 animate-pulse" : "text-muted-foreground")} />
              Live Feed
            </div>
            <p className="text-2xl font-bold">{liveEvents.length}</p>
            <div className="flex gap-2 mt-1">
              <Button
                variant={isLive ? "default" : "outline"}
                size="sm"
                className="h-6 text-[10px] px-2 gap-1"
                onClick={() => setIsLive(!isLive)}
              >
                {isLive ? "● Live" : "Paused"}
              </Button>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => refetch()}>
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search workspace…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5">
          {(["all", "active", "errors"] as const).map(m => (
            <Button
              key={m}
              variant={filterMode === m ? "default" : "outline"}
              size="sm"
              className="text-xs capitalize"
              onClick={() => setFilterMode(m)}
            >
              {m === "all" ? "All" : m === "active" ? "High Activity" : "Errors"}
            </Button>
          ))}
        </div>
      </div>

      {/* Main Grid: Workspace Cards + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workspace Cards */}
        <div className="lg:col-span-2">
          {displayed.length === 0 ? (
            <Card className="py-16">
              <CardContent className="flex flex-col items-center text-center">
                <MapIcon className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground font-medium">No workspaces match your criteria</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <AnimatePresence mode="popLayout">
                {displayed.slice(0, 20).map(ws => (
                  <WorkspaceCard
                    key={ws.userId}
                    ws={ws}
                    onClick={() => { setSelectedWs(ws); setDrawerOpen(true); }}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
          {displayed.length > 20 && (
            <p className="text-xs text-muted-foreground text-center mt-4">
              Showing 20 of {displayed.length} workspaces
            </p>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Live Activity Feed */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Radio className={cn("h-3.5 w-3.5", isLive ? "text-emerald-500 animate-pulse" : "text-muted-foreground")} />
                Live Activity
                <Badge variant="secondary" className="text-[10px] ml-auto">{liveEvents.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[300px]">
                {liveEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Waiting for events…</p>
                ) : (
                  <AnimatePresence initial={false}>
                    {liveEvents.slice(0, 25).map(event => (
                      <LiveEventRow key={event.id} event={event} />
                    ))}
                  </AnimatePresence>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Error Hotspots */}
          {errorHotspots.length > 0 && (
            <Card className="border-destructive/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Error Hotspots
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/40">
                  {errorHotspots.map(ws => (
                    <button
                      key={ws.userId}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors"
                      onClick={() => { setSelectedWs(ws); setDrawerOpen(true); }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{ws.name}</p>
                        {ws.topErrorPage && (
                          <p className="text-[10px] text-muted-foreground truncate">
                            {ws.topErrorPage}
                          </p>
                        )}
                      </div>
                      <Badge variant="destructive" className="text-[10px] shrink-0">
                        {ws.errors24h} hits
                      </Badge>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Growth Signals Quick View */}
          {(() => {
            const growers = (snapshots || [])
              .filter(w => w.assetsAdded7d >= 5 || w.teamAdded7d >= 2)
              .sort((a, b) => (b.assetsAdded7d + b.teamAdded7d * 3) - (a.assetsAdded7d + a.teamAdded7d * 3))
              .slice(0, 5);

            if (growers.length === 0) return null;

            return (
              <Card className="border-emerald-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Growth Signals
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border/40">
                    {growers.map(ws => (
                      <button
                        key={ws.userId}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors"
                        onClick={() => { setSelectedWs(ws); setDrawerOpen(true); }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{ws.name}</p>
                          <div className="flex gap-2 text-[10px] text-muted-foreground">
                            {ws.assetsAdded7d > 0 && <span className="text-emerald-600">+{ws.assetsAdded7d} assets</span>}
                            {ws.teamAdded7d > 0 && <span className="text-blue-600">+{ws.teamAdded7d} team</span>}
                          </div>
                        </div>
                        <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </div>
      </div>

      {/* Detail Drawer */}
      <WorkspaceDetailDrawer
        ws={selectedWs}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
};
