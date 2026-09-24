import { useRef, useEffect, useState, useCallback, useMemo, lazy, Suspense } from "react";
import { Slider } from "@/components/ui/slider";
import { SavedPalletBuild } from "@/hooks/use-saved-pallet-builds";
import { CustomTrailer } from "@/hooks/use-custom-trailers";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ZoomIn, ZoomOut, Maximize2, RotateCw, Trash2, Grid3X3, Move, Copy,
  MousePointer2, Package, MapPin, AlertTriangle, Home, Truck, Plus,
  GripVertical, Wand2, CheckCircle2, Keyboard, Settings2, Box as BoxIcon, Square
} from "lucide-react";
import { PlacedPallet, getStopColor } from "@/types/trailer-builder";
import { analyzeSequence, BlockingIssue } from "@/lib/trailer-load-analysis";
import { TRAILER_ZONES, getLoadZone, getZonePixelBounds } from "@/lib/trailer-zones";
import { cn } from "@/lib/utils";
import { useIsDesktop } from "@/hooks/use-desktop";

// Lazy 3D — keeps the R3F/three bundle out of the initial trailer builder chunk.
const TrailerCanvas3D = lazy(() => import("./TrailerCanvas3D"));

interface TrailerCanvasProps {
  trailer: CustomTrailer | null;
  placedPallets: PlacedPallet[];
  onPlacePallet: (pallet: PlacedPallet) => void;
  onRemovePallet: (id: string) => void;
  onUpdatePallet: (id: string, updates: Partial<PlacedPallet>) => void;
  onDuplicatePallet?: (id: string) => void;
  draggedPallet: SavedPalletBuild | null;
  selectedPalletId?: string | null;
  onSelectPallet?: (id: string | null) => void;
  onRequestSelectTrailer?: () => void;
  onRequestCreateTrailer?: () => void;
  /** Full pallet library for drag-into-3D placement. */
  savedPallets?: SavedPalletBuild[];
  /** Cargo IDs to visually flag (e.g. from a smart warning). */
  highlightedIds?: string[];
}

const RULER_SIZE = 28;
const BASE_SCALE = 8;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const SNAP_INCREMENT = 6;
const COLLISION_TOLERANCE = 0.1;

// Fallback pallet colors when no stop assigned
const PALLET_COLORS = [
  { bg: "hsl(var(--primary) / 0.15)", border: "hsl(var(--primary))", text: "hsl(var(--primary))" },
  { bg: "hsl(200 70% 50% / 0.15)", border: "hsl(200 70% 50%)", text: "hsl(200 70% 50%)" },
  { bg: "hsl(150 60% 40% / 0.15)", border: "hsl(150 60% 40%)", text: "hsl(150 60% 40%)" },
  { bg: "hsl(30 80% 55% / 0.15)", border: "hsl(30 80% 55%)", text: "hsl(30 80% 55%)" },
  { bg: "hsl(280 60% 55% / 0.15)", border: "hsl(280 60% 55%)", text: "hsl(280 60% 55%)" },
  { bg: "hsl(350 70% 55% / 0.15)", border: "hsl(350 70% 55%)", text: "hsl(350 70% 55%)" },
];

function getFallbackColor(index: number) {
  return PALLET_COLORS[index % PALLET_COLORS.length];
}

export const TrailerCanvas = ({
  trailer,
  placedPallets,
  onPlacePallet,
  onRemovePallet,
  onUpdatePallet,
  onDuplicatePallet,
  draggedPallet,
  selectedPalletId: externalSelectedId,
  onSelectPallet: externalOnSelect,
  onRequestSelectTrailer,
  onRequestCreateTrailer,
  savedPallets,
  highlightedIds,
}: TrailerCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasAreaRef = useRef<HTMLDivElement>(null);

  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const selectedPallet = externalSelectedId !== undefined ? externalSelectedId : internalSelectedId;
  const setSelectedPallet = useCallback((id: string | null) => {
    if (externalOnSelect) externalOnSelect(id);
    else setInternalSelectedId(id);
  }, [externalOnSelect]);

  const [dragState, setDragState] = useState<{
    palletId: string;
    offsetX: number;
    offsetY: number;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [panState, setPanState] = useState<{ startX: number; startY: number; startPanX: number; startPanY: number } | null>(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [showZones, setShowZones] = useState(false);
  const [showGridOverride, setShowGridOverride] = useState(false);
  const [dropPreview, setDropPreview] = useState<{ x: number; y: number; w: number; h: number; valid: boolean } | null>(null);
  const [stopPopoverId, setStopPopoverId] = useState<string | null>(null);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [ctrlDragCopy, setCtrlDragCopy] = useState(false);

  // 2D / 3D view toggle — 3D is desktop-only, matching the pallet builder.
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const isDesktop = useIsDesktop();
  useEffect(() => {
    if (isDesktop === false && viewMode === "3d") setViewMode("2d");
  }, [isDesktop, viewMode]);

  const scale = BASE_SCALE * zoom;
  const trailerW = trailer ? trailer.width * scale : 0;
  const trailerH = trailer ? trailer.length * scale : 0;
  const gridSize = 12 * scale;

  // Blocking issues for visual warnings
  const blockingIssues = useMemo(() => {
    if (!trailer) return [];
    return analyzeSequence(trailer, placedPallets).blockingIssues;
  }, [trailer, placedPallets]);

  const blockedIds = useMemo(() => {
    const ids = new Set<string>();
    blockingIssues.forEach(b => { ids.add(b.blockedPalletId); ids.add(b.blockerPalletId); });
    return ids;
  }, [blockingIssues]);

  // Has any stop assignments?
  const hasStops = useMemo(() => placedPallets.some(p => p.stopNumber && p.stopNumber > 0), [placedPallets]);

  // --- Helpers ---
  const snapValue = useCallback((v: number) => {
    if (!snapEnabled) return v;
    return Math.round(v / SNAP_INCREMENT) * SNAP_INCREMENT;
  }, [snapEnabled]);

  const getPalletDims = useCallback((p: PlacedPallet) => {
    const d = p.palletData.pallet_data.palletDimensions;
    return p.rotation === 90 ? { w: d.length, h: d.width } : { w: d.width, h: d.length };
  }, []);

  const checkCollision = useCallback((x: number, y: number, w: number, h: number, excludeId: string) => {
    return placedPallets.some(p => {
      if (p.id === excludeId) return false;
      const d = getPalletDims(p);
      const ox = Math.min(x + w, p.x + d.w) - Math.max(x, p.x);
      const oy = Math.min(y + h, p.y + d.h) - Math.max(y, p.y);
      return ox > COLLISION_TOLERANCE && oy > COLLISION_TOLERANCE;
    });
  }, [placedPallets, getPalletDims]);

  const checkBounds = useCallback((x: number, y: number, w: number, h: number) => {
    if (!trailer) return false;
    return x >= 0 && y >= 0 && x + w <= trailer.width && y + h <= trailer.length;
  }, [trailer]);

  const screenToTrailer = useCallback((clientX: number, clientY: number) => {
    const rect = canvasAreaRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale };
  }, [scale]);

  // --- Keyboard shortcuts ---
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === " ") { e.preventDefault(); setSpaceHeld(true); return; }
      if (!selectedPallet) return;
      if (e.key === "r" || e.key === "R") { e.preventDefault(); handleRotate(selectedPallet); }
      else if (e.key === "d" || e.key === "D") { e.preventDefault(); onDuplicatePallet?.(selectedPallet); }
      else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); handleDelete(selectedPallet); }
      else if (e.key === "Escape") { setSelectedPallet(null); setStopPopoverId(null); }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === " ") setSpaceHeld(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => { window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp); };
  }, [selectedPallet, placedPallets]);

  // --- Internal drag (pointer events: works for mouse, touch, and pen) ---
  const handlePalletPointerDown = (e: React.PointerEvent, palletId: string) => {
    // Mouse: only left-button. Touch/pen: always proceed.
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const p = placedPallets.find(pp => pp.id === palletId);
    if (!p) return;
    // Capture this pointer so move/up events keep firing on this element
    // even if the finger/mouse drifts outside it.
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
    setSelectedPallet(palletId);
    // Ctrl+drag → copy mode: duplicate immediately, drag the copy
    if (e.ctrlKey || e.metaKey) {
      setCtrlDragCopy(true);
      const dims = getPalletDims(p);
      const dup: PlacedPallet = { ...p, id: crypto.randomUUID(), x: p.x, y: p.y };
      onPlacePallet(dup);
      setSelectedPallet(dup.id);
      const pos = screenToTrailer(e.clientX, e.clientY);
      setDragState({
        palletId: dup.id,
        offsetX: pos.x - p.x, offsetY: pos.y - p.y,
        startX: p.x, startY: p.y, currentX: p.x, currentY: p.y,
      });
      return;
    }
    setCtrlDragCopy(false);
    const pos = screenToTrailer(e.clientX, e.clientY);
    setDragState({
      palletId,
      offsetX: pos.x - p.x, offsetY: pos.y - p.y,
      startX: p.x, startY: p.y, currentX: p.x, currentY: p.y,
    });
  };

  const handlePalletPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragState || !trailer) return;
    e.preventDefault();
    const pos = screenToTrailer(e.clientX, e.clientY);
    const nx = snapValue(pos.x - dragState.offsetX);
    const ny = snapValue(pos.y - dragState.offsetY);
    setDragState(prev => prev ? { ...prev, currentX: nx, currentY: ny } : null);
  }, [dragState, trailer, screenToTrailer, snapValue]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState || !trailer) return;
    const pos = screenToTrailer(e.clientX, e.clientY);
    const nx = snapValue(pos.x - dragState.offsetX);
    const ny = snapValue(pos.y - dragState.offsetY);
    setDragState(prev => prev ? { ...prev, currentX: nx, currentY: ny } : null);
  }, [dragState, trailer, screenToTrailer, snapValue]);

  const handleMouseUp = useCallback(() => {
    if (!dragState || !trailer) { setDragState(null); return; }
    const p = placedPallets.find(pp => pp.id === dragState.palletId);
    if (!p) { setDragState(null); return; }
    const dims = getPalletDims(p);
    const { currentX: nx, currentY: ny } = dragState;
    if (!checkBounds(nx, ny, dims.w, dims.h)) {
      toast.error("Out of bounds"); setDragState(null); return;
    }
    if (checkCollision(nx, ny, dims.w, dims.h, dragState.palletId)) {
      toast.error("Overlap detected"); setDragState(null); return;
    }
    onUpdatePallet(dragState.palletId, { x: nx, y: ny });
    setDragState(null);
  }, [dragState, trailer, placedPallets, getPalletDims, checkBounds, checkCollision, onUpdatePallet]);

  const handlePalletPointerUp = useCallback((e: React.PointerEvent) => {
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    handleMouseUp();
  }, [handleMouseUp]);

  // --- Library drop ---
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!trailer || !draggedPallet) return;
    const pos = screenToTrailer(e.clientX, e.clientY);
    const dims = draggedPallet.pallet_data.palletDimensions;
    const x = snapValue(pos.x - dims.width / 2);
    const y = snapValue(pos.y - dims.length / 2);
    const valid = checkBounds(x, y, dims.width, dims.length) && !checkCollision(x, y, dims.width, dims.length, "");
    setDropPreview({ x, y, w: dims.width, h: dims.length, valid });
  }, [trailer, draggedPallet, screenToTrailer, snapValue, checkBounds, checkCollision]);

  const handleDragLeave = () => setDropPreview(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDropPreview(null);
    if (!trailer || !draggedPallet) return;
    const pos = screenToTrailer(e.clientX, e.clientY);
    const dims = draggedPallet.pallet_data.palletDimensions;
    const x = snapValue(pos.x - dims.width / 2);
    const y = snapValue(pos.y - dims.length / 2);
    if (!checkBounds(x, y, dims.width, dims.length)) { toast.error("Out of bounds"); return; }
    if (checkCollision(x, y, dims.width, dims.length, "")) { toast.error("Overlap detected"); return; }
    const newPallet: PlacedPallet = {
      id: crypto.randomUUID(), palletId: draggedPallet.id,
      x, y, rotation: 0, palletData: draggedPallet,
    };
    onPlacePallet(newPallet);
    setSelectedPallet(newPallet.id);
    toast.success(`${draggedPallet.name} placed on trailer`);
  }, [trailer, draggedPallet, screenToTrailer, snapValue, checkBounds, checkCollision, onPlacePallet, setSelectedPallet]);

  // --- Actions ---
  const handleRotate = useCallback((id: string) => {
    const p = placedPallets.find(pp => pp.id === id);
    if (!p || !trailer) return;
    const newRot = p.rotation === 0 ? 90 : 0;
    const d = p.palletData.pallet_data.palletDimensions;
    const nw = newRot === 90 ? d.length : d.width;
    const nh = newRot === 90 ? d.width : d.length;
    if (!checkBounds(p.x, p.y, nw, nh)) { toast.error("Cannot rotate — out of bounds"); return; }
    if (checkCollision(p.x, p.y, nw, nh, id)) { toast.error("Cannot rotate — overlap"); return; }
    onUpdatePallet(id, { rotation: newRot });
  }, [placedPallets, trailer, checkBounds, checkCollision, onUpdatePallet]);

  const handleDelete = useCallback((id: string) => {
    onRemovePallet(id);
    setSelectedPallet(null);
    toast.success("Pallet removed");
  }, [onRemovePallet, setSelectedPallet]);

  // --- Zoom ---
  const handleZoomIn = () => setZoom(z => Math.min(MAX_ZOOM, z + 0.25));
  const handleZoomOut = () => setZoom(z => Math.max(MIN_ZOOM, z - 0.25));
  const handleFitToScreen = useCallback(() => {
    if (!trailer || !containerRef.current) { setZoom(1); setPanOffset({ x: 0, y: 0 }); return; }
    const rect = containerRef.current.getBoundingClientRect();
    const paddingX = 80;
    const paddingY = 60;
    const availW = rect.width - RULER_SIZE - paddingX;
    const availH = (rect.height - RULER_SIZE - paddingY) * 0.85; // target ~85% of visible height
    const zx = availW / (trailer.width * BASE_SCALE);
    const zy = availH / (trailer.length * BASE_SCALE);
    setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.min(zx, zy))));
    setPanOffset({ x: 0, y: 0 });
  }, [trailer]);

  const handleResetView = useCallback(() => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  // Auto-fit trailer to viewport when trailer changes
  useEffect(() => {
    if (!trailer) return;
    // Small delay to ensure containerRef is measured after render
    const timer = setTimeout(() => {
      handleFitToScreen();
    }, 50);
    return () => clearTimeout(timer);
  }, [trailer?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Mouse wheel zoom: only with Ctrl/Cmd held (pinch-zoom on trackpads).
  // Plain scroll/two-finger pan is allowed to scroll the page normally.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(z => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z + delta)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // --- Clamp pan so trailer stays within visible canvas ---
  const clampPan = useCallback((px: number, py: number): { x: number; y: number } => {
    if (!containerRef.current || !trailer) return { x: px, y: py };
    const rect = containerRef.current.getBoundingClientRect();
    const contentW = trailerW + RULER_SIZE + 32; // trailer + ruler + padding
    const contentH = trailerH + RULER_SIZE + 32;
    const minX = Math.min(0, rect.width - contentW - 16);
    const minY = Math.min(0, rect.height - contentH - 16);
    return {
      x: Math.max(minX, Math.min(16, px)),
      y: Math.max(minY, Math.min(16, py)),
    };
  }, [trailer, trailerW, trailerH]);

  // --- Pan via left-click drag on background, middle-click, or Alt+click ---
  const panMoved = useRef(false);

  const handleContainerMouseDown = useCallback((e: React.MouseEvent) => {
    // Space+click, middle-click, Alt+click, or left-click on background → pan
    if (e.button === 1 || (e.button === 0 && e.altKey) || (e.button === 0 && spaceHeld) || e.button === 0) {
      // Only start pan for plain left-click if target is the canvas background
      if (e.button === 0 && !e.altKey && !spaceHeld) {
        const target = e.target as HTMLElement;
        const isBackground = target === canvasAreaRef.current || target.dataset?.grid === "true" || target === containerRef.current || target.closest('[data-grid="true"]') === canvasAreaRef.current;
        if (!isBackground) return;
      }
      e.preventDefault();
      panMoved.current = false;
      setPanState({ startX: e.clientX, startY: e.clientY, startPanX: panOffset.x, startPanY: panOffset.y });
    }
  }, [panOffset, spaceHeld]);

  const handleContainerMouseMove = useCallback((e: React.MouseEvent) => {
    if (panState) {
      const dx = e.clientX - panState.startX;
      const dy = e.clientY - panState.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) panMoved.current = true;
      const clamped = clampPan(panState.startPanX + dx, panState.startPanY + dy);
      setPanOffset(clamped);
      return;
    }
    handleMouseMove(e);
  }, [panState, handleMouseMove, clampPan]);

  const handleContainerMouseUp = useCallback((e: React.MouseEvent) => {
    if (panState) {
      setPanState(null);
      return;
    }
    handleMouseUp();
  }, [panState, handleMouseUp]);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (panMoved.current) return;
    if (panState) return;
    if (e.target === canvasAreaRef.current || (e.target as HTMLElement).dataset?.grid === "true") {
      setSelectedPallet(null);
      setStopPopoverId(null);
    }
  };

  // --- Empty state with onboarding guide ---
  if (!trailer) {
    const steps = [
      { icon: Truck, label: "Select or create a trailer" },
      { icon: GripVertical, label: "Drag pallets, containers, or items onto the trailer" },
      { icon: Wand2, label: "Optimize the layout with Auto Pack" },
    ];
    return (
      <div className="w-full h-full flex items-center justify-center border border-dashed border-border/50 bg-muted/5 rounded-lg p-8">
        <div className="max-w-sm w-full rounded-xl border border-border bg-card p-6 shadow-sm animate-in fade-in-0 duration-300">
          <div className="flex flex-col items-center text-center mb-5">
            <div className="p-3 rounded-2xl bg-primary/10 mb-4">
              <Truck className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">
              Plan Your Trailer Layout
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Follow these steps to begin planning your trailer load.
            </p>
          </div>

          <div className="space-y-2.5 mb-5">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2.5">
                <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                  {i + 1}
                </div>
                <step.icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-foreground/80">{step.label}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            {onRequestSelectTrailer && (
              <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={onRequestSelectTrailer}>
                <Truck className="h-3.5 w-3.5" /> Select Trailer
              </Button>
            )}
            {onRequestCreateTrailer && (
              <Button size="sm" className="flex-1 gap-1.5" onClick={onRequestCreateTrailer}>
                <Plus className="h-3.5 w-3.5" /> Create New Trailer
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const footMarks = (totalInches: number, scaleFactor: number) => {
    const marks: { pos: number; label: string; isMajor: boolean }[] = [];
    const maxFeet = Math.ceil(totalInches / 12);
    for (let ft = 0; ft <= maxFeet; ft++) {
      const inch = ft * 12;
      if (inch > totalInches) break;
      // Only emit major (5ft) marks to reduce ruler noise
      if (ft % 5 !== 0) continue;
      marks.push({ pos: inch * scaleFactor, label: `${ft}'`, isMajor: true });
    }
    return marks;
  };

  // 1ft and 5ft grid sizes for multi-weight grid
  const ftSize = 12 * scale;       // 1-foot grid
  const ft5Size = 60 * scale;      // 5-foot grid

  return (
    <div className="relative w-full h-full flex flex-col rounded-lg border border-border bg-card overflow-hidden">
      {/* 3D view — full-canvas render, mirrors PalletCanvas3D. */}
      {viewMode === "3d" && trailer && isDesktop === true ? (
        <>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-border bg-muted/20">
            <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} isDesktop={isDesktop} />
            <div className="flex-1" />
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="font-medium text-foreground/80">{trailer.name}</span>
              <span className="text-muted-foreground/40">·</span>
              <span>{trailer.width}"×{trailer.length}"</span>
              <span className="text-muted-foreground/40">·</span>
              <span>{placedPallets.length} load{placedPallets.length !== 1 ? "s" : ""}</span>
            </div>
          </div>
          <Suspense
            fallback={
              <div className="flex-1 flex items-center justify-center bg-[#eef1f4]">
                <div className="text-xs text-muted-foreground animate-pulse">Loading 3D view…</div>
              </div>
            }
          >
            <TrailerCanvas3D
              trailer={trailer}
              placedPallets={placedPallets}
              selectedPalletId={selectedPallet}
              onSelectPallet={setSelectedPallet}
              onUpdatePallet={onUpdatePallet}
              onRemovePallet={onRemovePallet}
              onPlacePallet={onPlacePallet}
              libraryPallets={savedPallets}
              onExitFullscreen={() => setViewMode("2d")}
            />
          </Suspense>
        </>
      ) : (
      <>
      {/* Compact canvas toolbar */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-border bg-muted/20">
        <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} isDesktop={isDesktop} />
        {isDesktop !== false && <div className="w-px h-4 bg-border mx-0.5" />}
        {placedPallets.length > 0 ? (
          <>
            <div className="flex items-center gap-1">
              <Tooltip><TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleZoomOut} disabled={zoom <= MIN_ZOOM}><ZoomOut className="h-3.5 w-3.5" /></Button>
              </TooltipTrigger><TooltipContent side="bottom">Zoom out</TooltipContent></Tooltip>

              <Slider
                value={[zoom]}
                onValueChange={([v]) => setZoom(v)}
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={0.05}
                className="w-24"
              />

              <Tooltip><TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleZoomIn} disabled={zoom >= MAX_ZOOM}><ZoomIn className="h-3.5 w-3.5" /></Button>
              </TooltipTrigger><TooltipContent side="bottom">Zoom in</TooltipContent></Tooltip>

              <span className="text-[10px] font-mono text-muted-foreground w-9 text-center select-none">{Math.round(zoom * 100)}%</span>
            </div>

            <div className="w-px h-4 bg-border mx-0.5" />

            <Tooltip><TooltipTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleFitToScreen}><Maximize2 className="h-3.5 w-3.5" /></Button>
            </TooltipTrigger><TooltipContent side="bottom">Fit to trailer</TooltipContent></Tooltip>

            <Tooltip><TooltipTrigger asChild>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleResetView}
                disabled={zoom === 1 && panOffset.x === 0 && panOffset.y === 0}>
                <Home className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger><TooltipContent side="bottom">Reset view</TooltipContent></Tooltip>

            <div className="w-px h-4 bg-border mx-0.5" />

            <Tooltip><TooltipTrigger asChild>
              <Button size="icon" variant={snapEnabled ? "secondary" : "ghost"} className="h-7 w-7"
                onClick={() => { setSnapEnabled(s => !s); toast.info(snapEnabled ? "Free placement" : "Snap enabled"); }}>
                <Grid3X3 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger><TooltipContent side="bottom">{snapEnabled ? "Snap (on)" : "Snap (off)"}</TooltipContent></Tooltip>
          </>
        ) : (
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] gap-1.5 text-muted-foreground">
                <Settings2 className="h-3.5 w-3.5" /> View Options
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-2">
              <div className="space-y-1">
                <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-muted" onClick={handleZoomIn}>
                  <ZoomIn className="h-3.5 w-3.5" /> Zoom in
                </button>
                <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-muted" onClick={handleZoomOut}>
                  <ZoomOut className="h-3.5 w-3.5" /> Zoom out
                </button>
                <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-muted" onClick={handleFitToScreen}>
                  <Maximize2 className="h-3.5 w-3.5" /> Fit to vehicle
                </button>
                <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-muted" onClick={handleResetView}>
                  <Home className="h-3.5 w-3.5" /> Reset view
                </button>
                <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-muted" onClick={() => setSnapEnabled(s => !s)}>
                  <Grid3X3 className="h-3.5 w-3.5" /> Snap to grid {snapEnabled ? "(on)" : "(off)"}
                </button>
                <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-muted" onClick={() => setShowZones(s => !s)}>
                  <MapPin className="h-3.5 w-3.5" /> Show zones {showZones ? "(on)" : "(off)"}
                </button>
                <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-muted" onClick={() => setShowGridOverride(s => !s)}>
                  <Grid3X3 className="h-3.5 w-3.5" /> Show grid {showGridOverride ? "(on)" : "(off)"}
                </button>
              </div>
            </PopoverContent>
          </Popover>
        )}

        <div className="flex-1" />

        <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="font-medium text-foreground/80">{trailer.name}</span>
          <span className="text-muted-foreground/40">·</span>
          <span>{trailer.width}"×{trailer.length}"</span>
          <span className="text-muted-foreground/40">·</span>
          <span>{placedPallets.length} load{placedPallets.length !== 1 ? "s" : ""}</span>
          {hasStops && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <span className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{new Set(placedPallets.filter(p => p.stopNumber).map(p => p.stopNumber)).size}</span>
            </>
          )}
        </div>
      </div>

      {/* Canvas area */}
      <div ref={containerRef}
        className="flex-1 overflow-hidden relative"
        style={{ cursor: spaceHeld ? "grab" : panState ? "grabbing" : (dragState ? "grabbing" : "default") }}
        onMouseDown={handleContainerMouseDown}
        onMouseMove={handleContainerMouseMove}
        onMouseUp={handleContainerMouseUp}
        onMouseLeave={handleContainerMouseUp}>
        <div className="inline-flex min-w-full min-h-full p-8"
          style={{
            paddingLeft: RULER_SIZE + 16,
            paddingTop: RULER_SIZE + 16,
            transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
          }}>
          <div className="relative" style={{ width: trailerW, height: trailerH }}>

            {/* Top ruler */}
            <div className="absolute select-none pointer-events-none" style={{ top: -RULER_SIZE, left: 0, width: trailerW, height: RULER_SIZE }}>
              <svg width={trailerW} height={RULER_SIZE} className="overflow-visible">
                <line x1={0} y1={RULER_SIZE} x2={trailerW} y2={RULER_SIZE} stroke="hsl(var(--border))" strokeWidth={1} />
                {footMarks(trailer.width, scale).map((m, i) => (
                  <g key={i}>
                    <line x1={m.pos} y1={RULER_SIZE} x2={m.pos} y2={m.isMajor ? RULER_SIZE - 14 : RULER_SIZE - 8}
                      stroke={m.isMajor ? "hsl(var(--foreground) / 0.5)" : "hsl(var(--muted-foreground) / 0.5)"}
                      strokeWidth={m.isMajor ? 1.5 : 0.75} />
                    {(m.isMajor || zoom >= 0.6) && (
                      <text x={m.pos + 3} y={RULER_SIZE - (m.isMajor ? 16 : 10)}
                        fill={m.isMajor ? "hsl(var(--foreground) / 0.7)" : "hsl(var(--muted-foreground) / 0.5)"}
                        fontSize={m.isMajor ? 10 : 8} fontFamily="monospace" fontWeight={m.isMajor ? 600 : 400}>{m.label}</text>
                    )}
                  </g>
                ))}
              </svg>
            </div>

            {/* Left ruler */}
            <div className="absolute select-none pointer-events-none" style={{ left: -RULER_SIZE, top: 0, width: RULER_SIZE, height: trailerH }}>
              <svg width={RULER_SIZE} height={trailerH} className="overflow-visible">
                <line x1={RULER_SIZE} y1={0} x2={RULER_SIZE} y2={trailerH} stroke="hsl(var(--border))" strokeWidth={1} />
                {footMarks(trailer.length, scale).map((m, i) => (
                  <g key={i}>
                    <line x1={RULER_SIZE} y1={m.pos} x2={m.isMajor ? RULER_SIZE - 14 : RULER_SIZE - 8}
                      y2={m.pos}
                      stroke={m.isMajor ? "hsl(var(--foreground) / 0.5)" : "hsl(var(--muted-foreground) / 0.5)"}
                      strokeWidth={m.isMajor ? 1.5 : 0.75} />
                    {(m.isMajor || zoom >= 0.6) && (
                      <text x={2} y={m.pos + (m.isMajor ? 4 : 3)}
                        fill={m.isMajor ? "hsl(var(--foreground) / 0.7)" : "hsl(var(--muted-foreground) / 0.5)"}
                        fontSize={m.isMajor ? 10 : 8} fontFamily="monospace" fontWeight={m.isMajor ? 600 : 400}>{m.label}</text>
                    )}
                  </g>
                ))}
              </svg>
            </div>

            {/* Trailer floor */}
            <div
              ref={canvasAreaRef}
              data-grid="true"
              className="absolute inset-0 rounded-[3px]"
              style={{
                // Hide the dense placement grid until pallets exist (or user enables it via View Options).
                backgroundImage: (placedPallets.length > 0 || showGridOverride)
                  ? `
                      linear-gradient(to right, hsl(var(--foreground) / 0.08) 1px, transparent 1px),
                      linear-gradient(to bottom, hsl(var(--foreground) / 0.08) 1px, transparent 1px),
                      linear-gradient(to right, hsl(var(--border) / 0.15) 1px, transparent 1px),
                      linear-gradient(to bottom, hsl(var(--border) / 0.15) 1px, transparent 1px)
                    `
                  : undefined,
                backgroundSize: `${ft5Size}px ${ft5Size}px, ${ft5Size}px ${ft5Size}px, ${ftSize}px ${ftSize}px, ${ftSize}px ${ftSize}px`,
                backgroundColor: "hsl(var(--muted) / 0.04)",
                cursor: dragState ? "grabbing" : "default",
              }}
              onClick={handleCanvasClick}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {/* Trailer boundary — double border effect */}
              <div className="absolute inset-0 border-2 border-foreground/25 rounded-[3px] pointer-events-none" />
              <div className="absolute inset-[-1px] border border-foreground/8 rounded-[4px] pointer-events-none" />

              {/* Zone overlays */}
              {TRAILER_ZONES.map((zone) => {
                const bounds = getZonePixelBounds(zone, trailer.length, scale);
                const selectedPalletObj = selectedPallet
                  ? placedPallets.find(p => p.id === selectedPallet)
                  : null;
                const selectedZone = selectedPalletObj
                  ? getLoadZone(selectedPalletObj.y, selectedPalletObj.rotation === 90
                      ? selectedPalletObj.palletData.pallet_data.palletDimensions.width
                      : selectedPalletObj.palletData.pallet_data.palletDimensions.length,
                    trailer.length)
                  : null;
                const isActiveZone = selectedZone?.id === zone.id;

                return (
                  <div
                    key={zone.id}
                    className="absolute left-0 right-0 pointer-events-none transition-all duration-200"
                    style={{
                      top: bounds.top,
                      height: bounds.height,
                      backgroundColor: isActiveZone ? zone.bg.replace(/[\d.]+\)$/, '0.10)') : zone.bg,
                      borderTop: zone.id !== "front" ? `1px dashed ${zone.border}` : undefined,
                      boxShadow: isActiveZone ? `inset 0 0 0 1.5px ${zone.border}` : undefined,
                      borderRadius: zone.id === "front" ? "3px 3px 0 0" : zone.id === "door" ? "0 0 3px 3px" : undefined,
                    }}
                  >
                    {/* Zone label — left side, vertically centered */}
                    {(showZones || isActiveZone) && (
                      <div
                        className="absolute left-1.5 flex items-center gap-1 select-none transition-opacity duration-200"
                        style={{
                          top: "50%",
                          transform: "translateY(-50%)",
                          opacity: isActiveZone ? 0.7 : 0.35,
                        }}
                      >
                        <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: zone.text }}>
                          {zone.label}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Front (top) — simple label */}
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground/70 font-medium pointer-events-none select-none tracking-wide">
                ↑ Front / Cab
              </div>

              {/* Rear (bottom) — simple label */}
              <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground/70 font-medium pointer-events-none select-none tracking-wide">
                ↓ Rear / Door
              </div>

              {/* Drop preview ghost — enhanced with dimensions overlay */}
              {dropPreview && (
                <div
                  className={cn(
                    "absolute rounded-[3px] pointer-events-none animate-scale-in",
                    dropPreview.valid
                      ? "border-2 border-primary/60 bg-primary/8"
                      : "border-2 border-dashed border-destructive/50 bg-destructive/8"
                  )}
                  style={{
                    left: dropPreview.x * scale,
                    top: dropPreview.y * scale,
                    width: dropPreview.w * scale,
                    height: dropPreview.h * scale,
                    boxShadow: dropPreview.valid
                      ? "0 0 0 1px hsl(var(--primary) / 0.15), 0 4px 12px hsl(var(--primary) / 0.1)"
                      : "0 0 0 1px hsl(var(--destructive) / 0.15)",
                  }}
                >
                  {/* Dimension info card */}
                  {dropPreview.valid && draggedPallet && (
                    <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none z-20 animate-fade-in"
                      style={{ bottom: `calc(100% + 6px)` }}>
                      <div className="bg-card/95 backdrop-blur-sm border border-border/60 rounded-md shadow-lg px-2.5 py-1.5 whitespace-nowrap text-center">
                        <p className="text-[10px] font-semibold text-foreground">
                          {dropPreview.w}" × {dropPreview.h}"
                        </p>
                        <p className="text-[9px] text-muted-foreground tabular-nums">
                          {draggedPallet.pallet_data.placedCases.reduce((s, c) => s + (c.weight || 0), 0).toLocaleString()} lbs
                        </p>
                      </div>
                    </div>
                  )}
                  {/* Crosshair center */}
                  {dropPreview.valid && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full border border-primary/40 bg-primary/10" />
                    </div>
                  )}
                  {!dropPreview.valid && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <AlertTriangle className="h-4 w-4 text-destructive/60" />
                    </div>
                  )}
                </div>
              )}

              {/* Occupied floor shadows under pallets */}
              {placedPallets.map((placed) => {
                const dims = getPalletDims(placed);
                return (
                  <div
                    key={`floor-${placed.id}`}
                    className="absolute rounded-[2px] pointer-events-none"
                    style={{
                      left: placed.x * scale,
                      top: placed.y * scale,
                      width: dims.w * scale,
                      height: dims.h * scale,
                      backgroundColor: "hsl(var(--foreground) / 0.04)",
                    }}
                  />
                );
              })}

              {/* Placed pallets */}
              {placedPallets.map((placed, index) => {
                const dims = getPalletDims(placed);
                const isDragging = dragState?.palletId === placed.id;
                const dx = isDragging ? dragState!.currentX : placed.x;
                const dy = isDragging ? dragState!.currentY : placed.y;
                const isSelected = selectedPallet === placed.id;
                const isBlocked = blockedIds.has(placed.id);
                const isFlagged = Boolean(highlightedIds?.includes(placed.id));

                // Color: use stop color if assigned, else fallback
                const color = placed.stopNumber && placed.stopNumber > 0
                  ? getStopColor(placed.stopNumber)
                  : getFallbackColor(index);

                let dragValid = true;
                if (isDragging) {
                  dragValid = checkBounds(dx, dy, dims.w, dims.h) && !checkCollision(dx, dy, dims.w, dims.h, placed.id);
                }

                const totalWeight = placed.palletData.pallet_data.placedCases.reduce((s, c) => s + (c.weight || 0), 0);

                return (
                  <div
                    key={placed.id}
                    onPointerDown={(e) => handlePalletPointerDown(e, placed.id)}
                    onPointerMove={handlePalletPointerMove}
                    onPointerUp={handlePalletPointerUp}
                    onPointerCancel={handlePalletPointerUp}
                    onClick={(e) => { e.stopPropagation(); setSelectedPallet(placed.id); }}
                    className={cn(
                      "absolute rounded-[4px] select-none group",
                      isDragging && "cursor-grabbing z-30",
                      !isDragging && "cursor-grab",
                      isSelected && !isDragging && "z-20",
                      !isSelected && !isDragging && "hover:brightness-[0.97]",
                    )}
                    style={{
                      left: dx * scale,
                      top: dy * scale,
                      width: dims.w * scale,
                      height: dims.h * scale,
                      backgroundColor: color.bg,
                      borderWidth: isSelected ? 2 : 1,
                      borderStyle: isDragging && !dragValid ? "dashed" : isBlocked ? "dashed" : "solid",
                      borderColor: isBlocked && !isSelected
                        ? "hsl(var(--destructive))"
                        : isDragging && !dragValid
                          ? "hsl(var(--destructive))"
                          : isSelected ? color.border : `${color.border}88`,
                      // Selection glow + raised shadow
                      boxShadow: isFlagged && !isDragging
                        ? `0 0 0 2px hsl(var(--destructive) / 0.7), 0 0 14px hsl(var(--destructive) / 0.35)`
                        : isSelected && !isDragging
                        ? `0 0 0 2px ${color.border}30, 0 0 12px ${color.border}20, 0 4px 12px hsl(var(--foreground) / 0.08)`
                        : isDragging
                          ? dragValid
                            ? `0 8px 24px hsl(var(--foreground) / 0.15), 0 0 0 1px ${color.border}40`
                            : `0 8px 24px hsl(var(--destructive) / 0.2), 0 0 0 2px hsl(var(--destructive) / 0.4)`
                          : "0 1px 3px hsl(var(--foreground) / 0.04)",
                      // Smooth repositioning when not dragging
                      transition: isDragging
                        ? "box-shadow 0.15s ease-out"
                        : "left 0.2s ease-out, top 0.2s ease-out, box-shadow 0.2s ease-out, border-color 0.2s ease-out, transform 0.2s ease-out",
                      transform: isSelected && !isDragging
                        ? "scale(1.02) translateY(-1px)"
                        : isDragging
                          ? "scale(1.04)"
                          : undefined,
                      animation: !isDragging ? "scale-in 0.2s ease-out" : undefined,
                      // Prevent the browser from hijacking touches as page-scroll while
                      // a mobile user is dragging a pallet around the trailer.
                      touchAction: "none",
                    }}
                  >
                    {/* Collision warning overlay */}
                    {isDragging && !dragValid && (
                      <div className="absolute inset-0 rounded-[3px] flex items-center justify-center bg-destructive/10 pointer-events-none z-10 animate-fade-in">
                        <AlertTriangle className="h-5 w-5 text-destructive drop-shadow-sm" />
                      </div>
                    )}

                    {/* Stop badge (top-left) */}
                    {placed.stopNumber && placed.stopNumber > 0 && (
                      <div
                        className="absolute -top-2.5 -left-1 px-1.5 py-0 rounded-full text-[9px] font-bold shadow-sm pointer-events-none z-10"
                        style={{ backgroundColor: color.border, color: "white" }}
                      >
                        S{placed.stopNumber}
                      </div>
                    )}

                    {/* Blocking warning indicator */}
                    {isBlocked && !isDragging && (
                      <div className="absolute -top-2.5 -right-1 z-10 pointer-events-none">
                        <AlertTriangle className="h-4 w-4 text-destructive drop-shadow-sm" />
                      </div>
                    )}

                    {/* Content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-1 overflow-hidden">
                      <span
                        className="font-semibold text-center leading-tight truncate w-full px-1"
                        style={{ color: color.text, fontSize: Math.max(9, Math.min(13, dims.w * scale / 8)) }}
                      >
                        {placed.palletData.name.length > 12
                          ? placed.palletData.name.substring(0, 10) + "…"
                          : placed.palletData.name}
                      </span>
                      {dims.w * scale > 60 && dims.h * scale > 40 && (
                        <span className="text-[9px] mt-0.5 opacity-70" style={{ color: color.text }}>
                          {placed.destination || `${dims.w}" × ${dims.h}"`}
                        </span>
                      )}
                    </div>

                    {/* Rotation badge */}
                    {placed.rotation === 90 && (
                      <div className="absolute top-0.5 right-0.5 rounded-sm p-0.5" style={{ backgroundColor: `${color.border}22` }}>
                        <RotateCw className="h-2.5 w-2.5" style={{ color: color.text }} />
                      </div>
                    )}

                    {/* Dimension labels when selected */}
                    {isSelected && !isDragging && (
                      <>
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[9px] font-mono whitespace-nowrap pointer-events-none"
                          style={{ backgroundColor: color.border, color: "white" }}>{dims.w}"</div>
                        <div className="absolute top-1/2 -right-5 -translate-y-1/2 px-1.5 py-0.5 rounded text-[9px] font-mono whitespace-nowrap pointer-events-none"
                          style={{ backgroundColor: color.border, color: "white", writingMode: "vertical-rl" }}>{dims.h}"</div>
                      </>
                    )}

                    {/* Quick action toolbar — floating above selected load */}
                    {isSelected && !isDragging && (
                      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-0.5 z-30 animate-scale-in"
                        style={{ bottom: `calc(100% + 8px)` }}
                        onPointerDown={(e) => e.stopPropagation()}
                        onPointerUp={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-0.5 bg-card border border-border/60 rounded-lg shadow-lg px-1 py-0.5 pointer-events-auto">
                          <Tooltip><TooltipTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-6 w-6"
                              onClick={(e) => { e.stopPropagation(); handleRotate(placed.id); }}>
                              <RotateCw className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger><TooltipContent side="top" className="text-[10px]">Rotate (R)</TooltipContent></Tooltip>

                          <Tooltip><TooltipTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-6 w-6"
                              onClick={(e) => { e.stopPropagation(); onDuplicatePallet?.(placed.id); }}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </TooltipTrigger><TooltipContent side="top" className="text-[10px]">Duplicate (D)</TooltipContent></Tooltip>

                          <Tooltip><TooltipTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-6 w-6"
                              onClick={(e) => { e.stopPropagation(); handleDelete(placed.id); }}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </TooltipTrigger><TooltipContent side="top" className="text-[10px]">Delete (Del)</TooltipContent></Tooltip>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Empty hint */}
              {placedPallets.length === 0 && !dropPreview && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-40">
                  <Move className="h-8 w-8 text-muted-foreground mb-1.5" />
                  <p className="text-xs text-muted-foreground font-medium">Drag pallets here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status bar with shortcuts help */}
      <div className="flex items-center justify-between px-2.5 py-1 border-t border-border bg-muted/10 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-2">
          {selectedPallet && (
            <span className="flex items-center gap-1.5 text-foreground/60">
              <kbd className="px-1 py-0 bg-muted rounded text-[9px] font-mono leading-tight">R</kbd> rotate
              <kbd className="px-1 py-0 bg-muted rounded text-[9px] font-mono leading-tight">D</kbd> duplicate
              <kbd className="px-1 py-0 bg-muted rounded text-[9px] font-mono leading-tight">Del</kbd> remove
            </span>
          )}
          {!selectedPallet && (
            <span className="hidden sm:inline">Scroll to zoom · Space+drag to pan</span>
          )}
          {!selectedPallet && (
            <span className="sm:hidden">Pinch to zoom · Drag to pan</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="tabular-nums">{snapEnabled ? "Snap 6\"" : "Free"}</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-5 w-5">
                <Keyboard className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" align="end" className="w-56 p-3">
              <p className="text-xs font-semibold mb-2">Keyboard Shortcuts</p>
              <div className="space-y-1.5 text-[11px] text-muted-foreground">
                {[
                  ["R", "Rotate selected load"],
                  ["D", "Duplicate selected load"],
                  ["Del", "Remove selected load"],
                  ["Esc", "Deselect"],
                  ["Ctrl + Drag", "Copy load"],
                  ["Space + Drag", "Pan workspace"],
                  ["Scroll", "Zoom in / out"],
                ].map(([key, desc]) => (
                  <div key={key} className="flex items-center justify-between gap-2">
                    <span>{desc}</span>
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-[9px] font-mono leading-tight shrink-0">{key}</kbd>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      </>
      )}
    </div>
  );
};

// --- 2D / 3D view toggle ---
function ViewModeToggle({
  viewMode,
  setViewMode,
  isDesktop,
}: {
  viewMode: "2d" | "3d";
  setViewMode: (v: "2d" | "3d") => void;
  isDesktop: boolean | null;
}) {
  if (isDesktop === false) {
    return (
      <span
        className="inline-flex items-center gap-1 h-6 px-2 rounded-md border border-border/40 bg-muted/30 text-[10px] text-muted-foreground"
        title="Interactive 3D is best experienced on desktop"
      >
        <BoxIcon className="h-3 w-3" />
        3D · Best on desktop
      </span>
    );
  }
  if (isDesktop !== true) return null;
  return (
    <div className="flex items-center gap-0.5 p-0.5 rounded-md border border-border/40 bg-muted/30">
      <Button
        variant={viewMode === "2d" ? "secondary" : "ghost"}
        size="sm"
        className="h-6 px-2 text-[11px] gap-1"
        onClick={() => setViewMode("2d")}
      >
        <Square className="h-3 w-3" /> 2D
      </Button>
      <Button
        variant={viewMode === "3d" ? "secondary" : "ghost"}
        size="sm"
        className="h-6 px-2 text-[11px] gap-1"
        onClick={() => setViewMode("3d")}
      >
        <BoxIcon className="h-3 w-3" /> 3D
      </Button>
    </div>
  );
}

// --- Stop Assignment Form ---
function StopAssignmentForm({
  pallet,
  onUpdate,
}: {
  pallet: PlacedPallet;
  onUpdate: (updates: Partial<PlacedPallet>) => void;
}) {
  const [stop, setStop] = useState(pallet.stopNumber?.toString() || "");
  const [dest, setDest] = useState(pallet.destination || "");
  const [priority, setPriority] = useState(pallet.priority || "");

  return (
    <div className="space-y-2.5">
      <p className="text-xs font-semibold">Delivery Stop</p>
      <div className="space-y-1.5">
        <Label className="text-[11px]">Stop Number</Label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5, 6].map(n => {
            const sc = getStopColor(n);
            return (
              <button
                key={n}
                onClick={() => setStop(String(n))}
                className={cn(
                  "w-7 h-7 rounded text-xs font-bold transition-all",
                  stop === String(n) ? "ring-2 ring-offset-1 ring-offset-background" : "opacity-60 hover:opacity-100"
                )}
                style={{
                  backgroundColor: sc.bg,
                  color: sc.text,
                  borderColor: sc.border,
                  ...(stop === String(n) ? { ringColor: sc.border } : {}),
                }}
              >
                {n}
              </button>
            );
          })}
          {stop && (
            <button onClick={() => setStop("")}
              className="w-7 h-7 rounded text-[10px] text-muted-foreground hover:bg-muted transition-colors">
              ✕
            </button>
          )}
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-[11px]">Destination (optional)</Label>
        <Input value={dest} onChange={(e) => setDest(e.target.value)} placeholder="e.g. Sacramento" className="h-7 text-xs" />
      </div>
      <Button size="sm" className="w-full h-7 text-xs" onClick={() => {
        onUpdate({
          stopNumber: stop ? parseInt(stop) : undefined,
          destination: dest || undefined,
          priority: (priority as PlacedPallet["priority"]) || undefined,
        });
      }}>
        Save Stop Info
      </Button>
    </div>
  );
}
