import { useState, useMemo, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { useWarehouses } from "@/hooks/use-warehouses";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Grid3x3, Eye, EyeOff, Plus } from "lucide-react";
import { AddWarehouseDialog } from "./AddWarehouseDialog";

const formSchema = z.object({
  section_name: z.string().min(1, "Section name is required"),
  section_code: z.string().min(1, "Section code is required"),
  warehouse_id: z.string().min(1, "Warehouse is required"),
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
});

type FormValues = z.infer<typeof formSchema>;

interface AddWarehouseSectionModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddWarehouseSectionModal = ({
  open,
  onClose,
  onSuccess,
}: AddWarehouseSectionModalProps) => {
  const { warehouses, loading: warehousesLoading, refetch: refetchWarehouses } = useWarehouses();
  const [showPreview, setShowPreview] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveAndAddAnother, setSaveAndAddAnother] = useState(false);
  const [addWarehouseOpen, setAddWarehouseOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      section_name: "",
      section_code: "",
      warehouse_id: "",
      section_type: "General Storage",
      row_count: 4,
      bay_count: 6,
      level_count: 1,
      max_capacity: 24,
      density_threshold_low: 60,
      density_threshold_medium: 80,
      gps_coordinates: "",
      floor_level: 1,
      zone_grouping: "",
      label_color: "#2F5FFF",
      default_pallet_type: "Standard 48x40",
      temperature_controlled: false,
      access_restrictions: "All Users",
      auto_density_alerts: true,
      maintenance_cycle_days: 30,
    },
  });

  // Auto-generate section code
  useEffect(() => {
    if (open && !form.getValues("section_code")) {
      const generateCode = async () => {
        const { data, error } = await supabase
          .from("warehouse_sections")
          .select("section_code")
          .order("created_at", { ascending: false })
          .limit(1);

        if (!error && data && data.length > 0) {
          const lastCode = data[0].section_code;
          const match = lastCode.match(/([A-Z]+)-(\d+)/);
          if (match) {
            const prefix = match[1];
            const number = parseInt(match[2]) + 1;
            form.setValue("section_code", `${prefix}-${number}`);
          } else {
            form.setValue("section_code", "A-1");
          }
        } else {
          form.setValue("section_code", "A-1");
        }
      };
      generateCode();
    }
  }, [open, form]);

  const watchedValues = form.watch();
  const rowCount = watchedValues.row_count || 0;
  const bayCount = watchedValues.bay_count || 0;
  const levelCount = watchedValues.level_count || 1;

  // Calculate max capacity from rows × bays × levels
  useEffect(() => {
    if (rowCount > 0 && bayCount > 0 && levelCount > 0) {
      const calculatedCapacity = rowCount * bayCount * levelCount;
      form.setValue("max_capacity", calculatedCapacity);
    }
  }, [rowCount, bayCount, levelCount, form]);

  const previewGrid = useMemo(() => {
    if (!showPreview || rowCount === 0 || bayCount === 0) return null;

    const totalSlots = rowCount * bayCount;
    return Array.from({ length: totalSlots });
  }, [showPreview, rowCount, bayCount]);

  const selectedWarehouse = useMemo(() => {
    return warehouses.find((w) => w.id === watchedValues.warehouse_id);
  }, [warehouses, watchedValues.warehouse_id]);

  const onSubmit = async (values: FormValues) => {
    try {
      setSaving(true);

      // Prepare zone grouping as array
      const zoneArray = values.zone_grouping
        ? values.zone_grouping.split(",").map((z) => z.trim())
        : [];

      const { error } = await supabase.from("warehouse_sections").insert({
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
      });

      if (error) throw error;

      toast({
        title: "✅ Section added successfully",
        description: `Section ${values.section_code} has been created.`,
      });

      if (saveAndAddAnother) {
        form.reset();
        setSaveAndAddAnother(false);
      } else {
        onSuccess();
        onClose();
      }
    } catch (error: any) {
      console.error("Error adding section:", error);
      toast({
        title: "Error adding section",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#0D1321]">
            Add New Warehouse Section
          </DialogTitle>
          <DialogDescription>
            Define a new area or zone for pallet tracking and density monitoring.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Section 1: Basic Details */}
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
                      <FormLabel>Location *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {warehousesLoading ? (
                            <SelectItem value="loading" disabled>
                              Loading...
                            </SelectItem>
                          ) : warehouses.length === 0 ? (
                            <>
                              <SelectItem value="none" disabled>
                                No locations available
                              </SelectItem>
                              <Separator className="my-1" />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start gap-2 text-primary"
                                onClick={() => setAddWarehouseOpen(true)}
                              >
                                <Plus className="h-4 w-4" />
                                Add New Location
                              </Button>
                            </>
                          ) : (
                            <>
                              {warehouses.map((w) => (
                                <SelectItem key={w.id} value={w.id}>
                                  {w.name} ({w.code})
                                </SelectItem>
                              ))}
                              <Separator className="my-1" />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start gap-2 text-primary"
                                onClick={() => setAddWarehouseOpen(true)}
                              >
                                <Plus className="h-4 w-4" />
                                Add New Location
                              </Button>
                            </>
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
                  name="row_count"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Row Count</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? undefined : parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bay_count"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bay Count</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? undefined : parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="level_count"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Level Count (optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? undefined : parseInt(e.target.value))}
                        />
                      </FormControl>
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
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value === "" ? undefined : parseInt(e.target.value))}
                        />
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
                <div className="flex gap-4 mt-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded" />
                    <span>Low (&lt;{watchedValues.density_threshold_low}%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-400 rounded" />
                    <span>
                      Medium ({watchedValues.density_threshold_low}–
                      {watchedValues.density_threshold_medium - 1}%)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#2F5FFF] rounded" />
                    <span>High ({watchedValues.density_threshold_medium}%+)</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Section 2: Layout Visualization */}
            <Card className="p-6 bg-[#F6F8FB]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#0D1321]">Layout Visualization</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Live Preview</span>
                  <Switch checked={showPreview} onCheckedChange={setShowPreview} />
                  {showPreview ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </div>
              </div>

              {showPreview && previewGrid ? (
                <div className="space-y-4">
                  <div className="border rounded-lg p-4 bg-muted/20">
                    <div
                      className="grid gap-2"
                      style={{
                        gridTemplateColumns: `repeat(${bayCount}, minmax(0, 1fr))`,
                      }}
                    >
                      {previewGrid.map((_, index) => (
                        <TooltipProvider key={index}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="aspect-square border-2 border-muted rounded bg-muted/20 hover:border-[#2F5FFF] transition-colors cursor-pointer flex items-center justify-center">
                                <Grid3x3 className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-xs space-y-1">
                                <p>Pallet ID: —</p>
                                <p>Status: Empty</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>
                      {rowCount} rows × {bayCount} bays × {levelCount} level(s) = {rowCount * bayCount * levelCount} total
                      slots
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Preview disabled. Toggle to view layout.</p>
                </div>
              )}
            </Card>

            {/* Section 3: Location & Mapping */}
            <Card className="p-6 bg-[#F6F8FB]">
              <h3 className="text-lg font-semibold mb-4 text-[#0D1321]">Location & Mapping</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="gps_coordinates"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GPS Coordinates / Address</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 40.7128, -74.0060" {...field} />
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
                      <FormLabel>Floor / Level Name</FormLabel>
                      <Select
                        onValueChange={(v) => field.onChange(parseInt(v))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">Ground</SelectItem>
                          <SelectItem value="2">Mezzanine</SelectItem>
                          <SelectItem value="3">Upper</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="zone_grouping"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zone Grouping (comma-separated)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Outbound, Returns, Maintenance" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="label_color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Label / Marker Color</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input type="color" {...field} className="w-20 h-10" />
                        </FormControl>
                        <Input value={field.value} onChange={field.onChange} className="flex-1" />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Card>

            {/* Section 4: Operational Settings */}
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

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="temperature_controlled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
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
                      <FormItem className="flex items-center space-x-3 space-y-0 rounded-lg border p-3">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Auto Density Alerts</FormLabel>
                          <p className="text-xs text-muted-foreground">
                            Enable alerts when capacity exceeds 80%
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </Card>

            {/* Section 5: Summary & Actions */}
            <Card className="p-6 bg-card border-2">
              <h3 className="text-lg font-semibold mb-4 text-[#0D1321]">Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Section Name</p>
                  <p className="font-semibold">{watchedValues.section_name || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Warehouse</p>
                  <p className="font-semibold">{selectedWarehouse?.name || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <p className="font-semibold">{watchedValues.section_type || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Dimensions</p>
                  <p className="font-semibold">
                    {rowCount} × {bayCount} × {levelCount}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Capacity</p>
                  <p className="font-semibold">{watchedValues.max_capacity} pallets</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Alerts Enabled</p>
                  <Badge variant={watchedValues.auto_density_alerts ? "default" : "secondary"}>
                    {watchedValues.auto_density_alerts ? "Yes" : "No"}
                  </Badge>
                </div>
              </div>
            </Card>

            <Separator />

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setSaveAndAddAnother(true);
                  form.handleSubmit(onSubmit)();
                }}
                disabled={saving}
              >
                Save & Add Another
              </Button>
              <Button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700">
                {saving ? "Saving..." : "Save Section"}
              </Button>
            </div>
          </form>
        </Form>

        {/* Add Warehouse Dialog */}
        <AddWarehouseDialog
          open={addWarehouseOpen}
          onClose={() => setAddWarehouseOpen(false)}
          onSuccess={(warehouseId) => {
            refetchWarehouses();
            form.setValue("warehouse_id", warehouseId);
          }}
        />
      </DialogContent>
    </Dialog>
  );
};
