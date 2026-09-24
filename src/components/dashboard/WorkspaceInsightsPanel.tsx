/**
 * WorkspaceInsightsPanel – shows weekly workspace activity trends.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Package, Box, Users, MoveHorizontal } from "lucide-react";
import { startOfWeek } from "date-fns";

interface InsightItem {
  label: string;
  count: number;
  icon: React.ElementType;
}

export const WorkspaceInsightsPanel = () => {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString();

  const { data, isLoading } = useQuery({
    queryKey: ["workspace-insights-week", weekStart],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) return { assets: 0, containers: 0, team: 0, movements: 0 };

      const [assetsRes, containersRes, teamRes, movementsRes] = await Promise.all([
        supabase.from("cache_inventory").select("id", { count: "exact", head: true })
          .eq("asset_type", "item").gte("created_at", weekStart),
        supabase.from("cache_inventory").select("id", { count: "exact", head: true })
          .eq("asset_type", "container").gte("created_at", weekStart),
        supabase.from("employees").select("id", { count: "exact", head: true })
          .gte("created_at", weekStart),
        (supabase as any).from("product_events").select("id", { count: "exact", head: true })
          .in("event_type", ["asset_created", "container_created", "pallet_saved"])
          .gte("created_at", weekStart),
      ]);

      return {
        assets: assetsRes.count || 0,
        containers: containersRes.count || 0,
        team: teamRes.count || 0,
        movements: movementsRes.count || 0,
      };
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <Card className="p-5" style={{ boxShadow: "var(--shadow-card)" }}>
        <Skeleton className="h-5 w-36 mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      </Card>
    );
  }

  const insights: InsightItem[] = [
    { label: "Assets Added", count: data?.assets || 0, icon: Package },
    { label: "Containers Created", count: data?.containers || 0, icon: Box },
    { label: "Team Members Added", count: data?.team || 0, icon: Users },
    { label: "Inventory Actions", count: data?.movements || 0, icon: MoveHorizontal },
  ];

  const hasActivity = insights.some(i => i.count > 0);

  return (
    <Card className="p-5 sm:p-6" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/40">
        <h3 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
          <TrendingUp className="h-4.5 w-4.5 text-primary" />
          This Week
        </h3>
        {hasActivity && (
          <Badge variant="outline" className="text-[10px] text-muted-foreground">
            weekly summary
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {insights.map(item => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="flex items-center gap-3 rounded-xl bg-muted/30 border border-border/30 p-3 transition-colors hover:bg-muted/50"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-primary/70" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold tabular-nums leading-tight text-foreground">
                  {item.count}
                </p>
                <p className="text-[10px] text-muted-foreground font-medium truncate">{item.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {!hasActivity && (
        <p className="text-xs text-muted-foreground text-center mt-3">
          Activity will appear as you use the system this week.
        </p>
      )}
    </Card>
  );
};
