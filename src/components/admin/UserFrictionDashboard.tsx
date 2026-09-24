/**
 * User Friction Dashboard – shows where users struggle.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MousePointerClick,
  FormInput,
  RotateCcw,
  XCircle,
  Lock,
  Ban,
  TrendingUp,
} from "lucide-react";

interface FrictionEvent {
  id: string;
  event_type: string;
  page_route: string | null;
  element_label: string | null;
  details: Record<string, unknown>;
  created_at: string;
  user_id: string | null;
}

const FRICTION_ICONS: Record<string, React.ElementType> = {
  validation_error: FormInput,
  rage_click: MousePointerClick,
  abandoned_workflow: XCircle,
  repeated_action: RotateCcw,
  gated_feature_attempt: Lock,
  disabled_click: Ban,
};

const FRICTION_LABELS: Record<string, string> = {
  validation_error: "Validation Failures",
  rage_click: "Rage Clicks",
  abandoned_workflow: "Abandoned Workflows",
  repeated_action: "Repeated Actions",
  gated_feature_attempt: "Gated Feature Attempts",
  disabled_click: "Disabled Button Clicks",
};

const FRICTION_COLORS: Record<string, string> = {
  validation_error: "text-amber-500",
  rage_click: "text-red-500",
  abandoned_workflow: "text-orange-500",
  repeated_action: "text-blue-500",
  gated_feature_attempt: "text-purple-500",
  disabled_click: "text-muted-foreground",
};

export const UserFrictionDashboard = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["friction-events-analytics"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("friction_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data || []) as FrictionEvent[];
    },
    staleTime: 30_000,
    gcTime: 120_000,
  });

  if (isLoading)
    return (
      <Card>
        <CardContent className="py-8">
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );

  const events = data || [];

  // Group by type
  const typeCounts: Record<string, number> = {};
  events.forEach((e) => {
    typeCounts[e.event_type] = (typeCounts[e.event_type] || 0) + 1;
  });
  const maxTypeCount = Math.max(...Object.values(typeCounts), 1);

  // Top routes with friction
  const routeCounts: Record<string, number> = {};
  events.forEach((e) => {
    if (e.page_route) routeCounts[e.page_route] = (routeCounts[e.page_route] || 0) + 1;
  });
  const topRoutes = Object.entries(routeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const maxRouteCount = topRoutes[0]?.[1] || 1;

  // Top elements
  const elementCounts: Record<string, number> = {};
  events.forEach((e) => {
    if (e.element_label)
      elementCounts[e.element_label] = (elementCounts[e.element_label] || 0) + 1;
  });
  const topElements = Object.entries(elementCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  // Gated feature attempts
  const gatedEvents = events.filter((e) => e.event_type === "gated_feature_attempt");
  const gatedFeatureCounts: Record<string, number> = {};
  gatedEvents.forEach((e) => {
    const feature = e.element_label || (e.details as any)?.feature || "Unknown";
    gatedFeatureCounts[feature] = (gatedFeatureCounts[feature] || 0) + 1;
  });
  const topGated = Object.entries(gatedFeatureCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxGated = topGated[0]?.[1] || 1;

  // Unique users
  const uniqueUsers = new Set(events.filter((e) => e.user_id).map((e) => e.user_id)).size;

  // Time distribution (last 7 days)
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const recentEvents = events.filter(
    (e) => new Date(e.created_at).getTime() > sevenDaysAgo
  );
  const dayBuckets: Record<string, number> = {};
  recentEvents.forEach((e) => {
    const day = new Date(e.created_at).toLocaleDateString("en-US", { weekday: "short" });
    dayBuckets[day] = (dayBuckets[day] || 0) + 1;
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MousePointerClick className="h-4 w-4" /> User Friction Dashboard
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {events.length} events
            </Badge>
            <Badge variant="outline" className="text-xs">
              {uniqueUsers} users
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No friction events recorded yet. Events will appear as users interact with the app.
          </p>
        ) : (
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="h-8">
              <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
              <TabsTrigger value="gated" className="text-xs">Gated Features</TabsTrigger>
              <TabsTrigger value="elements" className="text-xs">Problem Elements</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* By type */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    By Type
                  </h4>
                  <div className="space-y-3">
                    {Object.entries(FRICTION_LABELS).map(([type, label]) => {
                      const count = typeCounts[type] || 0;
                      const Icon = FRICTION_ICONS[type] || MousePointerClick;
                      const color = FRICTION_COLORS[type] || "";
                      return (
                        <div key={type} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2">
                              <Icon className={`h-3.5 w-3.5 ${color}`} />
                              {label}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {count}
                            </Badge>
                          </div>
                          <Progress value={(count / maxTypeCount) * 100} className="h-1.5" />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Top routes */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Top Friction Pages
                  </h4>
                  <div className="space-y-2">
                    {topRoutes.map(([route, count]) => (
                      <div key={route} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-mono text-xs truncate">{route}</span>
                          <Badge variant="secondary" className="text-xs">
                            {count}
                          </Badge>
                        </div>
                        <Progress value={(count / maxRouteCount) * 100} className="h-1.5" />
                      </div>
                    ))}
                    {topRoutes.length === 0 && (
                      <p className="text-xs text-muted-foreground">No data</p>
                    )}
                  </div>

                  {/* 7-day activity */}
                  {Object.keys(dayBuckets).length > 0 && (
                    <div className="mt-5">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        <TrendingUp className="h-3 w-3 inline mr-1" />
                        7-Day Activity
                      </h4>
                      <div className="flex items-end gap-1 h-12">
                        {Object.entries(dayBuckets).map(([day, count]) => {
                          const maxDay = Math.max(...Object.values(dayBuckets), 1);
                          return (
                            <div key={day} className="flex-1 flex flex-col items-center gap-0.5">
                              <div
                                className="w-full bg-primary/20 rounded-sm min-h-[2px]"
                                style={{ height: `${(count / maxDay) * 100}%` }}
                              />
                              <span className="text-[9px] text-muted-foreground">{day}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Gated Features Tab */}
            <TabsContent value="gated" className="mt-0">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  <Lock className="h-3 w-3 inline mr-1" />
                  Features Users Attempted But Couldn't Access
                </h4>
                {topGated.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No gated feature attempts recorded yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {topGated.map(([feature, count]) => (
                      <div key={feature} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <Lock className="h-3.5 w-3.5 text-purple-500" />
                            {feature}
                          </span>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {count} attempts
                            </Badge>
                            {count >= 5 && (
                              <Badge variant="destructive" className="text-xs">
                                High demand
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Progress value={(count / maxGated) * 100} className="h-1.5" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Which pages trigger gated attempts */}
                {gatedEvents.length > 0 && (
                  <div className="mt-5">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Pages Triggering Gated Attempts
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {(() => {
                        const pageCounts: Record<string, number> = {};
                        gatedEvents.forEach((e) => {
                          if (e.page_route) pageCounts[e.page_route] = (pageCounts[e.page_route] || 0) + 1;
                        });
                        return Object.entries(pageCounts)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 6)
                          .map(([page, cnt]) => (
                            <Badge key={page} variant="outline" className="text-xs gap-1 px-2 py-1 font-mono">
                              {page} <span className="font-bold">{cnt}</span>
                            </Badge>
                          ));
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Problem Elements Tab */}
            <TabsContent value="elements" className="mt-0">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Most Problematic UI Elements
              </h4>
              {topElements.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No data</p>
              ) : (
                <div className="space-y-2">
                  {topElements.map(([el, count]) => {
                    // Determine which friction types this element appears in
                    const types = new Set<string>();
                    events
                      .filter((e) => e.element_label === el)
                      .forEach((e) => types.add(e.event_type));
                    return (
                      <div key={el} className="flex items-center justify-between text-sm py-1 border-b border-border/30 last:border-0">
                        <span className="truncate max-w-[60%]">{el}</span>
                        <div className="flex items-center gap-2">
                          {Array.from(types).map((t) => {
                            const Icon = FRICTION_ICONS[t] || MousePointerClick;
                            const color = FRICTION_COLORS[t] || "";
                            return <Icon key={t} className={`h-3 w-3 ${color}`} />;
                          })}
                          <Badge variant="secondary" className="text-xs">
                            {count}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};
