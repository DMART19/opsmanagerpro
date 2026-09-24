import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useWarehouses } from "@/hooks/use-warehouses";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { WarehouseSection } from "@/hooks/use-warehouse-sections";

const formSchema = z.object({
  section_name: z.string().min(1, "Section name is required"),
  section_code: z.string().min(1, "Section code is required"),
  warehouse_id: z.string().optional(),
  section_type: z.string().optional(),
  row_count: z.number().min(1).optional(),
  bay_count: z.number().min(1).optional(),
  level_count: z.number().min(1).optional(),
  max_capacity: z.number().min(1, "Max capacity is required"),
  density_threshold_low: z.number().min(0).max(100),
  density_threshold_medium: z.number().min(0).max(100),
  gps_coordinates: z.string().optional(),
  floor_level: z.number().optional(),
  zone_grouping: z.string().optional(),
  label_color: z.string().optional(),
  default_pallet_type: z.string().optional(),
  temperature_controlled: z.boolean().optional(),
  access_restrictions: z.string().optional(),
  auto_density_alerts: z.boolean().optional(),
  maintenance_cycle_days: z.number().min(1).optional(),
  location_description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditWarehouseSectionModalProps {
  section: WarehouseSection | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditWarehouseSectionModal = ({
  section,
  open,
  onClose,
  onSuccess,
}: EditWarehouseSectionModalProps) => {
  const { warehouses, loading: warehousesLoading } = useWarehouses();
  const [saving, setSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (section && open) {
      // Convert zone_grouping array to comma-separated string
      const zoneString = section.zone_grouping?.join(", ") || "";
      
      form.reset({
        section_name: section.section_name,
        section_code: section.section_code,
        warehouse_id: section.warehouse_id || "",
        section_type: section.section_type || "General Storage",
        row_count: section.row_count || undefined,
        bay_count: section.bay_count || undefined,
        level_count: section.level_count || 1,
        max_capacity: section.max_capacity,
        density_threshold_low: section.density_threshold_low || 60,
        density_threshold_medium: section.density_threshold_medium || 80,
        gps_coordinates: section.gps_coordinates || "",
        floor_level: section.floor_level || 1,
        zone_grouping: zoneString,
        label_color: section.label_color || "#2F5FFF",
        default_pallet_type: section.default_pallet_type || "Standard 48x40",
        temperature_controlled: section.temperature_controlled || false,
        access_restrictions: section.access_restrictions || "All Users",
        auto_density_alerts: section.auto_density_alerts ?? true,
        maintenance_cycle_days: section.maintenance_cycle_days || 30,
        location_description: section.location_description || "",
      });
    }
  }, [section, open, form]);

  const watchedValues = form.watch();

  const onSubmit = async (values: FormValues) => {
    if (!section) return;

    try {
      setSaving(true);

      // Prepare zone grouping as array
      const zoneArray = values.zone_grouping
        ? values.zone_grouping.split(",").map((z) => z.trim())
        : [];

      const { error } = await supabase
        .from("warehouse_sections")
        .update({
          section_name: values.section_name,
          section_code: values.section_code,
          warehouse_id: values.warehouse_id || null,
          section_type: values.section_type,
          row_count: values.row_count,
          bay_count: values.bay_count,
          level_count: values.level_count,
          max_capacity: values.max_capacity,
          density_threshold_low: values.density_threshold_low,
          density_threshold_medium: values.density_threshold_medium,
          gps_coordinates: values.gps_coordinates || null,
          floor_level: values.floor_level || 1,
          zone_grouping: zoneArray.length > 0 ? zoneArray : null,
          label_color: values.label_color,
          default_pallet_type: values.default_pallet_type,
          temperature_controlled: values.temperature_controlled,
          access_restrictions: values.access_restrictions,
          auto_density_alerts: values.auto_density_alerts,
          maintenance_cycle_days: values.maintenance_cycle_days,
          location_description: values.location_description || null,
        })
        .eq("id", section.id);

      if (error) throw error;

      toast({
        title: "✅ Section updated successfully",
        description: `Section ${values.section_code} has been updated.`,
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error updating section:", error);
      toast({
        title: "Error updating section",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!section) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#0D1321]">
            Edit Section {section.section_code}
          </DialogTitle>
          <DialogDescription>
            Update section details and operational settings.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Details */}
            <Card className="p-6 bg-[#F6F8FB]">
              <h3 className="text-lg font-semibold mb-4 text-[#0D1321]">Basic Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="section_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Section Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., North Wing Storage" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="section_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Section Code / ID *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., A-12" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="warehouse_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Warehouse / Site</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select warehouse" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {warehousesLoading ? (
                            <SelectItem value="loading" disabled>
                              Loading...
                            </SelectItem>
                          ) : (
                            warehouses.map((w) => (
                              <SelectItem key={w.id} value={w.id}>
                                {w.name} ({w.code})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="section_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Section Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="General Storage">General Storage</SelectItem>
                          <SelectItem value="Cold Storage">Cold Storage</SelectItem>
                          <SelectItem value="HazMat">HazMat</SelectItem>
                          <SelectItem value="Equipment">Equipment</SelectItem>
                          <SelectItem value="Staging">Staging</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="max_capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Pallet Capacity *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location_description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location Description</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Near loading dock" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="mt-4">
                <FormLabel className="mb-2 block">
                  Density Thresholds (Low: {watchedValues.density_threshold_low}%, Medium:{" "}
                  {watchedValues.density_threshold_medium}%+)
                </FormLabel>
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="density_threshold_low"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium min-w-20">Low &lt;</span>
                          <FormControl>
                            <Slider
                              min={0}
                              max={100}
                              step={5}
                              value={[field.value]}
                              onValueChange={(vals) => field.onChange(vals[0])}
                              className="flex-1"
                            />
                          </FormControl>
                          <span className="text-sm font-semibold min-w-12">{field.value}%</span>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="density_threshold_medium"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium min-w-20">Medium &lt;</span>
                          <FormControl>
                            <Slider
                              min={0}
                              max={100}
                              step={5}
                              value={[field.value]}
                              onValueChange={(vals) => field.onChange(vals[0])}
                              className="flex-1"
                            />
                          </FormControl>
                          <span className="text-sm font-semibold min-w-12">{field.value}%</span>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </Card>

            {/* Operational Settings */}
            <Card className="p-6 bg-[#F6F8FB]">
              <h3 className="text-lg font-semibold mb-4 text-[#0D1321]">Operational Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="default_pallet_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Pallet Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Standard 48x40">Standard 48x40</SelectItem>
                          <SelectItem value="Euro Pallet">Euro Pallet</SelectItem>
                          <SelectItem value="Custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="access_restrictions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Access Restrictions</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="All Users">All Users</SelectItem>
                          <SelectItem value="Technicians">Technicians</SelectItem>
                          <SelectItem value="Admins Only">Admins Only</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maintenance_cycle_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maintenance Cycle (days)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="floor_level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Floor Level</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="temperature_controlled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Temperature Controlled</FormLabel>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="auto_density_alerts"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Auto Density Alerts</FormLabel>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </Card>

            <Separator />

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Update Section"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
