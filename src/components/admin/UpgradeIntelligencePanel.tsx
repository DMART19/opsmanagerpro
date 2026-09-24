/**
 * Upgrade Intelligence Panel — Full workspace upgrade analytics
 * Shows scored leads, detail drawers, actionable nudges, and alert system
 */

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  Users,
  Package,
  Lock,
  Zap,
  RefreshCw,
  ArrowUpRight,
  AlertTriangle,
  Crown,
  Search,
  Eye,
  Mail,
  Gift,
  Target,
  Flame,
  BarChart3,
  ChevronRight,
  Activity,
  Sparkles,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface UpgradeSignal {
  id: string;
  user_id: string;
  score: number;
  asset_usage_pct: number;
  team_usage_pct: number;
  locked_feature_attempts: number;
  asset_growth_rate: number;
  top_signals: { signal: string; detail: string }[];
  current_plan: string;
  computed_at: string;
}

const SIGNAL_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  asset_limit_critical: { label: "Asset Limit Critical", icon: AlertTriangle, color: "text-destructive bg-destructive/10" },
  asset_limit_approaching: { label: "Asset Limit Near", icon: Package, color: "text-amber-600 bg-amber-500/10" },
  team_limit_critical: { label: "Team Limit Critical", icon: AlertTriangle, color: "text-destructive bg-destructive/10" },
  team_limit_approaching: { label: "Team Limit Near", icon: Users, color: "text-amber-600 bg-amber-500/10" },
  heavy_gated_attempts: { label: "Heavy Gated Attempts", icon: Lock, color: "text-purple-600 bg-purple-500/10" },
  gated_feature_interest: { label: "Gated Feature Interest", icon: Lock, color: "text-blue-600 bg-blue-500/10" },
  rapid_growth: { label: "Rapid Growth", icon: TrendingUp, color: "text-emerald-600 bg-emerald-500/10" },
};

const getScoreColor = (score: number) => {
  if (score >= 70) return "text-destructive";
  if (score >= 40) return "text-amber-600";
  return "text-muted-foreground";
};

const getScoreLabel = (score: number) => {
  if (score >= 70) return "Hot Lead";
  if (score >= 40) return "Warm";
  return "Cool";
};

const getScoreBadgeVariant = (score: number) => {
  if (score >= 70) return "destructive" as const;
  if (score >= 40) return "default" as const;
  return "secondary" as const;
};

const getPlanUpgradeSuggestion = (plan: string) => {
  switch (plan) {
    case "inventory": return { next: "Operations", price: "$119/mo", features: ["Team Management", "Credentials", "Compliance"] };
    case "operations": return { next: "Logistics Pro", price: "$249/mo", features: ["Pallet Builder", "Calendar", "Advanced Reports"] };
    case "operations_pro": return { next: "Enterprise", price: "Custom", features: ["Governance", "White-Glove Onboarding"] };
    default: return { next: "Operations", price: "$119/mo", features: ["Full Feature Access"] };
  }
};

// ─── Workspace Detail Drawer ───
const WorkspaceDetailDrawer = ({
  signal,
  profile,
  workspace,
  open,
  onOpenChange,
}: {
  signal: UpgradeSignal | null;
  profile: { email: string | null; display_name: string | null } | null;
  workspace: { workspace_name: string | null } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  if (!signal) return null;

  const suggestion = getPlanUpgradeSuggestion(signal.current_plan);
  const signals = signal.top_signals || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg w-full overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
              signal.score >= 70 ? "bg-destructive/10" : signal.score >= 40 ? "bg-amber-500/10" : "bg-muted"
            )}>
              <Target className={cn("h-6 w-6", getScoreColor(signal.score))} />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-left">
                {workspace?.workspace_name || profile?.display_name || "Workspace"}
              </SheetTitle>
              <p className="text-xs text-muted-foreground">{profile?.email || signal.user_id.slice(0, 12)}</p>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-5 mt-6">
          {/* Score & Label */}
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className={cn("text-4xl font-bold", getScoreColor(signal.score))}>{signal.score}</p>
              <Badge variant={getScoreBadgeVariant(signal.score)} className="mt-1">{getScoreLabel(signal.score)}</Badge>
            </div>
            <div className="flex-1 space-y-2">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Upgrade Probability</p>
                <Progress value={signal.score} className="h-2" />
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>Plan: <strong className="text-foreground capitalize">{signal.current_plan}</strong></span>
                <span>Computed: {formatDistanceToNow(new Date(signal.computed_at), { addSuffix: true })}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Usage Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-3 pb-2 px-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                  <Package className="h-3.5 w-3.5" /> Asset Usage
                </div>
                <div className="space-y-1">
                  <Progress value={Math.min(signal.asset_usage_pct, 100)} className="h-2" />
                  <p className={cn("text-lg font-bold", signal.asset_usage_pct >= 90 ? "text-destructive" : signal.asset_usage_pct >= 70 ? "text-amber-600" : "")}>
                    {signal.asset_usage_pct}%
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 pb-2 px-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                  <Users className="h-3.5 w-3.5" /> Team Usage
                </div>
                <div className="space-y-1">
                  <Progress value={Math.min(signal.team_usage_pct, 100)} className="h-2" />
                  <p className={cn("text-lg font-bold", signal.team_usage_pct >= 90 ? "text-destructive" : signal.team_usage_pct >= 70 ? "text-amber-600" : "")}>
                    {signal.team_usage_pct}%
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 pb-2 px-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                  <Lock className="h-3.5 w-3.5" /> Gated Attempts (7d)
                </div>
                <p className={cn("text-lg font-bold", signal.locked_feature_attempts >= 10 ? "text-purple-600" : "")}>
                  {signal.locked_feature_attempts}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 pb-2 px-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                  <Activity className="h-3.5 w-3.5" /> Growth Rate
                </div>
                <p className={cn("text-lg font-bold", signal.asset_growth_rate >= 50 ? "text-emerald-600" : "")}>
                  {signal.asset_growth_rate > 0 ? "+" : ""}{signal.asset_growth_rate}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Active Signals */}
          {signals.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Active Signals</p>
              <div className="space-y-2">
                {signals.map((sig, i) => {
                  const config = SIGNAL_LABELS[sig.signal] || { label: sig.signal, icon: ArrowUpRight, color: "text-muted-foreground bg-muted" };
                  const Icon = config.icon;
                  return (
                    <div key={i} className="flex items-start gap-3 bg-muted/30 rounded-lg border p-3">
                      <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", config.color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{config.label}</p>
                        <p className="text-xs text-muted-foreground">{sig.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <Separator />

          {/* Upgrade Recommendation */}
          <div className="bg-primary/5 rounded-xl border border-primary/20 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Recommended Upgrade</p>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-primary">{suggestion.next}</span>
              <span className="text-sm text-muted-foreground">{suggestion.price}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {suggestion.features.map((f) => (
                <Badge key={f} variant="outline" className="text-xs bg-background">{f}</Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Admin Actions */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Admin Actions</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 justify-start"
                onClick={() => {
                  navigator.clipboard.writeText(profile?.email || signal.user_id);
                  toast.success("Email copied to clipboard");
                }}
              >
                <Mail className="h-3.5 w-3.5" /> Copy Email
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 justify-start"
                onClick={() => toast.info("Upgrade nudge email queued for " + (profile?.display_name || "workspace"))}
              >
                <Zap className="h-3.5 w-3.5 text-amber-500" /> Send Nudge
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 justify-start"
                onClick={() => toast.info("Discount offer queued for " + (profile?.display_name || "workspace"))}
              >
                <Gift className="h-3.5 w-3.5 text-emerald-500" /> Offer Discount
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 justify-start"
                onClick={() => toast.info("Personalized onboarding scheduled")}
              >
                <Crown className="h-3.5 w-3.5 text-primary" /> VIP Onboard
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

// ─── Main Panel ───
export const UpgradeIntelligencePanel = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [selectedSignal, setSelectedSignal] = useState<UpgradeSignal | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: signals, isLoading } = useQuery({
    queryKey: ["upgrade-signals"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("upgrade_signals")
        .select("*")
        .order("score", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as UpgradeSignal[];
    },
    staleTime: 60_000,
  });

  const { data: profiles } = useQuery({
    queryKey: ["upgrade-profiles", signals?.map(s => s.user_id)],
    queryFn: async () => {
      if (!signals?.length) return {};
      const userIds = signals.map(s => s.user_id);
      const { data } = await supabase.from("profiles").select("id, email, display_name").in("id", userIds);
      const map: Record<string, { email: string | null; display_name: string | null }> = {};
      data?.forEach(p => { map[p.id] = p; });
      return map;
    },
    enabled: !!signals?.length,
  });

  const { data: workspaces } = useQuery({
    queryKey: ["upgrade-workspaces", signals?.map(s => s.user_id)],
    queryFn: async () => {
      if (!signals?.length) return {};
      const userIds = signals.map(s => s.user_id);
      const { data } = await supabase.from("workspace_settings").select("user_id, workspace_name").in("user_id", userIds);
      const map: Record<string, { workspace_name: string | null }> = {};
      data?.forEach(w => { map[w.user_id] = w; });
      return map;
    },
    enabled: !!signals?.length,
  });

  const recomputeMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("compute-upgrade-scores");
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["upgrade-signals"] });
      toast.success(`Scores recomputed for ${data?.processed ?? 0} workspaces`);
    },
    onError: () => toast.error("Failed to recompute scores"),
  });

  const filtered = useMemo(() => {
    if (!signals) return [];
    return signals.filter(s => {
      if (planFilter !== "all" && s.current_plan !== planFilter) return false;
      if (scoreFilter === "hot" && s.score < 70) return false;
      if (scoreFilter === "warm" && (s.score < 40 || s.score >= 70)) return false;
      if (scoreFilter === "cool" && s.score >= 40) return false;
      if (searchQuery) {
        const profile = profiles?.[s.user_id];
        const ws = workspaces?.[s.user_id];
        const haystack = [profile?.email, profile?.display_name, ws?.workspace_name, s.user_id].filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(searchQuery.toLowerCase())) return false;
      }
      return true;
    });
  }, [signals, planFilter, scoreFilter, searchQuery, profiles, workspaces]);

  const hotLeads = signals?.filter(s => s.score >= 70) || [];
  const warmLeads = signals?.filter(s => s.score >= 40 && s.score < 70) || [];
  const totalAttempts = signals?.reduce((sum, s) => sum + s.locked_feature_attempts, 0) || 0;
  const avgScore = signals?.length ? Math.round(signals.reduce((sum, s) => sum + s.score, 0) / signals.length) : 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hot Lead Alerts */}
      {hotLeads.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <Flame className="h-4 w-4 text-destructive" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-destructive">
                    {hotLeads.length} Hot Lead{hotLeads.length !== 1 ? "s" : ""} — High Upgrade Probability
                  </p>
                  <p className="text-xs text-muted-foreground">These workspaces show strong upgrade signals. Take action now.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {hotLeads.slice(0, 6).map((s) => {
                  const profile = profiles?.[s.user_id];
                  const ws = workspaces?.[s.user_id];
                  return (
                    <button
                      key={s.id}
                      className="flex items-center gap-3 rounded-lg bg-background border p-3 text-left hover:shadow-md transition-all group"
                      onClick={() => { setSelectedSignal(s); setDrawerOpen(true); }}
                    >
                      <span className="text-xl font-bold text-destructive">{s.score}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {ws?.workspace_name || profile?.display_name || profile?.email || s.user_id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">{s.current_plan}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setScoreFilter(scoreFilter === "hot" ? "all" : "hot")}>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Crown className="h-4 w-4 text-destructive" />
              Hot Leads
            </div>
            <p className="text-2xl font-bold text-destructive">{hotLeads.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Score ≥ 70</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setScoreFilter(scoreFilter === "warm" ? "all" : "warm")}>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4 text-amber-500" />
              Warm Leads
            </div>
            <p className="text-2xl font-bold text-amber-600">{warmLeads.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Score 40–69</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Lock className="h-4 w-4 text-purple-500" />
              Gated Attempts
            </div>
            <p className="text-2xl font-bold text-purple-600">{totalAttempts}</p>
            <p className="text-xs text-muted-foreground mt-1">Last 7 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <BarChart3 className="h-4 w-4" />
              Avg Score
            </div>
            <p className={cn("text-2xl font-bold", getScoreColor(avgScore))}>{avgScore}</p>
            <p className="text-xs text-muted-foreground mt-1">{signals?.length || 0} tracked</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search workspace or email…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Plans</SelectItem>
            <SelectItem value="inventory">Inventory</SelectItem>
            <SelectItem value="operations">Operations</SelectItem>
            <SelectItem value="operations_pro">Ops Pro</SelectItem>
          </SelectContent>
        </Select>
        <Select value={scoreFilter} onValueChange={setScoreFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Score" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Scores</SelectItem>
            <SelectItem value="hot">Hot (70+)</SelectItem>
            <SelectItem value="warm">Warm (40–69)</SelectItem>
            <SelectItem value="cool">Cool (&lt;40)</SelectItem>
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="outline"
          onClick={() => recomputeMutation.mutate()}
          disabled={recomputeMutation.isPending}
          className="gap-1.5 ml-auto"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", recomputeMutation.isPending && "animate-spin")} />
          Recompute
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            Workspace Upgrade Pipeline
            <Badge variant="secondary" className="ml-1">{filtered.length}</Badge>
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
                  <TableHead>Assets</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Growth</TableHead>
                  <TableHead>Signals</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                      {signals?.length === 0
                        ? "No upgrade signals yet. Click \"Recompute\" to analyze workspaces."
                        : "No results match your filters."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((s) => {
                    const profile = profiles?.[s.user_id];
                    const ws = workspaces?.[s.user_id];
                    return (
                      <TableRow
                        key={s.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => { setSelectedSignal(s); setDrawerOpen(true); }}
                      >
                        <TableCell>
                          <div className="flex flex-col items-center gap-0.5">
                            <span className={cn("text-lg font-bold", getScoreColor(s.score))}>
                              {s.score}
                            </span>
                            <Badge variant={getScoreBadgeVariant(s.score)} className="text-[10px] px-1.5">
                              {getScoreLabel(s.score)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium truncate max-w-[180px]">
                              {ws?.workspace_name || profile?.display_name || profile?.email || s.user_id.slice(0, 8)}
                            </p>
                            <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                              {profile?.email || "—"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize text-xs">{s.current_plan}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 min-w-[70px]">
                            <Progress value={Math.min(s.asset_usage_pct, 100)} className="h-1.5" />
                            <span className={cn("text-xs", s.asset_usage_pct >= 90 ? "text-destructive font-medium" : "text-muted-foreground")}>{s.asset_usage_pct}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 min-w-[70px]">
                            <Progress value={Math.min(s.team_usage_pct, 100)} className="h-1.5" />
                            <span className={cn("text-xs", s.team_usage_pct >= 90 ? "text-destructive font-medium" : "text-muted-foreground")}>{s.team_usage_pct}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            "text-xs font-medium",
                            s.asset_growth_rate >= 50 ? "text-emerald-600" : s.asset_growth_rate > 0 ? "text-muted-foreground" : ""
                          )}>
                            {s.asset_growth_rate > 0 ? "+" : ""}{s.asset_growth_rate}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {(s.top_signals || []).slice(0, 2).map((sig, i) => {
                              const config = SIGNAL_LABELS[sig.signal] || { label: sig.signal, icon: ArrowUpRight, color: "text-muted-foreground bg-muted" };
                              const Icon = config.icon;
                              return (
                                <span key={i} className={cn("inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full", config.color)} title={sig.detail}>
                                  <Icon className="h-2.5 w-2.5" />
                                  {config.label}
                                </span>
                              );
                            })}
                            {(s.top_signals || []).length > 2 && (
                              <span className="text-[10px] text-muted-foreground">+{s.top_signals.length - 2}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedSignal(s); setDrawerOpen(true); }}>
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
      <WorkspaceDetailDrawer
        signal={selectedSignal}
        profile={selectedSignal ? profiles?.[selectedSignal.user_id] || null : null}
        workspace={selectedSignal ? workspaces?.[selectedSignal.user_id] || null : null}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
};

// ─── Hot Leads Widget (for overview/dashboard) ───
export const UpgradeHotLeadsWidget = () => {
  const { data: signals, isLoading } = useQuery({
    queryKey: ["upgrade-signals"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("upgrade_signals")
        .select("*")
        .order("score", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as UpgradeSignal[];
    },
    staleTime: 60_000,
  });

  const { data: workspaces } = useQuery({
    queryKey: ["upgrade-workspaces-widget", signals?.map(s => s.user_id)],
    queryFn: async () => {
      if (!signals?.length) return {};
      const userIds = signals.map(s => s.user_id);
      const [{ data: wsData }, { data: profData }] = await Promise.all([
        supabase.from("workspace_settings").select("user_id, workspace_name").in("user_id", userIds),
        supabase.from("profiles").select("id, email, display_name").in("id", userIds),
      ]);
      const map: Record<string, string> = {};
      profData?.forEach(p => { map[p.id] = p.display_name || p.email || p.id.slice(0, 8); });
      wsData?.forEach(w => { if (w.workspace_name) map[w.user_id] = w.workspace_name; });
      return map;
    },
    enabled: !!signals?.length,
  });

  const hotLeads = useMemo(() => (signals || []).filter(s => s.score >= 70).slice(0, 5), [signals]);
  const warmCount = useMemo(() => (signals || []).filter(s => s.score >= 40 && s.score < 70).length, [signals]);

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (!hotLeads.length && !warmCount) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Crown className="h-4 w-4 text-destructive" />
          Upgrade Candidates
          {hotLeads.length > 0 && (
            <Badge variant="destructive" className="text-xs">{hotLeads.length} hot</Badge>
          )}
          {warmCount > 0 && (
            <Badge variant="secondary" className="text-xs">{warmCount} warm</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {hotLeads.length > 0 ? (
          <div className="space-y-2">
            {hotLeads.map((s) => (
              <div key={s.id} className="flex items-center gap-3 rounded-lg bg-muted/30 border px-3 py-2">
                <span className={cn("text-lg font-bold shrink-0", getScoreColor(s.score))}>{s.score}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{workspaces?.[s.user_id] || s.user_id.slice(0, 8)}</p>
                  <div className="flex gap-1 mt-0.5">
                    {(s.top_signals || []).slice(0, 2).map((sig, i) => {
                      const config = SIGNAL_LABELS[sig.signal];
                      return config ? (
                        <span key={i} className={cn("text-[9px] px-1 py-0 rounded-full", config.color)}>{config.label}</span>
                      ) : null;
                    })}
                  </div>
                </div>
                <Badge variant="outline" className="capitalize text-[10px] shrink-0">{s.current_plan}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            {warmCount} warm leads — no hot leads yet
          </p>
        )}
      </CardContent>
    </Card>
  );
};
