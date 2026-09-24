import { useState, useRef, useCallback, useEffect, useMemo, lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PalletLibraryItem } from "@/types/pallet-builder";
import { PlacedCase } from "@/types/pallet-builder";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Package,
  Boxes,
  RotateCw,
  Trash2,
  Layers,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  CircleDot,
  MoveHorizontal,
  PanelLeftOpen,
  PanelLeftClose,
  Box as BoxIcon,
  Square } from
"lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger } from
"@/components/ui/tooltip";
import { getItemValidation, getWeightDistribution, type WeightBalance } from "@/lib/pallet-spatial-warnings";
import { PalletConfig } from "@/pages/PalletBuilder";
import { cn } from "@/lib/utils";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger } from
"@/components/ui/context-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger } from
"@/components/ui/popover";
import { getSupportLevelColor, checkOversized } from "@/lib/pallet-validation";
import { DimensionCaptureModal, DimensionCaptureResult } from "./DimensionCaptureModal";
import { usePalletSidebarCollapse } from "@/pages/PalletBuilder";
import { useIsDesktop } from "@/hooks/use-desktop";
const PalletCanvas3D = lazy(() => import("./PalletCanvas3D"));

const SidebarToggle = () => {
  const { collapsed, setCollapsed } = usePalletSidebarCollapse();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7"
      onClick={() => setCollapsed(!collapsed)}
      title={collapsed ? "Show sidebar" : "Hide sidebar"}
    >
      {collapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
    </Button>
  );
};

interface PendingDrop {
  caseData: any;
  x: number;
  y: number;
}

interface PalletBuilderCanvasProps {
  selectedPallet: PalletConfig | null;
  placedCases: PlacedCase[];
  onUpdateCases: (cases: PlacedCase[]) => void;
  selectedLayer: number;
  onChangeLayer: (layer: number) => void;
  strictMode: boolean;
  metrics: {
    totalWeight: number;
    maxWeight: number;
    weightUsage: number;
    itemCount: number;
    layers: number;
  };
  clickPlaceItem?: PalletLibraryItem | null;
  onClearClickPlace?: () => void;
  libraryItems?: PalletLibraryItem[];
  onRequestDimensions?: (item: PalletLibraryItem) => void;
}

export const PalletBuilderCanvas = ({
  selectedPallet,
  placedCases,
  onUpdateCases,
  selectedLayer,
  onChangeLayer,
  strictMode,
  metrics,
  clickPlaceItem,
  onClearClickPlace,
  libraryItems,
  onRequestDimensions,
}: PalletBuilderCanvasProps) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const isDesktop = useIsDesktop();
  // 3D is desktop-only — force back to 2D whenever viewport shrinks.
  useEffect(() => {
    if (isDesktop === false && viewMode === "3d") setViewMode("2d");
  }, [isDesktop, viewMode]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropPreview, setDropPreview] = useState<{x: number;y: number;width: number;height: number;valid: boolean;} | null>(null);

  // Internal drag state for repositioning placed items
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<{x: number;y: number;} | null>(null);
  const [dragValid, setDragValid] = useState(true);
  const dragOffsetRef = useRef<{x: number;y: number;}>({ x: 0, y: 0 });

  // Touch gesture state for tablet (pinch-to-zoom, two-finger pan)
  const [canvasPan, setCanvasPan] = useState({ x: 0, y: 0 });
  const lastTouchRef = useRef<{dist: number;midX: number;midY: number;} | null>(null);
  const dragStartRef = useRef<{x: number;y: number;id: string;started: boolean;} | null>(null);
  const didDragRef = useRef(false);
  const DRAG_THRESHOLD = 8; // pixels before drag starts (prevents accidental moves on touch)

  // Dimension capture state
  const [dimensionModalOpen, setDimensionModalOpen] = useState(false);
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null);

  // Placement glow animation
  const [justPlacedId, setJustPlacedId] = useState<string | null>(null);

  // First-time hint for click-to-place
  const [showClickHint, setShowClickHint] = useState(() => {
    return !localStorage.getItem("pallet-click-hint-dismissed");
  });

  // Scale: 8 pixels per inch
  const baseScale = 8;
  const scale = baseScale * zoom;
  const canvasWidth = selectedPallet ? selectedPallet.width * scale : 0;
  const canvasHeight = selectedPallet ? selectedPallet.length * scale : 0;

  // Check if item has valid dimensions AND weight for placement
  const hasValidPlacementData = (caseData: any): boolean => {
    const length = Number(caseData.length);
    const width = Number(caseData.width);
    const height = Number(caseData.height);
    const weight = Number(caseData.weight);
    return length > 0 && width > 0 && height > 0 && weight > 0;
  };

  // Collision detection — uses a small tolerance so edge-to-edge placements are never rejected
  const COLLISION_TOLERANCE = 0.1; // inches – prevents false positives from rounding
  const checkCollision = useCallback((
  x: number,
  y: number,
  width: number,
  length: number,
  excludeId: string,
  layer: number) =>
  {
    return placedCases.some((c) => {
      if (c.id === excludeId || c.z !== layer) return false;
      const cWidth = c.rotation === 90 || c.rotation === 270 ? c.length : c.width;
      const cLength = c.rotation === 90 || c.rotation === 270 ? c.width : c.length;
      // Overlap only when boxes intrude more than the tolerance
      const overlapX = Math.min(x + width, c.x + cWidth) - Math.max(x, c.x);
      const overlapY = Math.min(y + length, c.y + cLength) - Math.max(y, c.y);
      return overlapX > COLLISION_TOLERANCE && overlapY > COLLISION_TOLERANCE;
    });
  }, [placedCases]);

  // Boundary check
  const checkBoundary = useCallback((x: number, y: number, width: number, length: number) => {
    if (!selectedPallet) return false;
    return x >= 0 && y >= 0 && x + width <= selectedPallet.width && y + length <= selectedPallet.length;
  }, [selectedPallet]);

  // Complete placement with dimensions
  const completePlacement = useCallback((
  caseData: any,
  x: number,
  y: number,
  dimensions: {length: number;width: number;height: number;weight?: number;}) =>
  {
    if (!selectedPallet) return;

    const caseWidth = dimensions.width;
    const caseLength = dimensions.length;
    const caseHeight = dimensions.height;
    const caseWeight = dimensions.weight || Number(caseData.weight) || 50;

    // Check oversized
    if (checkOversized(caseWidth, caseLength, selectedPallet.width, selectedPallet.length, 0)) {
      toast.info("Item doesn't fit", {
        description: `${caseWidth}"×${caseLength}" is larger than the pallet (${selectedPallet.width}"×${selectedPallet.length}")`
      });
      return;
    }

    // Clamp position to boundaries
    const clampedX = Math.max(0, Math.min(x, selectedPallet.width - caseWidth));
    const clampedY = Math.max(0, Math.min(y, selectedPallet.length - caseLength));

    // Check collision at clamped position
    if (checkCollision(clampedX, clampedY, caseWidth, caseLength, "", selectedLayer)) {
      toast.info("Spot taken", {
        description: "Try a different position or rearrange with Smart Layout"
      });
      return;
    }

    // Check weight limit
    const newTotalWeight = metrics.totalWeight + caseWeight;
    if (newTotalWeight > selectedPallet.maxWeight) {
      toast.info("Weight limit reached", {
        description: `Adding this would total ${newTotalWeight.toLocaleString()} lbs (limit: ${selectedPallet.maxWeight.toLocaleString()} lbs)`
      });
      return;
    }

    // Determine display name and source from the dropped data
    const displayName = caseData.name || caseData.case_id || "Item";
    const itemSource = caseData.source || "case";

    // Create placed case
    const newCase: PlacedCase = {
      id: `placed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      caseId: displayName,
      caseType: caseData.category || caseData.case_type || caseData.subtitle || "Standard",
      x: clampedX,
      y: clampedY,
      z: selectedLayer,
      rotation: 0,
      width: caseWidth,
      length: caseLength,
      height: caseHeight,
      weight: caseWeight,
      condition: caseData.condition || "good",
      fragile: caseData.fragile || false,
      category: caseData.category || caseData.case_type || "General",
      allowRotation: caseData.allowRotation !== false && caseData.allow_rotation !== false,
      source: itemSource,
      sourceId: caseData.sourceId || caseData.id
    };

    onUpdateCases([...placedCases, newCase]);
    setSelectedCase(null);

    // Placement feedback: glow animation + dismiss hint
    setJustPlacedId(newCase.id);
    setTimeout(() => setJustPlacedId(null), 800);
    if (showClickHint) {
      setShowClickHint(false);
      localStorage.setItem("pallet-click-hint-dismissed", "1");
    }
  }, [selectedPallet, selectedLayer, placedCases, onUpdateCases, checkCollision, metrics.totalWeight, showClickHint]);

  // Handle dimension capture confirmation
  const handleDimensionConfirm = useCallback(async (result: DimensionCaptureResult) => {
    if (!pendingDrop) return;

    const { caseData, x, y } = pendingDrop;

    // Complete the placement
    completePlacement(caseData, x, y, result.dimensions);

    // "Save globally" is intentionally a no-op for Items & Containers
    // since dimensions belong to the pallet build context, not the source record.
    // We keep the checkbox hidden for these sources in the modal.

    setDimensionModalOpen(false);
    setPendingDrop(null);
  }, [pendingDrop, completePlacement]);

  // Handle dimension capture cancellation
  const handleDimensionCancel = useCallback(() => {
    setDimensionModalOpen(false);
    setPendingDrop(null);
  }, []);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setDropPreview(null);

    if (!canvasRef.current || !selectedPallet) return;

    const externalData = e.dataTransfer.getData("application/json");
    if (!externalData) return;

    try {
      const caseData = JSON.parse(externalData);
      const rect = canvasRef.current.getBoundingClientRect();

      // Calculate drop position
      const mouseX = (e.clientX - rect.left) / scale;
      const mouseY = (e.clientY - rect.top) / scale;

      // Check if item has valid dimensions AND weight
      if (!hasValidPlacementData(caseData)) {
        // Open dimension capture modal
        setPendingDrop({
          caseData,
          x: Math.round(mouseX),
          y: Math.round(mouseY)
        });
        setDimensionModalOpen(true);
        return;
      }

      // Item has dimensions - proceed with placement
      const caseWidth = Number(caseData.width) || 12;
      const caseLength = Number(caseData.length) || 12;

      // Calculate position centered on drop point
      const x = Math.round(mouseX - caseWidth / 2);
      const y = Math.round(mouseY - caseLength / 2);

      completePlacement(caseData, x, y, {
        length: caseLength,
        width: caseWidth,
        height: Number(caseData.height) || 12,
        weight: Number(caseData.weight)
      });
    } catch (err) {
      console.error("Failed to parse dropped data:", err);
    }
  }, [selectedPallet, scale, completePlacement]);

  // Handle drag over for preview
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);

    if (!canvasRef.current || !selectedPallet) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / scale;
    const mouseY = (e.clientY - rect.top) / scale;

    // Default preview size (for items without dimensions)
    const previewWidth = 12;
    const previewLength = 12;

    let x = Math.round(mouseX - previewWidth / 2);
    let y = Math.round(mouseY - previewLength / 2);
    x = Math.max(0, Math.min(x, selectedPallet.width - previewWidth));
    y = Math.max(0, Math.min(y, selectedPallet.length - previewLength));

    const isValid = checkBoundary(x, y, previewWidth, previewLength) &&
    !checkCollision(x, y, previewWidth, previewLength, "", selectedLayer);

    setDropPreview({ x, y, width: previewWidth, height: previewLength, valid: isValid });
  }, [selectedPallet, scale, selectedLayer, checkBoundary, checkCollision]);

  // Rotate case
  const handleRotate = useCallback((caseId: string) => {
    const caseItem = placedCases.find((c) => c.id === caseId);
    if (!caseItem || !selectedPallet) return;

    if (caseItem.allowRotation === false) {
      toast.info("This item's rotation is locked");
      return;
    }

    const newRotation = (caseItem.rotation + 90) % 360;
    const newWidth = newRotation === 90 || newRotation === 270 ? caseItem.length : caseItem.width;
    const newLength = newRotation === 90 || newRotation === 270 ? caseItem.width : caseItem.length;

    if (!checkBoundary(caseItem.x, caseItem.y, newWidth, newLength)) {
      toast.info("Can't rotate here", {
        description: "Would extend beyond the pallet edge"
      });
      return;
    }

    if (checkCollision(caseItem.x, caseItem.y, newWidth, newLength, caseId, caseItem.z)) {
      toast.info("Can't rotate here", {
        description: "Another item is in the way"
      });
      return;
    }

    onUpdateCases(placedCases.map((c) =>
    c.id === caseId ? { ...c, rotation: newRotation } : c
    ));
  }, [placedCases, selectedPallet, onUpdateCases, checkBoundary, checkCollision]);

  // Delete case
  const handleDelete = useCallback((caseId: string) => {
    onUpdateCases(placedCases.filter((c) => c.id !== caseId));
    setSelectedCase(null);
  }, [placedCases, onUpdateCases]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!selectedCase) return;
    if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      handleRotate(selectedCase);
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      handleDelete(selectedCase);
    }
  }, [selectedCase, handleRotate, handleDelete]);

  // Attach keyboard listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // ── Touch gestures for canvas: pinch-to-zoom & two-finger pan ──
  const handleCanvasTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      lastTouchRef.current = { dist, midX, midY };
    }
  }, []);

  const handleCanvasTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchRef.current) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

      // Pinch zoom
      const zoomDelta = (dist - lastTouchRef.current.dist) * 0.004;
      setZoom((prev) => Math.max(0.5, Math.min(2, prev + zoomDelta)));

      // Two-finger pan
      const panDx = midX - lastTouchRef.current.midX;
      const panDy = midY - lastTouchRef.current.midY;
      setCanvasPan((prev) => ({ x: prev.x + panDx, y: prev.y + panDy }));

      lastTouchRef.current = { dist, midX, midY };
    }
  }, []);

  const handleCanvasTouchEnd = useCallback(() => {
    lastTouchRef.current = null;
  }, []);

  // ── Internal drag: pointer-based repositioning with drag threshold ──
  const handlePointerDown = useCallback((e: React.PointerEvent, caseId: string) => {
    if (!canvasRef.current || !selectedPallet) return;
    e.preventDefault();
    e.stopPropagation();

    const caseItem = placedCases.find((c) => c.id === caseId);
    if (!caseItem) return;

    // Store the initial pointer position; don't start dragging yet (threshold)
    dragStartRef.current = { x: e.clientX, y: e.clientY, id: caseId, started: false };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [placedCases, selectedPallet]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!canvasRef.current || !selectedPallet) return;

    // Check threshold before starting drag
    if (dragStartRef.current && !dragStartRef.current.started) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;

      // Threshold exceeded — start the drag
      const caseItem = placedCases.find((c) => c.id === dragStartRef.current!.id);
      if (!caseItem) {dragStartRef.current = null;return;}

      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = (dragStartRef.current.x - rect.left) / scale;
      const mouseY = (dragStartRef.current.y - rect.top) / scale;
      dragOffsetRef.current = { x: mouseX - caseItem.x, y: mouseY - caseItem.y };
      setDraggingId(dragStartRef.current.id);
      setDragPos({ x: caseItem.x, y: caseItem.y });
      setDragValid(true);
      dragStartRef.current.started = true;
      // Close any open item menu while dragging
      setSelectedCase(null);
    }

    // Use ref as source of truth for active drag ID (state may lag behind)
    const activeDragId = draggingId || (dragStartRef.current?.started ? dragStartRef.current.id : null);
    if (!activeDragId) return;
    e.preventDefault();

    const caseItem = placedCases.find((c) => c.id === activeDragId);
    if (!caseItem) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / scale;
    const mouseY = (e.clientY - rect.top) / scale;

    const caseWidth = caseItem.rotation === 90 || caseItem.rotation === 270 ? caseItem.length : caseItem.width;
    const caseLength = caseItem.rotation === 90 || caseItem.rotation === 270 ? caseItem.width : caseItem.length;

    // Snap to 1-inch grid and clamp to pallet boundaries
    let x = Math.round(mouseX - dragOffsetRef.current.x);
    let y = Math.round(mouseY - dragOffsetRef.current.y);
    x = Math.max(0, Math.min(x, selectedPallet.width - caseWidth));
    y = Math.max(0, Math.min(y, selectedPallet.length - caseLength));

    const collides = checkCollision(x, y, caseWidth, caseLength, activeDragId, caseItem.z);
    setDragPos({ x, y });
    setDragValid(!collides);
  }, [draggingId, placedCases, selectedPallet, scale, checkCollision]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const activeDragId = draggingId || (dragStartRef.current?.started ? dragStartRef.current.id : null);
    dragStartRef.current = null;
    didDragRef.current = !!activeDragId;

    if (!activeDragId || !dragPos || !selectedPallet) {
      setDraggingId(null);
      setDragPos(null);
      return;
    }

    const caseItem = placedCases.find((c) => c.id === activeDragId);
    if (!caseItem) {
      setDraggingId(null);
      setDragPos(null);
      return;
    }

    const caseWidth = caseItem.rotation === 90 || caseItem.rotation === 270 ? caseItem.length : caseItem.width;
    const caseLength = caseItem.rotation === 90 || caseItem.rotation === 270 ? caseItem.width : caseItem.length;

    const collides = checkCollision(dragPos.x, dragPos.y, caseWidth, caseLength, activeDragId, caseItem.z);

    if (!collides) {
      onUpdateCases(placedCases.map((c) =>
      c.id === activeDragId ? { ...c, x: dragPos.x, y: dragPos.y } : c
      ));
    }

    setDraggingId(null);
    setDragPos(null);
    setDragValid(true);
  }, [draggingId, dragPos, placedCases, selectedPallet, checkCollision, onUpdateCases]);

  const filteredCases = placedCases.filter((c) => c.z === selectedLayer);

  // Weight distribution
  const weightDist = useMemo(() => {
    if (!selectedPallet || placedCases.length === 0) return null;
    return getWeightDistribution(placedCases, selectedPallet.width, selectedPallet.length);
  }, [placedCases, selectedPallet]);

  // Per-item validations (memoized)
  const itemValidations = useMemo(() => {
    if (!selectedPallet) return new Map();
    const map = new Map<string, ReturnType<typeof getItemValidation>>();
    for (const item of filteredCases) {
      map.set(item.id, getItemValidation(item, placedCases, selectedPallet.width, selectedPallet.length, strictMode));
    }
    return map;
  }, [filteredCases, placedCases, selectedPallet, strictMode]);

  const balanceLabel: Record<WeightBalance, string> = {
    balanced: "Balanced",
    front_heavy: "Front-heavy",
    rear_heavy: "Rear-heavy",
    left_heavy: "Left-heavy",
    right_heavy: "Right-heavy"
  };

  const balanceColor = (b: WeightBalance, severity: number) => {
    if (b === "balanced") return "text-primary";
    if (severity > 0.4) return "text-destructive";
    return "text-warning";
  };

  // Empty state - no pallet selected
  if (!selectedPallet) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/10">
        <div className="text-center space-y-4 max-w-sm p-8">
          <div className="p-5 rounded-2xl bg-primary/10 mx-auto w-fit">
            <Layers className="h-10 w-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-foreground">No pallet built yet</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Use Pallet Builder to visually organize containers and equipment.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Select a pallet type from the sidebar to start building.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 flex flex-col bg-muted/10 overflow-hidden min-w-0 isolate">
        {/* Canvas Controls */}
        <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2 border-b border-border/30 bg-background/80 backdrop-blur-sm flex-wrap">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-wrap">
            {/* Sidebar Toggle */}
            <SidebarToggle />
            {/* 2D / 3D view toggle */}
            {isDesktop === true ? (
            <div className="flex items-center gap-0.5 p-0.5 rounded-md border border-border/40 bg-muted/30">
              <Button
                variant={viewMode === "2d" ? "secondary" : "ghost"}
                size="sm"
                className="h-6 px-2 text-[11px] gap-1"
                onClick={() => setViewMode("2d")}
              >
                <Square className="h-3 w-3" />
                2D
              </Button>
              <Button
                variant={viewMode === "3d" ? "secondary" : "ghost"}
                size="sm"
                className="h-6 px-2 text-[11px] gap-1"
                onClick={() => setViewMode("3d")}
              >
                <BoxIcon className="h-3 w-3" />
                3D
              </Button>
            </div>
            ) : isDesktop === false ? (
              <span
                className="inline-flex items-center gap-1 h-6 px-2 rounded-md border border-border/40 bg-muted/30 text-[10px] text-muted-foreground"
                title="3D pallet view is available on desktop only"
              >
                <BoxIcon className="h-3 w-3" />
                3D · Desktop only
              </span>
            ) : null}
            {/* Layer + Zoom controls hidden until items exist — keeps the empty
                state focused on inventory selection rather than CAD controls. */}
            {placedCases.length > 0 && viewMode === "2d" && (
            <>
            {/* Layer Controls */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-muted-foreground/60" />
                    <span className="text-[13px] font-medium text-muted-foreground">Layer {selectedLayer}</span>
                    <div className="flex">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onChangeLayer(Math.max(1, selectedLayer - 1))}
                        disabled={selectedLayer <= 1}>

                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onChangeLayer(selectedLayer + 1)}>

                        <ChevronUp className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">Stack items across multiple layers for multi-level pallet builds.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 sm:gap-1.5 sm:border-l sm:border-border/30 sm:pl-4 sm:ml-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {setZoom(Math.max(0.5, zoom - 0.25));setCanvasPan({ x: 0, y: 0 });}}>

                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <span className="text-[11px] text-muted-foreground/60 w-10 text-center tabular-nums">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {setZoom(Math.min(2, zoom + 0.25));setCanvasPan({ x: 0, y: 0 });}}>

                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {setZoom(1);setCanvasPan({ x: 0, y: 0 });}}
                title="Reset zoom">

                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            </>
            )}
          </div>

          {/* Metrics — live capacity feedback. Hidden on mobile because the
              mobile preview card already shows item count + weight above. */}
          <div className="hidden sm:flex items-center gap-3 text-[12px]">
            <div className="flex items-center gap-1 text-muted-foreground/60">
              <span className="text-[10px] uppercase tracking-wide font-medium">Items</span>
              <span className="tabular-nums font-semibold text-foreground/80">{metrics.itemCount}</span>
            </div>
            <div className="w-px h-3 bg-border/30" />
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wide font-medium text-muted-foreground/60">Weight</span>
              {metrics.itemCount > 0 && (
                <div className="w-12 h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500 ease-out",
                      metrics.weightUsage > 100 ? "bg-destructive" :
                      metrics.weightUsage > 80 ? "bg-warning" :
                      "bg-primary"
                    )}
                    style={{ width: `${Math.min(100, metrics.weightUsage)}%` }} />
                </div>
              )}
              <span className={cn(
                "tabular-nums font-semibold transition-colors duration-300",
                metrics.weightUsage > 100 ? "text-destructive" :
                metrics.weightUsage > 80 ? "text-warning" :
                "text-foreground/80"
              )}>
                {metrics.totalWeight.toLocaleString()} / {metrics.maxWeight.toLocaleString()} lbs
              </span>
            </div>
            {metrics.weightUsage > 100 &&
            <span className="text-[11px] text-destructive font-medium">Weight limit exceeded</span>
            }
            {/* Click-to-place indicator */}
            {clickPlaceItem &&
            <>
                <div className="w-px h-3.5 bg-border/30" />


                <button
                onClick={() => onClearClickPlace?.()}
                className="text-[10px] text-muted-foreground hover:text-foreground underline">

                  Cancel
                </button>
              </>
            }
            {/* Weight Distribution — subtle inline indicator */}
            {weightDist && placedCases.length >= 2 &&
            <>
                <div className="w-px h-3.5 bg-border/30" />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className={cn("flex items-center gap-1", balanceColor(weightDist.balance, weightDist.severity))}>
                        {weightDist.balance === "balanced" ?
                      <CircleDot className="h-3 w-3" /> :

                      <MoveHorizontal className="h-3 w-3" />
                      }
                        <span className="text-[11px] font-medium">{balanceLabel[weightDist.balance]}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs max-w-[200px]">
                        {weightDist.balance === "balanced" ?
                      "Weight is evenly distributed" :
                      `Weight is shifted ${weightDist.balance.replace("_", " ")}. Consider redistributing for better stability.`}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            }
          </div>
        </div>

        {/* Canvas Area — 3D mode (desktop only; mobile users see the 2D canvas). */}
        {viewMode === "3d" && isDesktop === true ? (
          <Suspense
            fallback={
              <div className="flex-1 flex items-center justify-center bg-[#eef1f4]">
                <div className="text-xs text-muted-foreground animate-pulse">Loading 3D view…</div>
              </div>
            }
          >
            <PalletCanvas3D
              selectedPallet={selectedPallet}
              placedCases={placedCases}
              selectedCaseId={selectedCase}
              onSelectCase={setSelectedCase}
              onUpdateCases={onUpdateCases}
              selectedLayer={selectedLayer}
              libraryItems={libraryItems}
              onExitFullscreen={() => {
                /* Leaving browser fullscreen should NOT drop the user out of
                 * 3D view — view mode is decoupled from fullscreen. The only
                 * way to return to 2D is the explicit 2D toggle. */
              }}
              onRequestDimensions={onRequestDimensions}
            />
          </Suspense>
        ) : (
        <div
          className="flex-1 overflow-auto p-6 lg:p-8"
          onTouchStart={handleCanvasTouchStart}
          onTouchMove={handleCanvasTouchMove}
          onTouchEnd={handleCanvasTouchEnd}>

          <div className="flex justify-center" style={{ transform: `translate(${canvasPan.x}px, ${canvasPan.y}px)` }}>
            <div
              ref={canvasRef}
              className={cn(
                "relative bg-card rounded-lg transition-all duration-200",
                isDragOver ?
                "border border-primary/50 shadow-[0_0_0_3px_hsl(var(--primary)/0.06),0_4px_24px_-4px_rgba(0,0,0,0.08)]" :
                "border border-border/40 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.06)]",
                clickPlaceItem && "cursor-crosshair"
              )}
              style={{
                width: `${canvasWidth}px`,
                height: `${canvasHeight}px`
              }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={() => {
                setIsDragOver(false);
                setDropPreview(null);
              }}
              onClick={(e) => {
                // Click-to-place mode
                if (clickPlaceItem && canvasRef.current && selectedPallet) {
                  const rect = canvasRef.current.getBoundingClientRect();
                  const mouseX = (e.clientX - rect.left) / scale;
                  const mouseY = (e.clientY - rect.top) / scale;

                  const itemData = clickPlaceItem;
                  if (itemData.width && itemData.width > 0 && itemData.length && itemData.length > 0 && itemData.height && itemData.height > 0 && itemData.weight && itemData.weight > 0) {
                    const x = Math.round(mouseX - itemData.width / 2);
                    const y = Math.round(mouseY - itemData.length / 2);
                    completePlacement(itemData, x, y, {
                      length: itemData.length,
                      width: itemData.width,
                      height: itemData.height,
                      weight: itemData.weight
                    });
                  } else {
                    setPendingDrop({
                      caseData: itemData,
                      x: Math.round(mouseX),
                      y: Math.round(mouseY)
                    });
                    setDimensionModalOpen(true);
                  }
                  onClearClickPlace?.();
                  setSelectedCase(null);
                  return;
                }
                // Click on empty canvas area — deselect
                setSelectedCase(null);
              }}>

              {/* Grid — subtle dot pattern with foot-line emphasis */}
              <svg className="absolute inset-0 pointer-events-none" width="100%" height="100%">
                {/* Inch grid — very faint dots at intersections */}
                {Array.from({ length: selectedPallet.width }).map((_, xi) =>
                Array.from({ length: selectedPallet.length }).map((_, yi) => {
                  if (xi % 12 === 0 && yi % 12 === 0) return null; // skip foot intersections
                  return (
                    <circle
                      key={`dot-${xi}-${yi}`}
                      cx={(xi + 1) * scale}
                      cy={(yi + 1) * scale}
                      r={0.5}
                      fill="currentColor"
                      opacity={0.08} />);


                })
                )}
                {/* Foot grid lines — subtle but visible */}
                {Array.from({ length: Math.floor(selectedPallet.width / 12) + 1 }).map((_, i) =>
                <line
                  key={`fv-${i}`}
                  x1={i * 12 * scale}
                  y1={0}
                  x2={i * 12 * scale}
                  y2={canvasHeight}
                  stroke="currentColor"
                  strokeWidth={1}
                  opacity={0.08} />

                )}
                {Array.from({ length: Math.floor(selectedPallet.length / 12) + 1 }).map((_, i) =>
                <line
                  key={`fh-${i}`}
                  x1={0}
                  y1={i * 12 * scale}
                  x2={canvasWidth}
                  y2={i * 12 * scale}
                  stroke="currentColor"
                  strokeWidth={1}
                  opacity={0.08} />

                )}
              </svg>

              {/* Dimension Labels */}
              <div className="absolute -top-7 left-0 right-0 flex justify-center">
                <span className="text-[11px] font-medium text-muted-foreground/60 tracking-wide">
                  {selectedPallet.width}"
                </span>
              </div>
              <div className="absolute -left-7 top-0 bottom-0 flex items-center">
                <span className="text-[11px] font-medium text-muted-foreground/60 tracking-wide -rotate-90 whitespace-nowrap">
                  {selectedPallet.length}"
                </span>
              </div>

              {/* Drop Preview */}
              {isDragOver && dropPreview &&
              <div
                className={cn(
                  "absolute pointer-events-none z-20 rounded transition-colors duration-150",
                  dropPreview.valid ?
                  "border-2 border-primary/40 bg-primary/5" :
                  "border-2 border-destructive/30 bg-destructive/5"
                )}
                style={{
                  left: `${dropPreview.x * scale}px`,
                  top: `${dropPreview.y * scale}px`,
                  width: `${dropPreview.width * scale}px`,
                  height: `${dropPreview.height * scale}px`
                }} />

              }

              {/* Placed Cases */}
              {filteredCases.map((c) => {
                const caseWidth = c.rotation === 90 || c.rotation === 270 ? c.length : c.width;
                const caseLength = c.rotation === 90 || c.rotation === 270 ? c.width : c.length;
                const supportColor = getSupportLevelColor(c, selectedPallet.width, selectedPallet.length);
                const isSelected = selectedCase === c.id;
                const isDragging = draggingId === c.id;
                const validation = itemValidations.get(c.id);
                const hasErrors = validation && validation.errors.length > 0;
                const hasWarnings = validation && validation.warnings.length > 0;
                const isJustPlaced = justPlacedId === c.id;

                // Use live drag position when actively dragging this item
                const displayX = isDragging && dragPos ? dragPos.x : c.x;
                const displayY = isDragging && dragPos ? dragPos.y : c.y;

                return (
                  <Popover
                    key={c.id}
                    open={isSelected}
                    onOpenChange={(open) => {
                      if (!open && selectedCase === c.id) setSelectedCase(null);
                    }}>
                    <PopoverTrigger asChild>
                      <div
                        onPointerDown={(e) => handlePointerDown(e, c.id)}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onClick={(e) => {
                          e.stopPropagation();
                          // Ignore the click that fires right after a drag ends
                          if (didDragRef.current) {
                            didDragRef.current = false;
                            return;
                          }
                          // Always open (and keep open) the options for this item
                          setSelectedCase(c.id);
                        }}
                        className={cn(
                          "absolute rounded touch-none select-none transition-all duration-200",
                          isDragging ?
                          dragValid ?
                          "cursor-grabbing z-30 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.15)] border-2 border-primary/60 bg-primary/8 opacity-95" :
                          "cursor-grabbing z-30 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.1)] border-2 border-destructive/40 bg-destructive/5 opacity-85" :
                          "cursor-grab",
                          !isDragging && isSelected && "ring-2 ring-primary/50 shadow-[0_4px_12px_-2px_rgba(0,0,0,0.1)] z-10",
                          !isDragging && !isSelected && (
                          hasErrors ?
                          "border border-destructive/40 bg-destructive/8" :
                          supportColor === 'red' ?
                          "border border-destructive/30 bg-destructive/6" :
                          hasWarnings ?
                          "border border-warning/40 bg-warning/6" :
                          supportColor === 'yellow' ?
                          "border border-warning/30 bg-warning/8" :
                          "border border-primary/20 bg-primary/6 hover:border-primary/40 hover:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)]"),

                          isJustPlaced && "ring-2 ring-primary shadow-[0_0_12px_hsl(var(--primary)/0.3)] animate-scale-in z-20"
                        )}
                        style={{
                          left: `${displayX * scale}px`,
                          top: `${displayY * scale}px`,
                          width: `${caseWidth * scale}px`,
                          height: `${caseLength * scale}px`,
                          transition: isDragging ? 'none' : 'box-shadow 0.2s ease, border-color 0.2s ease, transform 0.1s ease'
                        }}>

                        <div className="w-full h-full flex flex-col items-center justify-center p-1 text-center overflow-hidden relative">
                          {/* Subtle warning indicator */}
                          {(hasErrors || hasWarnings) && !isDragging &&
                          <div className={cn(
                            "absolute top-1 right-1 opacity-60",
                            hasErrors ? "text-destructive" : "text-warning"
                          )}>
                              <AlertTriangle className="h-2.5 w-2.5" />
                            </div>
                          }
                          <div className="text-[11px] font-semibold truncate max-w-full leading-tight">{c.caseId}</div>
                          <div className="text-[9px] text-muted-foreground/70 leading-tight mt-0.5">
                            {caseWidth}×{caseLength}" · {c.weight}lb
                          </div>
                          {c.fragile &&
                          <span className="text-[7px] font-semibold uppercase tracking-wider text-destructive/70 mt-0.5">
                              Fragile
                            </span>
                          }
                          {c.rotation > 0 &&
                          <div className="text-[8px] text-muted-foreground/50">↻{c.rotation}°</div>
                          }
                        </div>
                      </div>
                    </PopoverTrigger>
                    <PopoverContent
                      side="top"
                      align="center"
                      className="w-44 p-1"
                      onOpenAutoFocus={(e) => e.preventDefault()}>
                      <div className="px-2 py-1.5 border-b mb-1">
                        <div className="text-xs font-semibold truncate">{c.caseId}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {caseWidth}×{caseLength}" · {c.weight}lb
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start h-8 text-xs"
                        disabled={c.allowRotation === false}
                        onClick={() => {
                          handleRotate(c.id);
                        }}>
                        <RotateCw className="h-3.5 w-3.5 mr-2" />
                        Rotate 90°
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start h-8 text-xs text-destructive hover:text-destructive"
                        onClick={() => {
                          handleDelete(c.id);
                          setSelectedCase(null);
                        }}>
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        Remove
                      </Button>
                    </PopoverContent>
                  </Popover>);

              })}

              {/* Center of Gravity indicator */}
              {weightDist && placedCases.length >= 2 &&
              <div
                className="absolute pointer-events-none z-30 transition-all duration-500 ease-out"
                style={{
                  left: `${weightDist.centerX * selectedPallet.width * scale - 5}px`,
                  top: `${weightDist.centerY * selectedPallet.length * scale - 5}px`,
                  opacity: weightDist.balance === "balanced" ? 0.3 : 0.5
                }}>

                  <div className={cn(
                  "w-2.5 h-2.5 rounded-full border-[1.5px]",
                  weightDist.balance === "balanced" ?
                  "border-primary/60 bg-primary/20" :
                  weightDist.severity > 0.4 ?
                  "border-destructive/60 bg-destructive/20" :
                  "border-warning/60 bg-warning/20"
                )} />
                </div>
              }

              {/* Empty State */}
              {filteredCases.length === 0 && !isDragOver &&
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center space-y-4 max-w-[280px]">
                    <div className="p-3 rounded-xl bg-primary/8 mx-auto w-fit">
                      <Package className="h-8 w-8 text-primary/40" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground/50">
                      Start building your pallet
                    </p>
                    <div className="space-y-2 text-left">
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                        <span className="text-xs text-muted-foreground/40">Drag items from the left panel</span>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                        <span className="text-xs text-muted-foreground/40">Drop them onto the pallet grid</span>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                        <span className="text-xs text-muted-foreground/40">Right-click to rotate items</span>
                      </div>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
        )}

        {/* Selected Item Actions */}
        {selectedCase &&
        <div className="flex items-center justify-center gap-3 px-4 py-2.5 border-t border-border/50 bg-background/95 backdrop-blur-sm">
            <span className="text-[13px] text-muted-foreground">
              {placedCases.find((c) => c.id === selectedCase)?.caseId}
            </span>
            <div className="w-px h-4 bg-border/50" />
            <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2.5 gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => handleRotate(selectedCase)}
            disabled={placedCases.find((c) => c.id === selectedCase)?.allowRotation === false}>

              <RotateCw className="h-3.5 w-3.5" />
              Rotate
            </Button>
            <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2.5 gap-1.5 text-muted-foreground hover:text-destructive"
            onClick={() => handleDelete(selectedCase)}>

              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </Button>
            <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2.5 text-muted-foreground/60"
            onClick={() => setSelectedCase(null)}>

              Done
            </Button>
          </div>
        }
      </div>

      {/* Dimension Capture Modal */}
      <DimensionCaptureModal
        open={dimensionModalOpen}
        onOpenChange={setDimensionModalOpen}
        itemName={pendingDrop?.caseData?.name || pendingDrop?.caseData?.contents || pendingDrop?.caseData?.case_id || "Item"}
        itemId={pendingDrop?.caseData?.sourceId || pendingDrop?.caseData?.case_id || ""}
        existingDimensions={{
          length: pendingDrop?.caseData?.length,
          width: pendingDrop?.caseData?.width,
          height: pendingDrop?.caseData?.height,
          weight: pendingDrop?.caseData?.weight
        }}
        onConfirm={handleDimensionConfirm}
        onCancel={handleDimensionCancel}
        hideSaveGlobally={pendingDrop?.caseData?.source === "item" || pendingDrop?.caseData?.source === "container"} />

    </>);

};