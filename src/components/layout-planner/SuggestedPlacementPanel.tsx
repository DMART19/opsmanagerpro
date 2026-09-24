import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Target, AlertTriangle, Info, MousePointerClick } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSpaceAllocation } from "./SpaceAllocationContext";
import { recommendSpace, buildCapacityAlerts } from "@/lib/space-recommender";

export const SuggestedPlacementPanel = () => {
  const { selectedItem, sections, inventory, assignInventoryToSection } = useSpaceAllocation();

  const quantity = Math.max(1, selectedItem?.quantity_available || 1);

  const recommendation = useMemo(() => {
    if (!selectedItem) return null;
    return recommendSpace({ item: selectedItem, quantity, sections, inventory });
  }, [selectedItem, quantity, sections, inventory]);

  const alerts = useMemo(
    () => (selectedItem ? buildCapacityAlerts({ quantity, sections, recommendation }) : []),
    [selectedItem, quantity, sections, recommendation]
  );

  return (
    <div className="flex flex-col h-full min-h-0 border-l bg-card">
      <div className="p-3 border-b flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Suggested Placement</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!selectedItem ? (
          <div className="text-center py-12 space-y-2 text-muted-foreground">
            <MousePointerClick className="h-8 w-8 mx-auto opacity-60" />
            <p className="text-sm">Select inventory to see the best placement.</p>
          </div>
        ) : (
          <>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Selected Item</div>
              <div className="text-base font-semibold mt-0.5">{selectedItem.description || "Untitled"}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {quantity} {quantity === 1 ? "unit" : "units"}
                {selectedItem.subcategory && ` · ${selectedItem.subcategory}`}
              </div>
            </div>

            {recommendation ? (
              <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-primary">Best Match</span>
                </div>
                <div>
                  <div className="text-lg font-bold">
                    {recommendation.section.section_code} · {recommendation.section.section_name}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <Stat label="Available" value={`${recommendation.available}`} />
                  <Stat label="Match" value={`${recommendation.compatibility}%`} />
                  <Stat label="Distance" value={recommendation.distance} />
                </div>
                <Button
                  className="w-full h-10"
                  onClick={() => assignInventoryToSection(selectedItem, recommendation.section)}
                >
                  Assign Inventory
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">
                No section in this warehouse has enough free space.
              </div>
            )}

            {alerts.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Capacity Alerts</div>
                {alerts.map((a, i) => {
                  const Icon = a.level === "danger" ? AlertTriangle : Info;
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex items-start gap-2 text-xs p-2 rounded-md border",
                        a.level === "danger"
                          ? "bg-destructive/5 border-destructive/30 text-destructive"
                          : "bg-muted/40 border-border text-foreground"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>{a.message}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md bg-background border py-1.5">
    <div className="text-sm font-semibold">{value}</div>
    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
  </div>
);