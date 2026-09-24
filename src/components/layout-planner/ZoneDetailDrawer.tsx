import { useMemo } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, MoveRight, Eye } from "lucide-react";
import { useSpaceAllocation } from "./SpaceAllocationContext";

export const ZoneDetailDrawer = () => {
  const {
    selectedSection, setSelectedSection,
    selectedItem, inventory,
    assignInventoryToSection,
  } = useSpaceAllocation();

  const open = !!selectedSection;

  const stored = useMemo(() => {
    if (!selectedSection) return [];
    const map = new Map<string, number>();
    inventory.forEach((it) => {
      if (it.section === selectedSection.section_code) {
        const key = it.description || "Untitled";
        map.set(key, (map.get(key) || 0) + (it.quantity_available || 1));
      }
    });
    return Array.from(map.entries()).slice(0, 8);
  }, [selectedSection, inventory]);

  if (!selectedSection) return null;

  const max = selectedSection.max_capacity || 0;
  const used = selectedSection.current_capacity || 0;
  const available = Math.max(0, max - used);

  return (
    <Drawer open={open} onOpenChange={(o) => !o && setSelectedSection(null)}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <span>{selectedSection.section_code} · {selectedSection.section_name}</span>
          </DrawerTitle>
          <DrawerDescription>{selectedSection.location_description || "Section detail"}</DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-4 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Capacity" value={`${max}`} />
            <Stat label="Used" value={`${used}`} />
            <Stat label="Available" value={`${available}`} highlight />
          </div>

          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Items Stored</div>
            {stored.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Empty section.</p>
            ) : (
              <div className="space-y-1">
                {stored.map(([name, qty]) => (
                  <div key={name} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                    <span className="flex items-center gap-2 truncate">
                      <Package className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="truncate">{name}</span>
                    </span>
                    <Badge variant="secondary" className="text-[11px]">{qty}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
            <Button
              className="h-10"
              disabled={!selectedItem || available <= 0}
              onClick={async () => {
                if (!selectedItem) return;
                const ok = await assignInventoryToSection(selectedItem, selectedSection);
                if (ok) setSelectedSection(null);
              }}
            >
              Place Inventory
            </Button>
            <Button variant="outline" className="h-10" disabled>
              <MoveRight className="h-3.5 w-3.5 mr-1" /> Move Inventory
            </Button>
            <Button variant="outline" className="h-10" disabled>
              <Eye className="h-3.5 w-3.5 mr-1" /> View Contents
            </Button>
          </div>
          {!selectedItem && (
            <p className="text-xs text-muted-foreground text-center">
              Select an item from Awaiting Placement to enable Place Inventory.
            </p>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

const Stat = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <div className={`rounded-md border py-2 text-center ${highlight ? "bg-primary/5 border-primary/30" : "bg-muted/30"}`}>
    <div className="text-lg font-semibold">{value}</div>
    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
  </div>
);