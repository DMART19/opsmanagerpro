import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CacheInventoryItem, CACHE_INVENTORY_QUERY_KEY } from "@/hooks/use-cache-inventory";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface DuplicateCacheItemModalProps {
  item: CacheInventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDuplicated: () => void;
}

export const DuplicateCacheItemModal = ({ 
  item, 
  open, 
  onOpenChange, 
  onDuplicated 
}: DuplicateCacheItemModalProps) => {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, watch, setValue } = useForm();
  const isInternal = watch("is_internal");

  useEffect(() => {
    if (item) {
      reset({
        id_cache_fema: item.id_cache_fema || "",
        id_cache_tf: item.id_cache_tf || "",
        barcode: "", // Clear barcode for duplicate
        section: item.section || "",
        subcategory: item.subcategory || "",
        description: `${item.description || ""} (Copy)`,
        manufacturer: item.manufacturer || "",
        model_part_num: item.model_part_num || "",
        serial_number: "", // Clear serial for duplicate
        date_expire: item.date_expire || "",
        quantity_out: 0,
        quantity_available: item.quantity_available,
        status_item: item.status_item || "IN",
        group_abbv: item.group_abbv || "",
        is_internal: item.is_internal,
        group_year: item.group_year || new Date().getFullYear(),
      });
    }
  }, [item, reset]);

  const onSubmit = async (data: any) => {
    try {
      // Get current user for RLS
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        toast({
          title: "Authentication Required",
          description: "Please log in to duplicate items",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("cache_inventory")
        .insert([{
          user_id: sessionData.session.user.id,
          id_cache_fema: data.id_cache_fema || null,
          id_cache_tf: data.id_cache_tf || null,
          barcode: data.barcode || null,
          section: data.section || null,
          subcategory: data.subcategory || null,
          description: data.description || null,
          manufacturer: data.manufacturer || null,
          model_part_num: data.model_part_num || null,
          serial_number: data.serial_number || null,
          date_expire: data.date_expire || null,
          quantity_out: parseInt(data.quantity_out) || 0,
          quantity_available: parseInt(data.quantity_available) || 0,
          status_item: data.status_item || null,
          group_abbv: data.group_abbv?.toUpperCase() || null,
          is_internal: data.is_internal || false,
          group_year: parseInt(data.group_year) || null,
        }]);

      if (error) throw error;

      // Invalidate cache to update dashboard and all consumers
      await queryClient.invalidateQueries({ queryKey: CACHE_INVENTORY_QUERY_KEY });

      toast({
        title: "Item duplicated",
        description: "New item created successfully",
      });

      onDuplicated();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Duplication failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Duplicate Inventory Item</DialogTitle>
          <DialogDescription>
            Review and edit the duplicated item before saving
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <ScrollArea className="h-[60vh] -mx-2 px-2">
            <div className="grid grid-cols-2 gap-4 px-1">
              <div>
                <Label htmlFor="id_cache_fema">Item ID</Label>
                <Input id="id_cache_fema" {...register("id_cache_fema")} placeholder="e.g., INV-001" />
              </div>

              <div>
                <Label htmlFor="id_cache_tf">Reference ID</Label>
                <Input id="id_cache_tf" {...register("id_cache_tf")} placeholder="Secondary identifier" />
              </div>

              <div>
                <Label htmlFor="barcode">Barcode (New)</Label>
                <Input 
                  id="barcode" 
                  {...register("barcode")} 
                  placeholder="Enter new barcode"
                />
              </div>

              <div>
                <Label htmlFor="section">Location / Section</Label>
                <Input id="section" {...register("section")} placeholder="e.g., A-12" />
              </div>

              <div>
                <Label htmlFor="subcategory">Category</Label>
                <Input id="subcategory" {...register("subcategory")} />
              </div>

              <div className="col-span-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" {...register("description")} autoComplete="off" />
              </div>

              <div>
                <Label htmlFor="manufacturer">Manufacturer</Label>
                <Input id="manufacturer" {...register("manufacturer")} />
              </div>

              <div>
                <Label htmlFor="model_part_num">Model/Part Number</Label>
                <Input id="model_part_num" {...register("model_part_num")} />
              </div>

              <div>
                <Label htmlFor="serial_number">Serial Number (New)</Label>
                <Input 
                  id="serial_number" 
                  {...register("serial_number")}
                  placeholder="Enter new serial number"
                />
              </div>

              <div>
                <Label htmlFor="date_expire">Expiration Date</Label>
                <Input id="date_expire" type="date" {...register("date_expire")} />
              </div>

              <div>
                <Label htmlFor="quantity_out">Quantity Out</Label>
                <Input id="quantity_out" type="number" {...register("quantity_out")} />
              </div>

              <div>
                <Label htmlFor="quantity_available">Quantity Available</Label>
                <Input id="quantity_available" type="number" {...register("quantity_available")} />
              </div>

              <div>
                <Label htmlFor="status_item">Status</Label>
                <select 
                  id="status_item" 
                  {...register("status_item")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="Available">Available</option>
                  <option value="In Use">In Use</option>
                  <option value="Under Service">Under Service</option>
                  <option value="Retired">Retired</option>
                </select>
              </div>

              <div>
                <Label htmlFor="group_abbv">Group</Label>
                <Input 
                  id="group_abbv" 
                  {...register("group_abbv")}
                  className="uppercase"
                  placeholder="e.g., TECH, OFFICE"
                  onChange={(e) => {
                    e.target.value = e.target.value.toUpperCase();
                  }}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_internal"
                  checked={isInternal}
                  onCheckedChange={(checked) => setValue("is_internal", checked)}
                />
                <Label htmlFor="is_internal" className="font-normal">Internal Item</Label>
              </div>

              <div>
                <Label htmlFor="group_year">Year</Label>
                <Input id="group_year" type="number" {...register("group_year")} />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Create Duplicate
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
