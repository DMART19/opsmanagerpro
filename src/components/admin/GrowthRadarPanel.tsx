/**
 * Growth Radar Panel — Identifies high-value workspaces by combining
 * upgrade signals, feature usage frequency, data growth, and team expansion.
 */

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Radar,
  TrendingUp,
  Users,
  Package,
  Zap,
  Crown,
  Activity,
  Search,
  Eye,
  Flame,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  BarChart3,
  Layers,
  Clock,
  Target,
  Sparkles,
} from "lucide-react";
import { subDays, format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

// ─── Types ───

interface WorkspaceGrowthProfile {
  userId: string;
  email: string | null;
  displayName: string | null;
  workspaceName: string | null;
  plan: string | null;

  // Counts
  assetCount: number;
  teamCount: number;
  taskCount: number;

  // Growth (7d vs prior 7d)
  assetsAdded7d: number;
  assetsAdded14d: number;
  teamAdded7d: number;

  // Feature usage (product_events last 30d)
  featureEvents30d: number;
  featureBreakdown: Record<string, number>;

  // Gated attempts
  gatedAttempts7d: number;

  // Upgrade signal score (if computed)
  upgradeScore: number | null;

  // Computed
  growthScore: number;
  growthTier: "rapid" | "steady" | "stalled";
  lastActivity: string | null;
}

// ─── Score computation ───

function computeGrowthScore(p: Omit<WorkspaceGrowthProfile, "growthScore" | "growthTier">): { score: number; tier: "rapid" | "steady" | "stalled" } {
  let score = 0;

  // 1. Asset growth momentum (max 25)
  if (p.assetsAdded7d >= 20) score += 25;
  else if (p.assetsAdded7d >= 10) score += 18;
  else if (p.assetsAdded7d >= 5) score += 10;
  else if (p.assetsAdded7d >= 1) score += 5;

  // 2. Team expansion (max 20)
  if (p.teamAdded7d >= 5) score += 20;
  else if (p.teamAdded7d >= 3) score += 14;
  else if (p.teamAdded7d >= 1) score += 8;

  // 3. Feature usage intensity (max 25)
  if (p.featureEvents30d >= 100) score += 25;
  else if (p.featureEvents30d >= 50) score += 18;
  else if (p.featureEvents30d >= 20) score += 12;
  else if (p.featureEvents30d >= 5) score += 5;

  // 4. Feature breadth — how many distinct features used (max 15)
  const featureCount = Object.keys(p.featureBreakdown).length;
  if (featureCount >= 5) score += 15;
  else if (featureCount >= 3) score += 10;
  else if (featureCount >= 2) score += 5;

  // 5. Gated feature interest (max 15)
  if (p.gatedAttempts7d >= 10) score += 15;
  else if (p.gatedAttempts7d >= 3) score += 10;
  else if (p.gatedAttempts7d >= 1) score += 5;

  score = Math.min(score, 100);

  const tier = score >= 60 ? "rapid" : score >= 30 ? "steady" : "stalled";
  return { score, tier };
}

// ─── Data fetching ───

async function fetchGrowthData(): Promise<WorkspaceGrowthProfile[]> {
  const now = new Date();
  const sevenDaysAgo = subDays(now, 7);
  const fourteenDaysAgo = subDays(now, 14);
  const thirtyDaysAgo = subDays(now, 30);

  // Get all workspace plans
  const { data: plans } = await supabase
    .from("workspace_plans")
    .select("user_id, plan")
    .order("updated_at", { ascending: false })
    .limit(200);

  if (!plans?.length) return [];

  const userIds = plans.map(p => p.user_id);
  const planMap = new Map(plans.map(p => [p.user_id, p.plan]));

  // Parallel fetches
  const [
    profilesRes,
    settingsRes,
    assetsRes,
    assets7dRes,
    assets14dRes,
    teamRes,
    team7dRes,
    tasksRes,
    eventsRes,
    frictionRes,
    signalsRes,
    auditRes,
  ] = await Promise.all([
    supabase.from("profiles").select("id, email, display_name").in("id", userIds),
    supabase.from("workspace_settings").select("user_id, workspace_name").in("user_id", userIds),
    // Total assets per user
    supabase.from("cache_inventory").select("user_id").in("user_id", userIds),
    // Assets created in last 7 days
    supabase.from("cache_inventory").select("user_id").in("user_id", userIds).gte("created_at", sevenDaysAgo.toISOString()),
    // Assets created 7-14 days ago
    supabase.from("cache_inventory").select("user_id").in("user_id", userIds)
      .gte("created_at", fourteenDaysAgo.toISOString())
      .lt("created_at", sevenDaysAgo.toISOString()),
    // Total team per user
    supabase.from("employees").select("user_id").in("user_id", userIds),
    // Team added in last 7 days
    supabase.from("employees").select("user_id").in("user_id", userIds).gte("created_at", sevenDaysAgo.toISOString()),
    // Total tasks
    supabase.from("tasks").select("user_id").in("user_id", userIds),
    // Product events last 30 days
    supabase.from("product_events").select("user_id, event_type").in("user_id", userIds).gte("created_at", thirtyDaysAgo.toISOString()),
    // Friction events (gated attempts) last 7 days
    supabase.from("friction_events").select("user_id").in("user_id", userIds)
      .eq("event_type", "gated_feature_attempt")
      .gte("created_at", sevenDaysAgo.toISOString()),
    // Upgrade signals
    (supabase as any).from("upgrade_signals").select("user_id, score").in("user_id", userIds),
    // Audit logs for last activity
    supabase.from("audit_logs").select("changed_by, changed_at").in("changed_by", userIds)
      .order("changed_at", { ascending: false }).limit(500),
  ]);

  // Build lookup maps
  const profileMap = new Map((profilesRes.data || []).map(p => [p.id, p]));
  const settingsMap = new Map((settingsRes.data || []).map(s => [s.user_id, s]));
  const signalMap = new Map((signalsRes.data || []).map((s: any) => [s.user_id, s.score]));

  // Count helpers
  const countByUser = (rows: { user_id: string | null }[] | null) => {
    const map = new Map<string, number>();
    for (const r of rows || []) {
      if (r.user_id) map.set(r.user_id, (map.get(r.user_id) || 0) + 1);
    }
    return map;
  };

  const assetCountMap = countByUser(assetsRes.data);
  const assets7dMap = countByUser(assets7dRes.data);
  const assets14dMap = countByUser(assets14dRes.data);
  const teamCountMap = countByUser(teamRes.data);
  const team7dMap = countByUser(team7dRes.data);
  const taskCountMap = countByUser(tasksRes.data);
  const frictionMap = countByUser(frictionRes.data);

  // Feature event breakdown per user
  const featureMap = new Map<string, Record<string, number>>();
  const featureCountMap = new Map<string, number>();
  for (const e of eventsRes.data || []) {
    if (!e.user_id) continue;
    featureCountMap.set(e.user_id, (featureCountMap.get(e.user_id) || 0) + 1);
    if (!featureMap.has(e.user_id)) featureMap.set(e.user_id, {});
    const breakdown = featureMap.get(e.user_id)!;
    breakdown[e.event_type] = (breakdown[e.event_type] || 0) + 1;
  }

  // Last activity
  const lastActivityMap = new Map<string, string>();
  for (const a of auditRes.data || []) {
    if (a.changed_by && !lastActivityMap.has(a.changed_by)) {
      lastActivityMap.set(a.changed_by, a.changed_at);
    }
  }

  // Build profiles
  const results: WorkspaceGrowthProfile[] = [];

  for (const uid of userIds) {
    const profile = profileMap.get(uid);
    const settings = settingsMap.get(uid);
    const partial = {
      userId: uid,
      email: profile?.email || null,
      displayName: profile?.display_name || null,
      workspaceName: settings?.workspace_name || null,
      plan: planMap.get(uid) || null,
      assetCount: assetCountMap.get(uid) || 0,
      teamCount: teamCountMap.get(uid) || 0,
      taskCount: taskCountMap.get(uid) || 0,
      assetsAdded7d: assets7dMap.get(uid) || 0,
      assetsAdded14d: assets14dMap.get(uid) || 0,
      teamAdded7d: team7dMap.get(uid) || 0,
      featureEvents30d: featureCountMap.get(uid) || 0,
      featureBreakdown: featureMap.get(uid) || {},
      gatedAttempts7d: frictionMap.get(uid) || 0,
      upgradeScore: (signalMap.get(uid) as number) ?? null,
      lastActivity: lastActivityMap.get(uid) || null,
    };

    const { score, tier } = computeGrowthScore(partial as Omit<WorkspaceGrowthProfile, "growthScore" | "growthTier">);
    results.push({ ...partial, growthScore: score, growthTier: tier });
  }

  return results.sort((a, b) => b.growthScore - a.growthScore);
}

// ─── Tier styling ───

const TIER_CONFIG = {
  rapid: { label: "Rapid Growth", color: "text-emerald-600", bg: "bg-emerald-500/10 border-emerald-500/30", badge: "destructive" as const },
  steady: { label: "Steady", color: "text-amber-600", bg: "bg-amber-500/10 border-amber-500/30", badge: "default" as const },
  stalled: { label: "Stalled", color: "text-muted-foreground", bg: "bg-muted border-border", badge: "secondary" as const },
};

const FEATURE_LABELS: Record<string, string> = {
  asset_created: "Assets",
  container_created: "Containers",
  team_member_added: "Team",
  credential_added: "Credentials",
  pallet_saved: "Pallets",
  calendar_event_created: "Calendar",
};

// ─── Detail Drawer ───

const GrowthDetailDrawer = ({
  profile,
  open,
  onOpenChange,
}: {
  profile: WorkspaceGrowthProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  if (!profile) return null;

  const tier = TIER_CONFIG[profile.growthTier];
  const assetGrowthPct = profile.assetsAdded14d > 0
    ? Math.round(((profile.assetsAdded7d - profile.assetsAdded14d) / profile.assetsAdded14d) * 100)
    : profile.assetsAdded7d > 0 ? 100 : 0;

  const featureEntries = Object.entries(profile.featureBreakdown)
    .sort((a, b) => b[1] - a[1]);
  const maxFeatureCount = featureEntries.length > 0 ? featureEntries[0][1] : 1;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg w-full overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center shrink-0 border", tier.bg)}>
              <Radar className={cn("h-6 w-6", tier.color)} />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-left">
                {profile.workspaceName || profile.displayName || "Workspace"}
              </SheetTitle>
              <p className="text-xs text-muted-foreground">{profile.email || profile.userId.slice(0, 12)}</p>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-5 mt-6">
          {/* Score header */}
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className={cn("text-4xl font-bold", tier.color)}>{profile.growthScore}</p>
              <Badge variant={tier.badge} className="mt-1">{tier.label}</Badge>
            </div>
            <div className="flex-1 space-y-2">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Growth Score</p>
                <Progress value={profile.growthScore} className="h-2" />
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>Plan: <strong className="text-foreground capitalize">{profile.plan}</strong></span>
                {profile.upgradeScore !== null && (
                  <span>Upgrade Score: <strong className="text-foreground">{profile.upgradeScore}</strong></span>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Key metrics */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="pt-3 pb-2 px-3 text-center">
                <Package className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-xl font-bold">{profile.assetCount}</p>
                <p className="text-[10px] text-muted-foreground">Assets</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 pb-2 px-3 text-center">
                <Users className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-xl font-bold">{profile.teamCount}</p>
                <p className="text-[10px] text-muted-foreground">Team</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 pb-2 px-3 text-center">
                <Layers className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-xl font-bold">{profile.taskCount}</p>
                <p className="text-[10px] text-muted-foreground">Tasks</p>
              </CardContent>
            </Card>
          </div>

          {/* Growth indicators */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">7-Day Growth</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/30 rounded-lg border p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Assets Added</span>
                  {assetGrowthPct !== 0 && (
                    <span className={cn("text-xs font-medium flex items-center gap-0.5",
                      assetGrowthPct > 0 ? "text-emerald-600" : "text-destructive"
                    )}>
                      {assetGrowthPct > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {Math.abs(assetGrowthPct)}%
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold">
                  {profile.assetsAdded7d > 0 ? "+" : ""}{profile.assetsAdded7d}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  vs {profile.assetsAdded14d} prior week
                </p>
              </div>
              <div className="bg-muted/30 rounded-lg border p-3">
                <span className="text-xs text-muted-foreground">Team Added</span>
                <p className="text-2xl font-bold mt-1">
                  {profile.teamAdded7d > 0 ? "+" : ""}{profile.teamAdded7d}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {profile.gatedAttempts7d > 0 && `${profile.gatedAttempts7d} gated attempts`}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Feature usage breakdown */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
              Feature Usage (30d) — {profile.featureEvents30d} events
            </p>
            {featureEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3">No feature events recorded</p>
            ) : (
              <div className="space-y-2">
                {featureEntries.map(([type, count]) => (
                  <div key={type} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{FEATURE_LABELS[type] || type}</span>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                    <Progress value={(count / maxFeatureCount) * 100} className="h-1.5" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {profile.lastActivity && (
            <>
              <Separator />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Last activity: {formatDistanceToNow(new Date(profile.lastActivity), { addSuffix: true })}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

// ─── Main Panel ───

export const GrowthRadarPanel = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeView, setActiveView] = useState("all");
  const [selectedProfile, setSelectedProfile] = useState<WorkspaceGrowthProfile | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["growth-radar"],
    queryFn: fetchGrowthData,
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  });

  const rapidGrowers = useMemo(() => (profiles || []).filter(p => p.growthTier === "rapid"), [profiles]);
  const steadyGrowers = useMemo(() => (profiles || []).filter(p => p.growthTier === "steady"), [profiles]);
  const mostActive = useMemo(() =>
    [...(profiles || [])].sort((a, b) => b.featureEvents30d - a.featureEvents30d).slice(0, 10),
    [profiles]
  );
  const fastestGrowing = useMemo(() =>
    [...(profiles || [])].sort((a, b) => b.assetsAdded7d - a.assetsAdded7d).slice(0, 10),
    [profiles]
  );

  const displayed = useMemo(() => {
    let list = profiles || [];
    if (activeView === "rapid") list = rapidGrowers;
    else if (activeView === "active") list = mostActive;
    else if (activeView === "growing") list = fastestGrowing;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p =>
        [p.email, p.displayName, p.workspaceName, p.userId].filter(Boolean).join(" ").toLowerCase().includes(q)
      );
    }
    return list;
  }, [profiles, activeView, searchQuery, rapidGrowers, mostActive, fastestGrowing]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const totalTracked = profiles?.length || 0;
  const avgScore = totalTracked > 0 ? Math.round((profiles || []).reduce((s, p) => s + p.growthScore, 0) / totalTracked) : 0;
  const totalEvents = (profiles || []).reduce((s, p) => s + p.featureEvents30d, 0);

  return (
    <div className="space-y-6">
      {/* Rapid Growth Alert */}
      {rapidGrowers.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                    {rapidGrowers.length} Rapid Growth Workspace{rapidGrowers.length !== 1 ? "s" : ""} Detected
                  </p>
                  <p className="text-xs text-muted-foreground">These workspaces are scaling quickly and likely to upgrade.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {rapidGrowers.slice(0, 6).map(p => (
                  <button
                    key={p.userId}
                    className="flex items-center gap-3 rounded-lg bg-background border p-3 text-left hover:shadow-md transition-all group"
                    onClick={() => { setSelectedProfile(p); setDrawerOpen(true); }}
                  >
                    <span className="text-xl font-bold text-emerald-600">{p.growthScore}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{p.workspaceName || p.displayName || p.email || p.userId.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">+{p.assetsAdded7d} assets · +{p.teamAdded7d} team</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveView(activeView === "rapid" ? "all" : "rapid")}>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Flame className="h-4 w-4 text-emerald-500" />
              Rapid Growth
            </div>
            <p className="text-2xl font-bold text-emerald-600">{rapidGrowers.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Score ≥ 60</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveView(activeView === "active" ? "all" : "active")}>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Activity className="h-4 w-4 text-blue-500" />
              Most Active
            </div>
            <p className="text-2xl font-bold text-blue-600">{mostActive.filter(p => p.featureEvents30d > 0).length}</p>
            <p className="text-xs text-muted-foreground mt-1">Top 10 by usage</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveView(activeView === "growing" ? "all" : "growing")}>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4 text-amber-500" />
              Fastest Growing
            </div>
            <p className="text-2xl font-bold text-amber-600">{fastestGrowing.filter(p => p.assetsAdded7d > 0).length}</p>
            <p className="text-xs text-muted-foreground mt-1">By data volume</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <BarChart3 className="h-4 w-4" />
              Avg Score
            </div>
            <p className={cn("text-2xl font-bold", avgScore >= 60 ? "text-emerald-600" : avgScore >= 30 ? "text-amber-600" : "text-muted-foreground")}>{avgScore}</p>
            <p className="text-xs text-muted-foreground mt-1">{totalTracked} tracked · {totalEvents} events</p>
          </CardContent>
        </Card>
      </div>

      {/* View Tabs + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Tabs value={activeView} onValueChange={setActiveView} className="w-full sm:w-auto">
          <TabsList className="h-9">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="rapid" className="text-xs">Rapid</TabsTrigger>
            <TabsTrigger value="active" className="text-xs">Most Active</TabsTrigger>
            <TabsTrigger value="growing" className="text-xs">Fastest Growing</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 max-w-sm ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search workspace…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Radar className="h-4 w-4" />
            Growth Radar
            <Badge variant="secondary" className="ml-1">{displayed.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[520px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[70px]">Score</TableHead>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Assets (7d)</TableHead>
                  <TableHead>Team (7d)</TableHead>
                  <TableHead>Events (30d)</TableHead>
                  <TableHead>Features</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayed.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                      No workspaces match your criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  displayed.map((p) => {
                    const tier = TIER_CONFIG[p.growthTier];
                    return (
                      <TableRow
                        key={p.userId}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => { setSelectedProfile(p); setDrawerOpen(true); }}
                      >
                        <TableCell>
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={cn("text-lg font-bold", tier.color)}>{p.growthScore}</span>
                            <Badge variant={tier.badge} className="text-[10px] px-1.5">{tier.label}</Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium truncate max-w-[180px]">
                              {p.workspaceName || p.displayName || p.email || p.userId.slice(0, 8)}
                            </p>
                            <p className="text-xs text-muted-foreground truncate max-w-[180px]">{p.email || "—"}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize text-xs">{p.plan}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-medium">{p.assetCount}</span>
                            {p.assetsAdded7d > 0 && (
                              <span className="text-xs text-emerald-600 flex items-center">
                                <ArrowUpRight className="h-3 w-3" />+{p.assetsAdded7d}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-medium">{p.teamCount}</span>
                            {p.teamAdded7d > 0 && (
                              <span className="text-xs text-emerald-600 flex items-center">
                                <ArrowUpRight className="h-3 w-3" />+{p.teamAdded7d}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={cn("text-sm font-medium", p.featureEvents30d >= 50 ? "text-blue-600" : "")}>
                            {p.featureEvents30d}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-0.5 max-w-[160px]">
                            {Object.keys(p.featureBreakdown).slice(0, 3).map(type => (
                              <span key={type} className="text-[9px] bg-muted px-1.5 py-0.5 rounded-full">
                                {FEATURE_LABELS[type] || type}
                              </span>
                            ))}
                            {Object.keys(p.featureBreakdown).length > 3 && (
                              <span className="text-[9px] text-muted-foreground">+{Object.keys(p.featureBreakdown).length - 3}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedProfile(p); setDrawerOpen(true); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Detail Drawer */}
      <GrowthDetailDrawer
        profile={selectedProfile}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
};
