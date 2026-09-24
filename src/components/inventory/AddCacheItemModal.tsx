import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSoftRequired } from "@/hooks/use-soft-required";

import { SoftRequiredPrompt } from "@/components/ui/soft-required-prompt";
import { useNavigate } from "react-router-dom";
import { useDemoPath } from "@/hooks/use-demo-path";
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
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { PhotoUpload } from "@/components/ui/photo-upload";
import { toast } from "@/hooks/use-toast";
import { useInventoryData } from "@/hooks/use-inventory-data";
import { 
  Loader2, 
  ChevronDown, 
  Settings2,
  CheckCircle2,
  Box,
  ScanLine,
  AlertTriangle,
} from "lucide-react";
import { useAssetAttributes } from "@/hooks/use-asset-attributes";
import { AssetAttributes, validateAssetAttributes } from "./AssetAttributes";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useGuidanceContext } from "@/contexts/GuidanceContext";
import { TaxonomyCombobox } from "@/components/ui/taxonomy-combobox";
import { LocationCombobox } from "@/components/ui/location-combobox";
import { AutoSuggestInput } from "@/components/ui/auto-suggest-input";
import { useFieldSuggestions } from "@/hooks/use-field-suggestions";
import { CacheInventoryItem } from "@/hooks/use-cache-inventory";
import { BarcodeScannerDrawer } from "./BarcodeScannerDrawer";

// Simplified validation schema - only Name is truly required
const inventoryItemSchema = z.object({
  description: z.string()
    .min(1, "Item name is required")
    .max(500, "Name must be less than 500 characters")
    .trim(),
  section: z.string().max(50).optional().or(z.literal("")),
  quantity_available: z.coerce.number().min(0).default(1),
  quantity_out: z.coerce.number().min(0).default(0),
  // Lifecycle fields
  date_expire: z.string().optional().or(z.literal("")),
  // Identification fields
  item_id: z.string().max(100).optional().or(z.literal("")),
  reference_id: z.string().max(100).optional().or(z.literal("")),
  barcode: z.string().max(100).optional().or(z.literal("")),
  serial_number: z.string().max(100).optional().or(z.literal("")),
  // Product details
  model_part_num: z.string().max(100).optional().or(z.literal("")),
  // Organization
  group_year: z.coerce.number().min(2000).max(2099).optional().nullable(),
  is_internal: z.boolean().default(false),
  // Stock thresholds for alerts (optional, rule-based)
  low_stock_threshold: z.coerce.number().min(0).optional().nullable(),
  critical_stock_threshold: z.coerce.number().min(0).optional().nullable(),
});

type InventoryItemFormData = z.infer<typeof inventoryItemSchema>;

interface AddCacheItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
  defaultContainerId?: string | null;
  prefillBarcode?: string | null;
}

export const AddCacheItemModal = ({ open, onOpenChange, onAdded, defaultContainerId, prefillBarcode }: AddCacheItemModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { getPath } = useDemoPath();
  
  const { addItem, isDemoMode, items } = useInventoryData();
  const guidance = useGuidanceContext();
  
  const [optionalOpen, setOptionalOpen] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  
  const { attributes } = useAssetAttributes();
  const descriptionSuggestions = useFieldSuggestions("description");
  const modelSuggestions = useFieldSuggestions("model_part_num");
  const serialSuggestions = useFieldSuggestions("serial_number");
  const [attributeValues, setAttributeValues] = useState<Record<string, string | null>>({});
  const [attributeErrors, setAttributeErrors] = useState<Record<string, string>>({});

  // Scanner state
  const [scannerOpen, setScannerOpen] = useState(false);
  const [duplicateItem, setDuplicateItem] = useState<CacheInventoryItem | null>(null);
  const [showDuplicateAlert, setShowDuplicateAlert] = useState(false);

  // FK state for taxonomy fields — initialize from last-used defaults
  const DEFAULTS_KEY = "add-item-defaults";
  const getSavedDefaults = useCallback(() => {
    try {
      const raw = localStorage.getItem(DEFAULTS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }, []);

  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [statusId, setStatusId] = useState<string | null>(null);
  const [manufacturerId, setManufacturerId] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);

  // (defaults applied after useForm below)

  // Refs for focusing soft-required fields
  const categoryRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  
  const { 
    register, 
    handleSubmit, 
    reset, 
    watch, 
    setValue, 
    formState: { errors } 
  } = useForm<InventoryItemFormData>({
    resolver: zodResolver(inventoryItemSchema),
    mode: "onChange",
    defaultValues: {
      description: "",
      section: "",
      quantity_available: 1,
      quantity_out: 0,
      date_expire: "",
      item_id: "",
      reference_id: "",
      barcode: "",
      serial_number: "",
      model_part_num: "",
      is_internal: false,
      group_year: new Date().getFullYear(),
      low_stock_threshold: null,
      critical_stock_threshold: null,
    }
  });

  // Reset form to clean state every time modal opens
  useEffect(() => {
    if (open) {
      resetForm();
      // Re-apply last-used defaults (category/status/section) for convenience
      const defaults = getSavedDefaults();
      if (defaults.categoryId) setCategoryId(defaults.categoryId);
      if (defaults.statusId) setStatusId(defaults.statusId);
      if (defaults.section) setValue("section", defaults.section);
      // Apply prefill barcode from scan-to-search
      if (prefillBarcode) {
        setValue("barcode", prefillBarcode);
        setOptionalOpen(true);
      }
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const resetForm = () => {
    reset();
    setAttributeValues({});
    setAttributeErrors({});
    setOptionalOpen(false);
    setAlertsEnabled(false);
    setImageUrl(null);
    setCategoryId(null);
    setStatusId(null);
    setManufacturerId(null);
    setGroupId(null);
    setDuplicateItem(null);
    setShowDuplicateAlert(false);
  };

  // Handle barcode scan result from BarcodeScannerDrawer
  const handleScanResult = useCallback(async (item: CacheInventoryItem) => {
    // Item was found — it's a duplicate
    const code = item.barcode || item.serial_number || item.id_cache_fema || "";
    setDuplicateItem(item);
    setShowDuplicateAlert(true);
    // Pre-fill barcode in case user chooses "Create New Anyway"
    setValue("barcode", code);
  }, [setValue]);

  // When scanner finds no match, it calls onItemFound with a synthetic item — 
  // Instead we use a dedicated "not found" handler
  const handleScanNotFound = useCallback((code: string) => {
    console.log("[AddItem] Barcode scanned, no match. Auto-filling barcode field:", code);
    // Auto-fill barcode field
    setValue("barcode", code);
    // Open More Options so barcode is visible
    setOptionalOpen(true);
    toast({
      title: "Barcode scanned",
      description: `Code "${code}" added. No existing item matched.`,
    });
  }, [setValue]);

  const handleOpenDuplicateItem = () => {
    if (!duplicateItem) return;
    setShowDuplicateAlert(false);
    onOpenChange(false);
    resetForm();
    navigate(getPath(`/inventory?item=${duplicateItem.id}`));
  };

  const handleCreateNewAnyway = () => {
    setShowDuplicateAlert(false);
    setDuplicateItem(null);
    // barcode is already pre-filled, open More Options so user sees it
    setOptionalOpen(true);
  };

  // Soft-required fields for assets
  const sectionValue = watch("section");
  const softRequiredFields = useMemo(() => [
    {
      key: "category",
      label: "Category",
      hint: "Adding a category improves filtering and reporting.",
      defaultValue: "__skip__", // handled via taxonomy
      value: categoryId,
    },
    {
      key: "location",
      label: "Location",
      hint: "Adding a location helps track where items are stored.",
      defaultValue: "No Location",
      value: sectionValue,
    },
  ], [categoryId, sectionValue]);

  const softRequired = useSoftRequired(softRequiredFields);

  // Pending submit data for after soft-required prompt
  const pendingSubmitRef = useRef<InventoryItemFormData | null>(null);

  const handleFormSubmit = (data: InventoryItemFormData) => {
    pendingSubmitRef.current = data;
    if (!softRequired.checkBeforeSave()) return;
    doSubmit(data);
  };

  const handleSoftAddNow = () => {
    softRequired.handleAddNow();
    // Open the "More Options" section so the user can see the fields
    setOptionalOpen(true);
    const firstMissing = softRequired.missingFields[0];
    setTimeout(() => {
      if (firstMissing?.key === "category") {
        categoryRef.current?.querySelector("button")?.focus();
      } else if (firstMissing?.key === "location") {
        sectionRef.current?.querySelector("button")?.click();
      }
    }, 250);
  };

  const handleSoftSkip = () => {
    const defaults = softRequired.handleSkip();
    const data = pendingSubmitRef.current;
    if (!data) return;
    // Apply defaults
    if (defaults.location && !data.section) {
      data.section = defaults.location;
    }
    doSubmit(data);
  };

  const doSubmit = async (data: InventoryItemFormData) => {
    if (!isDemoMode) {
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
    }
    setAttributeErrors({});

    setIsSubmitting(true);
    
    try {
      console.log("[AddItem] Submitting with barcode:", data.barcode || "(none)");
      const result = await addItem({
        description: data.description.trim(),
        section: data.section?.trim() || null,
        quantity_available: data.quantity_available ?? 1,
        quantity_out: data.quantity_out ?? 0,
        date_expire: data.date_expire || null,
        id_cache_fema: data.item_id?.trim() || null,
        id_cache_tf: data.reference_id?.trim() || null,
        barcode: data.barcode?.trim() || null,
        serial_number: data.serial_number?.trim() || null,
        model_part_num: data.model_part_num?.trim() || null,
        group_year: data.group_year || null,
        is_internal: data.is_internal || false,
        low_stock_threshold: alertsEnabled ? data.low_stock_threshold : null,
        critical_stock_threshold: alertsEnabled ? data.critical_stock_threshold : null,
        image_url: imageUrl,
        container_id: defaultContainerId || null,
        // FK IDs
        category_id: categoryId,
        asset_status_id: statusId,
        manufacturer_id: manufacturerId,
        asset_group_id: groupId,
      });

      if (!result) {
        setIsSubmitting(false);
        return;
      }

      // Save custom field values for the newly created asset
      const nonEmptyValues = Object.entries(attributeValues).filter(
        ([_, v]) => v != null && v !== ""
      );
      if (!isDemoMode && nonEmptyValues.length > 0 && result.id) {
        const { error: attrError } = await supabase
          .from("asset_attribute_values")
          .upsert(
            nonEmptyValues.map(([attributeId, value]) => ({
              asset_id: result.id,
              attribute_id: attributeId,
              value: value ?? null,
            })),
            { onConflict: "asset_id,attribute_id" }
          );

        if (attrError) {
          console.error("Failed to save attribute values:", attrError);
        }
      }

      // Persist last-used defaults for next time
      try {
        localStorage.setItem(DEFAULTS_KEY, JSON.stringify({
          categoryId,
          statusId,
          section: data.section?.trim() || null,
        }));
      } catch { /* ignore storage errors */ }

      // Notify guidance engine
      guidance.recordCompletion("has_item");
      if (defaultContainerId) guidance.recordCompletion("has_assignment");

      const isFirstAsset = !isDemoMode && items.length === 0;
      const createdId = result.id;
      const createdName = data.description;

      // Clear only the name + unique identifiers, retain category/location/qty/etc.
      const retainAndReopen = () => {
        setValue("description", "");
        setValue("barcode", "");
        setValue("serial_number", "");
        setValue("item_id", "");
        setValue("reference_id", "");
        setImageUrl(null);
        // Re-open the modal
        onOpenChange(true);
        // Focus name field after a tick
        setTimeout(() => {
          document.getElementById("description")?.focus();
        }, 300);
      };

      if (isDemoMode) {
        const { showDemoSaveToast } = await import("@/lib/demo-toast");
        showDemoSaveToast("Asset added");
      } else if (isFirstAsset) {
        toast({
          title: (
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Great — your first asset has been added!
            </span>
          ) as any,
          description: (
            <span className="flex items-center justify-between gap-2">
              <span>Now create a container to organize assets.</span>
              <button
                onClick={() => navigate(getPath("/inventory"))}
                className="inline-flex items-center gap-1 text-primary font-medium hover:underline whitespace-nowrap"
              >
                <Box className="h-3.5 w-3.5" />
                Create Container
              </button>
            </span>
          ) as any,
          duration: 8000,
        });
      } else {
        toast({
          title: (
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <span className="font-semibold">Item Added</span>
            </span>
          ) as any,
          description: (
            <div className="flex flex-col gap-2.5 pt-0.5">
              <span className="text-sm text-muted-foreground truncate">"{createdName}"</span>
              <div className="flex gap-2">
                <button
                  onClick={retainAndReopen}
                  className="flex-1 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium transition-all active:scale-[0.97] hover:opacity-90"
                >
                  Add Another
                </button>
                <button
                  onClick={() => navigate(getPath(`/inventory?highlight=${createdId}`))}
                  className="flex-1 h-8 px-3 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium transition-all active:scale-[0.97] hover:opacity-90"
                >
                  View Item
                </button>
              </div>
            </div>
          ) as any,
          duration: 6000,
          className: "!rounded-2xl !shadow-[0_8px_30px_-4px_hsl(var(--foreground)/0.12)] !border-border/50 !p-4 animate-in slide-in-from-top-2 fade-in-0 duration-300",
        });
      }

      resetForm();
      onAdded();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Add item error:", error);
      toast({
        title: "Failed to Add Item",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  const formContent = (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey && (e.target as HTMLElement).tagName !== "TEXTAREA") {
          const target = e.target as HTMLInputElement;
          // Enter on Item Name → move to Quantity
          if (target.id === "description") {
            e.preventDefault();
            const qtyInput = e.currentTarget.querySelector<HTMLInputElement>("#quantity_available");
            qtyInput?.focus();
            qtyInput?.select();
            return;
          }
          // Enter on Quantity → submit
          if (target.id === "quantity_available") {
            e.preventDefault();
            const descVal = e.currentTarget.querySelector<HTMLInputElement>("#description")?.value;
            if (descVal?.trim()) {
              handleSubmit(handleFormSubmit)();
            }
            return;
          }
        }
      }}
      className="flex flex-col flex-1 min-h-0 overflow-hidden"
    >
      <div className={`flex-1 min-h-0 overflow-y-auto ${isMobile ? "-mx-6 px-6" : "-mx-2 px-2"}`}>
        <div className="space-y-2 pb-4 px-1">
          
          {/* === PHOTO (optional, compact) === */}
          <PhotoUpload
            value={imageUrl}
            onChange={setImageUrl}
            folder="assets"
            size="lg"
            placeholder="Photo"
          />

          {/* === PRIMARY ROW: Name + Scan | Qty with steppers === */}
          <div className="flex gap-2 items-start">
            <div className="flex-[7] min-w-0 flex items-start gap-1.5">
              <div className="flex-1 min-w-0">
                <AutoSuggestInput
                  id="description"
                  suggestions={descriptionSuggestions}
                  value={watch("description") || ""}
                  onChange={(v) => setValue("description", v, { shouldValidate: true })}
                  placeholder="Item name"
                  autoCorrect="off"
                  className={cn(
                    "h-12 text-base border-0 border-b border-border/40 rounded-none px-0",
                    "focus-visible:ring-0 focus-visible:border-primary/60 focus-visible:shadow-none",
                    "placeholder:text-muted-foreground/40",
                    errors.description && "border-destructive/60"
                  )}
                  autoFocus
                />
                {errors.description?.message && (
                  <p className="text-xs text-destructive mt-1">{errors.description.message}</p>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-12 w-12 shrink-0 rounded-xl border-border/30 bg-muted/20 hover:bg-primary/10 hover:border-primary/30 active:scale-[0.95] transition-all duration-150"
                onClick={() => setScannerOpen(true)}
                title="Scan barcode"
              >
                <ScanLine className="h-5 w-5 text-primary" />
              </Button>
            </div>
            <div className="flex-[3] shrink-0 flex items-center gap-0.5">
              <button
                type="button"
                className="h-12 w-9 flex items-center justify-center rounded-l-xl border border-border/20 bg-muted/20 text-muted-foreground hover:bg-muted/40 active:scale-[0.95] transition-all duration-150 text-base font-medium"
                onClick={() => {
                  const cur = watch("quantity_available") ?? 1;
                  if (cur > 0) setValue("quantity_available", cur - 1);
                }}
              >
                −
              </button>
              <Input 
                id="quantity_available" 
                type="number" 
                inputMode="numeric"
                min="0"
                {...register("quantity_available")} 
                className={cn(
                  "h-12 text-center text-base font-semibold tabular-nums border-y border-border/20 rounded-none px-0",
                  "focus-visible:ring-0 focus-visible:border-primary/60 focus-visible:shadow-none",
                  "bg-muted/5 min-w-0"
                )}
                placeholder="1"
              />
              <button
                type="button"
                className="h-12 w-9 flex items-center justify-center rounded-r-xl border border-border/20 bg-muted/20 text-muted-foreground hover:bg-muted/40 active:scale-[0.95] transition-all duration-150 text-base font-medium"
                onClick={() => {
                  const cur = watch("quantity_available") ?? 1;
                  setValue("quantity_available", cur + 1);
                }}
              >
                +
              </button>
            </div>
          </div>

          {/* === OPTIONAL: Everything else behind "More Options" === */}
          <Collapsible open={optionalOpen} onOpenChange={setOptionalOpen}>
            <CollapsibleTrigger asChild>
              <button 
                type="button" 
                className={cn(
                  "w-full flex items-center justify-between py-2 px-3 text-xs rounded-xl mt-1",
                  "bg-muted/15 hover:bg-muted/30 text-muted-foreground/60 hover:text-muted-foreground",
                  "transition-all duration-200 ease-out"
                )}
              >
                <span className="flex items-center gap-1.5 font-medium">
                  <Settings2 className="h-3 w-3" />
                  More Options
                </span>
                <ChevronDown className={cn(
                  "h-3.5 w-3.5 transition-transform duration-300 ease-out",
                  optionalOpen && "rotate-180"
                )} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2 animate-in fade-in-0 slide-in-from-top-2 duration-300 ease-out">
              
              {/* Status, Category, Location */}
              <div className={cn(
                "grid gap-2",
                isMobile ? "grid-cols-1" : "grid-cols-3"
              )}>
                <div>
                  <TaxonomyCombobox
                    table="asset_statuses"
                    value={statusId}
                    onChange={setStatusId}
                    placeholder="Status"
                    className="h-10 border-border/30 bg-muted/20 text-sm"
                  />
                </div>
                <div ref={categoryRef}>
                  <TaxonomyCombobox
                    table="custom_categories"
                    value={categoryId}
                    onChange={setCategoryId}
                    placeholder="Category"
                    userScoped={false}
                    className="h-10 border-border/30 bg-muted/20 text-sm"
                  />
                </div>
                <div>
                  <LocationCombobox
                    value={sectionValue || ""}
                    onChange={(v) => setValue("section", v)}
                    placeholder="Location"
                    className="h-10 border-border/30 bg-muted/20 text-sm"
                  />
                </div>
              </div>

              {/* Custom Fields — always visible with inline creator */}
              <div className="p-3 border border-border/20 rounded-xl bg-muted/10">
                <AssetAttributes
                  values={attributeValues}
                  onChange={setAttributeValues}
                  errors={attributeErrors}
                />
              </div>

              {/* Expiration Date */}
              <div>
                <Label htmlFor="date_expire" className="text-xs text-muted-foreground/70">Expiration Date</Label>
                <Input 
                  id="date_expire" 
                  type="date" 
                  {...register("date_expire")}
                  className="h-10 border-border/30 bg-muted/20 text-sm"
                />
                <p className="text-[10px] text-muted-foreground/40 mt-0.5 pl-1">Auto-alerts at 30, 14, and 7 days</p>
              </div>

              {/* Stock Alerts */}
              <div className="p-3 border border-border/20 rounded-xl bg-muted/10">
                <div className="flex items-center justify-between">
                  <Label htmlFor="alerts_enabled" className="cursor-pointer text-xs text-muted-foreground/70">
                    Low stock alerts
                  </Label>
                  <Switch
                    id="alerts_enabled"
                    checked={alertsEnabled}
                    onCheckedChange={setAlertsEnabled}
                  />
                </div>
                {alertsEnabled && (
                  <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-border/20 animate-in fade-in-0 duration-200">
                    <div>
                      <Label htmlFor="low_stock_threshold" className="text-[10px] text-warning">Warning</Label>
                      <Input 
                        id="low_stock_threshold" 
                        type="number"
                        inputMode="numeric"
                        min="0"
                        {...register("low_stock_threshold")}
                        placeholder="10"
                        className="h-9 border-border/30 bg-muted/20 text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="critical_stock_threshold" className="text-[10px] text-destructive">Critical</Label>
                      <Input 
                        id="critical_stock_threshold" 
                        type="number"
                        inputMode="numeric"
                        min="0"
                        {...register("critical_stock_threshold")}
                        placeholder="3"
                        className="h-9 border-border/30 bg-muted/20 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Identification */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground/50 pl-1">Identification</p>
                <div className={isMobile ? "space-y-2" : "grid grid-cols-2 gap-2"}>
                  <Input 
                    id="item_id" 
                    {...register("item_id")} 
                    placeholder="Item ID"
                    className="h-9 border-border/30 bg-muted/20 text-sm"
                  />
                  <Input 
                    id="barcode" 
                    {...register("barcode")} 
                    placeholder="Barcode"
                    className="h-9 border-border/30 bg-muted/20 text-sm"
                  />
                </div>
                <div className={isMobile ? "space-y-2" : "grid grid-cols-2 gap-2"}>
                  <AutoSuggestInput
                    id="serial_number"
                    suggestions={serialSuggestions}
                    value={watch("serial_number") || ""}
                    onChange={(v) => setValue("serial_number", v)}
                    placeholder="Serial number"
                    className="h-9 border-border/30 bg-muted/20 text-sm"
                  />
                  <Input 
                    id="reference_id" 
                    {...register("reference_id")} 
                    placeholder="Reference ID"
                    className="h-9 border-border/30 bg-muted/20 text-sm"
                  />
                </div>
              </div>

              {/* Product Details */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground/50 pl-1">Product Details</p>
                <div className={isMobile ? "space-y-2" : "grid grid-cols-2 gap-2"}>
                  <TaxonomyCombobox
                    table="manufacturers"
                    value={manufacturerId}
                    onChange={setManufacturerId}
                    placeholder="Manufacturer"
                    className="h-9 border-border/30 bg-muted/20 text-sm"
                  />
                  <AutoSuggestInput
                    id="model_part_num"
                    suggestions={modelSuggestions}
                    value={watch("model_part_num") || ""}
                    onChange={(v) => setValue("model_part_num", v)}
                    placeholder="Model / Part #"
                    className="h-9 border-border/30 bg-muted/20 text-sm"
                  />
                </div>
              </div>

              {/* Organization */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground/50 pl-1">Organization</p>
                <div className={isMobile ? "space-y-2" : "grid grid-cols-2 gap-2"}>
                  <TaxonomyCombobox
                    table="asset_groups"
                    value={groupId}
                    onChange={setGroupId}
                    placeholder="Group"
                    className="h-9 border-border/30 bg-muted/20 text-sm"
                  />
                  <Input 
                    id="group_year" 
                    type="number"
                    inputMode="numeric"
                    min="2000"
                    max="2099"
                    {...register("group_year")} 
                    placeholder="Year"
                    className="h-9 border-border/30 bg-muted/20 text-sm"
                  />
                </div>
                <div className={isMobile ? "space-y-2" : "grid grid-cols-2 gap-2"}>
                  <Input 
                    id="quantity_out" 
                    type="number" 
                    inputMode="numeric"
                    min="0"
                    {...register("quantity_out")} 
                    placeholder="Quantity out"
                    className="h-9 border-border/30 bg-muted/20 text-sm"
                  />
                  <div className="flex items-center gap-2 h-9 px-3 border border-border/20 rounded-lg bg-muted/10">
                    <Switch
                      id="is_internal"
                      checked={watch("is_internal")}
                      onCheckedChange={(checked) => setValue("is_internal", checked)}
                    />
                    <Label htmlFor="is_internal" className="cursor-pointer text-xs text-muted-foreground">
                      Internal
                    </Label>
                  </div>
                </div>
              </div>

              {/* Inline custom fields section — always shown via AssetAttributes */}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      {/* Footer — calm, spacious */}
      <div className={cn(
        "flex gap-2 pt-3 border-t border-border/10 bg-background",
        isMobile ? "flex-col pb-2" : "justify-end"
      )}>
        <Button 
          type="submit" 
          disabled={isSubmitting || !watch("description")?.trim()}
          className={cn("h-12 rounded-2xl font-medium text-base shadow-sm", isMobile && "order-1")}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding...
            </>
          ) : (
            "Add Item"
          )}
        </Button>
        <Button 
          type="button" 
          variant="ghost" 
          onClick={() => onOpenChange(false)}
          disabled={isSubmitting}
          className={cn("h-12 rounded-2xl text-muted-foreground/70", isMobile && "order-2")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );

  const promptElement = (
    <SoftRequiredPrompt
      open={softRequired.showPrompt}
      onOpenChange={softRequired.dismissPrompt}
      missingFields={softRequired.missingFields}
      onAddNow={handleSoftAddNow}
      onSkip={handleSoftSkip}
    />
  );

  const scannerElement = (
    <BarcodeScannerDrawer
      open={scannerOpen}
      onOpenChange={setScannerOpen}
      onItemFound={handleScanResult}
      onCodeNotFound={handleScanNotFound}
    />
  );

  const duplicateAlertElement = (
    <AlertDialog open={showDuplicateAlert} onOpenChange={setShowDuplicateAlert}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Item Already Exists
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>This barcode already exists in inventory:</p>
              <div className="rounded-lg border border-border/30 bg-muted/20 p-3">
                <p className="font-medium text-foreground text-sm">
                  {duplicateItem?.description || "Unnamed Item"}
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  {duplicateItem?.barcode && (
                    <span className="font-mono">{duplicateItem.barcode}</span>
                  )}
                  {duplicateItem?.quantity_available != null && (
                    <span>Qty: {duplicateItem.quantity_available}</span>
                  )}
                  {duplicateItem?.section && (
                    <span>{duplicateItem.section}</span>
                  )}
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogAction
            onClick={handleOpenDuplicateItem}
            className="rounded-xl"
          >
            View Item
          </AlertDialogAction>
          <AlertDialogAction
            onClick={handleCreateNewAnyway}
            className="rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/75"
          >
            Duplicate Item
          </AlertDialogAction>
          <AlertDialogCancel className="rounded-xl">
            Cancel
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (isMobile) {
    return (
      <>
        <Sheet open={open} onOpenChange={(isOpen) => {
          if (!isOpen) resetForm();
          onOpenChange(isOpen);
        }}>
          <SheetContent 
            side="bottom" 
            className="max-h-[80vh] h-auto flex flex-col rounded-t-3xl pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_40px_-10px_hsl(var(--foreground)/0.08)]"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <SheetHeader className="text-left pb-2 shrink-0">
              <SheetTitle className="text-lg">New Item</SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground/60">
                Just a name and you're done. Tap "More Options" for details.
              </SheetDescription>
            </SheetHeader>
            {formContent}
          </SheetContent>
        </Sheet>
        {promptElement}
        {scannerElement}
        {duplicateAlertElement}
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen) resetForm();
        onOpenChange(isOpen);
      }}>
        <DialogContent 
          className="max-w-md max-h-[85vh] flex flex-col gap-3 rounded-2xl shadow-[0_8px_40px_-12px_hsl(var(--foreground)/0.12)]"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader className="shrink-0 space-y-0.5">
            <DialogTitle className="text-lg">New Item</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground/60">
              Just a name and you're done. Expand "More Options" for details.
            </DialogDescription>
          </DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>
      {promptElement}
      {scannerElement}
      {duplicateAlertElement}
    </>
  );
};
