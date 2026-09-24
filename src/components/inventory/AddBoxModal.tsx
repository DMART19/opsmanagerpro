import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useTourMode } from "@/contexts/TourModeContext";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ChevronRight, Loader2, ScanLine, Shuffle, Camera, Plus, Package, Archive, Layers, LayoutGrid, MoreHorizontal, MapPinOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

import { PhotoUpload } from "@/components/ui/photo-upload";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { CACHE_INVENTORY_QUERY_KEY } from "@/hooks/use-cache-inventory";
import { useWarehouseSections } from "@/hooks/use-warehouse-sections";
import { useContainerAttributes, useContainerAttributeValues } from "@/hooks/use-container-attributes";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useGuidanceContext } from "@/contexts/GuidanceContext";
import { ContainerAttributes, validateContainerAttributes } from "./ContainerAttributes";
import { TaxonomyCombobox } from "@/components/ui/taxonomy-combobox";
import { LocationSearchCombobox, pushRecentLocation } from "@/components/ui/location-search-combobox";
import { ParentContainerCombobox } from "@/components/ui/parent-container-combobox";
import { useSoftRequired } from "@/hooks/use-soft-required";

import { SoftRequiredPrompt } from "@/components/ui/soft-required-prompt";
import { motion, AnimatePresence } from "framer-motion";
import { BarcodeScannerDrawer } from "./BarcodeScannerDrawer";
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

const boxSchema = z.object({
  box_number: z.string().min(1, "Container name is required"),
  box_number_alt: z.string().optional(),
  barcode: z.string().optional(),
  box_description: z.string().optional(),
  section_id: z.string().optional(),
  capacity: z.string().optional(),
  parent_container_id: z.string().optional(),
});

type BoxFormData = z.infer<typeof boxSchema>;

interface AddBoxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateAnother?: () => void;
  box?: any;
}

const CONTAINER_PREFIXES = [
  { prefix: "C-", suffix: () => `${randLetter()}${randDigit()}${randDigit()}` },
  { prefix: "Shelf-", suffix: () => `${randLetter()}${randDigit()}` },
  { prefix: "Bin-", suffix: () => `${randLetter()}${randDigit()}` },
  { prefix: "Rack-", suffix: () => `${randLetter()}${randDigit()}` },
  { prefix: "Bay-", suffix: () => `${randDigit()}${randDigit()}` },
];
const randLetter = () => "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];
const randDigit = () => String(Math.floor(Math.random() * 10));

const generateContainerId = () => {
  const pattern = CONTAINER_PREFIXES[Math.floor(Math.random() * CONTAINER_PREFIXES.length)];
  return pattern.prefix + pattern.suffix();
};

/* ── Compact "Advanced" disclosure for low-value fields ── */
const AdvancedSection = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="pt-1">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground/60 hover:text-muted-foreground transition-colors"
      >
        <ChevronRight className={cn("h-3 w-3 transition-transform", open && "rotate-90")} />
        Advanced settings
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-2.5 space-y-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CONTAINER_TYPES = [
  { id: "box", label: "Box", icon: Package },
  { id: "bin", label: "Bin", icon: Archive },
  { id: "pallet", label: "Pallet", icon: Layers },
  { id: "shelf", label: "Shelf", icon: LayoutGrid },
  { id: "custom", label: "Custom", icon: MoreHorizontal },
] as const;

const CAPACITY_UNITS = ["items", "lbs", "pallets"] as const;
type CapacityUnit = typeof CAPACITY_UNITS[number];

export const AddBoxModal = ({ isOpen, onClose, onCreateAnother, box }: AddBoxModalProps) => {
  const queryClient = useQueryClient();
  const guidance = useGuidanceContext();
  const { sections } = useWarehouseSections();
  const { attributes } = useContainerAttributes();
  const { isTourMode } = useTourMode();
  const { saveValues } = useContainerAttributeValues(box?.id || null);
  const [customAttributes, setCustomAttributes] = useState<Record<string, string | null>>({});
  const [attributeErrors, setAttributeErrors] = useState<Record<string, string>>({});
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [containers, setContainers] = useState<any[]>([]);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [containerType, setContainerType] = useState<string>("box");
  const [capacityUnit, setCapacityUnit] = useState<CapacityUnit>("items");
  const [createAnotherAfterSave, setCreateAnotherAfterSave] = useState(false);

  // Scanner state
  const [scannerOpen, setScannerOpen] = useState(false);
  const [duplicateContainer, setDuplicateContainer] = useState<any | null>(null);
  const [pendingScannedCode, setPendingScannedCode] = useState<string | null>(null);

  // FK state
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [containerStatusId, setContainerStatusId] = useState<string | null>(null);
  const [containerGroupId, setContainerGroupId] = useState<string | null>(null);
  const locationRef = useRef<HTMLDivElement>(null);
  const pendingSubmitRef = useRef<BoxFormData | null>(null);

  const form = useForm<BoxFormData>({
    resolver: zodResolver(boxSchema),
    defaultValues: {
      box_number: "",
      box_number_alt: "",
      barcode: "",
      box_description: "",
      section_id: "",
      capacity: "",
      parent_container_id: "",
    },
  });

  // Auto-focus name field on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Load existing containers for parent selector
  useEffect(() => {
    if (!isOpen) return;
    const loadContainers = async () => {
      const { data } = await supabase
        .from("cache_inventory")
        .select("id, box_number, description, container_id")
        .eq("asset_type", "container")
        .order("box_number");
      
      if (!data) { setContainers([]); return; }
      
      if (box?.id) {
        const excludeIds = new Set<string>([box.id]);
        const collectDescendants = (parentId: string) => {
          data.forEach(c => {
            if (c.container_id === parentId && !excludeIds.has(c.id)) {
              excludeIds.add(c.id);
              collectDescendants(c.id);
            }
          });
        };
        collectDescendants(box.id);
        setContainers(data.filter(c => !excludeIds.has(c.id)));
      } else {
        setContainers(data);
      }
    };
    loadContainers();
  }, [isOpen, box?.id]);

  useEffect(() => {
    if (box) {
      form.reset({
        box_number: box.box_number,
        box_number_alt: box.box_number_alt || "",
        barcode: box.barcode || "",
        box_description: box.box_description || box.description || "",
        section_id: box.section_id || box.section || "",
        capacity: box.capacity?.toString() || "",
        parent_container_id: box.container_id || "",
      });
      setCategoryId(box.category_id || null);
      setContainerStatusId(box.container_status_id || null);
      setContainerGroupId(box.container_group_id || null);
      if (box.custom_data) {
        setCustomAttributes(box.custom_data as Record<string, string | null>);
      }
      setImageUrl(box.image_url || null);
    } else {
      // Smart defaults: recall last-used location & parent container
      const lastLocation = localStorage.getItem("container_last_location") || "";
      const lastParent = localStorage.getItem("container_last_parent") || "";
      const lastType = localStorage.getItem("container_last_type") || "box";
      const lastUnit = (localStorage.getItem("container_last_unit") as CapacityUnit) || "items";
      form.reset({
        box_number: generateContainerId(),
        box_number_alt: "",
        barcode: "",
        box_description: "",
        section_id: lastLocation,
        capacity: "",
        parent_container_id: lastParent,
      });
      setCustomAttributes({});
      setAttributeErrors({});
      setImageUrl(null);
      setCategoryId(null);
      setContainerStatusId(null);
      setContainerGroupId(null);
      setContainerType(lastType);
      setCapacityUnit(CAPACITY_UNITS.includes(lastUnit) ? lastUnit : "items");
    }
  }, [box?.id, isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Soft-required: Location
  const sectionIdValue = form.watch("section_id");
  const boxNumberValue = form.watch("box_number");
  const softRequiredFields = useMemo(() => [
    {
      key: "location",
      label: "Location",
      hint: "Adding a location helps track container placement.",
      defaultValue: "__skip__",
      value: sectionIdValue,
    },
  ], [sectionIdValue]);

  const softRequired = useSoftRequired(softRequiredFields);

  // ── Barcode scan handler ──
  const handleScanCode = useCallback(async (code: string) => {
    // Check if a container with this barcode/box_number already exists
    const { data: existing } = await supabase
      .from("cache_inventory")
      .select("id, box_number, description, barcode")
      .eq("asset_type", "container")
      .or(`barcode.eq.${code},box_number.eq.${code}`)
      .limit(1);

    if (existing && existing.length > 0) {
      setDuplicateContainer(existing[0]);
      setPendingScannedCode(code);
    } else {
      // No duplicate — populate the name field with the scanned code
      form.setValue("box_number", code);
      form.setValue("barcode", code);
      setScannerOpen(false);
      toast({ title: "Code scanned", description: `"${code}" applied to container.` });
      setTimeout(() => nameInputRef.current?.focus(), 150);
    }
  }, [form]);

  const handleDuplicateOpenExisting = () => {
    const id = duplicateContainer?.id;
    setDuplicateContainer(null);
    setPendingScannedCode(null);
    setScannerOpen(false);
    onClose();
    if (id) navigate(`/assets?item=${id}`);
  };

  const handleDuplicateCreateAnyway = () => {
    const code = pendingScannedCode;
    setDuplicateContainer(null);
    setPendingScannedCode(null);
    setScannerOpen(false);
    if (code) {
      form.setValue("box_number", code);
      form.setValue("barcode", code);
    }
    setTimeout(() => nameInputRef.current?.focus(), 150);
  };

  const handleFormSubmit = (data: BoxFormData) => {
    pendingSubmitRef.current = data;
    if (!softRequired.checkBeforeSave()) return;
    doSubmit(data);
  };

  const handleSoftAddNow = () => {
    softRequired.handleAddNow();
    locationRef.current?.querySelector("button")?.focus();
  };

  const handleSoftSkip = () => {
    softRequired.handleSkip();
    const data = pendingSubmitRef.current;
    if (data) doSubmit(data);
  };

  const getAvailableParentContainers = () => {
    if (!box) return containers;
    return containers.filter(c => c.id !== box.id);
  };

  const doSubmit = async (data: BoxFormData) => {
    const { isValid, errors } = validateContainerAttributes(attributes, customAttributes);
    if (!isValid) {
      setAttributeErrors(errors);
      return;
    }
    setAttributeErrors({});

    if (data.parent_container_id && box && data.parent_container_id === box.id) {
      toast({ title: "Cannot nest a container inside itself", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    const submissionData: any = {
      asset_type: "container",
      box_number: data.box_number,
      box_number_alt: data.box_number_alt || null,
      barcode: data.barcode || null,
      description: data.box_description || null,
      section: data.section_id || null,
      category_id: categoryId || null,
      container_status_id: containerStatusId || null,
      container_group_id: containerGroupId || null,
      container_id: data.parent_container_id || null,
      custom_data: {
        ...(Object.keys(customAttributes).length > 0 ? customAttributes : {}),
        __container_type: containerType,
        __capacity_unit: capacityUnit,
      },
      image_url: imageUrl,
      quantity_available: 0,
      quantity_out: 0,
      is_internal: false,
    };

    let createdId: string | null = null;
    try {
      if (box) {
        const { error } = await supabase
          .from("cache_inventory")
          .update(submissionData)
          .eq("id", box.id);
        if (error) throw error;
        if (Object.keys(customAttributes).length > 0) {
          await saveValues.mutateAsync({ containerId: box.id, values: customAttributes });
        }
        createdId = box.id;
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("You must be logged in");
        submissionData.user_id = user.id;
        
        const { data: newRow, error } = await supabase
          .from("cache_inventory")
          .insert([submissionData])
          .select()
          .single();
        if (error) throw error;
        if (newRow && Object.keys(customAttributes).length > 0) {
          await saveValues.mutateAsync({ containerId: newRow.id, values: customAttributes });
        }
        createdId = newRow?.id || null;
      }
      
      queryClient.invalidateQueries({ queryKey: CACHE_INVENTORY_QUERY_KEY });
      // Notify guidance engine
      if (!box) guidance.recordCompletion("has_container");
      if (data.section_id) {
        pushRecentLocation(data.section_id);
        localStorage.setItem("container_last_location", data.section_id);
      }
      if (data.parent_container_id) {
        localStorage.setItem("container_last_parent", data.parent_container_id);
      } else {
        localStorage.removeItem("container_last_parent");
      }
      localStorage.setItem("container_last_type", containerType);
      localStorage.setItem("container_last_unit", capacityUnit);
      
      
      
      if (isTourMode) {
        const { showDemoSaveToast } = await import("@/lib/demo-toast");
        showDemoSaveToast(box ? "Container updated" : "Container created");
      } else if (box) {
        toast({ title: "Container updated" });
      } else {
        toast({
          title: "Container created",
          description: data.box_number,
          duration: 3500,
        });
      }

      if (createAnotherAfterSave && !box) {
        // Reset for next entry, keep modal open
        setCreateAnotherAfterSave(false);
        const lastLocation = data.section_id || "";
        form.reset({
          box_number: generateContainerId(),
          box_number_alt: "",
          barcode: "",
          box_description: "",
          section_id: lastLocation,
          capacity: "",
          parent_container_id: data.parent_container_id || "",
        });
        setCustomAttributes({});
        setImageUrl(null);
        setTimeout(() => nameInputRef.current?.focus(), 80);
      } else {
        onClose();
      }
    } catch (err: any) {
      const isNetworkError = err.message?.includes("Load failed") || err.message?.includes("Failed to fetch");
      toast({ 
        title: "Error", 
        description: isNetworkError ? "Network issue. Please check your connection and try again." : err.message, 
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditing = !!box;
  const availableParents = getAvailableParentContainers();

  const formContent = (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleFormSubmit)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && (e.target as HTMLElement).tagName !== "TEXTAREA") {
            e.preventDefault();
            const active = document.activeElement;
            // Name field → open location picker
            if (active === nameInputRef.current) {
              const locationBtn = locationRef.current?.querySelector("button");
              if (locationBtn) { locationBtn.click(); return; }
            }
            // Any other field → submit if name is filled
            const nameVal = form.getValues("box_number");
            if (nameVal?.trim()) {
              form.handleSubmit(handleFormSubmit)();
            }
          }
        }}
        className="flex flex-col min-h-0 flex-1"
      >
        <div className={cn("flex-1 min-h-0 overflow-y-auto overscroll-contain", isMobile ? "-mx-6 px-6" : "-mx-2 px-2")}>
          <div className="pb-2 px-1">

            {/* ── PRIMARY: Quick Create fields only ── */}
            <div className="space-y-2.5 pb-2.5">
              <FormField
                control={form.control}
                name="box_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-muted-foreground">Container Name</FormLabel>
                    <FormControl>
                      <div className="flex gap-2 items-center">
                        <Input 
                          {...field}
                          ref={(e) => {
                            field.ref(e);
                            (nameInputRef as any).current = e;
                          }}
                          placeholder="e.g. Shelf A-3, Bin-C3"
                          className={cn(
                            "h-12 text-lg font-medium flex-1",
                            "border-border/20 bg-muted/5 rounded-xl",
                            "focus-visible:ring-1 focus-visible:ring-primary/30 focus-visible:border-primary/40",
                            "placeholder:text-muted-foreground/30"
                          )}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-12 px-3 shrink-0 gap-1.5 rounded-xl border-border/20 text-xs font-medium hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-colors"
                          onClick={() => setScannerOpen(true)}
                          title="Scan barcode or QR code"
                        >
                          <Camera className="h-3.5 w-3.5" />
                          Scan
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-12 px-3 shrink-0 gap-1.5 rounded-xl border-border/20 text-xs font-medium hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-colors"
                          onClick={() => form.setValue("box_number", generateContainerId())}
                          title="Generate a random container name"
                        >
                          <Shuffle className="h-3.5 w-3.5" />
                          Generate
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Type quick-select */}
              <div className="flex flex-wrap gap-1.5">
                {CONTAINER_TYPES.map((t) => {
                  const Icon = t.icon;
                  const active = containerType === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setContainerType(t.id)}
                      className={cn(
                        "flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-medium border transition-all",
                        active
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-muted/5 text-muted-foreground border-border/20 hover:border-border/40 hover:text-foreground"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {/* Location */}
              <div ref={locationRef} className="flex gap-2 items-start">
                <div className="flex-1">
                  <LocationSearchCombobox
                    value={form.watch("section_id") || ""}
                    onChange={(val) => form.setValue("section_id", val)}
                    placeholder="Location — choose or create"
                    className="h-11 border-border/15 bg-muted/5 text-sm rounded-xl"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => form.setValue("section_id", "")}
                  className="h-11 px-3 shrink-0 gap-1.5 rounded-xl text-[11px] font-medium text-muted-foreground hover:text-foreground"
                  title="Skip location for now"
                >
                  <MapPinOff className="h-3.5 w-3.5" />
                  Assign later
                </Button>
              </div>

              {/* Capacity (optional) — flat */}
              <div className="flex gap-2">
                <FormField
                  control={form.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          inputMode="numeric"
                          min="0"
                          placeholder="Capacity (optional) — e.g. 50"
                          className="h-10 border-border/15 bg-muted/5 text-sm rounded-xl"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Select value={capacityUnit} onValueChange={(v) => setCapacityUnit(v as CapacityUnit)}>
                  <SelectTrigger className="h-10 w-[110px] border-border/15 bg-muted/5 text-sm rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CAPACITY_UNITS.map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tracking — single combined ID field */}
              <FormField
                control={form.control}
                name="barcode"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          placeholder="Scan or add ID (optional)"
                          className="h-10 border-border/15 bg-muted/5 text-sm pr-10 rounded-xl"
                          onChange={(e) => {
                            field.onChange(e);
                            // Mirror to alt ID for backward-compat search
                            form.setValue("box_number_alt", e.target.value);
                          }}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setScannerOpen(true)}
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary rounded-lg"
                          title="Scan code"
                        >
                          <ScanLine className="h-4 w-4" />
                        </Button>
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Photo + Notes — flat */}
              <div className="flex gap-3 items-start pt-1">
                <PhotoUpload
                  value={imageUrl}
                  onChange={setImageUrl}
                  folder="containers"
                  size="lg"
                  placeholder="Photo"
                />
                <FormField
                  control={form.control}
                  name="box_description"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Notes — e.g. Rice, Brake Pads"
                          className="h-10 border-border/15 bg-muted/5 text-sm rounded-xl"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Parent Container */}
              {availableParents.length > 0 && (
                <FormField
                  control={form.control}
                  name="parent_container_id"
                  render={({ field }) => (
                    <FormItem>
                      <ParentContainerCombobox
                        value={field.value || ""}
                        onChange={(val) => field.onChange(val)}
                        containers={availableParents}
                        placeholder="Parent container (optional)"
                      />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* ── Advanced (low-value fields) ── */}
            <AdvancedSection>
              <div className={isMobile ? "space-y-2" : "grid grid-cols-3 gap-2"}>
                <TaxonomyCombobox
                  table="custom_categories"
                  value={categoryId}
                  onChange={setCategoryId}
                  placeholder="Category"
                  className="h-10 border-border/15 bg-muted/5 text-sm rounded-xl"
                />
                <TaxonomyCombobox
                  table="container_groups"
                  value={containerGroupId}
                  onChange={setContainerGroupId}
                  placeholder="Group"
                  className="h-10 border-border/15 bg-muted/5 text-sm rounded-xl"
                />
                <TaxonomyCombobox
                  table="container_statuses"
                  value={containerStatusId}
                  onChange={setContainerStatusId}
                  placeholder="Status"
                  className="h-10 border-border/15 bg-muted/5 text-sm rounded-xl"
                />
              </div>
              <ContainerAttributes
                values={customAttributes}
                onChange={setCustomAttributes}
                errors={attributeErrors}
              />
            </AdvancedSection>

          </div>
        </div>

        {/* ── Footer — primary + batch CTA ── */}
        <div className={cn(
          "flex gap-2 pt-3 border-t border-border/10 mt-auto shrink-0 bg-background",
          isMobile ? "flex-col" : "justify-end items-center"
        )}>
          {!isEditing && (
            <Button
              type="submit"
              variant="outline"
              disabled={isSubmitting || !boxNumberValue?.trim()}
              onClick={() => setCreateAnotherAfterSave(true)}
              className={cn("h-12 rounded-2xl font-medium gap-2 text-sm border-border/30", isMobile && "order-2")}
            >
              <Plus className="h-4 w-4" />
              Create & Add Another
            </Button>
          )}
          <Button
            type="submit"
            disabled={isSubmitting || !boxNumberValue?.trim()}
            onClick={() => setCreateAnotherAfterSave(false)}
            className={cn("h-12 rounded-2xl font-medium gap-2 text-sm px-6", isMobile && "order-1")}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEditing ? "Saving..." : "Creating..."}
              </>
            ) : (
              isEditing ? "Save Changes" : "Create Container"
            )}
          </Button>
        </div>
      </form>
    </Form>
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
      onItemFound={(item) => {
        // Found an existing container — treat as duplicate
        setDuplicateContainer(item);
        setPendingScannedCode(item.barcode || item.box_number || "");
      }}
      onCodeNotFound={(code) => {
        // No match — use the code
        form.setValue("box_number", code);
        form.setValue("barcode", code);
        setScannerOpen(false);
        toast({ title: "Code scanned", description: `"${code}" applied to container.` });
        setTimeout(() => nameInputRef.current?.focus(), 150);
      }}
    />
  );

  const duplicateDialog = (
    <AlertDialog open={!!duplicateContainer} onOpenChange={(open) => { if (!open) { setDuplicateContainer(null); setPendingScannedCode(null); } }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>This container already exists</AlertDialogTitle>
          <AlertDialogDescription>
            A container named <span className="font-medium text-foreground">"{duplicateContainer?.box_number}"</span> was found with this code.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => { setDuplicateContainer(null); setPendingScannedCode(null); }}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction className="bg-secondary text-secondary-foreground hover:bg-secondary/80" onClick={handleDuplicateOpenExisting}>
            Open Container
          </AlertDialogAction>
          <AlertDialogAction onClick={handleDuplicateCreateAnyway}>
            Create New Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (isMobile) {
    return (
      <>
        <Sheet open={isOpen} onOpenChange={onClose}>
          <SheetContent 
            side="bottom" 
            className="max-h-[80vh] h-auto flex flex-col rounded-t-3xl pb-[env(safe-area-inset-bottom)] overflow-hidden shadow-2xl"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <SheetHeader className="text-left pb-2 shrink-0">
              <SheetTitle className="text-lg">
                {isEditing ? "Edit Container" : "New Container"}
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground/60">
                Name is required — everything else is optional.
              </SheetDescription>
            </SheetHeader>
            {formContent}
          </SheetContent>
        </Sheet>
        {promptElement}
        {scannerElement}
        {duplicateDialog}
      </>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent 
          className="max-w-md max-h-[85vh] flex flex-col gap-3 overflow-hidden rounded-2xl shadow-2xl shadow-black/8 border-border/20"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader className="shrink-0 space-y-0.5">
            <DialogTitle className="text-lg">
              {isEditing ? "Edit Container" : "New Container"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground/60">
              Name is required — everything else is optional.
            </DialogDescription>
          </DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>
      {promptElement}
      {scannerElement}
      {duplicateDialog}
    </>
  );
};
