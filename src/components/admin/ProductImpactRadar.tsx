/**
 * Product Impact Radar – highlights issues affecting the most users.
 */
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ErrorLog } from "@/hooks/use-error-logs";

const PAGE_IMPORTANCE: Record<string, number> = {
  "/dashboard": 10,
  "/assets": 9,
  "/team": 8,
  "/pallet-builder": 7,
  "/credentials": 7,
  "/calendar": 6,
  "/settings": 5,
};

interface ImpactItem {
  message: string;
  route: string;
  hits: number;
  uniqueUsers: number;
  severity: string;
  score: number;
  level: "high" | "medium" | "low";
}

export const ProductImpactRadar = ({ errors, isLoading }: { errors: ErrorLog[]; isLoading: boolean }) => {
  const items = useMemo(() => {
    if (!errors?.length) return [];

    // Group by error_hash or message
    const groups = new Map<string, { errors: ErrorLog[]; users: Set<string> }>();
    errors.filter(e => e.status !== "resolved" && e.status !== "ignored").forEach(e => {
      const key = e.error_hash || e.message.slice(0, 80);
      const group = groups.get(key) || { errors: [], users: new Set<string>() };
      group.errors.push(e);
      if (e.user_id) group.users.add(e.user_id);
      groups.set(key, group);
    });

    return Array.from(groups.entries())
      .map(([, g]): ImpactItem => {
        const first = g.errors[0];
        const hits = g.errors.reduce((s, e) => s + e.hit_count, 0);
        const uniqueUsers = g.users.size;
        const sevWeight = first.severity === "critical" ? 4 : first.severity === "error" ? 3 : first.severity === "warn" ? 2 : 1;
        const pageWeight = PAGE_IMPORTANCE[first.page_route || ""] || 3;
        const score = Math.round(hits * 0.3 + uniqueUsers * 3 + sevWeight * 5 + pageWeight * 2);
        return {
          message: first.message,
          route: first.page_route || "Unknown",
          hits,
          uniqueUsers,
          severity: first.severity,
          score,
          level: score >= 30 ? "high" : score >= 15 ? "medium" : "low",
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
  }, [errors]);

  const byLevel = useMemo(() => ({
    high: items.filter(i => i.level === "high"),
    medium: items.filter(i => i.level === "medium"),
    low: items.filter(i => i.level === "low"),
  }), [items]);

  if (isLoading) return <Card><CardContent className="py-8"><Skeleton className="h-40 w-full" /></CardContent></Card>;

  const LevelSection = ({ level, label, icon: Icon, items, color }: { level: string; label: string; icon: React.ElementType; items: ImpactItem[]; color: string }) => {
    if (!items.length) return null;
    return (
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Icon className={cn("h-4 w-4", color)} />
          <span className={cn("text-sm font-semibold", color)}>{label}</span>
          <Badge variant="secondary" className="text-xs">{items.length}</Badge>
        </div>
        <div className="space-y-1.5">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm">
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium text-xs">{item.message}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{item.route}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="text-[10px]">{item.hits} hits</Badge>
                <Badge variant="outline" className="text-[10px]">{item.uniqueUsers} users</Badge>
                <span className="text-xs font-bold text-muted-foreground w-8 text-right">{item.score}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4" /> Product Impact Radar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No active issues detected 🎉</p>
        ) : (
          <>
            <LevelSection level="high" label="High Impact" icon={AlertTriangle} items={byLevel.high} color="text-red-600" />
            <LevelSection level="medium" label="Medium Impact" icon={AlertCircle} items={byLevel.medium} color="text-yellow-600" />
            <LevelSection level="low" label="Low Impact" icon={Info} items={byLevel.low} color="text-blue-600" />
          </>
        )}
      </CardContent>
    </Card>
  );
};
