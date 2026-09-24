import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Warehouse as WarehouseIcon, MapPin, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useSpaceAllocation } from "./SpaceAllocationContext";
import type { WarehouseSection } from "@/hooks/use-warehouse-sections";

const zoneColor = (pct: number) => {
  if (pct >= 85) return { bar: "bg-destructive", text: "text-destructive", ring: "ring-destructive/40" };
  if (pct >= 60) return { bar: "bg-amber-500", text: "text-amber-600", ring: "ring-amber-400/40" };
  return { bar: "bg-emerald-500", text: "text-emerald-600", ring: "ring-emerald-400/40" };
};

export const WarehouseMapPanel = () => {
  const {
    warehouses, sections, inventory,
    selectedWarehouseId, setSelectedWarehouseId,
    setSelectedSection, assignInventoryToSection,
  } = useSpaceAllocation();
  const [hoverId, setHoverId] = useState<string | null>(null);

  const handleDrop = async (e: React.DragEvent, section: WarehouseSection) => {
    e.preventDefault();
    setHoverId(null);
    const id = e.dataTransfer.getData("application/x-inventory-id");
    if (!id) return;
    const item = inventory.find((x) => x.id === id);
    if (item) await assignInventoryToSection(item, section);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="p-3 border-b bg-card flex items-center gap-2">
        <WarehouseIcon className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Warehouse Map</span>
        <div className="ml-auto flex items-center gap-2">
          <Select
            value={selectedWarehouseId || undefined}
            onValueChange={setSelectedWarehouseId}
          >
            <SelectTrigger className="h-9 w-[220px]">
              <SelectValue placeholder="Select warehouse" />
            </SelectTrigger>
            <SelectContent>
              {warehouses.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name} <span className="text-muted-foreground">· {w.code}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-muted/20">
        {!selectedWarehouseId || warehouses.length === 0 ? (
          <EmptyState message="No warehouses configured yet." />
        ) : sections.length === 0 ? (
          <EmptyState message="This warehouse has no sections yet." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {sections.map((s) => {
              const max = s.max_capacity || 0;
              const used = s.current_capacity || 0;
              const pct = max > 0 ? Math.round((used / max) * 100) : 0;
              const c = zoneColor(pct);
              const isHover = hoverId === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedSection(s)}
                  onDragOver={(e) => { e.preventDefault(); setHoverId(s.id); }}
                  onDragLeave={() => setHoverId((h) => (h === s.id ? null : h))}
                  onDrop={(e) => handleDrop(e, s)}
                  className={cn(
                    "text-left p-4 rounded-lg border bg-card transition-all hover:shadow-md hover:border-primary/40",
                    isHover && "ring-2 ring-primary border-primary scale-[1.01]"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-lg font-bold leading-tight">{s.section_code}</div>
                      <div className="text-sm text-muted-foreground truncate">{s.section_name}</div>
                    </div>
                    <span className={cn("text-sm font-semibold", c.text)}>{pct}%</span>
                  </div>
                  <div className="mt-3 h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className={cn("h-full transition-all", c.bar)} style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{used} / {max} used</span>
                    <span>{Math.max(0, max - used)} available</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const EmptyState = ({ message }: { message: string }) => (
  <div className="text-center py-16 space-y-3">
    <LayoutGrid className="h-10 w-10 mx-auto text-muted-foreground/60" />
    <p className="text-sm text-muted-foreground">{message}</p>
    <Button asChild variant="outline" size="sm">
      <Link to="/settings?tab=warehouses">
        <MapPin className="h-3.5 w-3.5 mr-1" /> Manage warehouses
      </Link>
    </Button>
  </div>
);