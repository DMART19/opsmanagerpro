import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/ui/numeric-input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useCacheInventory, CacheInventoryItem } from "@/hooks/use-cache-inventory";
import { Package, ArrowRight, MapPin, Box, AlertCircle } from "lucide-react";
import { GuidanceTooltip } from "@/components/guidance";

interface MoveCacheItemModalProps {
  item: CacheInventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMoved: () => void;
}

export const MoveCacheItemModal = ({ item, open, onOpenChange, onMoved }: MoveCacheItemModalProps) => {
  const [destSection, setDestSection] = useState("");
  const [destContainerId, setDestContainerId] = useState<string>("none");
  const [quantityToMove, setQuantityToMove] = useState<string>("1");
  const [isMoving, setIsMoving] = useState(false);
  const { items: allItems } = useCacheInventory();

  const availableQty = item?.quantity_available ?? 0;
  const parsedQty = Math.max(0, parseInt(quantityToMove, 10) || 0);
  const remainingQty = Math.max(0, availableQty - parsedQty);

  // Unique storage areas from existing items
  const storageAreas = useMemo(() => {
    const areas = new Set<string>();
    allItems.forEach(i => {
      if (i.section?.trim()) areas.add(i.section.trim());
    });
    return Array.from(areas).sort();
  }, [allItems]);

  // Filter containers: exclude self and descendants, optionally filter by selected storage area
  const containers = useMemo(() => {
    const allContainers = allItems.filter(i => i.asset_type === "container");
    let filtered = allContainers;

    if (item && item.asset_type === "container") {
      const excludeIds = new Set<string>([item.id]);
      const collectDescendants = (parentId: string) => {
        allItems.forEach(c => {
          if (c.container_id === parentId && !excludeIds.has(c.id)) {
            excludeIds.add(c.id);
            if (c.asset_type === "container") collectDescendants(c.id);
          }
        });
      };
      collectDescendants(item.id);
      filtered = allContainers.filter(c => !excludeIds.has(c.id));
    }

    // If a destination storage area is selected, show containers in that area
    if (destSection.trim()) {
      filtered = filtered.filter(c => c.section === destSection.trim());
    }

    return filtered;
  }, [allItems, item, destSection]);

  // Get container name for current item
  const currentContainerName = useMemo(() => {
    if (!item?.container_id) return "None";
    const c = allItems.find(i => i.id === item.container_id);
    return c ? (c.box_number || c.description || "Container") : "Unknown";
  }, [item, allItems]);

  useEffect(() => {
    if (item && open) {
      setDestSection("");
      setDestContainerId("none");
      setQuantityToMove("1");
    }
  }, [item, open]);

  // Reset container when storage area changes
  useEffect(() => {
    setDestContainerId("none");
  }, [destSection]);

  // Validation
  const validationError = useMemo(() => {
    if (!item) return null;
    if (parsedQty < 1) return "Quantity must be at least 1";
    if (parsedQty > availableQty) return `Cannot exceed available quantity (${availableQty})`;

    const resolvedDest = destContainerId === "none" ? null : destContainerId;
    const sameSection = (destSection.trim() || null) === (item.section || null) || (!destSection.trim() && !item.section);
    const sameContainer = resolvedDest === (item.container_id || null);
    if (sameSection && sameContainer) return "Destination is the same as current location";

    // Check container belongs to selected storage area
    if (resolvedDest && destSection.trim()) {
      const destContainer = allItems.find(i => i.id === resolvedDest);
      if (destContainer && destContainer.section && destContainer.section !== destSection.trim()) {
        return "Selected container is not in the chosen storage area";
      }
    }

    return null;
  }, [item, parsedQty, availableQty, destSection, destContainerId, allItems]);

  const handleMove = async () => {
    if (!item || validationError) return;

    setIsMoving(true);
    try {
      const resolvedContainerId = destContainerId === "none" ? null : destContainerId;
      const destSectionValue = destSection.trim() || null;

      if (parsedQty >= availableQty) {
        // Full move — update existing record in place
        const updateData: Record<string, any> = {};
        if (destSectionValue !== (item.section || null)) {
          updateData.section = destSectionValue;
        }
        if (resolvedContainerId !== (item.container_id || null)) {
          updateData.container_id = resolvedContainerId;
        }
        if (Object.keys(updateData).length > 0) {
          const { error } = await supabase
            .from("cache_inventory")
            .update(updateData)
            .eq("id", item.id);
          if (error) throw error;
        }
      } else {
        // Partial move — reduce source qty and create new record at destination
        const { error: updateError } = await supabase
          .from("cache_inventory")
          .update({ quantity_available: availableQty - parsedQty })
          .eq("id", item.id);
        if (updateError) throw updateError;

        // Create new record at destination with moved quantity
        const newRecord: Record<string, any> = {
          description: item.description,
          model_part_num: item.model_part_num,
          serial_number: item.serial_number,
          barcode: item.barcode,
          date_expire: item.date_expire,
          is_internal: item.is_internal,
          group_year: item.group_year,
          id_cache_fema: item.id_cache_fema,
          id_cache_tf: item.id_cache_tf,
          manufacturer_id: item.manufacturer_id,
          asset_status_id: item.asset_status_id,
          asset_group_id: item.asset_group_id,
          category_id: item.category_id,
          low_stock_threshold: item.low_stock_threshold,
          critical_stock_threshold: item.critical_stock_threshold,
          image_url: item.image_url,
          asset_type: item.asset_type,
          container_type_id: item.container_type_id,
          container_status_id: item.container_status_id,
          container_group_id: item.container_group_id,
          box_number: item.box_number,
          box_number_alt: item.box_number_alt,
          user_id: item.user_id,
          quantity_available: parsedQty,
          quantity_out: 0,
          section: destSectionValue,
          container_id: resolvedContainerId,
        };

        const { error: insertError } = await supabase
          .from("cache_inventory")
          .insert(newRecord);
        if (insertError) throw insertError;
      }

      toast({
        title: "Items moved",
        description: `${parsedQty} ${parsedQty === 1 ? "item" : "items"} moved successfully`,
      });

      onMoved();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Move failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsMoving(false);
    }
  };

  const quickMoveButtons = [1, 5, 10, availableQty].filter(
    (v, i, arr) => v <= availableQty && arr.indexOf(v) === i
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Box className="h-5 w-5 text-primary" />
            {item?.container_id ? 'Move Container' : 'Assign Container'}
          </DialogTitle>
          <DialogDescription>
            Choose a container where this item should be stored.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <GuidanceTooltip
            guidanceId="move_item_intro"
            message="Choose how many units to move and where they should go. Storage Areas represent physical locations. Containers are optional sub-locations within storage areas."
          />
          {/* Current item info card */}
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-medium text-sm truncate">{item?.description || "Unknown"}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground pl-6">
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span>Storage Area: <span className="text-foreground">{item?.section || "None"}</span></span>
              </div>
              <div className="flex items-center gap-1">
                <Box className="h-3 w-3" />
                <span>Container: <span className="text-foreground">{currentContainerName}</span></span>
              </div>
              <div className="col-span-2">
                Available Quantity: <Badge variant="secondary" className="ml-1 text-xs">{availableQty}</Badge>
              </div>
            </div>
          </div>

          {/* Quantity to move */}
          <div className="space-y-2">
            <Label htmlFor="qty_move">Quantity to Move</Label>
            <NumericInput
              id="qty_move"
              value={quantityToMove}
              onValueChange={setQuantityToMove}
              onNumericBlur={(v) => {
                if (v === null || v < 1) setQuantityToMove("1");
                else if (v > availableQty) setQuantityToMove(String(availableQty));
                else setQuantityToMove(String(v));
              }}
              allowDecimal={false}
              min={1}
              max={availableQty}
              className="w-full"
              error={parsedQty > availableQty || parsedQty < 1}
            />
            {/* Quick move buttons */}
            <div className="flex gap-2 flex-wrap">
              {quickMoveButtons.map((qty) => (
                <Button
                  key={qty}
                  type="button"
                  variant={parsedQty === qty ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-7 px-3"
                  onClick={() => setQuantityToMove(String(qty))}
                >
                  {qty === availableQty ? "Move All" : `Move ${qty}`}
                </Button>
              ))}
            </div>
            {/* Remaining display */}
            <p className="text-xs text-muted-foreground">
              Remaining after move: <span className="font-medium text-foreground">{remainingQty}</span>
            </p>
          </div>

          {/* Destination storage area */}
          <div className="space-y-1.5">
            <Label>Destination Storage Area</Label>
            <Select value={destSection} onValueChange={setDestSection}>
              <SelectTrigger>
                <SelectValue placeholder="Select storage area" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">No storage area</SelectItem>
                {storageAreas.map((area) => (
                  <SelectItem key={area} value={area}>{area}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Destination container */}
          <div className="space-y-1.5">
            <Label>Destination Container <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Select value={destContainerId} onValueChange={setDestContainerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select container" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No container</SelectItem>
                {containers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.box_number || c.description} — {c.container_type_name || "Container"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Validation error */}
          {validationError && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{validationError}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isMoving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleMove}
            disabled={isMoving || !!validationError}
          >
            {isMoving ? "Moving..." : `Move ${parsedQty} ${parsedQty === 1 ? "Item" : "Items"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
