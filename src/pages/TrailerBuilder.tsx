import { useState, useCallback, useEffect, useRef, lazy, Suspense, useMemo } from "react";
import { Truck, Plus, Save, FolderOpen, FileDown, Trash2, Wand2, CheckCircle2 } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { LegalFooter } from "@/components/LegalFooter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCustomTrailers, CustomTrailer } from "@/hooks/use-custom-trailers";
import { useSavedPalletBuilds, SavedPalletBuild } from "@/hooks/use-saved-pallet-builds";
import { useSavedTrailerLayouts } from "@/hooks/use-saved-trailer-layouts";
import { TrailerCanvas } from "@/components/trailer-builder/TrailerCanvas";
import { LoadLibraryPanel } from "@/components/trailer-builder/LoadLibraryPanel";
import { useLoadLibraryAssets, LoadLibraryItem } from "@/hooks/use-load-library-assets";
import { LoadStatusPanel } from "@/components/trailer-builder/LoadStatusPanel";
import { TrailerCoachCard } from "@/components/trailer-builder/TrailerCoachCard";
import { TrailerSetupCard } from "@/components/trailer-builder/TrailerSetupCard";
import { VehicleStatusStrip } from "@/components/trailer-builder/VehicleStatusStrip";
import { BottomMetricsRail } from "@/components/trailer-builder/BottomMetricsRail";
import { MobileTrailerActionBar } from "@/components/trailer-builder/MobileTrailerActionBar";
import { MobileBuildLoad } from "@/components/trailer-builder/MobileBuildLoad";
import { scoreTrailerLoad } from "@/lib/trailer-load-score";
import { analyzeAxles } from "@/lib/trailer-axle-analysis";
import { buildSmartWarnings } from "@/lib/trailer-smart-warnings";
import { autoArrange, optimizeStops, optimizeWeight } from "@/lib/trailer-auto-arrange";
import { AxleDistributionPanel } from "@/components/trailer-builder/AxleDistributionPanel";
import { HeightClearancePanel } from "@/components/trailer-builder/HeightClearancePanel";
import { SmartWarningsPanel } from "@/components/trailer-builder/SmartWarningsPanel";
import { CargoInspectorPanel } from "@/components/trailer-builder/CargoInspectorPanel";
import { TrailerBottomToolbar } from "@/components/trailer-builder/TrailerBottomToolbar";
import { useLayoutPlannerSummary } from "@/components/layout-planner/LayoutPlannerContext";
import { useActiveLayoutPlannerTab } from "@/components/layout-planner/WorkflowTabs";
const CreateTrailerModal = lazy(() => import("@/components/trailer-builder/CreateTrailerModal").then(m => ({ default: m.CreateTrailerModal })));
const SaveTrailerLayoutModal = lazy(() => import("@/components/trailer-builder/SaveTrailerLayoutModal").then(m => ({ default: m.SaveTrailerLayoutModal })));
const LoadTrailerLayoutSheet = lazy(() => import("@/components/trailer-builder/LoadTrailerLayoutSheet").then(m => ({ default: m.LoadTrailerLayoutSheet })));
const ExportTrailerModal = lazy(() => import("@/components/trailer-builder/ExportTrailerModal").then(m => ({ default: m.ExportTrailerModal })));
const AutoPackModal = lazy(() => import("@/components/trailer-builder/AutoPackModal").then(m => ({ default: m.AutoPackModal })));
import { PlacedPallet } from "@/types/trailer-builder";
import { toast } from "sonner";

const TrailerBuilder = ({ embedded = false }: { embedded?: boolean } = {}) => {
  return <TrailerBuilderContent embedded={embedded} />;
};

const TrailerBuilderContent = ({ embedded = false }: { embedded?: boolean }) => {
  const { trailers, loading: loadingTrailers, createTrailer } = useCustomTrailers();
  const { savedBuilds, loading: loadingPallets } = useSavedPalletBuilds();
  const { layouts, loading: loadingLayouts, saveLayout, updateLayout, deleteLayout } = useSavedTrailerLayouts();
  const { items: libraryItems, containers: libraryContainers, loading: loadingAssets } = useLoadLibraryAssets();

  const [selectedTrailer, setSelectedTrailer] = useState<CustomTrailer | null>(null);
  const [placedPallets, setPlacedPallets] = useState<PlacedPallet[]>([]);
  const [draggedPallet, setDraggedPallet] = useState<SavedPalletBuild | null>(null);
  const [highlightLibrary, setHighlightLibrary] = useState(false);

  // --- Undo / redo history for cargo arrangement ---
  const historyRef = useRef<{ past: PlacedPallet[][]; future: PlacedPallet[][] }>({ past: [], future: [] });
  const [historyTick, setHistoryTick] = useState(0);
  const commit = useCallback((next: PlacedPallet[] | ((prev: PlacedPallet[]) => PlacedPallet[])) => {
    setPlacedPallets(prev => {
      historyRef.current.past = [...historyRef.current.past.slice(-49), prev];
      historyRef.current.future = [];
      return typeof next === "function" ? (next as (p: PlacedPallet[]) => PlacedPallet[])(prev) : next;
    });
    setHistoryTick(t => t + 1);
  }, []);
  const handleUndo = useCallback(() => {
    setPlacedPallets(prev => {
      const past = historyRef.current.past;
      if (past.length === 0) return prev;
      const last = past[past.length - 1];
      historyRef.current.past = past.slice(0, -1);
      historyRef.current.future = [prev, ...historyRef.current.future.slice(0, 49)];
      return last;
    });
    setHistoryTick(t => t + 1);
  }, []);
  const handleRedo = useCallback(() => {
    setPlacedPallets(prev => {
      const future = historyRef.current.future;
      if (future.length === 0) return prev;
      const [next, ...rest] = future;
      historyRef.current.future = rest;
      historyRef.current.past = [...historyRef.current.past.slice(-49), prev];
      return next;
    });
    setHistoryTick(t => t + 1);
  }, []);

  // Convert a LoadLibraryItem (item/container) to a SavedPalletBuild shape for the canvas
  const handleDragStartAsset = useCallback((asset: LoadLibraryItem) => {
    const asPallet: SavedPalletBuild = {
      id: asset.id,
      name: asset.name,
      is_template: false,
      pallet_data: {
        selectedPalletId: asset.id,
        selectedPalletType: "custom",
        palletDimensions: { width: asset.width, length: asset.length },
        maxWeight: asset.weight * 2 || 5000,
        placedCases: [{
          id: asset.id,
          caseId: asset.id,
          caseType: asset.type,
          x: 0, y: 0, z: 0,
          width: asset.width,
          length: asset.length,
          height: 12,
          weight: asset.weight,
          rotation: 0,
          condition: "good",
          fragile: false,
          source: asset.type as "item" | "container",
          sourceId: asset.id,
        }],
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setDraggedPallet(asPallet);
  }, []);
  const [selectedPalletId, setSelectedPalletId] = useState<string | null>(null);

  const [createTrailerOpen, setCreateTrailerOpen] = useState(false);
  const [saveLayoutOpen, setSaveLayoutOpen] = useState(false);
  const [loadLayoutOpen, setLoadLayoutOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [autoPackOpen, setAutoPackOpen] = useState(false);
  const [activeLayoutId, setActiveLayoutId] = useState<string | null>(null);
  const [activeLayoutName, setActiveLayoutName] = useState<string | null>(null);

  // Show keyboard shortcut tips on first load placement
  const hasShownTips = useRef(false);
  useEffect(() => {
    if (placedPallets.length === 1 && !hasShownTips.current) {
      hasShownTips.current = true;
      const tips = [
        { msg: "💡 Tip: Press R to rotate loads", delay: 600 },
        { msg: "💡 Press D to duplicate a load", delay: 2800 },
        { msg: "💡 Use Delete to remove a load", delay: 5000 },
      ];
      const timers = tips.map(({ msg, delay }) =>
        setTimeout(() => toast(msg, { duration: 3000 }), delay)
      );
      return () => timers.forEach(clearTimeout);
    }
  }, [placedPallets.length]);

  const handleSelectTrailer = (trailerId: string) => {
    const trailer = trailers.find(t => t.id === trailerId) || null;
    setSelectedTrailer(trailer);
    setPlacedPallets([]);
    setSelectedPalletId(null);
    if (trailer) setHighlightLibrary(true);
  };

  const handlePlacePallet = useCallback((pallet: PlacedPallet) => {
    commit(prev => [...prev, pallet]);
  }, [commit]);

  // Find the first non-overlapping spot for a pallet of the given dims.
  const findFreeSpot = useCallback((w: number, h: number) => {
    if (!selectedTrailer) return null;
    const TW = selectedTrailer.width;
    const TL = selectedTrailer.length;
    const step = 6;
    for (let y = 0; y + h <= TL; y += step) {
      for (let x = 0; x + w <= TW; x += step) {
        const overlaps = placedPallets.some(p => {
          const d = p.palletData.pallet_data.palletDimensions;
          const pw = p.rotation === 90 ? d.length : d.width;
          const ph = p.rotation === 90 ? d.width : d.length;
          return !(x + w <= p.x || p.x + pw <= x || y + h <= p.y || p.y + ph <= y);
        });
        if (!overlaps) return { x, y };
      }
    }
    return null;
  }, [selectedTrailer, placedPallets]);

  const handleTapPlacePallet = useCallback((pallet: SavedPalletBuild) => {
    if (!selectedTrailer) { toast.error("Select a vehicle first"); return; }
    const d = pallet.pallet_data.palletDimensions;
    const spot = findFreeSpot(d.width, d.length);
    if (!spot) { toast.error("No space available — try rotating or removing a pallet"); return; }
    handlePlacePallet({
      id: crypto.randomUUID(),
      palletId: pallet.id,
      x: spot.x,
      y: spot.y,
      rotation: 0,
      palletData: pallet,
    });
    toast.success(`${pallet.name} added`);
  }, [selectedTrailer, findFreeSpot, handlePlacePallet]);

  const handleTapPlaceAsset = useCallback((asset: LoadLibraryItem) => {
    if (!selectedTrailer) { toast.error("Select a vehicle first"); return; }
    const spot = findFreeSpot(asset.width, asset.length);
    if (!spot) { toast.error("No space available"); return; }
    const asPallet: SavedPalletBuild = {
      id: asset.id,
      name: asset.name,
      is_template: false,
      pallet_data: {
        selectedPalletId: asset.id,
        selectedPalletType: "custom",
        palletDimensions: { width: asset.width, length: asset.length },
        maxWeight: asset.weight * 2 || 5000,
        placedCases: [{
          id: asset.id, caseId: asset.id, caseType: asset.type,
          x: 0, y: 0, z: 0,
          width: asset.width, length: asset.length, height: 12,
          weight: asset.weight, rotation: 0, condition: "good", fragile: false,
          source: asset.type as "item" | "container", sourceId: asset.id,
        }],
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    handlePlacePallet({
      id: crypto.randomUUID(),
      palletId: asset.id,
      x: spot.x,
      y: spot.y,
      rotation: 0,
      palletData: asPallet,
    });
    toast.success(`${asset.name} added`);
  }, [selectedTrailer, findFreeSpot, handlePlacePallet]);

  const handleRemovePallet = useCallback((id: string) => {
    commit(prev => prev.filter(p => p.id !== id && p.stackedOn !== id));
    setSelectedPalletId(prev => prev === id ? null : prev);
  }, [commit]);

  const handleRotatePallet = useCallback((id: string) => {
    setPlacedPallets(prev => {
      const p = prev.find(pp => pp.id === id);
      if (!p || !selectedTrailer) return prev;
      const newRot = p.rotation === 0 ? 90 : 0;
      const d = p.palletData.pallet_data.palletDimensions;
      const nw = newRot === 90 ? d.length : d.width;
      const nh = newRot === 90 ? d.width : d.length;
      if (p.x + nw > selectedTrailer.width || p.y + nh > selectedTrailer.length) {
        toast.error("Cannot rotate — out of bounds");
        return prev;
      }
      return prev.map(pp => pp.id === id ? { ...pp, rotation: newRot } : pp);
    });
  }, [selectedTrailer]);

  const handleDuplicatePallet = useCallback((id: string) => {
    setPlacedPallets(prev => {
      const p = prev.find(pp => pp.id === id);
      if (!p || !selectedTrailer) return prev;
      const d = p.palletData.pallet_data.palletDimensions;
      const w = p.rotation === 90 ? d.length : d.width;
      const h = p.rotation === 90 ? d.width : d.length;
      // Try to place offset by width, else below
      let nx = p.x + w + 6;
      let ny = p.y;
      if (nx + w > selectedTrailer.width) { nx = p.x; ny = p.y + h + 6; }
      if (ny + h > selectedTrailer.length) { toast.error("No space to duplicate"); return prev; }
      const dup: PlacedPallet = { ...p, id: crypto.randomUUID(), x: nx, y: ny };
      toast.success("Pallet duplicated");
      return [...prev, dup];
    });
  }, [selectedTrailer]);

  const handleUpdatePallet = useCallback((id: string, updates: Partial<PlacedPallet>) => {
    setPlacedPallets(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  }, []);

  // --- Advanced load analysis ---
  const axles = useMemo(() => analyzeAxles(selectedTrailer, placedPallets), [selectedTrailer, placedPallets]);
  const smartWarnings = useMemo(
    () => buildSmartWarnings(selectedTrailer, placedPallets, axles),
    [selectedTrailer, placedPallets, axles]
  );
  const [highlightedCargo, setHighlightedCargo] = useState<string[]>([]);
  const handleHighlightCargo = useCallback((ids: string[]) => {
    setHighlightedCargo(ids);
    if (ids.length) setSelectedPalletId(ids[0]);
  }, []);

  const selectedCargo = useMemo(
    () => placedPallets.find(p => p.id === selectedPalletId) ?? null,
    [placedPallets, selectedPalletId]
  );

  const runArrange = useCallback(
    (fn: (t: CustomTrailer, p: PlacedPallet[]) => { placed: PlacedPallet[]; skipped: PlacedPallet[] }, label: string) => {
      if (!selectedTrailer || placedPallets.length === 0) return;
      const { placed, skipped } = fn(selectedTrailer, placedPallets);
      commit([...placed, ...skipped.map(s => ({ ...s }))].slice(0, placed.length + skipped.length));
      if (skipped.length) toast.warning(`${label} — ${skipped.length} item(s) could not be repositioned`);
      else toast.success(label);
    },
    [selectedTrailer, placedPallets, commit]
  );

  const handleApplyRecommendation = useCallback((palletId: string, updates: Partial<PlacedPallet>) => {
    setPlacedPallets(prev => prev.map(p => p.id === palletId ? { ...p, ...updates } : p));
    toast.success("Suggestion applied");
  }, []);

  const handleBulkUpdate = useCallback((updates: { palletId: string; updates: Partial<PlacedPallet> }[]) => {
    setPlacedPallets(prev => prev.map(p => {
      const u = updates.find(up => up.palletId === p.id);
      return u ? { ...p, ...u.updates } : p;
    }));
    toast.success("Layout optimized for delivery order");
  }, []);

  const handleClearAll = () => {
    commit([]);
    setSelectedPalletId(null);
    setActiveLayoutId(null);
    setActiveLayoutName(null);
    toast.success("All pallets cleared");
  };

  const handleAutoPackAccept = useCallback((pallets: PlacedPallet[]) => {
    commit(pallets);
    setSelectedPalletId(null);
    toast.success("Auto-packed layout applied");
  }, [commit]);

  const handleCreateTrailer = async (trailerData: {
    name: string;
    length: number;
    width: number;
    height: number;
    max_weight: number;
    notes?: string;
  }) => {
    const result = await createTrailer({
      ...trailerData,
      notes: trailerData.notes ?? null,
    });
    if (result) {
      setSelectedTrailer(result as CustomTrailer);
    }
  };

  const buildLayoutData = () => {
    const totalWeight = placedPallets.reduce((sum, p) => {
      const caseWeight = p.palletData.pallet_data?.placedCases?.reduce(
        (s: number, c: any) => s + (c.weight || 0), 0
      ) || 0;
      return sum + caseWeight;
    }, 0);
    return {
      placedPallets: placedPallets.map(p => ({
        palletId: p.palletId,
        x: p.x,
        y: p.y,
        rotation: p.rotation,
        palletData: p.palletData,
      })),
      totalWeight,
      usedSpace: placedPallets.length,
    };
  };

  const handleSaveLayout = async (name: string) => {
    if (!selectedTrailer) return;
    const result = await saveLayout(name, selectedTrailer.id, buildLayoutData());
    if (result) {
      setActiveLayoutId(result.id);
      setActiveLayoutName(result.name);
    }
  };

  const handleOverwriteLayout = async () => {
    if (!selectedTrailer || !activeLayoutId || !activeLayoutName) return;
    const result = await updateLayout(activeLayoutId, activeLayoutName, selectedTrailer.id, buildLayoutData());
    if (result) {
      setActiveLayoutId(result.id);
      setActiveLayoutName(result.name);
    }
  };

  const handleLoadLayout = (layout: any) => {
    const trailer = trailers.find(t => t.id === layout.trailer_id);
    if (trailer) {
      setSelectedTrailer(trailer);
      const restored = (layout.layout_data?.placedPallets || []).map((p: any, i: number) => ({
        id: `loaded-${i}-${Date.now()}`,
        palletId: p.palletId,
        x: p.x,
        y: p.y,
        rotation: p.rotation || 0,
        palletData: p.palletData,
      }));
      setPlacedPallets(restored);
      setSelectedPalletId(null);
      setActiveLayoutId(layout.id);
      setActiveLayoutName(layout.name);
      toast.success(`Layout "${layout.name}" loaded`);
    } else {
      toast.error("Trailer not found for this layout");
    }
  };

  // --- Load score + planner summary wiring ---
  const loadScore = useMemo(
    () => scoreTrailerLoad(selectedTrailer, placedPallets),
    [selectedTrailer, placedPallets]
  );

  const { setSummary } = useLayoutPlannerSummary();
  const [, setActivePlannerTab] = useActiveLayoutPlannerTab();

  useEffect(() => {
    setSummary({
      palletsBuilt: savedBuilds.length,
      inventory: libraryItems.length + libraryContainers.length,
      loaded: placedPallets.length,
      weightLbs: loadScore?.totalWeight ?? 0,
      utilization: loadScore?.utilization ?? 0,
      maxWeightLbs: selectedTrailer?.max_weight,
      warnings: loadScore?.warnings ?? 0,
      loadScore: loadScore?.score,
    });
  }, [
    setSummary,
    savedBuilds.length,
    libraryItems.length,
    libraryContainers.length,
    placedPallets.length,
    loadScore,
    selectedTrailer?.max_weight,
  ]);

  const coachState: "no-trailer" | "no-pallets-built" | "no-pallets" | "needs-attention" | "ready" =
    !selectedTrailer
      ? "no-trailer"
      : savedBuilds.length === 0
      ? "no-pallets-built"
      : placedPallets.length === 0
      ? "no-pallets"
      : loadScore?.validated
      ? "ready"
      : "needs-attention";

  return (
    <div
      className={cn(
        embedded ? "flex flex-col flex-1 min-h-0" : "min-h-screen bg-background flex flex-col",
        // Reserve room for the mobile sticky action bar (incl. iOS safe-area)
        "pb-[calc(env(safe-area-inset-bottom,0px)+72px)] lg:pb-0"
      )}
    >
      {!embedded && <Navigation />}

      <main className="flex-1 w-full px-5 lg:px-8 py-4 space-y-3 flex flex-col min-h-0">
        {!embedded && (
          <Breadcrumbs items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Layout Planner", href: "/layout-planner" },
            { label: "Trailer & Container Planning" }
          ]} />
        )}

        {/* Toolbar — wraps on mobile so action buttons remain reachable */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm px-3 py-2 shadow-sm">
          <Truck className="h-4 w-4 text-primary shrink-0" />
          <h1 className="text-sm font-semibold mr-1 hidden xl:block">Space Planner</h1>

          <Separator orientation="vertical" className="h-4 mx-1 bg-border/40" />

          {/* Stage-aware toolbar */}
          {!selectedTrailer ? (
            <>
              {trailers.length > 0 ? (
                <Select value="" onValueChange={handleSelectTrailer}>
                  <SelectTrigger className="w-[180px] h-8 text-xs border-border/50" data-trailer-select>
                    <SelectValue placeholder="Select Vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {trailers.map(t => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} ({t.length}"×{t.width}")
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              <Button variant="outline" size="sm" className="h-8 text-xs border-border/50" onClick={() => setCreateTrailerOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Create Vehicle
              </Button>
              <div className="flex-1" />
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setLoadLayoutOpen(true)} disabled={!trailers.length}>
                <FolderOpen className="h-3.5 w-3.5 mr-1" /> Load Layout
              </Button>
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
                <Truck className="h-3.5 w-3.5 text-primary" />
                {selectedTrailer.name}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-[11px] text-muted-foreground"
                onClick={() => {
                  setSelectedTrailer(null);
                  setPlacedPallets([]);
                  setSelectedPalletId(null);
                  setActiveLayoutId(null);
                  setActiveLayoutName(null);
                }}
              >
                Change
              </Button>

              <Separator orientation="vertical" className="h-4 mx-1 bg-border/40" />

              <Button
                size="sm"
                className="h-8 text-xs font-semibold gap-1.5 group"
                onClick={() => setAutoPackOpen(true)}
                disabled={savedBuilds.length === 0}
              >
                <Wand2 className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-12" />
                {placedPallets.length === 0 ? "Auto Load Vehicle" : "Optimize Load"}
              </Button>

              <Button variant="ghost" size="sm" className="h-8 text-xs px-2" onClick={() => setSaveLayoutOpen(true)} disabled={placedPallets.length === 0}>
                <Save className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Save</span>
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs px-2" onClick={() => setExportOpen(true)} disabled={placedPallets.length === 0}>
                <FileDown className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Export</span>
              </Button>

              <div className="flex-1" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={handleClearAll} disabled={placedPallets.length === 0}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom"><p className="text-xs">Clear all loads</p></TooltipContent>
              </Tooltip>
            </>
          )}
        </div>

        {/* Stage-aware main layout */}
        {!selectedTrailer ? (
          // Stage 1 — no trailer: replace whole planning area with guided setup
          <div className="min-h-[calc(100vh-260px)] flex">
            <TrailerSetupCard
              trailers={trailers}
              onSelectTrailer={handleSelectTrailer}
              onCreateTrailer={() => setCreateTrailerOpen(true)}
            />
          </div>
        ) : (
          <>
            {/* Slim workflow strip — desktop only */}
            <div className="hidden lg:block">
            <TrailerCoachCard
              state={coachState}
              ready={savedBuilds.length}
              loaded={placedPallets.length}
              remaining={Math.max(0, savedBuilds.length - placedPallets.length)}
              onSelectTrailer={() => document.querySelector<HTMLButtonElement>('[data-trailer-select]')?.click()}
              onCreateTrailer={() => setCreateTrailerOpen(true)}
              onBuildPallets={() => setActivePlannerTab("pallets")}
              onLoadSuggested={() => setAutoPackOpen(true)}
              onOptimize={() => setAutoPackOpen(true)}
              onOpenReview={() => setActivePlannerTab("summary")}
            />
            </div>

            {/* Desktop planning grid — preserved untouched */}
            <div className={cn(
              "hidden lg:grid gap-4 flex-1 min-h-0",
              placedPallets.length > 0
                ? "lg:grid-cols-[300px_1fr_300px]"
                : "lg:grid-cols-[300px_1fr]"
            )}>
              <div className="order-2 lg:order-1 max-h-[55vh] lg:max-h-none flex flex-col min-h-0">
              <LoadLibraryPanel
                savedPallets={savedBuilds}
                items={libraryItems}
                containers={libraryContainers}
                loading={loadingPallets || loadingAssets}
                onDragStartPallet={setDraggedPallet}
                onDragStartAsset={handleDragStartAsset}
                highlight={highlightLibrary}
                loadedCount={placedPallets.length}
                loadedPalletIds={placedPallets.map(p => p.palletId)}
                onTapPlacePallet={handleTapPlacePallet}
                onTapPlaceAsset={handleTapPlaceAsset}
              />
              </div>

              <div className="flex flex-col min-h-0 gap-3 order-1 lg:order-2 h-[50vh] lg:h-auto">
                <VehicleStatusStrip
                  trailer={selectedTrailer}
                  score={loadScore}
                  loaded={placedPallets.length}
                />
                <div className="flex-1 min-h-0">
                  <TrailerCanvas
                    trailer={selectedTrailer}
                    placedPallets={placedPallets}
                    onPlacePallet={handlePlacePallet}
                    onRemovePallet={handleRemovePallet}
                    onUpdatePallet={handleUpdatePallet}
                    onDuplicatePallet={handleDuplicatePallet}
                    draggedPallet={draggedPallet}
                    selectedPalletId={selectedPalletId}
                    onSelectPallet={setSelectedPalletId}
                    onRequestSelectTrailer={() => {
                      document.querySelector<HTMLButtonElement>('[data-trailer-select]')?.click();
                    }}
                    onRequestCreateTrailer={() => setCreateTrailerOpen(true)}
                    savedPallets={savedBuilds}
                    highlightedIds={highlightedCargo}
                  />
                </div>
              </div>

              {placedPallets.length > 0 && (
                <div className="flex flex-col gap-4 min-h-0 overflow-auto order-3 max-h-[60vh] lg:max-h-none">
                  {selectedCargo && (
                    <CargoInspectorPanel
                      pallet={selectedCargo}
                      all={placedPallets}
                      onUpdate={handleUpdatePallet}
                      onRotate={handleRotatePallet}
                      onDuplicate={handleDuplicatePallet}
                      onRemove={handleRemovePallet}
                    />
                  )}
                  <AxleDistributionPanel axles={axles} />
                  <HeightClearancePanel trailer={selectedTrailer} placedPallets={placedPallets} />
                  <SmartWarningsPanel warnings={smartWarnings} onHighlight={handleHighlightCargo} />
                  <LoadStatusPanel
                    trailer={selectedTrailer}
                    placedPallets={placedPallets}
                    score={loadScore}
                    selectedPalletId={selectedPalletId}
                    onSelectPallet={setSelectedPalletId}
                    onRotatePallet={handleRotatePallet}
                    onDuplicatePallet={handleDuplicatePallet}
                    onRemovePallet={handleRemovePallet}
                    onApplyRecommendation={handleApplyRecommendation}
                    onBulkUpdate={handleBulkUpdate}
                    onOptimize={() => setAutoPackOpen(true)}
                  />
                </div>
              )}
            </div>

            {/* Bottom live metrics rail — desktop only */}
            <div className="hidden lg:flex lg:flex-col lg:gap-2">
              <TrailerBottomToolbar
                disabled={placedPallets.length === 0}
                canUndo={historyRef.current.past.length > 0}
                canRedo={historyRef.current.future.length > 0}
                stopLegend={[...new Set(placedPallets.map(p => p.stopNumber).filter(Boolean) as number[])].sort()}
                onAutoArrange={() => runArrange((t, p) => autoArrange(t, p), "Cargo auto-arranged")}
                onOptimizeWeight={() => runArrange(optimizeWeight, "Layout optimized for weight balance")}
                onOptimizeStops={() => runArrange(optimizeStops, "Layout optimized for delivery order")}
                onReset={handleClearAll}
                onUndo={handleUndo}
                onRedo={handleRedo}
              />
              <BottomMetricsRail
                trailer={selectedTrailer}
                score={loadScore}
                loaded={placedPallets.length}
              />
            </div>

            {/* Mobile-only redesigned Build Load layout */}
            <MobileBuildLoad
              trailer={selectedTrailer}
              placedPallets={placedPallets}
              score={loadScore}
              savedPallets={savedBuilds}
              items={libraryItems}
              containers={libraryContainers}
              loading={loadingPallets || loadingAssets}
              draggedPallet={draggedPallet}
              selectedPalletId={selectedPalletId}
              onSelectPallet={setSelectedPalletId}
              onPlacePallet={handlePlacePallet}
              onRemovePallet={handleRemovePallet}
              onUpdatePallet={handleUpdatePallet}
              onDuplicatePallet={handleDuplicatePallet}
              onTapPlacePallet={handleTapPlacePallet}
              onTapPlaceAsset={handleTapPlaceAsset}
              onAutoLoad={() => setAutoPackOpen(true)}
              onChangeVehicle={() => document.querySelector<HTMLButtonElement>('[data-trailer-select]')?.click()}
            />
          </>
        )}
      </main>

      <Suspense fallback={null}>
        {createTrailerOpen && (
          <CreateTrailerModal open={createTrailerOpen} onOpenChange={setCreateTrailerOpen} onCreate={handleCreateTrailer} />
        )}
        {saveLayoutOpen && (
          <SaveTrailerLayoutModal open={saveLayoutOpen} onOpenChange={setSaveLayoutOpen} onSave={handleSaveLayout} onOverwrite={handleOverwriteLayout} activeLayoutName={activeLayoutName} />
        )}
        {loadLayoutOpen && (
          <LoadTrailerLayoutSheet open={loadLayoutOpen} onOpenChange={setLoadLayoutOpen} savedLayouts={layouts} loading={loadingLayouts} onLoad={handleLoadLayout} onDelete={deleteLayout} />
        )}
        {exportOpen && (
          <ExportTrailerModal open={exportOpen} onOpenChange={setExportOpen} placedPallets={placedPallets} trailerWidth={selectedTrailer?.width || 0} trailerLength={selectedTrailer?.length || 0} trailerName={selectedTrailer?.name || "Trailer"} trailer={selectedTrailer} />
        )}
        {selectedTrailer && autoPackOpen && (
          <AutoPackModal open={autoPackOpen} onOpenChange={setAutoPackOpen} trailer={selectedTrailer} availablePallets={savedBuilds} existingPallets={placedPallets} onAccept={handleAutoPackAccept} />
        )}
      </Suspense>
      {!embedded && <LegalFooter />}

      <MobileTrailerActionBar
        state={coachState}
        hasTrailers={trailers.length > 0}
        loaded={placedPallets.length}
        onSelectTrailer={() => document.querySelector<HTMLButtonElement>('[data-trailer-select]')?.click()}
        onCreateTrailer={() => setCreateTrailerOpen(true)}
        onBuildPallets={() => setActivePlannerTab("pallets")}
        onAutoLoad={() => setAutoPackOpen(true)}
        onSave={() => setSaveLayoutOpen(true)}
        onOpenReview={() => setActivePlannerTab("summary")}
      />
    </div>
  );
};

export default TrailerBuilder;
