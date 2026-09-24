import { useState, useMemo } from "react";
import { Navigation } from "@/components/Navigation";
import { LegalFooter } from "@/components/LegalFooter";
import { PageTransitionWrapper } from "@/components/PageTransitionWrapper";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Package, Box, Users, ShieldAlert, CalendarDays, TrendingUp, TrendingDown,
  Minus, BarChart3, LayoutGrid, Activity,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import { useWorkspaceAnalytics, type DailyCount } from "@/hooks/use-workspace-analytics";
import { cn } from "@/lib/utils";
import { useSettingsOptional } from "@/contexts/SettingsContext";
import { motion } from "framer-motion";

const TIME_RANGES = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
] as const;

// ─── Metric Card ───
const MetricCard = ({
  title, value, icon: Icon, trend, loading, accentColor,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  trend?: { current: number; previous: number };
  loading: boolean;
  accentColor?: string;
}) => {
  const growthPct = trend && trend.previous > 0
    ? Math.round(((trend.current - trend.previous) / trend.previous) * 100)
    : trend && trend.current > 0 ? 100 : 0;

  const isUp = growthPct > 0;
  const isDown = growthPct < 0;
  const TrendIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="hover:shadow-sm transition-shadow">
        <CardContent className="pt-4 pb-3.5 px-4">
          {loading ? (
            <div className="space-y-2.5">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-7 w-14" />
              <Skeleton className="h-3 w-28" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
                <div className={cn("p-1.5 rounded-md", accentColor || "bg-muted")}>
                  <Icon className="h-3.5 w-3.5 text-foreground/70" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground tracking-tight">{value.toLocaleString()}</p>
              {trend ? (
                <div className={cn(
                  "flex items-center gap-1 mt-1.5 text-[11px] font-medium",
                  isUp ? "text-emerald-600" : isDown ? "text-destructive" : "text-muted-foreground"
                )}>
                  <TrendIcon className="h-3 w-3" />
                  <span>{isUp ? "+" : ""}{growthPct}% vs prior week</span>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground mt-1.5">All time total</p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

// ─── Custom Tooltip ───
const ChartTooltip = ({ active, payload, label, formatter }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 shadow-md">
      <p className="text-xs font-medium text-foreground mb-1">
        {formatter ? formatter(label) : label}
      </p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-semibold text-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Trend Chart ───
const TrendChart = ({
  title, description, data, color, loading,
}: {
  title: string;
  description: string;
  data: DailyCount[];
  color: string;
  loading: boolean;
}) => {
  const totalActivity = useMemo(() => data.reduce((s, d) => s + d.count, 0), [data]);
  const maxDay = useMemo(() => {
    const max = data.reduce((best, d) => d.count > best.count ? d : best, { date: "", count: 0 });
    return max.count > 0 ? max : null;
  }, [data]);

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardHeader className="pb-1 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
            <CardDescription className="text-[11px] mt-0.5">{description}</CardDescription>
          </div>
          {!loading && (
            <div className="text-right">
              <p className="text-lg font-bold">{totalActivity}</p>
              <p className="text-[10px] text-muted-foreground">events</p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pb-3 px-4">
        {loading ? (
          <Skeleton className="h-[160px] w-full" />
        ) : totalActivity === 0 ? (
          <div className="h-[160px] flex flex-col items-center justify-center text-center">
            <Activity className="h-8 w-8 text-muted-foreground/25 mb-2" />
            <p className="text-xs text-muted-foreground">No activity during this period</p>
            <p className="text-[11px] text-muted-foreground/60 mt-0.5">Activity will appear here as you use this feature</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id={`grad-${title.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={v => format(parseISO(v), "MMM d")}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  stroke="hsl(var(--border))"
                  interval="preserveStartEnd"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={
                    <ChartTooltip formatter={(v: string) => format(parseISO(v), "EEE, MMM d yyyy")} />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke={color}
                  strokeWidth={2}
                  fill={`url(#grad-${title.replace(/\s/g, "")})`}
                  name={title}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, fill: "hsl(var(--card))" }}
                />
              </AreaChart>
            </ResponsiveContainer>
            {maxDay && (
              <p className="text-[10px] text-muted-foreground mt-1 text-right">
                Peak: {maxDay.count} on {format(parseISO(maxDay.date), "MMM d")}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Activity Bar Chart ───
const ActivityOverview = ({ data, loading, days }: { data: WorkspaceAnalyticsData; loading: boolean; days: number }) => {
  if (loading) return <Card><CardContent className="py-8"><Skeleton className="h-[240px] w-full" /></CardContent></Card>;

  const chartData = data.assetTrend.map((d, i) => ({
    date: d.date,
    Assets: d.count,
    Containers: data.containerTrend[i]?.count || 0,
    Team: data.teamTrend[i]?.count || 0,
    Tasks: data.taskTrend[i]?.count || 0,
  }));

  const totalEvents = chartData.reduce((s, d) => s + d.Assets + d.Containers + d.Team + d.Tasks, 0);
  const activeDays = chartData.filter(d => d.Assets + d.Containers + d.Team + d.Tasks > 0).length;

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardHeader className="pb-1 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold">Daily Activity Overview</CardTitle>
            <CardDescription className="text-[11px] mt-0.5">
              Combined workspace activity across all categories · Last {days} days
            </CardDescription>
          </div>
          <div className="flex items-center gap-4 text-right">
            <div>
              <p className="text-lg font-bold">{totalEvents}</p>
              <p className="text-[10px] text-muted-foreground">total events</p>
            </div>
            <div>
              <p className="text-lg font-bold">{activeDays}</p>
              <p className="text-[10px] text-muted-foreground">active days</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-3 px-4">
        {totalEvents === 0 ? (
          <div className="h-[220px] flex flex-col items-center justify-center text-center">
            <BarChart3 className="h-10 w-10 text-muted-foreground/20 mb-3" />
            <p className="text-sm text-muted-foreground font-medium">No activity recorded</p>
            <p className="text-xs text-muted-foreground/60 mt-1 max-w-[300px]">
              Start adding assets, containers, team members, or tasks to see activity here
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={v => format(parseISO(v), "MMM d")}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                stroke="hsl(var(--border))"
                interval={days <= 7 ? 0 : "preserveStartEnd"}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={
                  <ChartTooltip formatter={(v: string) => format(parseISO(v), "EEE, MMM d yyyy")} />
                }
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              />
              <Bar dataKey="Assets" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} maxBarSize={days <= 7 ? 40 : 16} />
              <Bar dataKey="Containers" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={days <= 7 ? 40 : 16} />
              <Bar dataKey="Team" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={days <= 7 ? 40 : 16} />
              <Bar dataKey="Tasks" fill="#f59e0b" radius={[3, 3, 0, 0]} maxBarSize={days <= 7 ? 40 : 16} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

type WorkspaceAnalyticsData = NonNullable<ReturnType<typeof useWorkspaceAnalytics>["data"]>;

// ─── Page ───
const WorkspaceAnalytics = () => {
  const [days, setDays] = useState<number>(30);
  const { data, isLoading } = useWorkspaceAnalytics(days);
  const settings = useSettingsOptional();
  const workspaceName = settings?.workspaceSettings?.workspace_name || "My Workspace";

  const analytics = data || {
    totalAssets: 0, totalContainers: 0, totalTeamMembers: 0, totalTasks: 0,
    totalLayouts: 0, credentialsExpiringSoon: 0,
    assetTrend: [], containerTrend: [], teamTrend: [], taskTrend: [],
    assetsThisWeek: 0, assetsPrevWeek: 0, containersThisWeek: 0, containersPrevWeek: 0,
    teamThisWeek: 0, teamPrevWeek: 0, tasksThisWeek: 0, tasksPrevWeek: 0,
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <PageTransitionWrapper>
        <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-24 w-full">
          <Breadcrumbs items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Analytics" },
          ]} />

          {/* Header with time range selector */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 mt-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                  {workspaceName} Analytics
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Workspace usage and operational trends
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 p-1 rounded-lg border bg-muted/30">
              {TIME_RANGES.map(r => (
                <Button
                  key={r.value}
                  variant={days === r.value ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-7 text-xs px-3 rounded-md",
                    days === r.value ? "" : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setDays(r.value)}
                >
                  {r.label}
                </Button>
              ))}
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6" data-tour="analytics-overview">
            <MetricCard
              title="Assets" value={analytics.totalAssets} icon={Package}
              trend={{ current: analytics.assetsThisWeek, previous: analytics.assetsPrevWeek }}
              loading={isLoading} accentColor="bg-primary/10"
            />
            <MetricCard
              title="Containers" value={analytics.totalContainers} icon={Box}
              trend={{ current: analytics.containersThisWeek, previous: analytics.containersPrevWeek }}
              loading={isLoading} accentColor="bg-blue-500/10"
            />
            <MetricCard
              title="Team" value={analytics.totalTeamMembers} icon={Users}
              trend={{ current: analytics.teamThisWeek, previous: analytics.teamPrevWeek }}
              loading={isLoading} accentColor="bg-emerald-500/10"
            />
            <MetricCard
              title="Tasks" value={analytics.totalTasks} icon={CalendarDays}
              trend={{ current: analytics.tasksThisWeek, previous: analytics.tasksPrevWeek }}
              loading={isLoading} accentColor="bg-amber-500/10"
            />
            <MetricCard
              title="Layouts" value={analytics.totalLayouts} icon={LayoutGrid}
              loading={isLoading} accentColor="bg-violet-500/10"
            />
            <MetricCard
              title="Expiring Creds" value={analytics.credentialsExpiringSoon} icon={ShieldAlert}
              loading={isLoading}
              accentColor={analytics.credentialsExpiringSoon > 0 ? "bg-destructive/10" : "bg-muted"}
            />
          </div>

          {/* Activity Overview */}
          <div className="mb-6">
            <ActivityOverview data={analytics} loading={isLoading} days={days} />
          </div>

          {/* Individual Trend Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TrendChart
              title="Asset Growth"
              description="New assets added per day"
              data={analytics.assetTrend}
              color="hsl(var(--primary))" loading={isLoading}
            />
            <TrendChart
              title="Container Activity"
              description="New containers created per day"
              data={analytics.containerTrend}
              color="#3b82f6" loading={isLoading}
            />
            <TrendChart
              title="Team Growth"
              description="Team members added per day"
              data={analytics.teamTrend}
              color="#10b981" loading={isLoading}
            />
            <TrendChart
              title="Task Scheduling"
              description="Tasks created or scheduled per day"
              data={analytics.taskTrend}
              color="#f59e0b" loading={isLoading}
            />
          </div>
        </main>
      </PageTransitionWrapper>
      <LegalFooter />
    </div>
  );
};

export default WorkspaceAnalytics;
