import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { LayoutGrid, Truck, Warehouse } from "lucide-react";
import { useWarehouseSections } from "@/hooks/use-warehouse-sections";
import { useSavedTrailerLayouts } from "@/hooks/use-saved-trailer-layouts";

/** Three widgets surfaced on the dashboard for Layout Planner activity */
export const LayoutPlannerWidgets = () => {
  const { sections } = useWarehouseSections();
  const { layouts } = useSavedTrailerLayouts();

  const { data: loadPlans = [] } = useQuery({
    queryKey: ["load_plans", "dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("load_plans")
        .select("id, status")
        .is("deleted_at", null);
      if (error) return [];
      return data || [];
    },
    staleTime: 1000 * 60,
  });

  const active = loadPlans.filter((p: any) => p.status !== "completed").length;
  const inProgress = loadPlans.filter((p: any) => p.status === "in_progress").length;
  const completed = loadPlans.filter((p: any) => p.status === "completed").length;

  const totalCap = sections.reduce((s, x) => s + (x.max_capacity || 0), 0);
  const usedCap = sections.reduce((s, x) => s + (x.current_capacity || 0), 0);
  const occupancy = totalCap > 0 ? Math.round((usedCap / totalCap) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <Link to="/layout-planner?tab=summary" className="group">
        <Card className="hover:border-primary/40 transition-colors h-full">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <LayoutGrid className="h-3 w-3" /> Active Load Plans
              </div>
              <span className="text-[10px] text-muted-foreground group-hover:text-primary">Open →</span>
            </div>
            <div className="text-2xl font-semibold mt-1">{active}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {inProgress} in progress · {completed} completed
            </div>
          </CardContent>
        </Card>
      </Link>

      <Link to="/layout-planner?tab=warehouse" className="group">
        <Card className="hover:border-primary/40 transition-colors h-full">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Warehouse className="h-3 w-3" /> Warehouse Utilization
              </div>
              <span className="text-[10px] text-muted-foreground group-hover:text-primary">Open →</span>
            </div>
            <div className="text-2xl font-semibold mt-1">{occupancy}%</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {usedCap.toLocaleString()} / {totalCap.toLocaleString()} slots
            </div>
          </CardContent>
        </Card>
      </Link>

      <Link to="/layout-planner?tab=trailers" className="group">
        <Card className="hover:border-primary/40 transition-colors h-full">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Truck className="h-3 w-3" /> Trailer Utilization
              </div>
              <span className="text-[10px] text-muted-foreground group-hover:text-primary">Open →</span>
            </div>
            <div className="text-2xl font-semibold mt-1">{layouts.length}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Planned loads</div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
};