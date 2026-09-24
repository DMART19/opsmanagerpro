import { useEffect, useState } from "react";
import { useTourMode } from "@/contexts/TourModeContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PhotoUpload } from "@/components/ui/photo-upload";
import { CacheInventoryItem, CACHE_INVENTORY_QUERY_KEY } from "@/hooks/use-cache-inventory";
import { useBoxes } from "@/hooks/use-boxes";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, AlertCircle, ChevronDown, Settings2, Tag, Fingerprint, Clock, Camera } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAssetAttributes, useAssetAttributeValues } from "@/hooks/use-asset-attributes";
import { AssetAttributes, validateAssetAttributes } from "./AssetAttributes";
import { TaxonomyCombobox } from "@/components/ui/taxonomy-combobox";
import { cn } from "@/lib/utils";

const inventoryItemSchema = z.object({
  description: z.string()
    .min(1, "Item name is required")
    .max(500, "Name must be less than 500 characters")
    .trim(),
  section: z.string().max(50).optional().or(z.literal("")),
  quantity_available: z.coerce.number().min(0).default(0),
  quantity_out: z.coerce.number().min(0).default(0),
  date_expire: z.string().optional().or(z.literal("")),
  item_id: z.string().max(100).optional().or(z.literal("")),
  reference_id: z.string().max(100).optional().or(z.literal("")),
  barcode: z.string().max(100).optional().or(z.literal("")),
  serial_number: z.string().max(100).optional().or(z.literal("")),
  model_part_num: z.string().max(100).optional().or(z.literal("")),
  group_year: z.coerce.number().min(2000).max(2099).optional().nullable(),
  is_internal: z.boolean().default(false),
  low_stock_threshold: z.coerce.number().min(0).optional().nullable(),
  critical_stock_threshold: z.coerce.number().min(0).optional().nullable(),
});

type InventoryItemFormData = z.infer<typeof inventoryItemSchema>;

interface CacheInventoryEditModalProps {
  item: CacheInventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (itemId: string) => void;
}

export const CacheInventoryEditModal = ({ item, open, onOpenChange, onSaved }: CacheInventoryEditModalProps) => {
  const { isTourMode } = useTourMode();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  const { attributes } = useAssetAttributes();
  const { valuesMap: existingAttrValues } = useAssetAttributeValues(item?.id || null);
  const { boxes } = useBoxes();

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [optionalOpen, setOptionalOpen] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);
  const [attributeValues, setAttributeValues] = useState<Record<string, string | null>>({});
  const [attributeErrors, setAttributeErrors] = useState<Record<string, string>>({});

  // Mobile accordion: only one section open at a time
  const [mobileSection, setMobileSection] = useState<string | null>(null);

  // FK state
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [statusId, setStatusId] = useState<string | null>(null);
  const [manufacturerId, setManufacturerId] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InventoryItemFormData>({
    resolver: zodResolver(inventoryItemSchema),
  });

  // When modal opens or item changes, sync all state
  useEffect(() => {
    if (!item || !open) return;

    reset({
      description: item.description || "",
      section: item.section || "",
      quantity_available: item.quantity_available || 0,
      quantity_out: item.quantity_out || 0,
      date_expire: item.date_expire || "",
      item_id: item.id_cache_fema || "",
      reference_id: item.id_cache_tf || "",
      barcode: item.barcode || "",
      serial_number: item.serial_number || "",
      model_part_num: item.model_part_num || "",
      group_year: item.group_year || null,
      is_internal: item.is_internal || false,
      low_stock_threshold: item.low_stock_threshold ?? null,
      critical_stock_threshold: item.critical_stock_threshold ?? null,
    });

    setImageUrl(item.image_url || null);
    setSelectedContainerId(item.container_id || null);
    setCategoryId(item.category_id || null);
    setStatusId(item.asset_status_id || null);
    setManufacturerId(item.manufacturer_id || null);
    setGroupId(item.asset_group_id || null);
    setAttributeErrors({});
    setMobileSection(null);
    // Reset custom field values — will be re-populated from DB below
    setAttributeValues({});

    // Auto-expand optional section if item has data in those fields
    const hasOptionalData = !!(
      item.date_expire || item.id_cache_fema || item.id_cache_tf ||
      item.barcode || item.serial_number || item.model_part_num ||
      item.group_year || item.is_internal || item.quantity_out
    );
    setOptionalOpen(hasOptionalData);

    const hasAlerts = !!(item.low_stock_threshold || item.critical_stock_threshold);
    setAlertsEnabled(hasAlerts);
  }, [item?.id, open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync attribute values when they load from DB (always sync, even when empty)
  useEffect(() => {
    if (existingAttrValues) {
      setAttributeValues(existingAttrValues);
    }
  }, [JSON.stringify(existingAttrValues)]); // eslint-disable-line react-hooks/exhaustive-deps

  const FieldError = ({ error }: { error?: { message?: string } }) => {
    if (!error?.message) return null;
    return (
      <p className="text-sm text-destructive mt-1 flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        {error.message}
      </p>
    );
  };

  const onSubmit = async (data: InventoryItemFormData) => {
    if (!item) return;

    const attrValidation = validateAssetAttributes(attributes, attributeValues);
    if (!attrValidation.isValid) {
      setAttributeErrors(attrValidation.errors);
      toast({
        title: "Validation Error",
        description: "Please fill in all required custom attributes",
        variant: "destructive",
      });
      return;
    }
    setAttributeErrors({});
    setIsSubmitting(true);

    try {
      const updatePayload = {
        description: data.description?.trim() || null,
        section: data.section?.trim() || null,
        quantity_available: data.quantity_available ?? 0,
        quantity_out: data.quantity_out ?? 0,
        date_expire: data.date_expire || null,
        id_cache_fema: data.item_id?.trim() || null,
        id_cache_tf: data.reference_id?.trim() || null,
        barcode: data.barcode?.trim() || null,
        serial_number: data.serial_number?.trim() || null,
        model_part_num: data.model_part_num?.trim() || null,
        group_year: data.group_year || null,
        is_internal: data.is_internal,
        low_stock_threshold: alertsEnabled ? data.low_stock_threshold : null,
        critical_stock_threshold: alertsEnabled ? data.critical_stock_threshold : null,
        image_url: imageUrl,
        container_id: selectedContainerId || null,
        category_id: categoryId || null,
        asset_status_id: statusId || null,
        manufacturer_id: manufacturerId || null,
        asset_group_id: groupId || null,
      };

      // Retry once on transient network errors
      let updatedRow: any = null;
      let lastError: any = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        const result = await supabase
          .from("cache_inventory")
          .update(updatePayload)
          .eq("id", item.id)
          .select()
          .single();
        
        if (!result.error) {
          updatedRow = result.data;
          lastError = null;
          break;
        }
        lastError = result.error;
        const msg = result.error.message || "";
        if (!msg.includes("Load failed") && !msg.includes("Failed to fetch") && !msg.includes("NetworkError")) break;
        await new Promise(r => setTimeout(r, 500));
      }

      if (lastError) throw lastError;
      if (!updatedRow) throw new Error("Update returned no data — row may not exist or RLS blocked the write.");

      // Save custom attribute values
      if (Object.keys(attributeValues).length > 0) {
        const { error: attrError } = await supabase
          .from("asset_attribute_values")
          .upsert(
            Object.entries(attributeValues).map(([attributeId, value]) => ({
              asset_id: item.id,
              attribute_id: attributeId,
              value: value ?? null,
            })),
            { onConflict: "asset_id,attribute_id" }
          );

        if (attrError) {
          console.error("Failed to save attribute values:", attrError);
          toast({
            title: "Warning",
            description: "Asset saved but custom fields may not have updated.",
            variant: "destructive",
          });
        }
      }

      await queryClient.invalidateQueries({ queryKey: CACHE_INVENTORY_QUERY_KEY });
      queryClient.refetchQueries({ queryKey: CACHE_INVENTORY_QUERY_KEY });

      if (isTourMode) {
        const { showDemoSaveToast } = await import("@/lib/demo-toast");
        showDemoSaveToast("Asset updated");
      } else {
        toast({
          title: "Item Updated",
          description: "Changes saved successfully",
        });
      }

      if (onSaved && item?.id) {
        onSaved(item.id);
      }

      onOpenChange(false);
    } catch (error: any) {
      const isNetworkError = error.message?.includes("Load failed") || error.message?.includes("Failed to fetch") || error.message?.includes("NetworkError");
      toast({
        title: "Update Failed",
        description: isNetworkError
          ? "Network connection issue. Please check your connection and try again."
          : (error.message || "An unexpected error occurred. Please try again."),
        variant: "destructive",
      });
      // Modal stays open — user input is preserved
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMobileSection = (section: string) => {
    setMobileSection(prev => prev === section ? null : section);
  };

  // ─── MOBILE QUICK EDIT ───
  const mobileFormContent = (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto -mx-4 px-4">
        <div className="space-y-3 pb-4">

          {/* ── PHOTO UPLOAD (hero position) ── */}
          <div className="flex justify-center -mx-4 px-4 py-3 bg-muted/30">
            <PhotoUpload
              value={imageUrl}
              onChange={setImageUrl}
              folder="assets"
              size="lg"
              placeholder="Tap to add photo"
            />
          </div>

          {/* ── HIGH-FREQUENCY FIELDS (always visible) ── */}
          <div className="space-y-2.5">
            <div>
              <Label htmlFor="m-description" className="text-xs font-medium text-muted-foreground">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="m-description"
                {...register("description")}
                placeholder="Item name"
                autoComplete="off"
                className={cn("h-10 text-sm border-0 border-b border-border rounded-none bg-transparent px-0 focus-visible:ring-0 focus-visible:border-primary", errors.description && "border-destructive")}
              />
              <FieldError error={errors.description} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="m-qty" className="text-xs font-medium text-muted-foreground">Qty Available</Label>
                <Input
                  id="m-qty"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  {...register("quantity_available")}
                  className="h-10 text-sm border-0 border-b border-border rounded-none bg-transparent px-0 focus-visible:ring-0 focus-visible:border-primary"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                <TaxonomyCombobox
                  table="asset_statuses"
                  value={statusId}
                  onChange={setStatusId}
                  placeholder="Select"
                  className="h-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="m-section" className="text-xs font-medium text-muted-foreground">Location</Label>
              <Input
                id="m-section"
                {...register("section")}
                placeholder="e.g., A-12, Building B"
                className="h-10 text-sm border-0 border-b border-border rounded-none bg-transparent px-0 focus-visible:ring-0 focus-visible:border-primary"
              />
            </div>
          </div>

          {/* ── ACCORDION SECTIONS ── */}

          {/* Classification */}
          <Collapsible open={mobileSection === "classification"} onOpenChange={() => toggleMobileSection("classification")}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="w-full flex items-center justify-between py-3 px-1 text-sm font-medium text-foreground border-b border-border"
              >
                <span className="flex items-center gap-2">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                  Classification
                </span>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", mobileSection === "classification" && "rotate-180")} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 pb-1 space-y-3 animate-in fade-in-0 duration-150">
              <div>
                <Label className="text-xs text-muted-foreground">Category</Label>
                <TaxonomyCombobox
                  table="custom_categories"
                  value={categoryId}
                  onChange={setCategoryId}
                  placeholder="Search or create"
                  userScoped={false}
                  className="h-10"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Container</Label>
                <Select
                  value={selectedContainerId || "none"}
                  onValueChange={(val) => setSelectedContainerId(val === "none" ? null : val)}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {boxes.map((box) => (
                      <SelectItem key={box.id} value={box.id}>
                        {box.box_number} — {box.cache_box_type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Group</Label>
                  <TaxonomyCombobox
                    table="asset_groups"
                    value={groupId}
                    onChange={setGroupId}
                    placeholder="Select group"
                    className="h-10"
                  />
                </div>
                <div>
                  <Label htmlFor="m-group-year" className="text-xs text-muted-foreground">Year</Label>
                  <Input
                    id="m-group-year"
                    type="number"
                    inputMode="numeric"
                    min="2000"
                    max="2099"
                    {...register("group_year")}
                    className="h-10"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 py-1">
                <Switch
                  id="m-internal"
                  checked={watch("is_internal")}
                  onCheckedChange={(checked) => setValue("is_internal", checked)}
                />
                <Label htmlFor="m-internal" className="cursor-pointer text-xs text-muted-foreground">Internal item</Label>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Identification */}
          <Collapsible open={mobileSection === "identification"} onOpenChange={() => toggleMobileSection("identification")}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="w-full flex items-center justify-between py-3 px-1 text-sm font-medium text-foreground border-b border-border"
              >
                <span className="flex items-center gap-2">
                  <Fingerprint className="h-3.5 w-3.5 text-muted-foreground" />
                  Identification
                </span>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", mobileSection === "identification" && "rotate-180")} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 pb-1 space-y-3 animate-in fade-in-0 duration-150">
              <div>
                <Label className="text-xs text-muted-foreground">Manufacturer</Label>
                <TaxonomyCombobox
                  table="manufacturers"
                  value={manufacturerId}
                  onChange={setManufacturerId}
                  placeholder="Search or create"
                  className="h-10"
                />
              </div>
              <div>
                <Label htmlFor="m-model" className="text-xs text-muted-foreground">Model / Part #</Label>
                <Input id="m-model" {...register("model_part_num")} placeholder="e.g., XPS-15" className="h-10" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="m-serial" className="text-xs text-muted-foreground">Serial Number</Label>
                  <Input id="m-serial" {...register("serial_number")} placeholder="Serial #" className="h-10" />
                </div>
                <div>
                  <Label htmlFor="m-barcode" className="text-xs text-muted-foreground">Barcode</Label>
                  <Input id="m-barcode" {...register("barcode")} placeholder="Barcode" className="h-10" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="m-item-id" className="text-xs text-muted-foreground">Item ID</Label>
                  <Input id="m-item-id" {...register("item_id")} placeholder="e.g., INV-001" className="h-10" />
                </div>
                <div>
                  <Label htmlFor="m-ref-id" className="text-xs text-muted-foreground">Reference ID</Label>
                  <Input id="m-ref-id" {...register("reference_id")} placeholder="Optional" className="h-10" />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Lifecycle */}
          <Collapsible open={mobileSection === "lifecycle"} onOpenChange={() => toggleMobileSection("lifecycle")}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="w-full flex items-center justify-between py-3 px-1 text-sm font-medium text-foreground border-b border-border"
              >
                <span className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  Lifecycle & Alerts
                </span>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", mobileSection === "lifecycle" && "rotate-180")} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 pb-1 space-y-3 animate-in fade-in-0 duration-150">
              <div>
                <Label htmlFor="m-expire" className="text-xs text-muted-foreground">Expiration Date</Label>
                <Input id="m-expire" type="date" {...register("date_expire")} className="h-10" />
              </div>
              <div>
                <Label htmlFor="m-qty-out" className="text-xs text-muted-foreground">Quantity Out</Label>
                <Input id="m-qty-out" type="number" inputMode="numeric" min="0" {...register("quantity_out")} className="h-10" />
              </div>
              <div className="p-3 border rounded-lg bg-muted/10">
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="m-alerts" className="cursor-pointer text-xs font-medium">Stock Alerts</Label>
                  <Switch id="m-alerts" checked={alertsEnabled} onCheckedChange={setAlertsEnabled} />
                </div>
                {alertsEnabled && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t animate-in fade-in-0 duration-150">
                    <div>
                      <Label className="text-xs text-warning">Low Stock</Label>
                      <Input type="number" inputMode="numeric" min="0" {...register("low_stock_threshold")} placeholder="e.g., 10" className="h-9" />
                    </div>
                    <div>
                      <Label className="text-xs text-destructive">Critical</Label>
                      <Input type="number" inputMode="numeric" min="0" {...register("critical_stock_threshold")} placeholder="e.g., 3" className="h-9" />
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Custom Attributes (if any) */}
          {attributes.length > 0 && (
            <Collapsible open={mobileSection === "attributes"} onOpenChange={() => toggleMobileSection("attributes")}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center justify-between py-3 px-1 text-sm font-medium text-foreground border-b border-border"
                >
                  <span className="flex items-center gap-2">
                    <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
                    Custom Fields
                  </span>
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", mobileSection === "attributes" && "rotate-180")} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 pb-1 animate-in fade-in-0 duration-150">
                <AssetAttributes
                  values={attributeValues}
                  onChange={setAttributeValues}
                  errors={attributeErrors}
                  allowClearValues
                />
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </div>

      {/* ── STICKY FOOTER ── */}
      <div className="flex gap-2 pt-3 pb-1 border-t bg-background shrink-0">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 h-11"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Save"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isSubmitting}
          className="h-11 px-6"
        >
          Cancel
        </Button>
      </div>
    </form>
  );

  // ─── DESKTOP FORM (unchanged) ───
  const desktopFormContent = (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto -mx-2 px-2">
        <div className="space-y-5 pb-6 px-1">

          {/* === PRIMARY FIELDS: Core Item Info === */}
          <div className="space-y-4">
            {/* Photo + Name Row */}
            <div className="flex gap-4">
              <PhotoUpload
                value={imageUrl}
                onChange={setImageUrl}
                folder="assets"
                size="lg"
                placeholder="Photo"
              />
              <div className="flex-1 space-y-2">
                <Label htmlFor="description" className="text-base">
                  Item Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="description"
                  {...register("description")}
                  placeholder="What is this item?"
                  autoComplete="off"
                  className={`h-12 text-base ${errors.description ? "border-destructive" : ""}`}
                />
                <FieldError error={errors.description} />
              </div>
            </div>

            {/* Quantity Available & Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity_available">Quantity Available</Label>
                <Input
                  id="quantity_available"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  {...register("quantity_available")}
                  className="h-11"
                />
              </div>
              <div>
                <Label>Status</Label>
                <TaxonomyCombobox
                  table="asset_statuses"
                  value={statusId}
                  onChange={setStatusId}
                  placeholder="Select status"
                  className="h-11"
                />
              </div>
            </div>

            {/* Category & Location */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>
                  Category <span className="text-muted-foreground text-xs font-normal">(optional)</span>
                </Label>
                <TaxonomyCombobox
                  table="custom_categories"
                  value={categoryId}
                  onChange={setCategoryId}
                  placeholder="Search or create category"
                  userScoped={false}
                  className="h-11"
                />
              </div>
              <div>
                <Label htmlFor="section">
                  Location <span className="text-muted-foreground text-xs font-normal">(optional)</span>
                </Label>
                <Input
                  id="section"
                  {...register("section")}
                  placeholder="e.g., A-12, Building B"
                  className="h-11"
                />
              </div>
            </div>

            {/* Container (Edit-only) */}
            <div>
              <Label>Container</Label>
              <Select
                value={selectedContainerId || "none"}
                onValueChange={(val) => setSelectedContainerId(val === "none" ? null : val)}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="No container" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No container</SelectItem>
                  {boxes.map((box) => (
                    <SelectItem key={box.id} value={box.id}>
                      {box.box_number} — {box.cache_box_type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* === CUSTOM FIELDS (always visible with inline creator) === */}
          <div className="p-4 border rounded-xl bg-muted/20">
            <AssetAttributes
              values={attributeValues}
              onChange={setAttributeValues}
              errors={attributeErrors}
              allowClearValues
            />
          </div>

          {/* === OPTIONAL TRACKING & AUTOMATION === */}
          <Collapsible open={optionalOpen} onOpenChange={setOptionalOpen}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-between p-4 h-auto text-muted-foreground hover:text-foreground border border-dashed rounded-xl"
              >
                <span className="font-medium">Optional Tracking & Automation</span>
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform",
                  optionalOpen && "rotate-180"
                )} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-5 pt-4">

              {/* Expiration Tracking */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                  Expiration Tracking
                </h4>
                <div>
                  <Label htmlFor="date_expire">Expiration Date</Label>
                  <Input
                    id="date_expire"
                    type="date"
                    {...register("date_expire")}
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Alerts trigger automatically 30, 14, and 7 days before expiration
                  </p>
                </div>
              </div>

              {/* Stock Alerts */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                  Stock Alerts
                </h4>
                <div className="p-4 border rounded-xl bg-muted/10">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <Label htmlFor="alerts_enabled" className="cursor-pointer font-medium">
                        Enable low stock alerts
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Get notified when quantity drops below thresholds
                      </p>
                    </div>
                    <Switch
                      id="alerts_enabled"
                      checked={alertsEnabled}
                      onCheckedChange={setAlertsEnabled}
                    />
                  </div>

                  {alertsEnabled && (
                    <div className="space-y-3 pt-3 border-t animate-in fade-in-0 duration-200">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="low_stock_threshold" className="text-warning text-xs">
                            Low Stock Warning
                          </Label>
                          <Input
                            id="low_stock_threshold"
                            type="number"
                            inputMode="numeric"
                            min="0"
                            {...register("low_stock_threshold")}
                            placeholder="e.g., 10"
                            className="h-10"
                          />
                        </div>
                        <div>
                          <Label htmlFor="critical_stock_threshold" className="text-destructive text-xs">
                            Critical Stock Alert
                          </Label>
                          <Input
                            id="critical_stock_threshold"
                            type="number"
                            inputMode="numeric"
                            min="0"
                            {...register("critical_stock_threshold")}
                            placeholder="e.g., 3"
                            className="h-10"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Alerts auto-resolve when stock is replenished
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Identification */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                  Identification
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="item_id">Item ID</Label>
                    <Input
                      id="item_id"
                      {...register("item_id")}
                      placeholder="e.g., INV-001"
                      className="h-11"
                    />
                  </div>
                  <div>
                    <Label htmlFor="barcode">Barcode</Label>
                    <Input
                      id="barcode"
                      {...register("barcode")}
                      placeholder="Scan or enter barcode"
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="serial_number">Serial Number</Label>
                    <Input
                      id="serial_number"
                      {...register("serial_number")}
                      placeholder="Unique serial number"
                      className="h-11"
                    />
                  </div>
                  <div>
                    <Label htmlFor="reference_id">Reference ID</Label>
                    <Input
                      id="reference_id"
                      {...register("reference_id")}
                      placeholder="Optional secondary ID"
                      className="h-11"
                    />
                  </div>
                </div>
              </div>

              {/* Product Details */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                  Product Details
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Manufacturer</Label>
                    <TaxonomyCombobox
                      table="manufacturers"
                      value={manufacturerId}
                      onChange={setManufacturerId}
                      placeholder="Search or create"
                      className="h-11"
                    />
                  </div>
                  <div>
                    <Label htmlFor="model_part_num">Model / Part #</Label>
                    <Input
                      id="model_part_num"
                      {...register("model_part_num")}
                      placeholder="e.g., XPS-15"
                      className="h-11"
                    />
                  </div>
                </div>
              </div>

              {/* Organization */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                  Organization
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Group</Label>
                    <TaxonomyCombobox
                      table="asset_groups"
                      value={groupId}
                      onChange={setGroupId}
                      placeholder="Search or create group"
                      className="h-11"
                    />
                  </div>
                  <div>
                    <Label htmlFor="group_year">Year</Label>
                    <Input
                      id="group_year"
                      type="number"
                      inputMode="numeric"
                      min="2000"
                      max="2099"
                      {...register("group_year")}
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quantity_out">Quantity Out</Label>
                    <Input
                      id="quantity_out"
                      type="number"
                      inputMode="numeric"
                      min="0"
                      {...register("quantity_out")}
                      className="h-11"
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="flex items-center gap-3 p-3 border rounded-xl bg-muted/10 w-full h-11">
                      <Switch
                        id="is_internal"
                        checked={watch("is_internal")}
                        onCheckedChange={(checked) => setValue("is_internal", checked)}
                      />
                      <Label htmlFor="is_internal" className="cursor-pointer text-sm">
                        Internal item
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex gap-3 pt-4 border-t bg-background justify-end">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-12"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isSubmitting}
          className="h-12"
        >
          Cancel
        </Button>
      </div>
    </form>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="h-[92vh] flex flex-col rounded-t-2xl"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {/* Compressed header */}
          <SheetHeader className="text-left pb-1 shrink-0">
            <SheetTitle className="text-base flex items-center gap-2">
              Quick Edit
            </SheetTitle>
            <SheetDescription className="sr-only">Edit asset details</SheetDescription>
          </SheetHeader>
          {mobileFormContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg max-h-[85vh] flex flex-col"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>Edit Item</DialogTitle>
          <DialogDescription>
            Update item details. Fields marked with <span className="font-medium">*</span> are required.
          </DialogDescription>
        </DialogHeader>
        {desktopFormContent}
      </DialogContent>
    </Dialog>
  );
};
