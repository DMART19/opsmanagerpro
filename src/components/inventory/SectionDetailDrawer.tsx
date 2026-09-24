import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { X, Package, AlertTriangle, Grid3x3, Edit, Plus, Maximize2, Box } from "lucide-react";
import { WarehouseSection, PalletSlot } from "@/hooks/use-warehouse-sections";
import { Skeleton } from "@/components/ui/skeleton";
import { PalletSlotDialog } from "./PalletSlotDialog";
import { EditWarehouseSectionModal } from "./EditWarehouseSectionModal";
import { supabase } from "@/integrations/supabase/client";
import { OperationalSectionManager } from "./OperationalSectionManager";

interface SectionDetailDrawerProps {
  section: WarehouseSection | null;
  open: boolean;
  onClose: () => void;
  onLoadSlots: (sectionId: string) => Promise<PalletSlot[]>;
  onSectionUpdated: () => void;
  onOpenFullView: (section: WarehouseSection) => void;
}

export const SectionDetailDrawer = ({
  section,
  open,
  onClose,
  onLoadSlots,
  onSectionUpdated,
  onOpenFullView,
}: SectionDetailDrawerProps) => {
  const [slots, setSlots] = useState<PalletSlot[]>([]);
  const [pallets, setPallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<PalletSlot | null>(null);
  const [slotDialogOpen, setSlotDialogOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  useEffect(() => {
    if (section && open) {
      loadSlots();
    }
  }, [section, open]);

  const loadSlots = async () => {
    if (!section) return;
    setLoading(true);
    const slotsData = await onLoadSlots(section.id);
    setSlots(slotsData);
    
    // Load actual pallets in this section
    const { data: palletsData } = await supabase
      .from("pallets")
      .select("*")
      .eq("section_id", section.id);
    
    setPallets(palletsData || []);
    setLoading(false);
  };

  const handleSlotClick = (slot: PalletSlot) => {
    setSelectedSlot(slot);
    setSlotDialogOpen(true);
  };

  const handleSlotUpdated = () => {
    loadSlots();
  };

  if (!section) return null;

  const density = (section.current_capacity / section.max_capacity) * 100;
  const availableSlots = section.max_capacity - section.current_capacity;
  const occupiedSlots = slots.filter((s) => s.is_occupied).length;
  const reservedSlots = slots.filter((s) => s.occupancy_status === "reserved").length;

  const getSlotColor = (slot: PalletSlot) => {
    if (slot.occupancy_status === "maintenance") return "bg-orange-500";
    if (slot.occupancy_status === "reserved") return "bg-blue-400";
    if (slot.is_occupied) return "bg-[#2F5FFF]";
    return "bg-muted";
  };

  return (
    <Drawer open={open} onOpenChange={onClose}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="border-b">
          <div className="flex items-start justify-between">
            <div>
              <DrawerTitle className="text-2xl flex items-center gap-2">
                <Grid3x3 className="h-6 w-6 text-[#2F5FFF]" />
                Section {section.section_code}
              </DrawerTitle>
              <DrawerDescription className="mt-1">
                {section.section_name}
                {section.location_description && ` • ${section.location_description}`}
                {section.floor_level && ` • Floor ${section.floor_level}`}
              </DrawerDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  if (section) onOpenFullView(section);
                }}
                title="Open operational management view"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setEditModalOpen(true)}
                title="Edit section details"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
            </div>
          </div>
        </DrawerHeader>

        <div className="overflow-y-auto p-6 space-y-6">
          {/* Capacity Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-[#F6F8FB] border border-[#0D1321]/10">
              <p className="text-sm text-muted-foreground mb-1">Capacity</p>
              <p className="text-2xl font-bold text-[#0D1321]">
                {section.current_capacity}/{section.max_capacity}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-[#F6F8FB] border border-[#0D1321]/10">
              <p className="text-sm text-muted-foreground mb-1">Available</p>
              <p className="text-2xl font-bold text-green-600">{availableSlots}</p>
            </div>
            <div className="p-4 rounded-lg bg-[#F6F8FB] border border-[#0D1321]/10">
              <p className="text-sm text-muted-foreground mb-1">Occupied</p>
              <p className="text-2xl font-bold text-[#2F5FFF]">{occupiedSlots}</p>
            </div>
            <div className="p-4 rounded-lg bg-[#F6F8FB] border border-[#0D1321]/10">
              <p className="text-sm text-muted-foreground mb-1">Reserved</p>
              <p className="text-2xl font-bold text-blue-400">{reservedSlots}</p>
            </div>
          </div>

          {/* Utilization Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Utilization</span>
              <Badge variant={density > 90 ? "destructive" : density > 60 ? "secondary" : "outline"}>
                {density.toFixed(1)}%
              </Badge>
            </div>
            <Progress value={density} className="h-3" />
            {density > 90 && (
              <div className="flex items-center gap-2 text-sm text-orange-600">
                <AlertTriangle className="h-4 w-4" />
                <span>Section is over 90% capacity</span>
              </div>
            )}
          </div>

          {/* Actual Pallets in Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Box className="h-5 w-5 text-[#2F5FFF]" />
                Pallets in Section
              </h3>
              <Badge variant="outline">{pallets.length} pallet(s)</Badge>
            </div>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded" />
                ))}
              </div>
            ) : pallets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border border-border/50 rounded-lg bg-muted/10">
                <Box className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No pallets in this section</p>
                <p className="text-sm mt-1">Use the Maximize button above to add pallets</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pallets.map((pallet) => (
                  <div
                    key={pallet.id}
                    className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{pallet.pallet_id}</p>
                        <p className="text-sm text-muted-foreground">
                          {pallet.pallet_type} • {pallet.condition}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={pallet.status === 'available' ? 'outline' : 'secondary'}>
                          {pallet.status}
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          {pallet.current_weight} kg
                        </p>
                      </div>
                    </div>
                    {pallet.notes && (
                      <p className="text-sm text-muted-foreground mt-2">{pallet.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Physical Slot Grid (if configured) */}
          {slots.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Grid3x3 className="h-5 w-5 text-[#2F5FFF]" />
                  Physical Slot Positions
                </h3>
                <p className="text-sm text-muted-foreground">Click any slot to manage</p>
              </div>
              <div className="grid grid-cols-8 md:grid-cols-12 gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot.id}
                    onClick={() => handleSlotClick(slot)}
                    className={`aspect-square rounded ${getSlotColor(
                      slot
                    )} transition-all hover:scale-110 hover:ring-2 hover:ring-[#2F5FFF] hover:ring-offset-2 cursor-pointer relative group focus:outline-none focus:ring-2 focus:ring-[#2F5FFF] focus:ring-offset-2`}
                    title={`Slot ${slot.slot_code} - ${slot.occupancy_status}`}
                  >
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      {slot.slot_number}
                    </div>
                    {slot.equipment_id && (
                      <div className="absolute top-0.5 right-0.5">
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-4 p-4 bg-[#F6F8FB] rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-[#2F5FFF]" />
              <span className="text-sm">Occupied</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-400" />
              <span className="text-sm">Reserved</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-orange-500" />
              <span className="text-sm">Maintenance</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-muted" />
              <span className="text-sm">Available</span>
            </div>
          </div>
        </div>

        <DrawerFooter className="border-t">
          <Button onClick={onClose} className="w-full">Close</Button>
        </DrawerFooter>
      </DrawerContent>

      {/* Pallet Slot Dialog */}
      <PalletSlotDialog
        slot={selectedSlot}
        open={slotDialogOpen}
        onClose={() => setSlotDialogOpen(false)}
        onSuccess={handleSlotUpdated}
      />

      {/* Edit Section Modal */}
      <EditWarehouseSectionModal
        section={section}
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSuccess={() => {
          onSectionUpdated();
          loadSlots();
        }}
      />
    </Drawer>
  );
};