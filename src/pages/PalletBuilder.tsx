import { useState, useMemo, useCallback, useRef, useEffect, createContext, useContext, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { LegalFooter } from "@/components/LegalFooter";
import { useDeviceType } from "@/hooks/use-device-type";
import { PalletBuilderCanvas } from "@/components/pallet-builder/PalletBuilderCanvas";
import { PalletBuilderSidebar } from "@/components/pallet-builder/PalletBuilderSidebar";
import { PalletBuilderToolbar } from "@/components/pallet-builder/PalletBuilderToolbar";
import { PalletHealthPanel } from "@/components/pallet-builder/PalletHealthPanel";
import { LiveMetricsHeader } from "@/components/pallet-builder/LiveMetricsHeader";
import { PalletEmptyState } from "@/components/pallet-builder/PalletEmptyState";
import { SelectedInventoryBar } from "@/components/pallet-builder/SelectedInventoryBar";
import { SuggestedPlacementPanel } from "@/components/pallet-builder/SuggestedPlacementPanel";
import { AutoArrangeResultCard, type AutoArrangeImpact } from "@/components/pallet-builder/AutoArrangeResultCard";
import { DesktopOnlyGate } from "@/components/pallet-builder/DesktopOnlyGate";
import { MobilePalletHeader } from "@/components/pallet-builder/MobilePalletHeader";
import { MobileBuildChecklist } from "@/components/pallet-builder/MobileBuildChecklist";
import { MobilePalletActionBar, type MobilePalletPrimaryAction } from "@/components/pallet-builder/MobilePalletActionBar";
import { DimensionCaptureModal, type DimensionCaptureResult } from "@/components/pallet-builder/DimensionCaptureModal";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
const ExportModal = lazy(() => import("@/components/pallet-builder/ExportModal").then(m => ({ default: m.ExportModal })));
import { SavedBuildsPanel } from "@/components/pallet-builder/SavedBuildsPanel";
import { UnsavedChangesDialog } from "@/components/pallet-builder/UnsavedChangesDialog";
import { useCustomPallets, CustomPallet } from "@/hooks/use-custom-pallets";
import { useSavedPalletBuilds, SavedPalletBuild } from "@/hooks/use-saved-pallet-builds";
import { useLayoutPlannerSummary } from "@/components/layout-planner/LayoutPlannerContext";
import { useCacheInventory } from "@/hooks/use-cache-inventory";
import { cn } from "@/lib/utils";
import { Package } from "lucide-react";

import { useTourMode } from "@/contexts/TourModeContext";
import { useFeatureGate } from "@/components/feature-locks";
import { PermissionGuardedPage } from "@/components/permissions/PermissionGuardedPage";
import { FeatureLockModal } from "@/components/feature-locks/FeatureLockModal";

import { PlacedCase, PalletLibraryItem } from "@/types/pallet-builder";
import { autoLoadPallet, AutoLoadItem, type AutoLoadStrategy, smartLayoutPallet } from "@/lib/pallet-auto-load";
import { buildPalletHealthReport, type PalletRecommendation } from "@/lib/pallet-recommendations";
import { suggestPlacement } from "@/lib/pallet-suggest-placement";
import { creditAutoPlacement } from "@/lib/pallet-time-saved";
import { getWeightDistribution } from "@/lib/pallet-spatial-warnings";
import { toast } from "sonner";
import { FeatureDiscoveryCard } from "@/components/discovery";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface PalletConfig {
  id: string;
  name: string;
  width: number;
  length: number;
  maxWeight: number;
}

// Sidebar collapse context
interface SidebarCollapseContextValue {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}
const SidebarCollapseContext = createContext<SidebarCollapseContextValue>({
  collapsed: false,
  setCollapsed: () => {},
});
export const usePalletSidebarCollapse = () => useContext(SidebarCollapseContext);

// Built-in standard pallet types always available
const BUILTIN_PALLETS: CustomPallet[] = [
  {
    id: "builtin-gma-48x40",
    name: "Standard GMA 48×40",
    width: 48,
    length: 40,
    height: 6,
    max_weight: 2800,
    pallet_type: "Wood",
    created_by: null,
    created_at: "",
    updated_at: "",
  },
  {
    id: "builtin-euro-800x1200",
    name: "EUR Pallet 31.5×47.2",
    width: 31.5,
    length: 47.24,
    height: 5.7,
    max_weight: 3300,
    pallet_type: "Wood",
    created_by: null,
    created_at: "",
    updated_at: "",
  },
  {
    id: "builtin-half-48x20",
    name: "Half Pallet 48×20",
    width: 48,
    length: 20,
    height: 6,
    max_weight: 1400,
    pallet_type: "Wood",
    created_by: null,
    created_at: "",
    updated_at: "",
  },
];

// Demo items with complete dimensions for testing
const DEMO_LIBRARY_ITEMS: PalletLibraryItem[] = [
  {
    id: "demo-item-1",
    sourceId: "demo-item-1",
    source: "item",
    name: "Office Supplies Box",
    subtitle: "Office",
    category: "Office",
    condition: "good",
    length: 18,
    width: 12,
    height: 10,
    weight: 35,
    fragile: false,
    allowRotation: true,
  },
  {
    id: "demo-item-2",
    sourceId: "demo-item-2",
    source: "item",
    name: "Tool Kit Case",
    subtitle: "Tools",
    category: "Tools",
    condition: "good",
    length: 24,
    width: 18,
    height: 16,
    weight: 120,
    fragile: false,
    allowRotation: true,
  },
  {
    id: "demo-item-3",
    sourceId: "demo-item-3",
    source: "item",
    name: "LED Light Fixture",
    subtitle: "Lighting",
    category: "Lighting",
    condition: "good",
    length: 14,
    width: 14,
    height: 12,
    weight: 45,
    fragile: true,
    allowRotation: true,
  },
  {
    id: "demo-container-1",
    sourceId: "demo-container-1",
    source: "container",
    name: "Storage Tote A",
    subtitle: "Storage",
    category: "Storage",
    condition: "good",
    length: 20,
    width: 16,
    height: 14,
    weight: 65,
    fragile: false,
    allowRotation: true,
  },
  {
    id: "demo-item-4",
    sourceId: "demo-item-4",
    source: "item",
    name: "Small Parts Bin",
    subtitle: "Hardware",
    category: "Hardware",
    condition: "good",
    length: 10,
    width: 8,
    height: 6,
    weight: 15,
    fragile: false,
    allowRotation: true,
  },
  {
    id: "demo-container-2",
    sourceId: "demo-container-2",
    source: "container",
    name: "Shipping Box B",
    subtitle: "Shipping",
    category: "Shipping",
    condition: "good",
    length: 22,
    width: 14,
    height: 10,
    weight: 40,
    fragile: false,
    allowRotation: true,
  },
];

const PalletBuilder = ({ embedded = false }: { embedded?: boolean } = {}) => {
  const deviceType = useDeviceType();
  const navigate = useNavigate();
  const { isTourMode } = useTourMode();
  const featureGate = useFeatureGate();
  const isPalletLocked = featureGate?.isLocked ?? false;
  const lockedPlanName = featureGate?.requiredPlan ?? "";
  const [lockModalOpen, setLockModalOpen] = useState(false);
  
  // Core state — auto-select default pallet (Standard GMA 48×40)
  const [selectedPallet, setSelectedPallet] = useState<PalletConfig | null>({
    id: "builtin-gma-48x40",
    name: "Standard GMA 48×40",
    width: 48,
    length: 40,
    maxWeight: 2800,
  });
  const [placedCases, setPlacedCases] = useState<PlacedCase[]>([]);
  const [selectedLayer, setSelectedLayer] = useState(1);
  const [strictMode, setStrictMode] = useState(false);
  const [autoLoadStrategy, setAutoLoadStrategy] = useState<AutoLoadStrategy>("best_fit");
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [insightsCollapsed, setInsightsCollapsed] = useState(false);
  // Local demo pallets created in-session
  const [localPallets, setLocalPallets] = useState<CustomPallet[]>([]);
  // Click-to-place mode
  const [clickPlaceItem, setClickPlaceItem] = useState<PalletLibraryItem | null>(null);

  // Mobile-only: when the user taps "+" on an item that has no dimensions yet,
  // we open the DimensionCaptureModal and remember the item so we can place it
  // once they confirm the size.
  const [pendingMobileDimItem, setPendingMobileDimItem] = useState<PalletLibraryItem | null>(null);
  // Counter the mobile sidebar listens to so we can pop the pallet picker open
  // when the user tries to add an item before choosing a pallet.
  const [palletPickerSignal, setPalletPickerSignal] = useState(0);

  // Active build tracking
  const [activeBuildId, setActiveBuildId] = useState<string | null>(null);
  const [activeBuildName, setActiveBuildName] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  // Snapshot of placed cases at load/save time for dirty tracking
  const snapshotRef = useRef<string>("");

  // Auto Arrange transparency card
  const [autoArrangeResult, setAutoArrangeResult] = useState<AutoArrangeImpact | null>(null);
  const preAutoArrangeRef = useRef<PlacedCase[] | null>(null);
  const healthPanelRef = useRef<HTMLDivElement | null>(null);

  // Unsaved changes dialog
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false);
  const pendingLoadRef = useRef<SavedPalletBuild | null>(null);
  
  // Data hooks
  const { customPallets: dbPallets, loading: loadingPallets, createCustomPallet } = useCustomPallets();
  const { savedBuilds, savePalletBuild, updatePalletBuild, deleteSavedBuild, loading: loadingBuilds } = useSavedPalletBuilds();
  const { items: inventoryItems, loading: loadingInventory } = useCacheInventory();
  const containers = inventoryItems.filter(i => i.asset_type === "container");

  // Merge built-in + db + local pallets
  const allPallets = useMemo(() => {
    const dbIds = new Set(dbPallets.map(p => p.id));
    return [
      ...BUILTIN_PALLETS.filter(b => !dbIds.has(b.id)),
      ...dbPallets,
      ...localPallets.filter(l => !dbIds.has(l.id)),
    ];
  }, [dbPallets, localPallets]);

  // Mark dirty when placed cases change from snapshot
  const markSnapshot = useCallback((cases: PlacedCase[]) => {
    snapshotRef.current = JSON.stringify(cases.map(c => ({ id: c.id, x: c.x, y: c.y, z: c.z, rotation: c.rotation })));
  }, []);

  const checkDirty = useCallback((cases: PlacedCase[]) => {
    const current = JSON.stringify(cases.map(c => ({ id: c.id, x: c.x, y: c.y, z: c.z, rotation: c.rotation })));
    return current !== snapshotRef.current;
  }, []);

  // Handle creating a pallet type
  const handleCreatePallet = useCallback(async (palletData: {
    name: string;
    width: number;
    length: number;
    height?: number;
    max_weight: number;
    pallet_type: string;
  }) => {
    if (isPalletLocked) {
      console.warn("Feature access blocked: Pallet Builder requires " + lockedPlanName + " plan");
      setLockModalOpen(true);
      return null;
    }
    if (isTourMode) {
      const newPallet: CustomPallet = {
        id: `local-${Date.now()}`,
        name: palletData.name,
        width: palletData.width,
        length: palletData.length,
        height: palletData.height ?? null,
        max_weight: palletData.max_weight,
        pallet_type: palletData.pallet_type,
        created_by: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setLocalPallets(prev => [...prev, newPallet]);
      toast.success("Custom pallet created");
      setSelectedPallet({
        id: newPallet.id,
        name: newPallet.name,
        width: newPallet.width,
        length: newPallet.length,
        maxWeight: newPallet.max_weight,
      });
      setPlacedCases([]);
      setActiveBuildId(null);
      setActiveBuildName(null);
      setIsDirty(false);
      markSnapshot([]);
      return newPallet;
    } else {
      const result = await createCustomPallet(palletData);
      if (result) {
        setSelectedPallet({
          id: result.id,
          name: result.name,
          width: result.width,
          length: result.length,
          maxWeight: result.max_weight,
        });
        setPlacedCases([]);
        setActiveBuildId(null);
        setActiveBuildName(null);
        setIsDirty(false);
        markSnapshot([]);
      }
      return result;
    }
  }, [isTourMode, createCustomPallet, markSnapshot]);

  // Build unified library items
  const libraryItems = useMemo<PalletLibraryItem[]>(() => {
    if (isTourMode) {
      return DEMO_LIBRARY_ITEMS;
    }

    const items: PalletLibraryItem[] = [];

    for (const inv of inventoryItems) {
      items.push({
        id: `item-${inv.id}`,
        sourceId: inv.id,
        source: "item",
        name: inv.description || inv.id_cache_tf || inv.id_cache_fema || "Unnamed Item",
        subtitle: inv.subcategory || undefined,
        category: inv.subcategory || undefined,
        condition: inv.status_item,
        length: null,
        width: null,
        height: null,
        weight: null,
        fragile: false,
        allowRotation: true,
        quantityAvailable: inv.quantity_available ?? null,
      });
    }

    for (const box of containers) {
      items.push({
        id: `container-${box.id}`,
        sourceId: box.id,
        source: "container",
        name: box.box_number || box.description || "Container",
        subtitle: box.container_type_name || undefined,
        category: box.container_type_name || undefined,
        condition: box.container_status_name || box.status_item || undefined,
        length: null,
        width: null,
        height: null,
        weight: null,
        fragile: false,
        allowRotation: true,
        quantityAvailable: null,
      });
    }

    return items;
  }, [isTourMode, inventoryItems, containers]);

  // Computed metrics
  const metrics = useMemo(() => {
    const totalWeight = placedCases.reduce((sum, c) => sum + c.weight, 0);
    const maxWeight = selectedPallet?.maxWeight || 0;
    const itemCount = placedCases.length;
    const layers = placedCases.length > 0 
      ? Math.max(...placedCases.map(c => c.z)) 
      : 0;
    
    return {
      totalWeight,
      maxWeight,
      weightUsage: maxWeight > 0 ? Math.round((totalWeight / maxWeight) * 100) : 0,
      itemCount,
      layers,
    };
  }, [placedCases, selectedPallet]);

  // Area utilization for header + health panel
  const utilization = useMemo(() => {
    if (!selectedPallet || placedCases.length === 0) return 0;
    const area = selectedPallet.width * selectedPallet.length;
    const used = placedCases.reduce((s, c) => {
      const w = c.rotation === 90 || c.rotation === 270 ? c.length : c.width;
      const l = c.rotation === 90 || c.rotation === 270 ? c.width : c.length;
      return s + w * l;
    }, 0);
    return Math.min(100, Math.round((used / area) * 100));
  }, [selectedPallet, placedCases]);

  // Pallet health report — the source of truth for warnings + recommendations
  const healthReport = useMemo(() => {
    if (!selectedPallet) {
      return {
        status: "healthy" as const,
        verdict: "Select a pallet to start",
        confidence: 100,
        checks: [],
        recommendations: [],
      };
    }
    return buildPalletHealthReport(
      placedCases,
      selectedPallet.width,
      selectedPallet.length,
      selectedPallet.maxWeight,
      strictMode,
    );
  }, [placedCases, selectedPallet, strictMode]);

  // Suggested placement for currently-picked inventory item
  const suggestion = useMemo(() => {
    if (!clickPlaceItem || !selectedPallet) return null;
    return suggestPlacement(clickPlaceItem, {
      palletWidth: selectedPallet.width,
      palletLength: selectedPallet.length,
      maxWeight: selectedPallet.maxWeight,
      placed: placedCases,
    });
  }, [clickPlaceItem, selectedPallet, placedCases]);

  // Suggested inventory for empty state — items with dimensions, heaviest first
  const emptyStateSuggestions = useMemo(() => {
    return libraryItems
      .slice()
      .sort((a, b) => {
        const ar = (a.width && a.length && a.height && a.weight != null) ? 1 : 0;
        const br = (b.width && b.length && b.height && b.weight != null) ? 1 : 0;
        if (ar !== br) return br - ar;
        return (b.weight ?? 0) - (a.weight ?? 0);
      })
      .slice(0, 5);
  }, [libraryItems]);

  // Push pallet-builder stats into the shared Layout Planner summary header.
  const { setSummary } = useLayoutPlannerSummary();
  useEffect(() => {
    const warnings = (healthReport.recommendations || []).filter(
      (r: any) => r.severity === "critical" || r.severity === "warning"
    ).length;
    setSummary({
      inventory: libraryItems.length,
      palletsBuilt: savedBuilds.length,
      weightLbs: metrics.totalWeight,
      utilization,
      warnings,
    });
  }, [setSummary, libraryItems.length, savedBuilds.length, metrics.totalWeight, utilization, healthReport.recommendations]);

  // Handlers
  const handleSelectPallet = useCallback((pallet: PalletConfig) => {
    if (placedCases.length > 0) {
      const confirmed = window.confirm(
        "Changing pallet type will clear placed items. Continue?"
      );
      if (!confirmed) return;
    }
    setSelectedPallet(pallet);
    setPlacedCases([]);
    setSelectedLayer(1);
    setActiveBuildId(null);
    setActiveBuildName(null);
    setIsDirty(false);
    markSnapshot([]);
    toast.success(`Selected ${pallet.name} (${pallet.width}" × ${pallet.length}")`);
  }, [placedCases.length, markSnapshot]);

  const handleUpdateCases = useCallback((cases: PlacedCase[]) => {
    setPlacedCases(cases);
    setIsDirty(checkDirty(cases));
  }, [checkDirty]);

  const handleClearAll = useCallback(() => {
    if (placedCases.length === 0) return;
    const confirmed = window.confirm("Remove all items from the pallet?");
    if (confirmed) {
      setPlacedCases([]);
      setIsDirty(checkDirty([]));
      toast.success("Pallet cleared");
    }
  }, [placedCases.length, checkDirty]);

  // ── Apply a recommendation's deterministic fix ──
  const handleApplyRecommendation = useCallback((rec: PalletRecommendation) => {
    if (!rec.apply) return;
    const next = rec.apply(placedCases);
    setPlacedCases(next);
    setIsDirty(checkDirty(next));
    toast.success("Fix applied", { description: rec.title });
  }, [placedCases, checkDirty]);

  // ── Place selected inventory item using suggested placement ──
  const handlePlaceSuggested = useCallback(() => {
    if (!clickPlaceItem || !selectedPallet) return;
    placeItemNow(clickPlaceItem);
    setClickPlaceItem(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clickPlaceItem, selectedPallet, placedCases, checkDirty]);

  // ── Place a specific item immediately (mobile "+" tap, one-shot quick add) ──
  const placeItemNow = useCallback((item: PalletLibraryItem) => {
    if (!selectedPallet) {
      // Pop the mobile pallet picker instead of throwing an error toast the
      // user can't act on. Also scroll the page back to the picker.
      setPalletPickerSignal((n) => n + 1);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      toast.message("Pick a pallet size to start");
      return;
    }
    if (!item.width || !item.length || !item.height || item.weight == null) {
      // Mobile users have no drag-and-drop path. Open the same capture modal
      // the desktop canvas uses so they can enter dims inline and continue.
      setPendingMobileDimItem(item);
      return;
    }
    const s = suggestPlacement(item, {
      palletWidth: selectedPallet.width,
      palletLength: selectedPallet.length,
      maxWeight: selectedPallet.maxWeight,
      placed: placedCases,
    });
    if (!s) {
      toast.error("No room left on this pallet");
      return;
    }
    const placed: PlacedCase = {
      id: `suggest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      caseId: item.name,
      caseType: item.category || "Standard",
      x: s.x, y: s.y, z: s.z, rotation: s.rotation,
      width: item.width,
      length: item.length,
      height: item.height,
      weight: item.weight,
      condition: item.condition || "good",
      fragile: item.fragile || false,
      category: item.category || "General",
      allowRotation: item.allowRotation !== false,
      source: item.source,
      sourceId: item.sourceId,
    };
    const next = [...placedCases, placed];
    setPlacedCases(next);
    setIsDirty(checkDirty(next));
    creditAutoPlacement(1);
    toast.success(`Added ${item.name}`, { description: `Layer ${s.z} · Confidence ${s.confidence}%` });
  }, [selectedPallet, placedCases, checkDirty]);

  // ── Undo last auto-arrange ──
  const handleUndoAutoArrange = useCallback(() => {
    if (!preAutoArrangeRef.current) {
      setAutoArrangeResult(null);
      return;
    }
    const restored = preAutoArrangeRef.current;
    setPlacedCases(restored);
    setIsDirty(checkDirty(restored));
    setAutoArrangeResult(null);
    preAutoArrangeRef.current = null;
    toast.message("Reverted to previous layout");
  }, [checkDirty]);

  // Load a saved build
  const applyBuild = useCallback((build: SavedPalletBuild) => {
    const pd = build.pallet_data;
    
    // Find matching pallet from allPallets
    const matchingPallet = allPallets.find(p => p.id === pd.selectedPalletId);
    const palletConfig: PalletConfig = matchingPallet
      ? { id: matchingPallet.id, name: matchingPallet.name, width: matchingPallet.width, length: matchingPallet.length, maxWeight: matchingPallet.max_weight }
      : { id: pd.selectedPalletId, name: `${pd.palletDimensions.width}″×${pd.palletDimensions.length}″`, width: pd.palletDimensions.width, length: pd.palletDimensions.length, maxWeight: pd.maxWeight };

    setSelectedPallet(palletConfig);
    setPlacedCases(pd.placedCases);
    setSelectedLayer(1);
    setActiveBuildId(build.id);
    setActiveBuildName(build.name);
    markSnapshot(pd.placedCases);
    setIsDirty(false);
    toast.success(`Loaded "${build.name}"`);
  }, [allPallets, markSnapshot]);

  const handleLoadBuild = useCallback((build: SavedPalletBuild) => {
    if (build.id === activeBuildId) return; // Already active

    if (isDirty) {
      pendingLoadRef.current = build;
      setUnsavedDialogOpen(true);
      return;
    }
    applyBuild(build);
  }, [activeBuildId, isDirty, applyBuild]);

  const handleDiscardAndLoad = useCallback(() => {
    setUnsavedDialogOpen(false);
    if (pendingLoadRef.current) {
      applyBuild(pendingLoadRef.current);
      pendingLoadRef.current = null;
    }
  }, [applyBuild]);

  const handleDeleteBuild = useCallback(async (id: string) => {
    await deleteSavedBuild(id);
    if (activeBuildId === id) {
      setActiveBuildId(null);
      setActiveBuildName(null);
    }
  }, [deleteSavedBuild, activeBuildId]);

  const handleAutoLoad = useCallback(() => {
    if (!selectedPallet) {
      toast.error("Select a pallet type first");
      return;
    }

    // If there are items already on the pallet, Auto Build should ONLY
    // re-arrange those exact items into the best leveled layout —
    // never add or remove items.
    if (placedCases.length > 0) {
      const itemsToReplace: AutoLoadItem[] = placedCases
        .filter(c => c.width && c.length && c.height && c.weight)
        .map(c => ({
          id: c.id,
          name: c.caseId,
          width: c.width,
          length: c.length,
          height: c.height,
          weight: c.weight,
          fragile: c.fragile,
          allowRotation: c.allowRotation,
          category: c.category || undefined,
          condition: c.condition || undefined,
          source: c.source,
          sourceId: c.sourceId,
        }));

      const rearranged = autoLoadPallet(itemsToReplace, {
        palletWidth: selectedPallet.width,
        palletLength: selectedPallet.length,
        maxWeight: selectedPallet.maxWeight,
        layer: selectedLayer,
        strictMode,
        strategy: autoLoadStrategy,
        existingItems: [],
      });

      if (rearranged.totalPlaced === 0) {
        toast.error("Cannot auto-arrange", { description: "Items don't fit on this pallet." });
        return;
      }

      const before = placedCases;
      const newCases = rearranged.placed;
      preAutoArrangeRef.current = before;
      setPlacedCases(newCases);
      setIsDirty(checkDirty(newCases));

      const palletArea = selectedPallet.width * selectedPallet.length;
      const usedArea = (cs: PlacedCase[]) => cs.reduce((s, c) => {
        const w = c.rotation === 90 || c.rotation === 270 ? c.length : c.width;
        const l = c.rotation === 90 || c.rotation === 270 ? c.width : c.length;
        return s + w * l;
      }, 0);
      const utilBefore = Math.round((usedArea(before) / palletArea) * 100);
      const utilAfter = Math.min(100, Math.round((usedArea(newCases) / palletArea) * 100));
      const balanceBefore = getWeightDistribution(before, selectedPallet.width, selectedPallet.length).severity;
      const balanceAfter = getWeightDistribution(newCases, selectedPallet.width, selectedPallet.length).severity;
      const balanceImprovement = Math.max(0, Math.round((balanceBefore - balanceAfter) * 100));
      const utilGain = Math.max(0, utilAfter - utilBefore);
      const quality = Math.min(100, Math.round(60 + utilGain * 0.5 + balanceImprovement * 0.3));
      setAutoArrangeResult({
        quality,
        utilizationBefore: utilBefore,
        utilizationAfter: utilAfter,
        balanceImprovementPct: balanceImprovement,
        heightReductionInches: 0,
        conflictsResolved: 0,
        itemsPlaced: rearranged.totalPlaced,
      });

      if (rearranged.totalUnplaced === 0) {
        toast.success(`Re-arranged ${rearranged.totalPlaced} items`, {
          description: "Optimized layout for balance and stability."
        });
      } else {
        toast.warning(`Re-arranged ${rearranged.totalPlaced} of ${rearranged.totalPlaced + rearranged.totalUnplaced} items`, {
          description: `${rearranged.totalUnplaced} item(s) couldn't fit in the optimized layout.`
        });
      }
      return;
    }

    const libReady: AutoLoadItem[] = libraryItems
      .filter(item => item.width && item.width > 0 && item.length && item.length > 0 && item.height && item.height > 0 && item.weight && item.weight > 0)
      .map(item => ({
        id: item.id,
        name: item.name,
        width: item.width!,
        length: item.length!,
        height: item.height!,
        weight: item.weight!,
        fragile: item.fragile,
        allowRotation: item.allowRotation,
        category: item.category || undefined,
        condition: item.condition || undefined,
        source: item.source,
        sourceId: item.sourceId,
      }));

    const readyItems: AutoLoadItem[] = libReady;

    if (readyItems.length === 0) {
      toast.error("Nothing to auto-build yet", {
        description: "Drag at least one item onto the pallet (or add items with dimensions) and Auto Build will fill the rest."
      });
      return;
    }

    const result = autoLoadPallet(readyItems, {
      palletWidth: selectedPallet.width,
      palletLength: selectedPallet.length,
      maxWeight: selectedPallet.maxWeight,
      layer: selectedLayer,
      strictMode,
      strategy: autoLoadStrategy,
      existingItems: placedCases,
    });

    if (result.totalPlaced === 0) {
      const reasons = result.unplaced.map(u => u.reason);
      if (reasons.every(r => r === "weight_exceeded")) {
        toast.error("Cannot auto-load", { description: "All items exceed the remaining weight capacity." });
      } else if (reasons.every(r => r === "too_large")) {
        toast.error("Cannot auto-load", { description: "All items are larger than the pallet." });
      } else {
        toast.error("Cannot auto-load", { description: "No items fit on the pallet — insufficient space, weight, or dimensions." });
      }
      return;
    }

    const before = placedCases;
    const newCases = [...placedCases, ...result.placed];
    preAutoArrangeRef.current = before;
    setPlacedCases(newCases);
    setIsDirty(checkDirty(newCases));
    creditAutoPlacement(result.totalPlaced);

    // Compute transparency impact
    const palletArea = selectedPallet.width * selectedPallet.length;
    const usedArea = (cs: PlacedCase[]) => cs.reduce((s, c) => {
      const w = c.rotation === 90 || c.rotation === 270 ? c.length : c.width;
      const l = c.rotation === 90 || c.rotation === 270 ? c.width : c.length;
      return s + w * l;
    }, 0);
    const utilBefore = Math.round((usedArea(before) / palletArea) * 100);
    const utilAfter = Math.min(100, Math.round((usedArea(newCases) / palletArea) * 100));
    const balanceBefore = getWeightDistribution(before, selectedPallet.width, selectedPallet.length).severity;
    const balanceAfter = getWeightDistribution(newCases, selectedPallet.width, selectedPallet.length).severity;
    const balanceImprovement = Math.max(0, Math.round((balanceBefore - balanceAfter) * 100));
    const utilGain = Math.max(0, utilAfter - utilBefore);
    const quality = Math.min(100, Math.round(60 + utilGain * 0.5 + balanceImprovement * 0.3));
    setAutoArrangeResult({
      quality,
      utilizationBefore: utilBefore,
      utilizationAfter: utilAfter,
      balanceImprovementPct: balanceImprovement,
      heightReductionInches: 0,
      conflictsResolved: 0,
      itemsPlaced: result.totalPlaced,
    });

    if (result.totalUnplaced === 0) {
      toast.success(`Auto-loaded ${result.totalPlaced} items`, {
        description: "All items placed successfully. Feel free to rearrange."
      });
    } else {
      toast.warning(`Placed ${result.totalPlaced} of ${result.totalPlaced + result.totalUnplaced} items`, {
        description: `${result.totalUnplaced} item(s) couldn't fit — check space or weight limits.`
      });
    }
  }, [selectedPallet, libraryItems, placedCases, selectedLayer, strictMode, autoLoadStrategy, checkDirty]);

  const handleSmartLayout = useCallback(() => {
    if (!selectedPallet) {
      toast.error("Select a pallet type first");
      return;
    }

    const layerItems = placedCases.filter(c => c.z === selectedLayer);
    const otherItems = placedCases.filter(c => c.z !== selectedLayer);

    if (layerItems.length === 0) {
      toast.info("No items on this layer to rearrange");
      return;
    }

    const result = smartLayoutPallet(layerItems, {
      palletWidth: selectedPallet.width,
      palletLength: selectedPallet.length,
      maxWeight: selectedPallet.maxWeight,
      layer: selectedLayer,
      strictMode,
    });

    const before = placedCases;
    const newCases = [...otherItems, ...result.placed];
    preAutoArrangeRef.current = before;
    setPlacedCases(newCases);
    setIsDirty(checkDirty(newCases));
    creditAutoPlacement(result.totalPlaced);

    const palletArea = selectedPallet.width * selectedPallet.length;
    const usedArea = (cs: PlacedCase[]) => cs.reduce((s, c) => {
      const w = c.rotation === 90 || c.rotation === 270 ? c.length : c.width;
      const l = c.rotation === 90 || c.rotation === 270 ? c.width : c.length;
      return s + w * l;
    }, 0);
    const utilBefore = Math.round((usedArea(before) / palletArea) * 100);
    const utilAfter = Math.min(100, Math.round((usedArea(newCases) / palletArea) * 100));
    const balanceBefore = getWeightDistribution(before, selectedPallet.width, selectedPallet.length).severity;
    const balanceAfter = getWeightDistribution(newCases, selectedPallet.width, selectedPallet.length).severity;
    setAutoArrangeResult({
      quality: Math.min(100, Math.round(70 + Math.max(0, utilAfter - utilBefore) * 0.5 + Math.max(0, (balanceBefore - balanceAfter) * 100) * 0.3)),
      utilizationBefore: utilBefore,
      utilizationAfter: utilAfter,
      balanceImprovementPct: Math.max(0, Math.round((balanceBefore - balanceAfter) * 100)),
      heightReductionInches: 0,
      conflictsResolved: 0,
      itemsPlaced: result.totalPlaced,
    });

    if (result.totalUnplaced === 0) {
      toast.success(`Layout optimized for balance and fit`, {
        description: `${result.totalPlaced} items arranged. Drag items to fine-tune.`
      });
    } else {
      const reasons = result.unplaced.map(u => u.reason);
      const reasonMsg = reasons.includes("weight_exceeded")
        ? "Some items exceed weight capacity."
        : reasons.includes("too_large")
          ? "Some items are too large for the pallet."
          : "Not enough space for all items.";
      toast.warning(`Placed ${result.totalPlaced} of ${result.totalPlaced + result.totalUnplaced} items`, {
        description: `${result.totalUnplaced} item(s) couldn't fit. ${reasonMsg}`
      });
    }
  }, [selectedPallet, placedCases, selectedLayer, strictMode, checkDirty]);

  const buildPalletData = useCallback(() => {
    if (!selectedPallet) return null;
    return {
      selectedPalletId: selectedPallet.id,
      selectedPalletType: "custom" as const,
      palletDimensions: { width: selectedPallet.width, length: selectedPallet.length },
      maxWeight: selectedPallet.maxWeight,
      placedCases,
    };
  }, [selectedPallet, placedCases]);

  const handleSave = useCallback(async (name: string) => {
    if (isPalletLocked) {
      console.warn("Feature access blocked: pallet_save requires " + lockedPlanName + " plan");
      setLockModalOpen(true);
      throw new Error("Feature locked");
    }
    if (!selectedPallet) {
      toast.error("Select a pallet type first");
      throw new Error("No pallet selected");
    }
    
    if (isTourMode) {
      const { showDemoSaveToast } = await import("@/lib/demo-toast");
      showDemoSaveToast("Build saved");
      return;
    }

    const palletData = buildPalletData();
    if (!palletData) {
      toast.error("Unable to build pallet data");
      throw new Error("No pallet data");
    }

    const result = await savePalletBuild(name, palletData, false);
    if (!result) {
      throw new Error("Save failed");
    }
    
    setActiveBuildId(result.id);
    setActiveBuildName(result.name);
    markSnapshot(placedCases);
    setIsDirty(false);
  }, [selectedPallet, placedCases, savePalletBuild, isTourMode, buildPalletData, markSnapshot]);

  const handleOverwrite = useCallback(async () => {
    if (isPalletLocked) { setLockModalOpen(true); return; }
    if (!activeBuildId || !activeBuildName) return;

    const palletData = buildPalletData();
    if (!palletData) return;

    if (isTourMode) {
      const { showDemoSaveToast } = await import("@/lib/demo-toast");
      showDemoSaveToast("Build updated");
      return;
    }

    const result = await updatePalletBuild(activeBuildId, activeBuildName, palletData);
    if (result) {
      markSnapshot(placedCases);
      setIsDirty(false);
    }
  }, [activeBuildId, activeBuildName, buildPalletData, updatePalletBuild, isTourMode, markSnapshot, placedCases]);

  const handleSaveAsTemplate = useCallback(async (name: string) => {
    if (isPalletLocked) { setLockModalOpen(true); return; }
    if (!selectedPallet) {
      toast.error("Select a pallet type first");
      return;
    }
    
    if (isTourMode) {
      const { showDemoSaveToast } = await import("@/lib/demo-toast");
      showDemoSaveToast("Template saved");
      return;
    }

    const palletData = buildPalletData();
    if (!palletData) return;

    await savePalletBuild(name, palletData, true);
  }, [selectedPallet, savePalletBuild, isTourMode, buildPalletData]);

  // Device type gate
  if (deviceType === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Mobile/tablet now use a stacked layout instead of being blocked.
  const isCompact = deviceType !== "desktop";

  return (
    <PermissionGuardedPage
      permission="use_pallet_builder"
      moduleName="Pallet Builder"
      requiredRoles="Supervisor or Workspace Admin"
    >
    <div className={embedded ? "flex flex-col flex-1 min-h-0" : "min-h-screen bg-background flex flex-col"}>
      {!embedded && <Navigation />}

      <main className="flex-1 hidden lg:flex flex-col min-h-0">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="max-w-[1800px] mx-auto px-6 lg:px-8 py-2 lg:py-2.5">
            {!embedded && (
              <Breadcrumbs items={[
                { label: "Dashboard", href: "/dashboard" },
                { label: "Layout Planner", href: "/layout-planner" },
                { label: "Pallet Builder" }
              ]} />
            )}
            
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-lg font-semibold">Pallet Builder</h1>
                <span className="text-xs text-muted-foreground hidden lg:inline">
                  {!selectedPallet
                    ? "No pallet selected"
                    : placedCases.length === 0
                    ? "Ready to build"
                    : isDirty
                    ? "Unsaved changes"
                    : activeBuildName
                    ? `"${activeBuildName}" saved`
                    : "Ready to save"}
                </span>
              </div>

              <FeatureDiscoveryCard
                discoveryKey="pallet_save_template"
                tip="Save pallet layouts as reusable templates to speed up future builds."
                showAfterVisits={2}
                autoFadeMs={15000}
                className="mb-2"
              />
              
              <PalletBuilderToolbar
                selectedPallet={selectedPallet}
                metrics={metrics}
                strictMode={strictMode}
                onToggleStrictMode={() => setStrictMode(!strictMode)}
                onClearAll={handleClearAll}
                onSave={handleSave}
                onSaveAsTemplate={handleSaveAsTemplate}
                onOverwrite={activeBuildId ? handleOverwrite : undefined}
                onExport={() => setExportModalOpen(true)}
                onSmartLayout={handleSmartLayout}
                hasItems={placedCases.length > 0}
                activeBuildName={activeBuildName}
                isDirty={isDirty}
              />
            </div>
          </div>

        </div>

        {/* Live Metrics Header — always visible above the canvas */}
        <LiveMetricsHeader
          itemCount={metrics.itemCount}
          totalWeight={metrics.totalWeight}
          maxWeight={metrics.maxWeight}
          weightUsage={metrics.weightUsage}
          utilization={utilization}
          layers={metrics.layers}
          warnings={healthReport.recommendations.filter(r => r.severity !== "optimization").length}
          nextAction={healthReport.recommendations[0]?.title ?? null}
          onWarningsClick={() => healthPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          onNextClick={() => {
            const top = healthReport.recommendations[0];
            if (top?.apply) {
              handleApplyRecommendation(top);
            } else {
              healthPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }}
        />

        {/* Main Content — 3-panel CSS Grid: inventory · canvas · insights */}
        <SidebarCollapseContext.Provider value={{ collapsed: sidebarCollapsed, setCollapsed: setSidebarCollapsed }}>
          <div
            className={cn(
              "flex-1 min-h-0 flex flex-col lg:overflow-hidden lg:grid",
              isCompact ? "overflow-y-auto" : "overflow-hidden"
            )}
            style={isCompact ? undefined : {
              gridTemplateColumns: `${sidebarCollapsed ? '0px' : '320px'} minmax(0, 1fr) ${insightsCollapsed ? '40px' : '320px'}`,
              transition: 'grid-template-columns 200ms ease',
            }}
          >
            {/* Left — Inventory & Item Library */}
            <div
              className={cn(
                "overflow-hidden bg-muted/10 relative",
                "order-2 lg:order-1",
                "border-b lg:border-b-0 lg:border-r border-border/40",
                "max-h-[65vh] lg:max-h-none lg:h-full min-h-0 flex flex-col"
              )}
              style={{
                flexShrink: 0,
                overflowX: 'hidden',
                transition: 'opacity 200ms ease, visibility 200ms ease',
                opacity: !isCompact && sidebarCollapsed ? 0 : 1,
                visibility: !isCompact && sidebarCollapsed ? 'hidden' : 'visible',
              }}
              data-tour="item-library"
            >
              <PalletBuilderSidebar
                palletTypes={allPallets}
                selectedPallet={selectedPallet}
                onSelectPallet={handleSelectPallet}
                libraryItems={libraryItems}
                loadingPallets={!isTourMode && loadingPallets}
                loadingItems={!isTourMode && loadingInventory}
                assignmentCounts={(() => {
                  const map: Record<string, number> = {};
                  for (const c of placedCases) {
                    if (!c.sourceId) continue;
                    const key = c.source === "container"
                      ? `container-${c.sourceId}`
                      : `item-${c.sourceId}`;
                    map[key] = (map[key] || 0) + 1;
                  }
                  return map;
                })()}
                onCreatePallet={handleCreatePallet}
                onClickPlace={(item) => placeItemNow(item)}
                onRemoveOneOfItem={(item) => {
                  // Remove the most recently placed case sourced from this item.
                  const key = item.id;
                  const idx = [...placedCases].reverse().findIndex(c => {
                    if (!c.sourceId) return false;
                    const k = c.source === "container" ? `container-${c.sourceId}` : `item-${c.sourceId}`;
                    return k === key;
                  });
                  if (idx === -1) return;
                  const realIdx = placedCases.length - 1 - idx;
                  const next = placedCases.slice(0, realIdx).concat(placedCases.slice(realIdx + 1));
                  handleUpdateCases(next);
                }}
                clickPlaceActive={!!clickPlaceItem}
                hasItems={placedCases.length > 0}
                isSaved={!!activeBuildName && !isDirty}
                onSaveClick={() => {
                  const saveBtn = document.querySelector('[data-save-trigger]') as HTMLButtonElement;
                  saveBtn?.click();
                }}
                onExport={() => setExportModalOpen(true)}
                onClearAll={handleClearAll}
                onSmartLayout={handleSmartLayout}
                canSave={!!selectedPallet && placedCases.length > 0}
                activeBuildName={activeBuildName}
                isDirty={isDirty}
                onOverwrite={activeBuildId ? handleOverwrite : undefined}
                savedBuildsSlot={
                  <SavedBuildsPanel
                    savedBuilds={savedBuilds}
                    loading={loadingBuilds}
                    activeBuildId={activeBuildId}
                    onLoad={handleLoadBuild}
                    onDelete={handleDeleteBuild}
                  />
                }
              />
            </div>

            {/* Center — Canvas (dominant) */}
            <div className="min-w-0 min-h-0 overflow-hidden flex order-1 lg:order-2 h-[55vh] lg:h-auto">
              {/* Canvas Area */}
            <div className="flex-1 min-w-0 min-h-0 overflow-hidden isolate relative flex flex-col" data-tour="pallet-canvas">
                {/* Selected inventory summary — shows what will be placed and
                    surfaces Auto Build as the primary CTA for first-time users. */}
                <SelectedInventoryBar
                  placedCases={placedCases}
                  onAutoBuild={handleAutoLoad}
                  canAutoBuild={!!selectedPallet && libraryItems.length > 0}
                />
                {/* Floating Suggested Placement card — appears when an inventory item is picked */}
                {clickPlaceItem && placedCases.length > 0 && (
                  <div className="absolute top-3 left-3 z-20 w-[320px] max-w-[calc(100%-1.5rem)]">
                    <SuggestedPlacementPanel
                      item={clickPlaceItem}
                      suggestion={suggestion}
                      onPlace={handlePlaceSuggested}
                      onDismiss={() => setClickPlaceItem(null)}
                    />
                  </div>
                )}

                {/* Auto Arrange transparency card */}
                {autoArrangeResult && (
                  <div className="absolute bottom-3 left-3 z-20 w-[320px] max-w-[calc(100%-1.5rem)]">
                    <AutoArrangeResultCard
                      impact={autoArrangeResult}
                      onKeep={() => setAutoArrangeResult(null)}
                      onUndo={handleUndoAutoArrange}
                      onDismiss={() => setAutoArrangeResult(null)}
                    />
                  </div>
                )}
                <PalletBuilderCanvas
                  selectedPallet={selectedPallet}
                  placedCases={placedCases}
                  onUpdateCases={handleUpdateCases}
                  selectedLayer={selectedLayer}
                  onChangeLayer={setSelectedLayer}
                  strictMode={strictMode}
                  metrics={metrics}
                  clickPlaceItem={clickPlaceItem}
                  onClearClickPlace={() => setClickPlaceItem(null)}
                  libraryItems={libraryItems}
                  onRequestDimensions={(item) => setPendingMobileDimItem(item)}
                />
                {placedCases.length === 0 && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none p-6">
                    <PalletEmptyState
                      onAutoBuild={handleAutoLoad}
                      onManualFocus={() => {
                        const input = document.querySelector<HTMLInputElement>(
                          '[data-tour="item-library"] input[placeholder*="Search"]'
                        );
                        input?.focus();
                      }}
                      canAutoBuild={!!selectedPallet && libraryItems.length > 0}
                      hasPallet={!!selectedPallet}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Right — Insights rail (collapsible) */}
            <div
              ref={healthPanelRef}
              className="min-h-0 overflow-hidden lg:h-full order-3 border-t lg:border-t-0 border-border/40"
            >
              <PalletHealthPanel
                report={healthReport}
                selectedPallet={selectedPallet}
                totalWeight={metrics.totalWeight}
                utilization={utilization}
                onApplyRecommendation={handleApplyRecommendation}
                onFocusCase={(id) => {
                  const el = document.querySelector(`[data-case-id="${id}"]`) as HTMLElement | null;
                  el?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
                collapsed={insightsCollapsed}
                onToggleCollapsed={() => setInsightsCollapsed(v => !v)}
              />
            </div>
          </div>
        </SidebarCollapseContext.Provider>
      </main>

      {/* ─────────────────── MOBILE / TABLET BRANCH ─────────────────── */}
      {/* Desktop `<main>` above is hidden via `hidden lg:flex`. This block
          renders only below the `lg` breakpoint. All handlers and state
          are shared — we do NOT duplicate save/packing/validation logic. */}
      <main className="flex-1 lg:hidden flex flex-col min-h-0 overflow-x-hidden">
        {/* Compact top header — minimal vertical footprint so workflow starts fast */}
        <div className="border-b border-border/40 bg-background px-3 py-1.5">
          {!embedded && (
            <Breadcrumbs items={[
              { label: "Layout Planner", href: "/layout-planner" },
              { label: "Pallet Builder" }
            ]} />
          )}
          <h1 className="mt-0.5 text-[15px] font-semibold leading-tight truncate">
            Pallet Builder
          </h1>
        </div>

        {/* Single sticky mini header */}
        <MobilePalletHeader
          palletName={selectedPallet?.name ?? null}
          dimsLabel={selectedPallet ? `${selectedPallet.width}×${selectedPallet.length}` : null}
          itemCount={metrics.itemCount}
          totalWeight={metrics.totalWeight}
          weightOk={metrics.weightUsage <= 100}
          warnings={healthReport.recommendations.filter(r => r.severity !== "optimization").length}
        />

        {/* Single compact checklist strip */}
        <MobileBuildChecklist
          palletDone={!!selectedPallet}
          itemsDone={placedCases.length > 0}
          arrangedDone={!!autoArrangeResult || (placedCases.length > 0 && !isDirty)}
          savedDone={!!activeBuildName && !isDirty}
        />

        {/* Scrollable body. `pb-28` reserves room for the fixed bottom bar. */}
        <div className="flex-1 overflow-x-hidden">
          <div className="px-3 py-3 pb-28 space-y-3">

            {/* 1️⃣  Selected pallet card (with inline picker on Change) */}
            <PalletBuilderSidebar
              palletTypes={allPallets}
              selectedPallet={selectedPallet}
              onSelectPallet={handleSelectPallet}
              libraryItems={libraryItems}
              loadingPallets={!isTourMode && loadingPallets}
              loadingItems={false}
              onCreatePallet={handleCreatePallet}
              hasItems={placedCases.length > 0}
              isSaved={!!activeBuildName && !isDirty}
              mobileSection="pallet"
              forcePalletPickerSignal={palletPickerSignal}
            />

            {/* 2️⃣  Add Items & Containers — the primary mobile workspace */}
            <div data-tour="item-library">
              <PalletBuilderSidebar
                palletTypes={allPallets}
                selectedPallet={selectedPallet}
                onSelectPallet={handleSelectPallet}
                libraryItems={libraryItems}
                loadingPallets={false}
                loadingItems={!isTourMode && loadingInventory}
                assignmentCounts={(() => {
                  const map: Record<string, number> = {};
                  for (const c of placedCases) {
                    if (!c.sourceId) continue;
                    const key = c.source === "container"
                      ? `container-${c.sourceId}`
                      : `item-${c.sourceId}`;
                    map[key] = (map[key] || 0) + 1;
                  }
                  return map;
                })()}
                onCreatePallet={handleCreatePallet}
                onClickPlace={(item) => placeItemNow(item)}
                onRemoveOneOfItem={(item) => {
                  const key = item.id;
                  const idx = [...placedCases].reverse().findIndex(c => {
                    if (!c.sourceId) return false;
                    const k = c.source === "container" ? `container-${c.sourceId}` : `item-${c.sourceId}`;
                    return k === key;
                  });
                  if (idx === -1) return;
                  const realIdx = placedCases.length - 1 - idx;
                  const next = placedCases.slice(0, realIdx).concat(placedCases.slice(realIdx + 1));
                  handleUpdateCases(next);
                  toast.message(`Removed 1 ${item.name}`);
                }}
                clickPlaceActive={!!clickPlaceItem}
                hasItems={placedCases.length > 0}
                isSaved={!!activeBuildName && !isDirty}
                mobileSection="items"
              />
            </div>

            {/* 3️⃣  Current build summary (only if items exist) */}
            {placedCases.length > 0 && (
              <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
                <SelectedInventoryBar
                  placedCases={placedCases}
                  onAutoBuild={handleAutoLoad}
                  canAutoBuild={!!selectedPallet && libraryItems.length > 0}
                />
              </div>
            )}

            {/* 4️⃣  Pallet preview/canvas — render the outline as soon as a pallet
                is chosen so mobile users can see what they're building on. */}
            {!selectedPallet ? (
              <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 px-4 py-6 text-center">
                <Package className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm font-medium text-foreground/80">
                  Choose a pallet to start
                </p>
                <p className="text-[12px] text-muted-foreground mt-1">
                  Pick a pallet size above to see the preview.
                </p>
              </div>
            ) : (
              <div
                className="relative rounded-2xl border border-border/60 bg-card overflow-hidden"
                data-tour="pallet-canvas"
              >
                <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-border/40">
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium leading-none">
                      Pallet Preview
                    </div>
                    <div className="text-[12px] text-foreground/90 tabular-nums truncate mt-1">
                      {placedCases.length === 0 ? (
                        <span className="text-muted-foreground">Tap + on an item to add it</span>
                      ) : (
                        <>
                          {metrics.itemCount} item{metrics.itemCount === 1 ? "" : "s"}
                          <span className="opacity-40 mx-1.5">·</span>
                          {Math.round(metrics.totalWeight).toLocaleString()} lbs
                          <span className="opacity-40 mx-1.5">·</span>
                          {utilization}% used
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div
                  className="relative overflow-hidden"
                  style={{ height: "min(50vh, 380px)" }}
                >
                  <PalletBuilderCanvas
                    selectedPallet={selectedPallet}
                    placedCases={placedCases}
                    onUpdateCases={handleUpdateCases}
                    selectedLayer={selectedLayer}
                    onChangeLayer={setSelectedLayer}
                    strictMode={strictMode}
                    metrics={metrics}
                    clickPlaceItem={clickPlaceItem}
                    onClearClickPlace={() => setClickPlaceItem(null)}
                    libraryItems={libraryItems}
                    onRequestDimensions={(item) => setPendingMobileDimItem(item)}
                  />
                  {autoArrangeResult && (
                    <div className="absolute bottom-2 left-2 right-2 z-20">
                      <AutoArrangeResultCard
                        impact={autoArrangeResult}
                        onKeep={() => setAutoArrangeResult(null)}
                        onUndo={handleUndoAutoArrange}
                        onDismiss={() => setAutoArrangeResult(null)}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 5️⃣  Review & Save (mobile variant). Validation surfaces what's missing. */}
            <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
              <div className="px-4 py-3">
                <PalletBuilderSidebar
                  palletTypes={allPallets}
                  selectedPallet={selectedPallet}
                  onSelectPallet={handleSelectPallet}
                  libraryItems={libraryItems}
                  loadingPallets={false}
                  loadingItems={false}
                  onCreatePallet={handleCreatePallet}
                  hasItems={placedCases.length > 0}
                  isSaved={!!activeBuildName && !isDirty}
                  onSaveClick={() => {
                    const saveBtn = document.querySelector('[data-save-trigger]') as HTMLButtonElement;
                    saveBtn?.click();
                  }}
                  onExport={() => setExportModalOpen(true)}
                  onClearAll={handleClearAll}
                  onSmartLayout={handleSmartLayout}
                  canSave={!!selectedPallet && placedCases.length > 0}
                  activeBuildName={activeBuildName}
                  isDirty={isDirty}
                  onOverwrite={activeBuildId ? handleOverwrite : undefined}
                  mobileSection="review"
                  reviewValidation={[
                    { label: "Pallet selected", pass: !!selectedPallet },
                    { label: "Items added", pass: placedCases.length > 0 },
                    { label: "Within weight limit", pass: metrics.weightUsage <= 100 },
                    {
                      label: "No critical warnings",
                      pass: healthReport.recommendations.filter(r => r.severity !== "optimization").length === 0,
                    },
                  ]}
                />
              </div>
            </div>

            {/* 6️⃣  Saved Builds — collapsed by default */}
            <Accordion type="single" collapsible className="rounded-2xl border border-border/60 bg-card overflow-hidden">
              <AccordionItem value="saved" className="border-0">
                <AccordionTrigger className="px-4 py-3 text-sm font-semibold hover:no-underline">
                  <span className="flex items-center gap-2">
                    Saved Builds
                    <span className="text-xs text-muted-foreground font-normal tabular-nums">
                      · {savedBuilds.length}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-2 pb-3">
                  <SavedBuildsPanel
                    savedBuilds={savedBuilds}
                    loading={loadingBuilds}
                    activeBuildId={activeBuildId}
                    onLoad={handleLoadBuild}
                    onDelete={handleDeleteBuild}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* 7️⃣  Insights — auto-open only when warnings exist */}
            {(() => {
              const warnCount = healthReport.recommendations.filter(r => r.severity !== "optimization").length;
              return (
                <Accordion
                  type="single"
                  collapsible
                  defaultValue={warnCount > 0 ? "insights" : undefined}
                  className="rounded-2xl border border-border/60 bg-card overflow-hidden"
                >
                  <AccordionItem value="insights" className="border-0">
                    <AccordionTrigger className="px-4 py-3 text-sm font-semibold hover:no-underline">
                      <span className="flex items-center gap-2">
                        Insights
                        <span
                          className={cn(
                            "text-xs font-normal tabular-nums",
                            warnCount > 0 ? "text-destructive" : "text-muted-foreground"
                          )}
                        >
                          · {warnCount} warning{warnCount === 1 ? "" : "s"}
                        </span>
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="px-1 pb-2">
                      <div ref={healthPanelRef}>
                        <PalletHealthPanel
                          report={healthReport}
                          selectedPallet={selectedPallet}
                          totalWeight={metrics.totalWeight}
                          utilization={utilization}
                          onApplyRecommendation={handleApplyRecommendation}
                          onFocusCase={(id) => {
                            const el = document.querySelector(`[data-case-id="${id}"]`) as HTMLElement | null;
                            el?.scrollIntoView({ behavior: "smooth", block: "center" });
                          }}
                          collapsed={false}
                          onToggleCollapsed={() => {}}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              );
            })()}
          </div>
        </div>

        {/* Sticky bottom action bar */}
        {(() => {
          const hasItems = placedCases.length > 0;
          const isSaved = !!activeBuildName && !isDirty;
          const warnCount = healthReport.recommendations.filter(r => r.severity !== "optimization").length;
          let primary: MobilePalletPrimaryAction | null = null;
          if (!selectedPallet) primary = "choose-pallet";
          else if (!hasItems) primary = null;
          else if (warnCount > 0 && !autoArrangeResult) primary = "auto-arrange";
          else if (activeBuildName && isDirty) primary = "overwrite-build";
          else if (!isSaved) primary = "save-build";
          else primary = "continue-load";
          if (!primary) return null;
          return (
            <MobilePalletActionBar
              primary={primary}
              activeBuildName={activeBuildName}
              hasItems={hasItems}
              canAutoBuild={!!selectedPallet && libraryItems.length > 0}
              onChoosePallet={() => {
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              onSaveClick={() => {
                const saveBtn = document.querySelector('[data-save-trigger]') as HTMLButtonElement;
                saveBtn?.click();
              }}
              onOverwrite={activeBuildId ? handleOverwrite : undefined}
              onContinueLoad={() => navigate("/layout-planner?tab=trailers")}
              onAutoBuild={handleAutoLoad}
              onAutoArrange={handleSmartLayout}
            />
          );
        })()}
      </main>

      {!embedded && <LegalFooter />}

      {/* Mobile dimension capture — opens when the user taps "+" on an item
          whose width/length/height/weight aren't on file yet. Reuses the
          same modal the desktop canvas uses on drag-and-drop. */}
      <DimensionCaptureModal
        open={!!pendingMobileDimItem}
        onOpenChange={(open) => { if (!open) setPendingMobileDimItem(null); }}
        itemName={pendingMobileDimItem?.name || "Item"}
        itemId={pendingMobileDimItem?.id || ""}
        existingDimensions={{
          length: pendingMobileDimItem?.length,
          width: pendingMobileDimItem?.width,
          height: pendingMobileDimItem?.height,
          weight: pendingMobileDimItem?.weight,
        }}
        onConfirm={(result: DimensionCaptureResult) => {
          const item = pendingMobileDimItem;
          setPendingMobileDimItem(null);
          if (!item) return;
          // Hand off to placeItemNow with the captured dimensions merged in,
          // so subsequent taps don't re-prompt during this session.
          const enriched: PalletLibraryItem = {
            ...item,
            length: result.dimensions.length,
            width: result.dimensions.width,
            height: result.dimensions.height,
            weight: result.dimensions.weight,
          };
          // Mutate the library item in-place too so the qty stepper "+"
          // can keep adding more without re-asking.
          item.length = result.dimensions.length;
          item.width = result.dimensions.width;
          item.height = result.dimensions.height;
          item.weight = result.dimensions.weight;
          placeItemNow(enriched);
        }}
        onCancel={() => setPendingMobileDimItem(null)}
        hideSaveGlobally
      />

      {/* Export Modal — lazy mounted only when open */}
      <Suspense fallback={null}>
        {exportModalOpen && (
          <ExportModal
            open={exportModalOpen}
            onOpenChange={setExportModalOpen}
            placedCases={placedCases}
            palletWidth={selectedPallet?.width || 0}
            palletLength={selectedPallet?.length || 0}
            palletType={selectedPallet?.name || ""}
            maxWeight={selectedPallet?.maxWeight || 0}
          />
        )}
      </Suspense>

      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        open={unsavedDialogOpen}
        onOpenChange={setUnsavedDialogOpen}
        onDiscard={handleDiscardAndLoad}
        onCancel={() => {
          setUnsavedDialogOpen(false);
          pendingLoadRef.current = null;
        }}
      />

      {/* Feature Lock Modal */}
      <FeatureLockModal
        open={lockModalOpen}
        onOpenChange={setLockModalOpen}
        featureName="Pallet Builder"
        description={`Pallet Builder is available on the ${lockedPlanName} plan. Visually organize containers and equipment onto pallets for optimized storage and transport.`}
        requiredPlan={lockedPlanName}
      />
    </div>
    </PermissionGuardedPage>
  );
};

export default PalletBuilder;
