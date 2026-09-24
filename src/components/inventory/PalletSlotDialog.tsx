import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { PalletSlot } from "@/hooks/use-warehouse-sections";
import { useEquipment } from "@/hooks/use-equipment";
import { Badge } from "@/components/ui/badge";
import { Package, Box, AlertTriangle } from "lucide-react";

const formSchema = z.object({
  occupancy_status: z.string(),
  equipment_id: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface PalletSlotDialogProps {
  slot: PalletSlot | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PalletSlotDialog = ({
  slot,
  open,
  onClose,
  onSuccess,
}: PalletSlotDialogProps) => {
  const { equipment } = useEquipment();
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const availableEquipment = equipment.filter((e) => e.status === "available");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      occupancy_status: slot?.occupancy_status || "available",
      equipment_id: slot?.equipment_id || "",
      notes: "",
    },
  });

  useEffect(() => {
    if (slot && open) {
      form.reset({
        occupancy_status: slot.occupancy_status || "available",
        equipment_id: slot.equipment_id || "",
        notes: "",
      });
    }
  }, [slot, open, form]);

  const onSubmit = async (values: FormValues) => {
    if (!slot) return;

    try {
      setSaving(true);

      const updateData: any = {
        occupancy_status: values.occupancy_status,
        is_occupied: values.occupancy_status === "occupied",
        equipment_id: values.equipment_id || null,
        last_updated: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("pallet_slots")
        .update(updateData)
        .eq("id", slot.id);

      if (error) throw error;

      // Update equipment status if assigned
      if (values.equipment_id) {
        const { error: equipError } = await supabase
          .from("equipment")
          .update({ status: "in-use", location_in_warehouse: slot.slot_code })
          .eq("id", values.equipment_id);

        if (equipError) throw equipError;
      }

      toast({
        title: "✅ Slot updated successfully",
        description: `Slot ${slot.slot_code} has been updated.`,
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error updating slot:", error);
      toast({
        title: "Error updating slot",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveItem = async () => {
    if (!slot) return;

    try {
      setRemoving(true);

      // Remove equipment from slot
      if (slot.equipment_id) {
        await supabase
          .from("equipment")
          .update({ status: "available", location_in_warehouse: null })
          .eq("id", slot.equipment_id);
      }

      // Clear the slot
      const { error } = await supabase
        .from("pallet_slots")
        .update({
          occupancy_status: "available",
          is_occupied: false,
          equipment_id: null,
          shipment_item_id: null,
          last_updated: new Date().toISOString(),
        })
        .eq("id", slot.id);

      if (error) throw error;

      toast({
        title: "✅ Item removed",
        description: `Slot ${slot.slot_code} is now available.`,
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error removing item:", error);
      toast({
        title: "Error removing item",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRemoving(false);
    }
  };

  if (!slot) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#0D1321] flex items-center gap-2">
            <Package className="h-5 w-5 text-[#2F5FFF]" />
            Pallet Slot {slot.slot_code}
          </DialogTitle>
          <DialogDescription>
            Manage the contents and status of this pallet slot.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Status */}
          <div className="p-4 bg-[#F6F8FB] rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current Status</span>
              <Badge
                variant={slot.is_occupied ? "default" : "outline"}
                className="capitalize"
              >
                {slot.occupancy_status}
              </Badge>
            </div>
            {slot.equipment_id && (
              <div className="flex items-center gap-2 text-sm">
                <Box className="h-4 w-4 text-[#2F5FFF]" />
                <span>Equipment assigned</span>
              </div>
            )}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="occupancy_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="occupied">Occupied</SelectItem>
                        <SelectItem value="reserved">Reserved</SelectItem>
                        <SelectItem value="service">Service</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="equipment_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign Equipment (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select equipment" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {availableEquipment.map((eq) => (
                          <SelectItem key={eq.id} value={eq.id}>
                            {eq.name} - {eq.asset_tag}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="flex-col sm:flex-row gap-2">
                {slot.is_occupied && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRemoveItem}
                    disabled={removing || saving}
                    className="w-full sm:w-auto text-destructive hover:text-destructive"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    {removing ? "Removing..." : "Clear Slot"}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={saving || removing}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving || removing}
                  className="w-full sm:w-auto"
                >
                  {saving ? "Saving..." : "Update Slot"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
