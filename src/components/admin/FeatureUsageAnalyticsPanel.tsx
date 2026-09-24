/**
 * FeatureUsageAnalyticsPanel — Comprehensive feature usage analytics for the Ops Control Center.
 * Tracks: assets, containers, team management, credentials, pallet builder, calendar tasks.
 * Metrics: usage frequency, most active workspaces, feature adoption rates.
 */

import { useMemo, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  BarChart3,
  Package,
  BoxIcon,
  Users,
  ShieldCheck,
  Layers,
  CalendarDays,
  TrendingUp,
  Activity,
  Zap,
  Crown,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, subDays, subHours, startOfDay, differenceInDays } from "date-fns";
import { motion } from "framer-motion";

// ─── Feature Map ───
const FEATURE_MAP = {
  asset_created: { label: "Assets", icon: Package, color: "hsl(var(--primary))" },
  container_created: { label: "Containers", icon: BoxIcon, color: "hsl(210, 70%, 55%)" },
  team_member_added: { label: "Team Management", icon: Users, color: "hsl(150, 60%, 45%)" },
  credential_added: { label: "Credentials", icon: ShieldCheck, color: "hsl(280, 60%, 55%)" },
  pallet_saved: { label: "Pallet Builder", icon: Layers, color: "hsl(35, 80%, 55%)" },
  calendar_event_created: { label: "Calendar Tasks", icon: CalendarDays, color: "hsl(350, 65%, 55%)" },
} as const;

type FeatureKey = keyof typeof FEATURE_MAP;
const ALL_FEATURES = Object.keys(FEATURE_MAP) as FeatureKey[];

const PIE_COLORS = ALL_FEATURES.map(k => FEATURE_MAP[k].color);

const TIME_RANGES = [
  { label: "Last 7 days", value: "7d", days: 7 },
  { label: "Last 30 days", value: "30d", days: 30 },
  { label: "Last 90 days", value: "90d", days: 90 },
  { label: "All time", value: "all", days: 0 },
] as const;

interface ProductEvent {
  event_type: string;
  created_at: string;
  user_id: string | null;
  workspace_id: string | null;
}

export const FeatureUsageAnalyticsPanel = () => {
  const [timeRange, setTimeRange] = useState<string>("30d");
  const [refreshKey, setRefreshKey] = useState(0);
  const queryClient = useQueryClient();

  const rangeDays = TIME_RANGES.find(t => t.value === timeRange)?.days ?? 30;
  const cutoffDate = rangeDays > 0 ? subDays(new Date(), rangeDays).toISOString() : null;

  // Fetch product events
  const { data: events, isLoading } = useQuery({
    queryKey: ["feature-usage-panel", timeRange, refreshKey],
    queryFn: async () => {
      let query = (supabase as any)
        .from("product_events")
        .select("event_type, created_at, user_id, workspace_id")
        .in("event_type", ALL_FEATURES)
        .order("created_at", { ascending: true });

      if (cutoffDate) {
        query = query.gte("created_at", cutoffDate);
      }

      const { data, error } = await query.limit(10000);
      if (error) throw error;
      return (data || []) as ProductEvent[];
    },
    staleTime: 60_000,
  });

  // Fetch workspace names for top workspaces
  const workspaceIds = useMemo(() => {
    if (!events) return [];
    const ids = new Set<string>();
    events.forEach(e => { if (e.user_id) ids.add(e.user_id); });
    return Array.from(ids);
  }, [events]);

  const { data: workspaceNames } = useQuery({
    queryKey: ["workspace-names-for-usage", workspaceIds.slice(0, 20)],
    queryFn: async () => {
      if (workspaceIds.length === 0) return {};
      const { data } = await supabase
        .from("workspace_settings")
        .select("user_id, workspace_name")
        .in("user_id", workspaceIds.slice(0, 20));
      const map: Record<string, string> = {};
      (data || []).forEach((ws: any) => { map[ws.user_id] = ws.workspace_name || "Unnamed"; });
      return map;
    },
    enabled: workspaceIds.length > 0,
    staleTime: 300_000,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("feature-usage-analytics-rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "product_events" }, () => {
        queryClient.invalidateQueries({ queryKey: ["feature-usage-panel"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // ─── Computed Analytics ───
  const analytics = useMemo(() => {
    if (!events || events.length === 0) {
      return {
        totalEvents: 0,
        featureCounts: {} as Record<FeatureKey, number>,
        featureUsers: {} as Record<FeatureKey, Set<string>>,
        dailyTrend: [] as any[],
        topWorkspaces: [] as { userId: string; name: string; count: number; features: string[] }[],
        adoptionRates: [] as { feature: string; label: string; users: number; rate: number }[],
        distribution: [] as { name: string; value: number }[],
        avgDailyRate: 0,
        uniqueUsers: 0,
        mostPopular: null as FeatureKey | null,
        leastPopular: null as FeatureKey | null,
      };
    }

    // Feature counts & unique users per feature
    const featureCounts: Record<string, number> = {};
    const featureUsers: Record<string, Set<string>> = {};
    const allUsers = new Set<string>();

    ALL_FEATURES.forEach(f => { featureCounts[f] = 0; featureUsers[f] = new Set(); });

    events.forEach(e => {
      const ft = e.event_type as FeatureKey;
      if (featureCounts[ft] !== undefined) {
        featureCounts[ft]++;
        if (e.user_id) {
          featureUsers[ft].add(e.user_id);
          allUsers.add(e.user_id);
        }
      }
    });

    const totalEvents = events.length;
    const uniqueUsers = allUsers.size;

    // Most / least popular
    const sorted = ALL_FEATURES.slice().sort((a, b) => featureCounts[b] - featureCounts[a]);
    const mostPopular = featureCounts[sorted[0]] > 0 ? sorted[0] : null;
    const leastPopular = sorted[sorted.length - 1];

    // Daily trend (last N days bucketed by day)
    const dayBuckets = new Map<string, Record<string, number>>();
    const effectiveDays = rangeDays || differenceInDays(new Date(), new Date(events[0]?.created_at)) + 1;
    const trendDays = Math.min(effectiveDays, 60);

    for (let i = trendDays - 1; i >= 0; i--) {
      const day = format(subDays(new Date(), i), "yyyy-MM-dd");
      const init: Record<string, number> = { total: 0 };
      ALL_FEATURES.forEach(f => { init[f] = 0; });
      dayBuckets.set(day, init);
    }

    events.forEach(e => {
      const day = format(new Date(e.created_at), "yyyy-MM-dd");
      const bucket = dayBuckets.get(day);
      if (bucket) {
        bucket.total = (bucket.total || 0) + 1;
        const ft = e.event_type;
        bucket[ft] = (bucket[ft] || 0) + 1;
      }
    });

    const dailyTrend = Array.from(dayBuckets.entries()).map(([day, counts]) => ({
      day: format(new Date(day), "MMM d"),
      ...counts,
    }));

    const avgDailyRate = trendDays > 0 ? Math.round(totalEvents / trendDays * 10) / 10 : 0;

    // Top workspaces by event count
    const wsMap = new Map<string, { count: number; features: Set<string> }>();
    events.forEach(e => {
      if (!e.user_id) return;
      const existing = wsMap.get(e.user_id) || { count: 0, features: new Set<string>() };
      existing.count++;
      existing.features.add(e.event_type);
      wsMap.set(e.user_id, existing);
    });

    const topWorkspaces = Array.from(wsMap.entries())
      .map(([userId, data]) => ({
        userId,
        name: workspaceNames?.[userId] || userId.slice(0, 8) + "…",
        count: data.count,
        features: Array.from(data.features),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Adoption rates (% of total users using each feature)
    const adoptionRates = ALL_FEATURES.map(f => ({
      feature: f,
      label: FEATURE_MAP[f].label,
      users: featureUsers[f].size,
      rate: uniqueUsers > 0 ? Math.round((featureUsers[f].size / uniqueUsers) * 100) : 0,
    })).sort((a, b) => b.rate - a.rate);

    // Distribution for pie chart
    const distribution = ALL_FEATURES
      .filter(f => featureCounts[f] > 0)
      .map(f => ({ name: FEATURE_MAP[f].label, value: featureCounts[f] }));

    return {
      totalEvents,
      featureCounts: featureCounts as Record<FeatureKey, number>,
      featureUsers: featureUsers as Record<FeatureKey, Set<string>>,
      dailyTrend,
      topWorkspaces,
      adoptionRates,
      distribution,
      avgDailyRate,
      uniqueUsers,
      mostPopular,
      leastPopular,
    };
  }, [events, rangeDays, workspaceNames]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Feature Usage Analytics
          </h2>
          <p className="text-sm text-muted-foreground">
            Track feature engagement, adoption rates, and workspace activity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_RANGES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="inline-flex items-center justify-center rounded-lg border bg-card px-3 py-2 text-sm hover:bg-muted/50 transition-colors gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiSummaryCard
          icon={Activity}
          label="Total Events"
          value={analytics.totalEvents}
          subtext={`${analytics.avgDailyRate}/day avg`}
          delay={0}
        />
        <KpiSummaryCard
          icon={Users}
          label="Active Users"
          value={analytics.uniqueUsers}
          subtext="Using tracked features"
          delay={0.05}
        />
        <KpiSummaryCard
          icon={Crown}
          label="Most Popular"
          value={analytics.mostPopular ? FEATURE_MAP[analytics.mostPopular].label : "—"}
          subtext={analytics.mostPopular ? `${analytics.featureCounts[analytics.mostPopular]} uses` : "No data"}
          isText
          delay={0.1}
        />
        <KpiSummaryCard
          icon={Zap}
          label="Features Used"
          value={ALL_FEATURES.filter(f => analytics.featureCounts[f] > 0).length}
          subtext={`of ${ALL_FEATURES.length} tracked`}
          delay={0.15}
        />
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {ALL_FEATURES.map((f, i) => {
          const config = FEATURE_MAP[f];
          const Icon = config.icon;
          const count = analytics.featureCounts[f] || 0;
          const users = analytics.featureUsers[f]?.size || 0;
          const maxCount = Math.max(...Object.values(analytics.featureCounts), 1);
          const pct = Math.round((count / maxCount) * 100);

          return (
            <motion.div
              key={f}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card className={cn("relative overflow-hidden", count === 0 && "opacity-50")}>
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${config.color}15` }}>
                      <Icon className="h-3.5 w-3.5" style={{ color: config.color }} />
                    </div>
                    <span className="text-[11px] font-medium text-muted-foreground truncate">{config.label}</span>
                  </div>
                  <p className="text-xl font-bold tabular-nums">{count.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">{users} user{users !== 1 ? "s" : ""}</p>
                  <Progress value={pct} className="h-1 mt-2" />
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Usage Trend Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            Usage Frequency Over Time
          </CardTitle>
          <CardDescription>Daily feature usage events</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.dailyTrend.length === 0 || analytics.totalEvents === 0 ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              No usage data in this time range.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={analytics.dailyTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  {ALL_FEATURES.map((f, i) => (
                    <linearGradient key={f} id={`grad-${f}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={FEATURE_MAP[f].color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={FEATURE_MAP[f].color} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10 }}
                  className="text-muted-foreground"
                  interval={Math.max(0, Math.floor(analytics.dailyTrend.length / 10))}
                />
                <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "11px",
                  }}
                />
                {ALL_FEATURES.map((f) => (
                  <Area
                    key={f}
                    type="monotone"
                    dataKey={f}
                    name={FEATURE_MAP[f].label}
                    stroke={FEATURE_MAP[f].color}
                    fill={`url(#grad-${f})`}
                    strokeWidth={1.5}
                    stackId="1"
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Two-column: Adoption Rates + Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Adoption Rates */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Feature Adoption Rates
            </CardTitle>
            <CardDescription>% of active users using each feature</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.adoptionRates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No adoption data yet.</p>
            ) : (
              <div className="space-y-3">
                {analytics.adoptionRates.map(a => {
                  const config = FEATURE_MAP[a.feature as FeatureKey];
                  const Icon = config?.icon || Activity;
                  return (
                    <div key={a.feature} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium">{a.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{a.users} users</span>
                          <Badge variant={a.rate >= 50 ? "default" : a.rate >= 20 ? "secondary" : "outline"} className="text-xs tabular-nums">
                            {a.rate}%
                          </Badge>
                        </div>
                      </div>
                      <Progress
                        value={a.rate}
                        className={cn("h-1.5")}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage Distribution Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Usage Distribution
            </CardTitle>
            <CardDescription>Share of total feature events</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.distribution.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No usage data yet.</p>
            ) : (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="50%" height={200}>
                  <PieChart>
                    <Pie
                      data={analytics.distribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {analytics.distribution.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "11px",
                      }}
                      formatter={(value: number) => [value, "Events"]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {analytics.distribution.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-xs truncate flex-1">{d.name}</span>
                      <span className="text-xs font-medium tabular-nums text-muted-foreground">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Most Active Workspaces */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Crown className="h-4 w-4 text-muted-foreground" />
            Most Active Workspaces
          </CardTitle>
          <CardDescription>Workspaces with the highest feature engagement</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.topWorkspaces.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No workspace activity yet.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-8">#</TableHead>
                    <TableHead className="text-xs">Workspace</TableHead>
                    <TableHead className="text-xs text-right">Events</TableHead>
                    <TableHead className="text-xs">Features Used</TableHead>
                    <TableHead className="text-xs text-right">Adoption</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.topWorkspaces.map((ws, i) => {
                    const adoptionPct = Math.round((ws.features.length / ALL_FEATURES.length) * 100);
                    return (
                      <TableRow key={ws.userId}>
                        <TableCell className="text-xs text-muted-foreground font-bold">{i + 1}</TableCell>
                        <TableCell className="text-xs font-medium truncate max-w-[160px]">{ws.name}</TableCell>
                        <TableCell className="text-xs text-right tabular-nums font-medium">{ws.count}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {ws.features.map(f => {
                              const config = FEATURE_MAP[f as FeatureKey];
                              return config ? (
                                <Badge
                                  key={f}
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0"
                                  style={{ borderColor: `${config.color}40`, color: config.color }}
                                >
                                  {config.label}
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={adoptionPct >= 80 ? "default" : adoptionPct >= 50 ? "secondary" : "outline"}
                            className="text-xs tabular-nums"
                          >
                            {adoptionPct}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ─── KPI Summary Card ───
const KpiSummaryCard = ({
  icon: Icon,
  label,
  value,
  subtext,
  delay = 0,
  isText = false,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  subtext: string;
  delay?: number;
  isText?: boolean;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay }}
  >
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className={cn(
              "font-bold tabular-nums truncate",
              isText ? "text-base" : "text-2xl"
            )}>
              {typeof value === "number" ? value.toLocaleString() : value}
            </p>
            <p className="text-[11px] text-muted-foreground">{label}</p>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">{subtext}</p>
      </CardContent>
    </Card>
  </motion.div>
);
