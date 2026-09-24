/**
 * AutoDiagnosisPanel — Automatic error diagnosis system for the Ops Control Center.
 * Groups errors, analyzes patterns, and provides actionable investigation guidance.
 */

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Database,
  Globe,
  Layers,
  Lightbulb,
  Search,
  Server,
  Shield,
  Stethoscope,
  Terminal,
  TrendingUp,
  Wrench,
  Zap,
  CheckCircle2,
  Copy,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { diagnoseError, getCategoryLabel, getCategoryColor, type DiagnosticResult, type ErrorCategory } from "@/lib/error-diagnostics";
import type { ErrorLog } from "@/hooks/use-error-logs";

interface AutoDiagnosisPanelProps {
  errors: ErrorLog[];
  isLoading: boolean;
}

// ─── Diagnosed Error Group ───
interface DiagnosedGroup {
  key: string;
  diagnosis: DiagnosticResult;
  errors: ErrorLog[];
  totalHits: number;
  uniqueRoutes: string[];
  uniqueEndpoints: string[];
  uniqueUsers: number;
  firstSeen: string;
  lastSeen: string;
  trend: "rising" | "stable" | "declining";
  impactScore: number;
}

const SEVERITY_ORDER: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
const CATEGORY_ICONS: Partial<Record<ErrorCategory, React.ElementType>> = {
  schema: Database,
  permission: Shield,
  runtime: Zap,
  network: Globe,
  auth: Shield,
  config: Wrench,
  storage: Layers,
  edge_function: Server,
};

export const AutoDiagnosisPanel = ({ errors, isLoading }: AutoDiagnosisPanelProps) => {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<ErrorCategory | "all">("all");

  // ─── Build Diagnosed Groups ───
  const diagnosedGroups = useMemo((): DiagnosedGroup[] => {
    const unresolvedErrors = errors.filter(e => e.status !== "resolved" && e.status !== "ignored");
    if (!unresolvedErrors.length) return [];

    // Group by diagnosis category + cause combination
    const groupMap = new Map<string, { diagnosis: DiagnosticResult; errors: ErrorLog[] }>();

    unresolvedErrors.forEach(err => {
      const diag = diagnoseError(err.message, err.stack_trace, {
        api_endpoint: err.api_endpoint,
        api_status_code: err.api_status_code,
        page_route: err.page_route,
        request_method: err.request_method,
        hit_count: err.hit_count,
      });

      const key = `${diag.category}::${diag.likelyCause}`;
      const existing = groupMap.get(key);
      if (existing) {
        existing.errors.push(err);
      } else {
        groupMap.set(key, { diagnosis: diag, errors: [err] });
      }
    });

    // Build group objects
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    return Array.from(groupMap.entries()).map(([key, { diagnosis, errors: groupErrors }]) => {
      const totalHits = groupErrors.reduce((s, e) => s + e.hit_count, 0);
      const uniqueRoutes = [...new Set(groupErrors.map(e => e.page_route).filter(Boolean) as string[])];
      const uniqueEndpoints = [...new Set(groupErrors.map(e => e.api_endpoint).filter(Boolean) as string[])];
      const uniqueUsers = new Set(groupErrors.filter(e => e.user_id).map(e => e.user_id)).size;

      const timestamps = groupErrors.map(e => new Date(e.last_seen_at).getTime());
      const firstSeen = new Date(Math.min(...groupErrors.map(e => new Date(e.created_at).getTime()))).toISOString();
      const lastSeen = new Date(Math.max(...timestamps)).toISOString();

      // Trend: compare recent vs older errors
      const recentHits = groupErrors
        .filter(e => new Date(e.last_seen_at) > oneDayAgo)
        .reduce((s, e) => s + e.hit_count, 0);
      const olderHits = totalHits - recentHits;
      const trend: "rising" | "stable" | "declining" =
        recentHits > olderHits * 1.5 ? "rising" :
        recentHits < olderHits * 0.5 ? "declining" : "stable";

      // Impact score: severity * hits * users * recency
      const severityWeight = SEVERITY_ORDER[diagnosis.severity] || 2;
      const recencyWeight = recentHits > 0 ? 2 : 1;
      const impactScore = Math.min(
        Math.round(severityWeight * Math.log2(totalHits + 1) * (uniqueUsers + 1) * recencyWeight),
        100
      );

      return {
        key,
        diagnosis,
        errors: groupErrors,
        totalHits,
        uniqueRoutes,
        uniqueEndpoints,
        uniqueUsers,
        firstSeen,
        lastSeen,
        trend,
        impactScore,
      };
    }).sort((a, b) => b.impactScore - a.impactScore);
  }, [errors]);

  // ─── Category Summary ───
  const categorySummary = useMemo(() => {
    const map = new Map<ErrorCategory, { count: number; hits: number }>();
    diagnosedGroups.forEach(g => {
      const existing = map.get(g.diagnosis.category) || { count: 0, hits: 0 };
      existing.count += g.errors.length;
      existing.hits += g.totalHits;
      map.set(g.diagnosis.category, existing);
    });
    return Array.from(map.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.hits - a.hits);
  }, [diagnosedGroups]);

  const filteredGroups = filterCategory === "all"
    ? diagnosedGroups
    : diagnosedGroups.filter(g => g.diagnosis.category === filterCategory);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Stethoscope className="h-8 w-8 animate-pulse" />
            <p className="text-sm">Analyzing errors...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (diagnosedGroups.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-500/50" />
            <div>
              <p className="font-medium">No Active Issues</p>
              <p className="text-sm text-muted-foreground mt-1">All errors are resolved or ignored</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Automatic Error Diagnosis</h2>
          <Badge variant="secondary" className="text-xs">{diagnosedGroups.length} issue groups</Badge>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterCategory("all")}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium border transition-colors",
            filterCategory === "all"
              ? "bg-primary/10 text-primary border-primary/30"
              : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
          )}
        >
          All ({diagnosedGroups.length})
        </button>
        {categorySummary.map(({ category, count, hits }) => {
          const Icon = CATEGORY_ICONS[category] || AlertTriangle;
          return (
            <button
              key={category}
              onClick={() => setFilterCategory(category)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium border transition-colors flex items-center gap-1.5",
                filterCategory === category
                  ? getCategoryColor(category)
                  : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
              )}
            >
              <Icon className="h-3 w-3" />
              {getCategoryLabel(category)} ({count})
            </button>
          );
        })}
      </div>

      {/* Diagnosed Groups */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredGroups.map((group, idx) => (
            <motion.div
              key={group.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, delay: idx * 0.03 }}
            >
              <DiagnosisCard
                group={group}
                isExpanded={expandedGroup === group.key}
                onToggle={() => setExpandedGroup(expandedGroup === group.key ? null : group.key)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ─── Individual Diagnosis Card ───
const DiagnosisCard = ({
  group,
  isExpanded,
  onToggle,
}: {
  group: DiagnosedGroup;
  isExpanded: boolean;
  onToggle: () => void;
}) => {
  const { diagnosis, errors: groupErrors } = group;
  const Icon = CATEGORY_ICONS[diagnosis.category] || AlertTriangle;

  const severityStyles: Record<string, string> = {
    critical: "border-l-destructive",
    high: "border-l-orange-500",
    medium: "border-l-warning",
    low: "border-l-muted-foreground",
  };

  const trendIcon = group.trend === "rising"
    ? <TrendingUp className="h-3 w-3 text-destructive" />
    : group.trend === "declining"
    ? <TrendingUp className="h-3 w-3 text-emerald-500 rotate-180" />
    : <Activity className="h-3 w-3 text-muted-foreground" />;

  return (
    <Card className={cn("border-l-4 overflow-hidden", severityStyles[diagnosis.severity] || "border-l-border")}>
      {/* Header — always visible */}
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <button className="w-full text-left p-4 hover:bg-muted/30 transition-colors">
            <div className="flex items-start gap-3">
              <div className={cn("p-2 rounded-lg shrink-0", getCategoryColor(diagnosis.category))}>
                <Icon className="h-4 w-4" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", getCategoryColor(diagnosis.category))}>
                    {getCategoryLabel(diagnosis.category)}
                  </Badge>
                  <Badge variant="outline" className={cn(
                    "text-[10px] px-1.5 py-0",
                    diagnosis.severity === "critical" ? "text-destructive border-destructive/30" :
                    diagnosis.severity === "high" ? "text-orange-600 border-orange-500/30" :
                    "text-muted-foreground"
                  )}>
                    {diagnosis.severity}
                  </Badge>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    {trendIcon}
                    {group.trend}
                  </span>
                </div>

                <p className="text-sm font-medium">{diagnosis.likelyCause}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{diagnosis.affectedComponent}</p>

                {/* Quick stats */}
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span>{group.errors.length} error{group.errors.length !== 1 ? "s" : ""}</span>
                  <span>{group.totalHits} total hits</span>
                  <span>{group.uniqueUsers} user{group.uniqueUsers !== 1 ? "s" : ""}</span>
                  <span>{group.uniqueRoutes.length} page{group.uniqueRoutes.length !== 1 ? "s" : ""}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Impact Score */}
                <div className="text-center">
                  <p className={cn(
                    "text-lg font-bold tabular-nums",
                    group.impactScore >= 50 ? "text-destructive" :
                    group.impactScore >= 25 ? "text-warning" :
                    "text-muted-foreground"
                  )}>
                    {group.impactScore}
                  </p>
                  <p className="text-[10px] text-muted-foreground">impact</p>
                </div>
                {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </div>
            </div>
          </button>
        </CollapsibleTrigger>

        {/* Expanded Detail */}
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4 border-t bg-muted/10">
            {/* Diagnosis Detail */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              {/* Suggested Fix */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Lightbulb className="h-3.5 w-3.5 text-warning" />
                  Suggested Fix
                </div>
                <div className="bg-warning/5 border border-warning/20 rounded-lg p-3">
                  <p className="text-sm">{diagnosis.suggestedFix}</p>
                </div>
              </div>

              {/* Investigation Steps */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Search className="h-3.5 w-3.5" />
                  Investigation Steps
                </div>
                <div className="bg-card border rounded-lg p-3">
                  <ol className="space-y-1.5">
                    {diagnosis.investigationSteps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs">
                        <span className="font-bold text-primary/60 shrink-0 w-4">{i + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>

            {/* Related Query */}
            {diagnosis.relatedQuery && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Terminal className="h-3.5 w-3.5" />
                  Diagnostic Query
                </div>
                <div className="bg-muted/50 border rounded-lg p-3 flex items-center gap-2">
                  <code className="text-xs font-mono flex-1 break-all">{diagnosis.relatedQuery}</code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(diagnosis.relatedQuery!);
                      toast.success("Query copied to clipboard");
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            {/* Affected Routes & Endpoints */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {group.uniqueRoutes.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5" />
                    Affected Pages ({group.uniqueRoutes.length})
                  </p>
                  <div className="space-y-1">
                    {group.uniqueRoutes.slice(0, 5).map(route => (
                      <div key={route} className="text-xs font-mono bg-muted/50 rounded px-2 py-1 truncate">
                        {route}
                      </div>
                    ))}
                    {group.uniqueRoutes.length > 5 && (
                      <p className="text-[10px] text-muted-foreground">+{group.uniqueRoutes.length - 5} more</p>
                    )}
                  </div>
                </div>
              )}

              {group.uniqueEndpoints.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Server className="h-3.5 w-3.5" />
                    Affected Endpoints ({group.uniqueEndpoints.length})
                  </p>
                  <div className="space-y-1">
                    {group.uniqueEndpoints.slice(0, 5).map(ep => (
                      <div key={ep} className="text-xs font-mono bg-muted/50 rounded px-2 py-1 truncate">
                        {ep}
                      </div>
                    ))}
                    {group.uniqueEndpoints.length > 5 && (
                      <p className="text-[10px] text-muted-foreground">+{group.uniqueEndpoints.length - 5} more</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
              <span>First seen: {formatDistanceToNow(new Date(group.firstSeen), { addSuffix: true })}</span>
              <span>Last seen: {formatDistanceToNow(new Date(group.lastSeen), { addSuffix: true })}</span>
            </div>

            {/* Sample Errors */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Sample Errors ({Math.min(groupErrors.length, 3)} of {groupErrors.length})</p>
              <div className="space-y-1">
                {groupErrors.slice(0, 3).map(err => (
                  <div key={err.id} className="text-xs bg-muted/30 border rounded-lg px-3 py-2 flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-mono truncate">{err.message}</p>
                      <p className="text-muted-foreground mt-0.5">
                        {err.page_route || "—"} · {err.hit_count} hits · {format(new Date(err.last_seen_at), "MMM d, h:mm a")}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      {err.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
