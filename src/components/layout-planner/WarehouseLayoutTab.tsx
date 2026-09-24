import { useMemo } from "react";
import { SpaceAllocationProvider, useSpaceAllocation } from "./SpaceAllocationContext";
import { AwaitingPlacementPanel } from "./AwaitingPlacementPanel";
import { WarehouseMapPanel } from "./WarehouseMapPanel";
import { SuggestedPlacementPanel } from "./SuggestedPlacementPanel";
import { ZoneDetailDrawer } from "./ZoneDetailDrawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const WarehouseLayoutTab = () => {
  return (
    <SpaceAllocationProvider>
      <Workspace />
      <ZoneDetailDrawer />
    </SpaceAllocationProvider>
  );
};

const Workspace = () => {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <SummaryBar />
      {/* Desktop: 3 columns */}
      <div className="hidden lg:grid flex-1 min-h-0 grid-cols-[280px_1fr_320px]">
        <AwaitingPlacementPanel />
        <WarehouseMapPanel />
        <SuggestedPlacementPanel />
      </div>
      {/* Tablet/Mobile: inventory on top, map/suggested as tabs */}
      <div className="lg:hidden flex flex-col flex-1 min-h-0">
        <div className="h-[40vh] min-h-[260px] border-b">
          <AwaitingPlacementPanel />
        </div>
        <Tabs defaultValue="map" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-3 mt-2 self-start">
            <TabsTrigger value="map">Warehouse Map</TabsTrigger>
            <TabsTrigger value="suggested">Suggested</TabsTrigger>
          </TabsList>
          <TabsContent value="map" className="flex-1 min-h-0 m-0">
            <WarehouseMapPanel />
          </TabsContent>
          <TabsContent value="suggested" className="flex-1 min-h-0 m-0">
            <SuggestedPlacementPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

const SummaryBar = () => {
  const { sections } = useSpaceAllocation();

  const stats = useMemo(() => {
    const total = sections.reduce((s, x) => s + (x.max_capacity || 0), 0);
    const used = sections.reduce((s, x) => s + (x.current_capacity || 0), 0);
    const available = Math.max(0, total - used);
    const utilization = total > 0 ? Math.round((used / total) * 100) : 0;
    const nearCap = sections.filter((s) => s.max_capacity > 0 && (s.current_capacity || 0) / s.max_capacity >= 0.8).length;
    return { available, used, utilization, nearCap };
  }, [sections]);

  return (
    <div className="border-b bg-card">
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border">
        <Metric label="Available Slots" value={stats.available.toLocaleString()} />
        <Metric label="Occupied" value={stats.used.toLocaleString()} />
        <Metric label="Utilization" value={`${stats.utilization}%`} />
        <Metric label="Near Capacity" value={`${stats.nearCap}`} accent={stats.nearCap > 0 ? "warn" : undefined} />
      </div>
    </div>
  );
};

const Metric = ({ label, value, accent }: { label: string; value: string; accent?: "warn" }) => (
  <div className="px-4 py-2.5">
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className={`text-xl font-semibold leading-tight mt-0.5 ${accent === "warn" ? "text-amber-600" : ""}`}>{value}</div>
  </div>
);