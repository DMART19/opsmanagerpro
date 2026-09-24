import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlacedCase } from "@/types/pallet-builder";
import { Package, RotateCw, RotateCcw, Trash2, ZoomIn, ZoomOut, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { analyzeCaseSupport } from "@/lib/pallet-stability";
import { StabilityWarningDialog } from "./StabilityWarningDialog";
import { OverhangWarningDialog } from "./OverhangWarningDialog";
import { SupportLevel } from "@/lib/pallet-stability";
import { validateCasePlacement, getSupportLevelColor, checkOversized } from "@/lib/pallet-validation";
import { BUILDER_TOOLTIPS } from "@/lib/tooltip-content";

interface PalletCanvasProps {
  placedCases: PlacedCase[];
  onUpdateCases: (cases: PlacedCase[]) => void;
  palletDimensions: { width: number; length: number };
  selectedLayer: number;
  strictMode?: boolean;
  showStabilityOverlay?: boolean;
}

export const PalletCanvas = ({
  placedCases,
  onUpdateCases,
  palletDimensions,
  selectedLayer,
  strictMode = false,
  showStabilityOverlay = true,
}: PalletCanvasProps) => {
  const [draggedCase, setDraggedCase] = useState<string | null>(null);
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [pendingCase, setPendingCase] = useState<PlacedCase | null>(null);
  const [showStabilityWarning, setShowStabilityWarning] = useState(false);
  const [pendingSupportLevel, setPendingSupportLevel] = useState<SupportLevel | null>(null);
  const [showOverhangWarning, setShowOverhangWarning] = useState(false);
  const [pendingOverhangCase, setPendingOverhangCase] = useState<PlacedCase | null>(null);
  const [overhangAmount, setOverhangAmount] = useState({ top: 0, right: 0, bottom: 0, left: 0 });
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropPreview, setDropPreview] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // Scale: 8 pixels per inch for better visibility
  const baseScale = 8;
  const scale = baseScale * zoom;
  const canvasWidth = palletDimensions.width * scale;
  const canvasHeight = palletDimensions.length * scale;
  const gridSize = 1 * scale; // 1 inch grid

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedCase) return;

      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        // Shift+R for counter-clockwise, R for clockwise
        handleRotate(selectedCase, e.shiftKey ? 'ccw' : 'cw');
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDelete(selectedCase);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCase, placedCases]);

  // Collision detection helper — tolerance prevents false positives at edges
  const COLLISION_TOLERANCE = 0.1;
  const checkCollision = (
    x: number,
    y: number,
    width: number,
    length: number,
    excludeId: string,
    layer: number
  ) => {
    return placedCases.some((c) => {
      if (c.id === excludeId || c.z !== layer) return false;
      
      const cWidth = c.rotation === 90 || c.rotation === 270 ? c.length : c.width;
      const cLength = c.rotation === 90 || c.rotation === 270 ? c.width : c.length;
      
      const overlapX = Math.min(x + width, c.x + cWidth) - Math.max(x, c.x);
      const overlapY = Math.min(y + length, c.y + cLength) - Math.max(y, c.y);
      return overlapX > COLLISION_TOLERANCE && overlapY > COLLISION_TOLERANCE;
    });
  };

  // Boundary check helper
  const checkBoundary = (x: number, y: number, width: number, length: number) => {
    return x >= 0 && y >= 0 && x + width <= palletDimensions.width && y + length <= palletDimensions.length;
  };

  const handleDragStart = (e: React.DragEvent, caseId: string) => {
    const caseItem = placedCases.find((c) => c.id === caseId);
    if (!caseItem) return;

    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    setDragOffset({ x: offsetX, y: offsetY });
    setDraggedCase(caseId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();

    // Check if this is an external drop from Container Library
    const externalData = e.dataTransfer.getData("application/json");
    if (externalData && !draggedCase) {
      try {
        const caseData = JSON.parse(externalData);
        
        // Calculate drop position
        let x = (e.clientX - rect.left) / scale;
        let y = (e.clientY - rect.top) / scale;
        
        // Center the case on drop point
        const caseWidth = caseData.width || 12;
        const caseLength = caseData.length || 12;
        x = Math.round(x - caseWidth / 2);
        y = Math.round(y - caseLength / 2);
        
        // Clamp to pallet boundaries
        x = Math.max(0, Math.min(x, palletDimensions.width - caseWidth));
        y = Math.max(0, Math.min(y, palletDimensions.length - caseLength));

        // Check if case is oversized
        if (checkOversized(caseWidth, caseLength, palletDimensions.width, palletDimensions.length, 0)) {
          toast.error("This case is larger than the pallet footprint and cannot be placed.");
          return;
        }

        // Check collision with existing cases
        if (checkCollision(x, y, caseWidth, caseLength, "", selectedLayer)) {
          toast.error("⚠️ Collision detected - adjust position or move existing cases");
          return;
        }

        // Create new placed case
        const newCase: PlacedCase = {
          id: `placed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          caseId: caseData.case_id,
          caseType: caseData.case_type || "Standard",
          x,
          y,
          z: selectedLayer,
          rotation: 0,
          width: caseWidth,
          length: caseLength,
          height: caseData.height || 12,
          weight: Number(caseData.weight) || 50,
          condition: caseData.condition || "good",
          fragile: caseData.fragile || false,
          category: caseData.case_type || "General",
          allowRotation: caseData.allow_rotation !== false,
        };

        const newCases = [...placedCases, newCase];
        onUpdateCases(newCases);
        toast.success(`Case ${caseData.case_id} placed on pallet`);
        return;
      } catch (err) {
        console.error("Failed to parse dropped case data:", err);
      }
    }

    // Handle internal drag (moving existing case)
    if (!draggedCase) return;

    const caseItem = placedCases.find((c) => c.id === draggedCase);
    if (!caseItem) return;
    
    // Calculate position in inches with drag offset
    let x = (e.clientX - rect.left - dragOffset.x) / scale;
    let y = (e.clientY - rect.top - dragOffset.y) / scale;

    // Get rotated dimensions
    const caseWidth = caseItem.rotation === 90 || caseItem.rotation === 270 ? caseItem.length : caseItem.width;
    const caseLength = caseItem.rotation === 90 || caseItem.rotation === 270 ? caseItem.width : caseItem.length;

    // Snap to grid (1 inch)
    x = Math.round(x);
    y = Math.round(y);

    // Check if case is oversized
    if (checkOversized(caseItem.width, caseItem.length, palletDimensions.width, palletDimensions.length, caseItem.rotation)) {
      toast.error("This case is larger than the pallet footprint and cannot be placed.");
      setDraggedCase(null);
      return;
    }

    // Collision check
    if (checkCollision(x, y, caseWidth, caseLength, draggedCase, caseItem.z)) {
      toast.error("⚠️ Collision detected");
      setDraggedCase(null);
      return;
    }

    // Create updated case with new position
    const updatedCase = { ...caseItem, x, y };
    
    // Validate placement with boundary/overhang checking
    const validation = validateCasePlacement(
      updatedCase,
      palletDimensions.width,
      palletDimensions.length,
      strictMode
    );

    // Block placement if validation fails (oversized or strict mode overhang)
    if (!validation.isValid && (!validation.overhang || strictMode)) {
      toast.error(validation.error || "Invalid placement");
      setDraggedCase(null);
      return;
    }

    // Show overhang warning in normal mode
    if (!validation.isValid && validation.overhang) {
      setPendingOverhangCase(updatedCase);
      setOverhangAmount(validation.overhang.amount);
      setShowOverhangWarning(true);
      setDraggedCase(null);
      toast.error("⚠️ Case extends beyond pallet edges!", {
        description: "This creates an unsafe overhang. Reposition or allow anyway.",
      });
      return;
    }

    const tempUpdatedCases = placedCases.map((c) =>
      c.id === draggedCase ? updatedCase : c
    );

    // Check stability for upper layers
    const layer = Math.floor((caseItem.z || 0) / 10) + 1;
    if (layer > 1) {
      const supportLevel = analyzeCaseSupport(updatedCase, tempUpdatedCases);
      
      // Strict mode prevents unstable placements
      if (strictMode && (supportLevel.level === "unsupported" || supportLevel.level === "partial")) {
        toast.error("Cannot place container here. Lower layer must support this position.");
        setDraggedCase(null);
        return;
      }
      
      // Show warning for unstable placements
      if (supportLevel.level === "unsupported" || supportLevel.level === "partial") {
        setPendingCase(updatedCase);
        setPendingSupportLevel(supportLevel);
        setShowStabilityWarning(true);
        setDraggedCase(null);
        return;
      }
    }

    // Place case normally
    onUpdateCases(tempUpdatedCases);
    setDraggedCase(null);
    toast.success("Case placed");
  };

  const handleConfirmPlacement = () => {
    if (pendingCase) {
      const updatedCases = placedCases.map((c) =>
        c.id === pendingCase.id ? pendingCase : c
      );
      onUpdateCases(updatedCases);
      toast.success("Case placed with warning");
    }
    setPendingCase(null);
    setPendingSupportLevel(null);
    setShowStabilityWarning(false);
  };

  const handleCancelPlacement = () => {
    setPendingCase(null);
    setPendingSupportLevel(null);
    setShowStabilityWarning(false);
    toast.info("Placement cancelled");
  };

  const handleRotate = (caseId: string, direction: 'cw' | 'ccw' = 'cw') => {
    const caseItem = placedCases.find((c) => c.id === caseId);
    if (!caseItem) return;

    // Check if rotation is allowed
    if (caseItem.allowRotation === false) {
      toast.error("This case is orientation-locked and cannot be rotated");
      return;
    }

    const rotationChange = direction === 'cw' ? 90 : -90;
    const newRotation = (caseItem.rotation + rotationChange + 360) % 360;
    
    // Check if rotated case fits
    const newWidth = newRotation === 90 || newRotation === 270 ? caseItem.length : caseItem.width;
    const newLength = newRotation === 90 || newRotation === 270 ? caseItem.width : caseItem.length;

    if (!checkBoundary(caseItem.x, caseItem.y, newWidth, newLength)) {
      toast.error("Cannot rotate - exceeds pallet boundaries");
      return;
    }

    if (checkCollision(caseItem.x, caseItem.y, newWidth, newLength, caseId, caseItem.z)) {
      toast.error("Cannot rotate - collision detected");
      return;
    }

    const updatedCases = placedCases.map((c) =>
      c.id === caseId ? { ...c, rotation: newRotation, width: caseItem.width, length: caseItem.length } : c
    );
    onUpdateCases(updatedCases);
    toast.success(`Case rotated ${direction === 'cw' ? 'clockwise' : 'counter-clockwise'}`);
  };

  const handleDelete = (caseId: string) => {
    const updatedCases = placedCases.filter((c) => c.id !== caseId);
    onUpdateCases(updatedCases);
    setSelectedCase(null);
    toast.success("Case removed from pallet");
  };

  const getConditionColor = (condition: string) => {
    switch (condition.toLowerCase()) {
      case "excellent":
        return "bg-success/20 border-success";
      case "good":
        return "bg-primary/20 border-primary";
      case "fair":
        return "bg-warning/20 border-warning";
      case "poor":
        return "bg-destructive/20 border-destructive";
      default:
        return "bg-muted border-border";
    }
  };

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case "Priority":
        return "bg-rose-500/20 border-rose-500";
      case "Standard":
        return "bg-green-500/20 border-green-500";
      case "Supplies":
        return "bg-blue-500/20 border-blue-500";
      case "Equipment":
        return "bg-purple-500/20 border-purple-500";
      default:
        return "bg-primary/20 border-primary";
    }
  };

  const filteredCases = placedCases.filter((c) => c.z === selectedLayer);

  return (
    <Card className="h-full">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Layout Canvas - Layer {selectedLayer}
            </CardTitle>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                  aria-label="Help for canvas"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs text-sm">
                {BUILDER_TOOLTIPS.canvas}
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-sm">
                {BUILDER_TOOLTIPS.zoomControls}
              </TooltipContent>
            </Tooltip>
            <span className="text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom(Math.min(2, zoom + 0.25))}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-sm">
                {BUILDER_TOOLTIPS.zoomControls}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        <div className="bg-muted/20 border border-border rounded-lg p-2 sm:p-4 relative overflow-x-auto">
          <div
            ref={canvasRef}
            className={`relative mx-auto bg-card border-2 shadow-inner overflow-hidden touch-none transition-all duration-200 ${
              isDragOver 
                ? "border-primary ring-4 ring-primary/20 bg-primary/5" 
                : "border-border"
            }`}
            onClick={(e) => {
              // Click on empty canvas area — deselect any selected case
              if (e.target === e.currentTarget) setSelectedCase(null);
            }}
            style={{
              width: `${canvasWidth}px`,
              height: `${canvasHeight}px`,
              borderRadius: 0,
              minWidth: '300px',
            }}
            onDrop={(e) => {
              handleDrop(e);
              setIsDragOver(false);
              setDropPreview(null);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
              
              // Calculate preview position
              if (canvasRef.current) {
                const rect = canvasRef.current.getBoundingClientRect();
                const x = Math.round((e.clientX - rect.left) / scale);
                const y = Math.round((e.clientY - rect.top) / scale);
                
                // Get case dimensions from dataTransfer if available
                const caseWidth = 12; // Default size
                const caseHeight = 12;
                
                setDropPreview({
                  x: Math.max(0, Math.min(x - caseWidth / 2, palletDimensions.width - caseWidth)),
                  y: Math.max(0, Math.min(y - caseHeight / 2, palletDimensions.length - caseHeight)),
                  width: caseWidth,
                  height: caseHeight,
                });
              }
            }}
            onDragLeave={(e) => {
              // Only set false if leaving the canvas entirely
              if (!canvasRef.current?.contains(e.relatedTarget as Node)) {
                setIsDragOver(false);
                setDropPreview(null);
              }
            }}
          >
            {/* Grid lines - every 1 inch */}
            <svg className="absolute inset-0 pointer-events-none opacity-10" width="100%" height="100%">
              {Array.from({ length: palletDimensions.width + 1 }).map((_, i) => (
                <line
                  key={`v-${i}`}
                  x1={i * scale}
                  y1={0}
                  x2={i * scale}
                  y2={canvasHeight}
                  stroke="currentColor"
                  strokeWidth="0.5"
                />
              ))}
              {Array.from({ length: palletDimensions.length + 1 }).map((_, i) => (
                <line
                  key={`h-${i}`}
                  x1={0}
                  y1={i * scale}
                  x2={canvasWidth}
                  y2={i * scale}
                  stroke="currentColor"
                  strokeWidth="0.5"
                />
              ))}
              {/* Thicker lines every 12 inches */}
              {Array.from({ length: Math.floor(palletDimensions.width / 12) + 1 }).map((_, i) => (
                <line
                  key={`v12-${i}`}
                  x1={i * 12 * scale}
                  y1={0}
                  x2={i * 12 * scale}
                  y2={canvasHeight}
                  stroke="currentColor"
                  strokeWidth="1"
                  opacity="0.3"
                />
              ))}
              {Array.from({ length: Math.floor(palletDimensions.length / 12) + 1 }).map((_, i) => (
                <line
                  key={`h12-${i}`}
                  x1={0}
                  y1={i * 12 * scale}
                  x2={canvasWidth}
                  y2={i * 12 * scale}
                  stroke="currentColor"
                  strokeWidth="1"
                  opacity="0.3"
                />
              ))}
            </svg>

            {/* Drop Preview Ghost - Using solid border for production-ready appearance */}
            {isDragOver && dropPreview && (
              <div
                className="absolute pointer-events-none border-2 border-primary bg-primary/10 z-20"
                style={{
                  left: `${dropPreview.x * scale}px`,
                  top: `${dropPreview.y * scale}px`,
                  width: `${dropPreview.width * scale}px`,
                  height: `${dropPreview.height * scale}px`,
                  borderRadius: 0,
                }}
              >
                <div className="flex items-center justify-center h-full text-primary text-xs font-medium">
                  Drop Here
                </div>
              </div>
            )}

            {/* Placed Cases */}
            {filteredCases.map((c) => {
              const caseWidth = (c.rotation === 90 || c.rotation === 270) ? c.length : c.width;
              const caseLength = (c.rotation === 90 || c.rotation === 270) ? c.width : c.length;
              const supportColor = showStabilityOverlay ? getSupportLevelColor(c, palletDimensions.width, palletDimensions.length) : "green";
              
              return (
                <ContextMenu key={c.id}>
                  <ContextMenuTrigger asChild>
                    <div
                      draggable
                      onDragStart={(e) => handleDragStart(e, c.id)}
                      onClick={() => setSelectedCase(c.id)}
                      className={`absolute cursor-move transition-all ${
                        selectedCase === c.id
                          ? "ring-2 ring-primary shadow-lg z-10"
                          : "hover:shadow-md"
                      } ${
                        supportColor === 'red' 
                          ? 'border-4 border-amber-600 bg-amber-100/80 shadow-amber-500/50 shadow-lg' 
                          : supportColor === 'yellow'
                          ? 'border-2 border-yellow-500 bg-yellow-50/80'
                          : `border-2 ${c.category ? getCategoryColor(c.category) : getConditionColor(c.condition)}`
                      }`}
                      style={{
                        left: `${c.x * scale}px`,
                        top: `${c.y * scale}px`,
                        width: `${caseWidth * scale}px`,
                        height: `${caseLength * scale}px`,
                        borderRadius: 0,
                      }}
                      title={`${c.caseId} | ${caseWidth}"×${caseLength}"×${c.height}" | ${c.weight}lbs | Layer ${c.z}`}
                    >
                  <div className="w-full h-full flex flex-col items-center justify-center p-1">
                    <div className="text-center">
                      <div className="text-xs font-bold truncate">{c.caseId}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {caseWidth}×{caseLength}×{c.height}"
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {c.weight}lb | L{c.z}
                      </div>
                      {c.fragile && (
                        <div className="text-[10px] text-destructive font-bold">
                          FRAGILE
                        </div>
                      )}
                      {supportColor === 'red' && (
                        <div className="text-[10px] text-red-600 font-bold">
                          ⚠ OVERHANG
                        </div>
                      )}
                      {supportColor === 'yellow' && (
                        <div className="text-[10px] text-yellow-600 font-semibold">
                          ⚠ EDGE
                        </div>
                      )}
                      {c.rotation > 0 && (
                        <div className="text-[10px] opacity-60">
                          ↻{c.rotation}°
                        </div>
                      )}
                    </div>
                      </div>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem
                      onClick={() => handleRotate(c.id, 'cw')}
                      disabled={c.allowRotation === false}
                    >
                      <RotateCw className="h-4 w-4 mr-2" />
                      Rotate Clockwise (90°)
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => handleRotate(c.id, 'ccw')}
                      disabled={c.allowRotation === false}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Rotate Counter-Clockwise (90°)
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => handleDelete(c.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove from Pallet
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}

            {filteredCases.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                Drag cases here to build your pallet
              </div>
            )}
          </div>

          {/* Selected Case Actions */}
          {selectedCase && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRotate(selectedCase, 'ccw')}
                className="gap-2"
                disabled={placedCases.find(c => c.id === selectedCase)?.allowRotation === false}
              >
                <RotateCcw className="h-4 w-4" />
                Rotate CCW
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRotate(selectedCase, 'cw')}
                className="gap-2"
                disabled={placedCases.find(c => c.id === selectedCase)?.allowRotation === false}
              >
                <RotateCw className="h-4 w-4" />
                Rotate CW
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(selectedCase)}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </Button>
            </div>
          )}

          {/* Legend */}
          <div className="mt-4 p-4 bg-muted/30 border border-border space-y-3" style={{ borderRadius: 0 }}>
            <div className="text-xs font-semibold">Category Colors</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-rose-500/20 border-2 border-rose-500" style={{ borderRadius: 0 }} />
                <span>Priority</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500/20 border-2 border-green-500" style={{ borderRadius: 0 }} />
                <span>Standard</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500/20 border-2 border-blue-500" style={{ borderRadius: 0 }} />
                <span>Supplies</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-purple-500/20 border-2 border-purple-500" style={{ borderRadius: 0 }} />
                <span>Equipment</span>
              </div>
            </div>
            
            <div className="border-t border-border pt-3 space-y-3">
              <div className="text-xs font-semibold">Placement Indicators:</div>
              <div className="grid grid-cols-1 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-4 border-amber-600 bg-amber-100" style={{ borderRadius: 0 }} />
                  <span className="text-amber-700 font-semibold">Needs Repositioning</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-yellow-500 bg-yellow-50" style={{ borderRadius: 0 }} />
                  <span className="text-yellow-600">Edge Placement</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-green-500 bg-green-50" style={{ borderRadius: 0 }} />
                  <span className="text-green-600">Fully Supported</span>
                </div>
              </div>
            </div>
            
            <div className="border-t border-border pt-3">
              <div className="text-xs text-muted-foreground space-y-1">
                <div>• <kbd className="px-1 bg-background rounded border text-[10px]">R</kbd> Rotate CW • <kbd className="px-1 bg-background rounded border text-[10px]">Shift+R</kbd> Rotate CCW • <kbd className="px-1 bg-background rounded border text-[10px]">DEL</kbd> Delete</div>
                <div>• Right-click case for context menu • Drag to move (1" snap grid)</div>
                <div>• Click to select • Use zoom controls for precision</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
