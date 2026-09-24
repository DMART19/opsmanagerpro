import { useState, useEffect, useCallback } from "react";
import { PhotoUpload } from "@/components/ui/photo-upload";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { AutoSuggestInput } from "@/components/ui/auto-suggest-input";
import { useFieldSuggestions } from "@/hooks/use-field-suggestions";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CacheInventoryItem, useInvalidateCacheInventory } from "@/hooks/use-cache-inventory";
import { useBoxes } from "@/hooks/use-boxes";
import { useAssetAttributes, useAssetAttributeValues } from "@/hooks/use-asset-attributes";
import { useItemCheckoutsForItem, ItemCheckout, isCheckoutOverdue } from "@/hooks/use-item-checkout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { TaxonomyCombobox } from "@/components/ui/taxonomy-combobox";
import { 
  Package, 
  MapPin, 
  Calendar, 
  Hash, 
  Edit, 
  Copy, 
  Trash2, 
  MoveHorizontal,
  Building2,
  Box,
  Clock,
  AlertTriangle,
  Sparkles,
  Bell,
  Save,
  Loader2,
  LogOut,
  LogIn,
  User,
  Users,
  X,
  Pencil,
  History,
  FileText,
  Plus,
  Minus,
  ScanLine,
  ChevronDown,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useFormatters } from "@/hooks/use-formatters";
import { format, formatDistanceToNow } from "date-fns";
import { ItemCheckoutDialog } from "./ItemCheckoutDialog";
import { ItemCheckinDialog } from "./ItemCheckinDialog";
import { AssetActivityHistory } from "./activity-history";
import { InlineQuantityCard } from "./InlineQuantityCard";
import { ItemHistoryTab } from "./ItemHistoryTab";
import { QuickAdjustModal, QuickAdjustMode } from "./QuickAdjustModal";
import { BarcodeScannerDrawer } from "./BarcodeScannerDrawer";
import { AssetAttributes } from "./AssetAttributes";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ItemDetailsDrawerProps {
  item: CacheInventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onMove: () => void;
  onDelete: () => Promise<void>;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  'IN': { label: 'Available', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200' },
  'OUT': { label: 'In Use', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200' },
  'MAINT': { label: 'Under Service', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200' },
  'RETIRED': { label: 'Retired', className: 'bg-muted text-muted-foreground border-muted' },
  'Available': { label: 'Available', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200' },
  'In Use': { label: 'In Use', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200' },
  'Under Service': { label: 'Under Service', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200' },
};

export const ItemDetailsDrawer = ({
  item,
  open,
  onOpenChange,
  onEdit,
  onDuplicate,
  onMove,
  onDelete,
}: ItemDetailsDrawerProps) => {
  const { formatDate, formatDateTime } = useFormatters();
  const [imageExpanded, setImageExpanded] = useState(false);
  const invalidateInventory = useInvalidateCacheInventory();
  
  // Custom attributes
  const { attributes } = useAssetAttributes();
  const { valuesMap: attributeValues } = useAssetAttributeValues(item?.id || null);
  const descriptionSuggestions = useFieldSuggestions("description");
  const modelSuggestions = useFieldSuggestions("model_part_num");
  const serialSuggestions = useFieldSuggestions("serial_number");
  const sectionSuggestions = useFieldSuggestions("section");
  const { boxes } = useBoxes();
  
  // Checkouts for this item
  const { checkouts: activeCheckouts, loading: checkoutsLoading, refetch: refetchCheckouts } = useItemCheckoutsForItem(item?.id || null);
  
  // Checkout dialog state
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [checkinDialogOpen, setCheckinDialogOpen] = useState(false);
  const [selectedCheckout, setSelectedCheckout] = useState<ItemCheckout | null>(null);
  
  // Local item state — overrides stale prop after a successful save
  const [localItem, setLocalItem] = useState<CacheInventoryItem | null>(null);

  // Inline edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    description: "",
    quantity_available: 0,
    section: "",
    date_expire: "",
    model_part_num: "",
    serial_number: "",
    barcode: "",
    container_id: null as string | null,
  });
  // FK ID state (taxonomy fields)
   const [editStatusId, setEditStatusId] = useState<string | null>(null);
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [editManufacturerId, setEditManufacturerId] = useState<string | null>(null);
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null);
  const [editAttributeValues, setEditAttributeValues] = useState<Record<string, string | null>>({});
  const [editError, setEditError] = useState<string | null>(null);
  
  // Barcode scanner state
  const [barcodeScannerOpen, setBarcodeScannerOpen] = useState(false);

  // Stock alert threshold state
  const [stockAlertsEnabled, setStockAlertsEnabled] = useState(false);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);
  const [criticalStockThreshold, setCriticalStockThreshold] = useState<number>(0);
  const [savingThresholds, setSavingThresholds] = useState(false);
  const [hasThresholdChanges, setHasThresholdChanges] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjusterEditing, setAdjusterEditing] = useState(false);
  const [adjusterValue, setAdjusterValue] = useState("");
  const [quickAdjustMode, setQuickAdjustMode] = useState<QuickAdjustMode | null>(null);
  
  // Live quantities (auto-sync with database)
  const [liveQuantityAvailable, setLiveQuantityAvailable] = useState<number | null>(null);
  const [liveQuantityOut, setLiveQuantityOut] = useState<number | null>(null);
  
  // Function to manually refetch item quantities
  const refetchItemQuantities = async () => {
    if (!item?.id) return;
    const { data, error } = await supabase
      .from("cache_inventory")
      .select("quantity_available, quantity_out")
      .eq("id", item.id)
      .single();
    
    if (!error && data) {
      setLiveQuantityAvailable(data.quantity_available ?? 0);
      setLiveQuantityOut(data.quantity_out ?? 0);
    }
  };
  
  // Initialize thresholds and quantities from item; clear localItem when item changes
  useEffect(() => {
    if (item) {
      const hasLow = item.low_stock_threshold != null;
      const hasCritical = item.critical_stock_threshold != null;
      setStockAlertsEnabled(hasLow || hasCritical);
      setLowStockThreshold(item.low_stock_threshold ?? 5);
      setCriticalStockThreshold(item.critical_stock_threshold ?? 0);
      setHasThresholdChanges(false);
      setLiveQuantityAvailable(item.quantity_available);
      setLiveQuantityOut(item.quantity_out);
      // Reset edit mode when item changes
      setIsEditing(false);
      setEditError(null);
      // Clear local override so fresh prop takes effect
      setLocalItem(null);
    }
  }, [item?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Subscribe to realtime updates for this item's quantities
  useEffect(() => {
    if (!item?.id || !open) return;

    const channel = supabase
      .channel(`item_quantities_${item.id}`)
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to all events (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "cache_inventory",
          filter: `id=eq.${item.id}`,
        },
        (payload) => {
          console.log("Realtime inventory update:", payload);
          const newData = payload.new as any;
          if (newData) {
            setLiveQuantityAvailable(newData.quantity_available ?? 0);
            setLiveQuantityOut(newData.quantity_out ?? 0);
          }
        }
      )
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [item?.id, open]);
  
  if (!item) return null;

  // Use localItem (post-save) if available, otherwise fall back to the prop
  const displayItem = localItem ?? item;

  // Use live quantities, falling back to item prop
  const displayQuantityAvailable = liveQuantityAvailable ?? displayItem.quantity_available ?? 0;
  const displayQuantityOut = liveQuantityOut ?? displayItem.quantity_out ?? 0;

  const statusConfig = STATUS_CONFIG[displayItem.status_item || 'IN'] || STATUS_CONFIG['IN'];
  
  // Use the configurable thresholds
  const effectiveLowThreshold = displayItem.low_stock_threshold ?? 5;
  const effectiveCriticalThreshold = displayItem.critical_stock_threshold ?? 0;
  
  const getExpirationInfo = () => {
    if (!displayItem.date_expire) return null;
    const expDate = new Date(displayItem.date_expire);
    const today = new Date();
    const daysUntil = Math.floor((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntil < 0) {
      return { label: 'Expired', className: 'text-destructive', days: daysUntil };
    }
    if (daysUntil < 30) {
      return { label: `Expires in ${daysUntil} days`, className: 'text-amber-600', days: daysUntil };
    }
    if (daysUntil < 90) {
      return { label: `Expires in ${Math.floor(daysUntil / 30)} months`, className: 'text-amber-600', days: daysUntil };
    }
    return { label: formatDate(expDate), className: 'text-muted-foreground', days: daysUntil };
  };

  const expirationInfo = getExpirationInfo();

  // Only trigger stock alerts when a threshold is explicitly configured (not null)
  const hasLowThreshold = displayItem.low_stock_threshold != null && displayItem.low_stock_threshold > 0;
  const hasCriticalThreshold = displayItem.critical_stock_threshold != null && displayItem.critical_stock_threshold > 0;

  const isOutOfStock = displayQuantityAvailable === 0 || 
    (hasCriticalThreshold && displayQuantityAvailable <= effectiveCriticalThreshold);
  const isLowStock = !isOutOfStock && hasLowThreshold && displayQuantityAvailable <= effectiveLowThreshold;

  const formatValue = (value: string | number | boolean | null | undefined, fallback = "Not set") => {
    if (value === null || value === undefined || value === "") return <span className="text-muted-foreground/60 italic">{fallback}</span>;
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return value;
  };

  const handleThresholdChange = (field: 'low' | 'critical', value: string) => {
    const numValue = parseInt(value) || 0;
    if (field === 'low') {
      setLowStockThreshold(numValue);
    } else {
      setCriticalStockThreshold(numValue);
    }
    setHasThresholdChanges(true);
  };

  const handleSaveThresholds = async () => {
    if (!item) return;
    
    setSavingThresholds(true);
    try {
      const { error } = await supabase
        .from('cache_inventory')
        .update({
          low_stock_threshold: stockAlertsEnabled ? lowStockThreshold : null,
          critical_stock_threshold: stockAlertsEnabled ? criticalStockThreshold : null,
        })
        .eq('id', item.id);

      if (error) throw error;

      toast({
        title: "Alert thresholds saved",
        description: "Stock level alerts have been updated for this item.",
      });
      setHasThresholdChanges(false);
      invalidateInventory();
    } catch (error: any) {
      toast({
        title: "Error saving thresholds",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingThresholds(false);
    }
  };

  // Start editing — seed form from the latest displayed item
  const handleStartEdit = () => {
    setEditForm({
      description: displayItem.description || "",
      quantity_available: displayQuantityAvailable,
      section: displayItem.section || "",
      date_expire: displayItem.date_expire || "",
      model_part_num: displayItem.model_part_num || "",
      serial_number: displayItem.serial_number || "",
      barcode: displayItem.barcode || "",
      container_id: displayItem.container_id || null,
    });
    // Seed FK IDs for taxonomy fields
    setEditStatusId(displayItem.asset_status_id || null);
    setEditCategoryId(displayItem.category_id || null);
    setEditManufacturerId(displayItem.manufacturer_id || null);
    setEditError(null);
    setEditImageUrl(displayItem.image_url || null);
    setEditAttributeValues(attributeValues || {});
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!item) return;
    if (!editForm.description.trim()) {
      setEditError("Asset name is required.");
      return;
    }
    setIsSavingEdit(true);
    setEditError(null);

    const updatePayload = {
      description: editForm.description.trim() || null,
      quantity_available: editForm.quantity_available,
      section: editForm.section.trim() || null,
      date_expire: editForm.date_expire || null,
      model_part_num: editForm.model_part_num.trim() || null,
      serial_number: editForm.serial_number.trim() || null,
      barcode: editForm.barcode.trim() || null,
      container_id: editForm.container_id || null,
      image_url: editImageUrl,
      asset_status_id: editStatusId || null,
      category_id: editCategoryId || null,
      manufacturer_id: editManufacturerId || null,
    };

    try {
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
        if (!msg.includes("Load failed") && !msg.includes("Failed to fetch") && !msg.includes("NetworkError")) {
          break; // Non-transient error, don't retry
        }
        await new Promise(r => setTimeout(r, 500));
      }

      if (lastError) throw lastError;
      if (!updatedRow) throw new Error("Update returned no data — row may not exist or access was denied.");

      // Resolve taxonomy names with separate lightweight queries (avoids join failures)
      const [statusRes, mfgRes, catRes, groupRes] = await Promise.all([
        updatedRow.asset_status_id
          ? supabase.from("asset_statuses").select("name").eq("id", updatedRow.asset_status_id).single()
          : Promise.resolve({ data: null }),
        updatedRow.manufacturer_id
          ? supabase.from("manufacturers").select("name").eq("id", updatedRow.manufacturer_id).single()
          : Promise.resolve({ data: null }),
        updatedRow.category_id
          ? supabase.from("custom_categories").select("name").eq("id", updatedRow.category_id).single()
          : Promise.resolve({ data: null }),
        updatedRow.asset_group_id
          ? supabase.from("asset_groups").select("name").eq("id", updatedRow.asset_group_id).single()
          : Promise.resolve({ data: null }),
      ]);

      const freshItem: CacheInventoryItem = {
        ...updatedRow,
        asset_type: updatedRow.asset_type || "item",
        box_number: updatedRow.box_number ?? null,
        box_number_alt: updatedRow.box_number_alt ?? null,
        status_item: statusRes.data?.name ?? null,
        manufacturer: mfgRes.data?.name ?? null,
        subcategory: catRes.data?.name ?? null,
        group_abbv: groupRes.data?.name ?? null,
        container_type_name: null,
        container_status_name: null,
        container_group_name: null,
        custom_data: updatedRow.custom_data as Record<string, any> | null ?? null,
      };
      setLocalItem(freshItem);
      setLiveQuantityAvailable(freshItem.quantity_available ?? 0);
      setLiveQuantityOut(freshItem.quantity_out ?? 0);

      // Save custom attribute values
      if (Object.keys(editAttributeValues).length > 0) {
        const { error: attrError } = await supabase
          .from("asset_attribute_values")
          .upsert(
            Object.entries(editAttributeValues).map(([attributeId, value]) => ({
              asset_id: item.id,
              attribute_id: attributeId,
              value: value ?? null,
            })),
            { onConflict: "asset_id,attribute_id" }
          );
        if (attrError) {
          console.error("Failed to save attribute values:", attrError);
          toast({ title: "Warning", description: "Asset saved but custom fields may not have updated.", variant: "destructive" });
        }
      }

      toast({ title: "Asset updated successfully" });
      setIsEditing(false);
      invalidateInventory();
    } catch (err: any) {
      const isNetworkError = err.message?.includes("Load failed") || err.message?.includes("Failed to fetch") || err.message?.includes("NetworkError");
      const description = isNetworkError
        ? "Network connection issue. Please check your connection and try again."
        : (err.message || "Failed to save changes");
      setEditError(description);
      toast({ title: "Save failed", description, variant: "destructive" });
      // Edit mode stays open — user input is preserved
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg flex flex-col overflow-hidden p-0">
        {/* Sticky header */}
        <div className="flex-shrink-0 px-6 pt-6 pb-3 pr-10 border-b border-border/20 bg-background shadow-[0_1px_3px_0_rgb(0_0_0/0.04)]">
          <div className="flex items-center gap-3">
            {displayItem.image_url ? (
              <button
                type="button"
                onClick={() => setImageExpanded(true)}
                className="flex-shrink-0 h-12 w-12 rounded-xl overflow-hidden border border-border/20 bg-muted/20 cursor-zoom-in hover:ring-2 hover:ring-primary/40 transition-all duration-150"
              >
                <img src={displayItem.image_url} alt={displayItem.description || "Item"} className="h-full w-full object-cover" />
              </button>
            ) : (
              <div className="flex-shrink-0 h-12 w-12 rounded-xl border border-border/20 bg-muted/20 flex items-center justify-center">
                <Package className="h-5 w-5 text-muted-foreground/60" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-base font-semibold leading-snug truncate">
                {displayItem.description || "Untitled Item"}
              </SheetTitle>
              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", statusConfig.className)}>
                  {statusConfig.label}
                </Badge>
                {isOutOfStock && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Out of Stock</Badge>
                )}
                {isLowStock && !isOutOfStock && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-warning/40 bg-warning/10 text-warning">Low Stock</Badge>
                )}
                {expirationInfo && expirationInfo.days < 0 && (
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0 gap-0.5">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    Expired
                  </Badge>
                )}
              </div>
            </div>
            {!isEditing && (
              <Button onClick={handleStartEdit} variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4">

        {/* Edit Mode Form */}
        {isEditing ? (
          <div className="space-y-5 mb-6">
            {editError && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                {editError}
              </div>
            )}

            {/* Section 1: Basic Info */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Basic Info</p>
              
              {/* Photo Upload */}
              <div className="flex items-center gap-3">
                <PhotoUpload
                  value={editImageUrl}
                  onChange={setEditImageUrl}
                  folder="assets"
                  size="md"
                  placeholder="Photo"
                />
                <p className="text-xs text-muted-foreground">Tap to change photo</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Name <span className="text-destructive">*</span></Label>
                <AutoSuggestInput
                  suggestions={descriptionSuggestions}
                  value={editForm.description}
                  onChange={(v) => setEditForm(f => ({ ...f, description: v }))}
                  placeholder="Asset name"
                  className="h-10"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Quantity Available</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editForm.quantity_available}
                    onChange={(e) => setEditForm(f => ({ ...f, quantity_available: parseInt(e.target.value) || 0 }))}
                    className="h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Status</Label>
                  <TaxonomyCombobox
                    table="asset_statuses"
                    value={editStatusId}
                    onChange={setEditStatusId}
                    placeholder="Select status"
                    className="h-10"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Classification */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Classification</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Category</Label>
                  <TaxonomyCombobox
                    table="custom_categories"
                    value={editCategoryId}
                    onChange={setEditCategoryId}
                    placeholder="Search or create"
                    userScoped={false}
                    className="h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Location</Label>
                  <AutoSuggestInput
                    suggestions={sectionSuggestions}
                    value={editForm.section}
                    onChange={(v) => setEditForm(f => ({ ...f, section: v }))}
                    placeholder="e.g. A-12"
                    className="h-10"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <Box className="h-3 w-3" />
                  Container
                </Label>
                <Select
                  value={editForm.container_id || "none"}
                  onValueChange={(v) => setEditForm(f => ({ ...f, container_id: v === "none" ? null : v }))}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="No container" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {(boxes || []).map(box => (
                      <SelectItem key={box.id} value={box.id}>
                        {box.box_number}{box.box_description ? ` — ${box.box_description}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Section 3: Identification */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Identification</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Manufacturer</Label>
                  <TaxonomyCombobox
                    table="manufacturers"
                    value={editManufacturerId}
                    onChange={setEditManufacturerId}
                    placeholder="Search or create"
                    className="h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Model / Part #</Label>
                  <AutoSuggestInput
                    suggestions={modelSuggestions}
                    value={editForm.model_part_num}
                    onChange={(v) => setEditForm(f => ({ ...f, model_part_num: v }))}
                    placeholder="Model or part number"
                    className="h-10"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Serial Number</Label>
                  <AutoSuggestInput
                    suggestions={serialSuggestions}
                    value={editForm.serial_number}
                    onChange={(v) => setEditForm(f => ({ ...f, serial_number: v }))}
                    placeholder="Serial number"
                    className="h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Barcode</Label>
                  <div className="flex gap-1.5">
                    <Input
                      value={editForm.barcode}
                      onChange={(e) => setEditForm(f => ({ ...f, barcode: e.target.value }))}
                      placeholder="Barcode"
                      className="h-10 flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 flex-shrink-0"
                      onClick={() => setBarcodeScannerOpen(true)}
                      title="Scan barcode with camera"
                    >
                      <ScanLine className="h-4 w-4 text-primary" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Lifecycle */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Lifecycle</p>
              <div className="space-y-1.5">
                <Label className="text-xs">Expiration Date</Label>
                <Input
                  type="date"
                  value={editForm.date_expire}
                  onChange={(e) => setEditForm(f => ({ ...f, date_expire: e.target.value }))}
                  className="h-10"
                />
              </div>
            </div>

            {/* Section 5: Custom Fields (collapsible) */}
            <Collapsible>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="w-full flex items-center justify-between py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider group"
                >
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Custom Fields
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-1 animate-in fade-in-0 duration-150">
                <AssetAttributes
                  values={editAttributeValues}
                  onChange={setEditAttributeValues}
                  allowClearValues
                />
              </CollapsibleContent>
            </Collapsible>

            {/* Save / Cancel */}
            <div className="flex gap-2 pt-1">
              <Button onClick={handleSaveEdit} disabled={isSavingEdit} className="flex-1 gap-1.5 h-10">
                {isSavingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isSavingEdit ? "Saving..." : "Save Changes"}
              </Button>
              <Button variant="outline" onClick={handleCancelEdit} disabled={isSavingEdit} className="gap-1.5 h-10">
                <X className="h-4 w-4" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>

            {/* Primary action */}
            <Button className="w-full h-11 gap-2 mb-3 active:scale-[0.98] transition-transform duration-150" onClick={onMove}>
              <Box className="h-4 w-4" />
              {item?.container_id ? 'Move to Another Container' : 'Assign Container'}
            </Button>

            {/* Secondary actions */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex flex-col h-auto py-3 gap-1 border-border/20 shadow-sm active:scale-[0.96] transition-transform duration-150"
                onClick={() => setCheckoutDialogOpen(true)}
                disabled={(item.quantity_available ?? 0) === 0}
              >
                <LogOut className="h-4 w-4" />
                <span className="text-xs">Check Out</span>
              </Button>
              <Button variant="outline" size="sm" className="flex flex-col h-auto py-3 gap-1 border-border/20 shadow-sm active:scale-[0.96] transition-transform duration-150" onClick={handleStartEdit}>
                <Edit className="h-4 w-4" />
                <span className="text-xs">Edit</span>
              </Button>
              <Button variant="outline" size="sm" className="flex flex-col h-auto py-3 gap-1 border-border/20 shadow-sm active:scale-[0.96] transition-transform duration-150" onClick={onDuplicate}>
                <Copy className="h-4 w-4" />
                <span className="text-xs">Duplicate</span>
              </Button>
            </div>

            {/* Delete — separated with confirmation */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 mb-6"
              onClick={() => setConfirmDeleteOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Delete Item
            </Button>
            </>
        )}

        {!isEditing && <Separator className="my-4" />}

        {/* Tabbed Content (hidden during edit mode) */}
        {!isEditing && (
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="w-full mb-4 h-11 bg-muted/40">
              <TabsTrigger value="details" className="flex-1 gap-1.5 h-9 text-sm transition-all duration-150 data-[state=active]:shadow-sm">
                <FileText className="h-3.5 w-3.5" />
                Details
              </TabsTrigger>
              <TabsTrigger value="history" className="flex-1 gap-1.5 h-9 text-sm transition-all duration-150 data-[state=active]:shadow-sm">
                <History className="h-3.5 w-3.5" />
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-0 space-y-0 animate-fade-in">
              {/* Key Stats */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <InlineQuantityCard
                  label="Available"
                  value={displayQuantityAvailable}
                  itemId={item.id}
                  field="quantity_available"
                  readOnly
                  icon={<Package className="h-5 w-5" />}
                  className={cn(
                    isOutOfStock && "text-destructive",
                    isLowStock && !isOutOfStock && "text-warning"
                  )}
                  cardClassName={cn(
                    isLowStock && !isOutOfStock && "bg-warning/10 border border-warning/20",
                    isOutOfStock && "bg-destructive/5 border border-destructive/15"
                  )}
                  onSaved={() => {
                    refetchItemQuantities();
                    invalidateInventory();
                  }}
                />
                <InlineQuantityCard
                  label="In Use"
                  value={displayQuantityOut}
                  itemId={item.id}
                  field="quantity_out"
                  readOnly
                  icon={<User className="h-5 w-5" />}
                  className="text-muted-foreground"
                  onSaved={() => {
                    refetchItemQuantities();
                    invalidateInventory();
                  }}
                />
              </div>

              {/* Quick Adjust */}
              <div className="mb-6 rounded-2xl border border-border/20 bg-muted/10 p-4 shadow-sm">
                <span className="text-xs font-medium text-muted-foreground block mb-3">Quick Adjust</span>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    className="h-14 rounded-xl flex flex-col items-center justify-center gap-1 border-border/20 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 active:scale-[0.96] transition-all duration-150 shadow-sm"
                    onClick={() => setQuickAdjustMode("add")}
                  >
                    <Plus className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Add Stock</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-14 rounded-xl flex flex-col items-center justify-center gap-1 border-border/20 bg-destructive/5 hover:bg-destructive/10 active:scale-[0.96] transition-all duration-150 shadow-sm"
                    onClick={() => setQuickAdjustMode("remove")}
                    disabled={displayQuantityAvailable <= 0}
                  >
                    <Minus className="h-5 w-5 text-destructive" />
                    <span className="text-xs font-semibold text-destructive">Remove</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-14 rounded-xl flex flex-col items-center justify-center gap-1 border-border/20 bg-muted/30 hover:bg-muted/50 active:scale-[0.96] transition-all duration-150 shadow-sm"
                    onClick={onMove}
                  >
                    <MoveHorizontal className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs font-semibold text-muted-foreground">Transfer</span>
                  </Button>
                </div>
              </div>

              {/* Quick Adjust Modal */}
              <QuickAdjustModal
                open={quickAdjustMode !== null}
                onOpenChange={(open) => { if (!open) setQuickAdjustMode(null); }}
                mode={quickAdjustMode ?? "add"}
                currentQuantity={displayQuantityAvailable}
                onConfirm={async (newQty) => {
                  const { error } = await supabase
                    .from("cache_inventory")
                    .update({ quantity_available: newQty })
                    .eq("id", item.id);
                  if (error) throw error;
                  refetchItemQuantities();
                  invalidateInventory();
                  toast({ title: quickAdjustMode === "add" ? "Stock added" : "Stock removed" });
                }}
              />

              {/* Active Checkouts Section */}
              {activeCheckouts.length > 0 && (
                <>
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Currently Checked Out ({activeCheckouts.length})
                    </h4>
                    <div className="space-y-2">
                      {activeCheckouts.map((checkout) => {
                        const isOverdue = isCheckoutOverdue(checkout);
                        const employeeName = checkout.employee 
                          ? `${checkout.employee.first_name} ${checkout.employee.last_name}`
                          : "Unknown";
                        
                        return (
                          <div 
                            key={checkout.id}
                            className={cn(
                              "rounded-lg border p-3 space-y-2",
                              isOverdue && "border-destructive/50 bg-destructive/5"
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <User className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                <span className="font-medium text-sm truncate">{employeeName}</span>
                                <Badge variant="outline" className="text-xs flex-shrink-0">
                                  Qty: {checkout.checked_out_quantity}
                                </Badge>
                              </div>
                              <Button
                                size="sm"
                                variant={isOverdue ? "destructive" : "outline"}
                                className="h-7 text-xs gap-1 flex-shrink-0"
                                onClick={() => {
                                  setSelectedCheckout(checkout);
                                  setCheckinDialogOpen(true);
                                }}
                              >
                                <LogIn className="h-3 w-3" />
                                Check In
                              </Button>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span>
                                Out {formatDistanceToNow(new Date(checkout.checked_out_at), { addSuffix: true })}
                              </span>
                              {checkout.expected_return_at && (
                                <>
                                  <span>•</span>
                                  <span className={cn(isOverdue && "text-destructive font-medium")}>
                                    {isOverdue ? (
                                      <>
                                        <AlertTriangle className="h-3 w-3 inline mr-1" />
                                        Overdue
                                      </>
                                    ) : (
                                      `Due ${format(new Date(checkout.expected_return_at), "MMM d")}`
                                    )}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <Separator className="my-4" />
                </>
              )}

              <Separator className="mb-5" />
              {/* Stock Alert Settings */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    Stock Alert Thresholds
                    <span className="text-xs font-normal text-muted-foreground/60">(optional)</span>
                  </h4>
                  <div className="flex items-center gap-2">
                    {hasThresholdChanges && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={handleSaveThresholds}
                        disabled={savingThresholds}
                        className="h-7 text-xs"
                      >
                        {savingThresholds ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <Save className="h-3 w-3 mr-1" />
                        )}
                        Save
                      </Button>
                    )}
                    {/* Enable / disable toggle */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={stockAlertsEnabled}
                      onClick={() => {
                        setStockAlertsEnabled(prev => !prev);
                        setHasThresholdChanges(true);
                      }}
                      className={cn(
                        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        stockAlertsEnabled ? "bg-primary" : "bg-muted-foreground/30"
                      )}
                    >
                      <span className={cn(
                        "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-150",
                        stockAlertsEnabled ? "translate-x-4" : "translate-x-1"
                      )} />
                    </button>
                  </div>
                </div>

                {stockAlertsEnabled ? (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg border animate-in fade-in-0 slide-in-from-top-2 duration-200">
                    <div className="space-y-2">
                      <Label htmlFor="low-threshold" className="text-xs text-warning flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Low Stock Alert
                      </Label>
                      <Input
                        id="low-threshold"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={lowStockThreshold}
                        onChange={(e) => handleThresholdChange('low', e.target.value)}
                        className="h-9"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Alert when stock ≤ this value
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="critical-threshold" className="text-xs text-destructive flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Critical Alert
                      </Label>
                      <Input
                        id="critical-threshold"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={criticalStockThreshold}
                        onChange={(e) => handleThresholdChange('critical', e.target.value)}
                        className="h-9"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Critical alert when stock ≤ this value
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground/60 italic pl-1">
                    Enable alerts to receive notifications when stock runs low.
                  </p>
                )}
              </div>

              <Separator className="mb-5" />
              {/* Details Sections */}
              <div className="space-y-6">
                {/* Location & Category */}
                {(displayItem.section || displayItem.subcategory || displayItem.group_abbv || displayItem.container_id) && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Location & Category
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {displayItem.container_id && (
                        <div className="rounded-lg border border-border/40 bg-muted/30 p-3">
                          <span className="text-[11px] text-muted-foreground block mb-1">Container</span>
                          <div className="flex items-center gap-1.5">
                            <Box className="h-4 w-4 text-muted-foreground/70 shrink-0" />
                            <span className="text-sm font-medium truncate">
                              {(boxes || []).find(b => b.id === displayItem.container_id)?.box_number || "Unknown"}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 ml-auto shrink-0"
                              onClick={onMove}
                              title="Change container"
                            >
                              <MoveHorizontal className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                      {displayItem.section && (
                        <div className="rounded-lg border border-border/40 bg-muted/30 p-3">
                          <span className="text-[11px] text-muted-foreground block mb-1">Storage Area</span>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 text-muted-foreground/70 shrink-0" />
                            <span className="text-sm font-medium truncate">{displayItem.section}</span>
                          </div>
                        </div>
                      )}
                      {displayItem.subcategory && (
                        <div className="rounded-lg border border-border/40 bg-muted/30 p-3">
                          <span className="text-[11px] text-muted-foreground block mb-1">Category</span>
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="h-4 w-4 text-muted-foreground/70 shrink-0" />
                            <span className="text-sm font-medium truncate">{displayItem.subcategory}</span>
                          </div>
                        </div>
                      )}
                      {displayItem.group_abbv && (
                        <div className="rounded-lg border border-border/40 bg-muted/30 p-3">
                          <span className="text-[11px] text-muted-foreground block mb-1">Group</span>
                          <div className="flex items-center gap-1.5">
                            <Users className="h-4 w-4 text-muted-foreground/70 shrink-0" />
                            <span className="text-sm font-medium truncate">{displayItem.group_abbv}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Identification */}
                {(displayItem.id_cache_fema || displayItem.id_cache_tf || displayItem.barcode || displayItem.serial_number) && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                        <Hash className="h-4 w-4" />
                        Identification
                      </h4>
                      <div className="space-y-3 pl-6">
                        {displayItem.id_cache_fema && (
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Item ID</span>
                            <span className="text-sm font-mono">{displayItem.id_cache_fema}</span>
                          </div>
                        )}
                        {displayItem.id_cache_tf && (
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Reference ID</span>
                            <span className="text-sm font-mono">{displayItem.id_cache_tf}</span>
                          </div>
                        )}
                        {displayItem.barcode && (
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Barcode</span>
                            <span className="text-sm font-mono">{displayItem.barcode}</span>
                          </div>
                        )}
                        {displayItem.serial_number && (
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Serial Number</span>
                            <span className="text-sm font-mono">{displayItem.serial_number}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Product Info */}
                {(displayItem.manufacturer || displayItem.model_part_num) && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Product Information
                      </h4>
                      <div className="space-y-3 pl-6">
                        {displayItem.manufacturer && (
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Manufacturer</span>
                            <span className="text-sm font-medium">{displayItem.manufacturer}</span>
                          </div>
                        )}
                        {displayItem.model_part_num && (
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Model / Part #</span>
                            <span className="text-sm font-mono">{displayItem.model_part_num}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Dates & Tracking */}
                {(displayItem.date_expire || displayItem.group_year || displayItem.is_internal) && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Dates & Tracking
                      </h4>
                      <div className="space-y-3 pl-6">
                        {displayItem.date_expire && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Expiration</span>
                            <span className={cn("text-sm font-medium", expirationInfo?.className)}>
                              {expirationInfo ? expirationInfo.label : displayItem.date_expire}
                            </span>
                          </div>
                        )}
                        {displayItem.group_year && (
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Year</span>
                            <span className="text-sm font-medium">{displayItem.group_year}</span>
                          </div>
                        )}
                        {displayItem.is_internal && (
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Internal Asset</span>
                            <span className="text-sm font-medium">Yes</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Custom Attributes — only show attrs with a value */}
                {(() => {
                  const filledAttrs = attributes.filter(attr => {
                    const value = attributeValues[attr.id];
                    return value !== null && value !== undefined && value !== "";
                  });
                  if (filledAttrs.length === 0) return null;
                  return (
                    <>
                      <Separator />
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          Custom Attributes
                        </h4>
                        <div className="space-y-3 pl-6">
                          {filledAttrs.map((attr) => {
                            const value = attributeValues[attr.id];
                            let displayValue: React.ReactNode = value;
                            if (attr.type === "boolean") {
                              displayValue = value === "true" ? "Yes" : "No";
                            } else if (attr.type === "date") {
                              try {
                                displayValue = format(new Date(value!), "PPP");
                              } catch {
                                displayValue = value;
                              }
                            }
                            return (
                              <div key={attr.id} className="flex justify-between">
                                <span className="text-sm text-muted-foreground">{attr.name}</span>
                                <span className="text-sm font-medium">{displayValue}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  );
                })()}

                {/* Timestamps */}
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      Last updated {displayItem.updated_at ? formatDateTime(displayItem.updated_at) : "Unknown"}
                    </span>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="history" className="mt-0 animate-fade-in">
              <ItemHistoryTab item={displayItem} />
            </TabsContent>
          </Tabs>
        )}
        </div>
      </SheetContent>

      {/* Checkout Dialog */}
      <ItemCheckoutDialog
        open={checkoutDialogOpen}
        onOpenChange={setCheckoutDialogOpen}
        item={item}
        onSuccess={() => {
          refetchCheckouts();
          refetchItemQuantities(); // Manual refetch as backup
          invalidateInventory();
        }}
      />

      {/* Checkin Dialog */}
      <ItemCheckinDialog
        open={checkinDialogOpen}
        onOpenChange={setCheckinDialogOpen}
        checkout={selectedCheckout}
        onSuccess={() => {
          refetchCheckouts();
          refetchItemQuantities(); // Manual refetch as backup
          invalidateInventory();
          setSelectedCheckout(null);
        }}
      />

      {/* Delete Confirmation */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="max-w-sm">
          <div className="flex flex-col items-center text-center gap-3 py-2">
            <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <Trash2 className="h-5 w-5 text-destructive" />
            </div>
            <p className="text-sm font-medium">Delete this item permanently?</p>
            <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
            <div className="flex gap-2 w-full mt-1">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmDeleteOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => {
                  setConfirmDeleteOpen(false);
                  onDelete();
                }}
              >
                Delete Item
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Expanded Image Lightbox */}
      {displayItem.image_url && (
        <Dialog open={imageExpanded} onOpenChange={setImageExpanded}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] sm:max-w-[85vw] p-0 bg-black/95 border-none overflow-hidden flex items-center justify-center">
            <button
              type="button"
              onClick={() => setImageExpanded(false)}
              className="absolute top-3 right-3 z-10 rounded-full bg-black/60 hover:bg-black/80 p-2 text-white transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={displayItem.image_url}
              alt={displayItem.description || "Item"}
              className="max-w-full max-h-[90vh] object-contain select-none"
              draggable={false}
            />
          </DialogContent>
        </Dialog>
      )}
    </Sheet>

    {/* Barcode scanner for edit mode */}
    <BarcodeScannerDrawer
      open={barcodeScannerOpen}
      onOpenChange={setBarcodeScannerOpen}
      onItemFound={(foundItem) => {
        // Use the found item's barcode as the scanned value
        const code = foundItem.barcode || foundItem.serial_number || "";
        if (code) {
          setEditForm(f => ({ ...f, barcode: code }));
        }
        setBarcodeScannerOpen(false);
      }}
      onCodeNotFound={(code) => {
        setEditForm(f => ({ ...f, barcode: code }));
        setBarcodeScannerOpen(false);
      }}
    />
    </>
  );
};
