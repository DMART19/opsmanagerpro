import { useState, useRef, useCallback, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { PlacedCase } from "@/types/pallet-builder";
import { 
  Package, 
  Plus, 
  Trash2, 
  RotateCw, 
  Layers, 
  Wand2, 
  Save, 
  ZoomIn, 
  ZoomOut,
  Info,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  X,
  Move,
  Hand
} from "lucide-react";
import { useCases } from "@/hooks/use-cases";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MobilePalletBuilderProps {
  placedCases: PlacedCase[];
  onUpdateCases: (cases: PlacedCase[]) => void;
  palletDimensions: { width: number; length: number };
  selectedLayer: number;
  onLayerChange: (layer: number) => void;
  maxWeight: number;
  onSmartArrange: () => void;
  onSave: () => void;
  onReset: () => void;
}

// Touch modes for mobile interaction
type TouchMode = 'pan' | 'place';

export const MobilePalletBuilder = ({
  placedCases,
  onUpdateCases,
  palletDimensions,
  selectedLayer,
  onLayerChange,
  maxWeight,
  onSmartArrange,
  onSave,
  onReset,
}: MobilePalletBuilderProps) => {
  const { cases, loading: casesLoading } = useCases();
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // State
  const [zoom, setZoom] = useState(0.8);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [touchMode, setTouchMode] = useState<TouchMode>('pan');
  const [selectedItemToPlace, setSelectedItemToPlace] = useState<any>(null);
  const [selectedPlacedCase, setSelectedPlacedCase] = useState<string | null>(null);
  const [showItemLibrary, setShowItemLibrary] = useState(false);
  const [showSpecs, setShowSpecs] = useState(false);
  const [showItemActions, setShowItemActions] = useState(false);
  
  // Touch handling state
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [lastPinchDistance, setLastPinchDistance] = useState<number | null>(null);
  
  // Scale: pixels per inch
  const baseScale = 6;
  const scale = baseScale * zoom;
  const canvasWidth = palletDimensions.width * scale;
  const canvasHeight = palletDimensions.length * scale;

  // Calculate totals
  const totalWeight = placedCases.reduce((sum, c) => sum + c.weight, 0);
  const weightPercentage = (totalWeight / maxWeight) * 100;
  const casesOnLayer = placedCases.filter(c => c.z === selectedLayer);
  const totalLayers = Math.max(1, ...placedCases.map(c => c.z));

  // Handle touch start for pan/place
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch gesture start
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setLastPinchDistance(distance);
    } else if (e.touches.length === 1) {
      const touch = e.touches[0];
      setTouchStart({ x: touch.clientX, y: touch.clientY });
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastPinchDistance !== null) {
      // Pinch to zoom
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = distance - lastPinchDistance;
      const zoomDelta = delta * 0.005;
      setZoom(prev => Math.max(0.3, Math.min(2, prev + zoomDelta)));
      setLastPinchDistance(distance);
    } else if (e.touches.length === 1 && touchStart && touchMode === 'pan') {
      // Pan
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStart.x;
      const deltaY = touch.clientY - touchStart.y;
      setPanOffset(prev => ({
        x: prev.x + deltaX * 0.5,
        y: prev.y + deltaY * 0.5,
      }));
      setTouchStart({ x: touch.clientX, y: touch.clientY });
    }
  }, [lastPinchDistance, touchStart, touchMode]);

  const handleTouchEnd = useCallback(() => {
    setTouchStart(null);
    setLastPinchDistance(null);
  }, []);

  // Handle canvas tap for placing items
  const handleCanvasTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    let clientX: number, clientY: number;
    
    if ('touches' in e) {
      if (e.touches.length !== 1) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Calculate position in inches
    const x = Math.round((clientX - rect.left - panOffset.x) / scale);
    const y = Math.round((clientY - rect.top - panOffset.y) / scale);

    if (touchMode === 'place' && selectedItemToPlace) {
      // Place the selected item
      const itemWidth = selectedItemToPlace.width || 12;
      const itemLength = selectedItemToPlace.length || 12;
      
      // Center on tap point and clamp to boundaries
      const placeX = Math.max(0, Math.min(x - itemWidth / 2, palletDimensions.width - itemWidth));
      const placeY = Math.max(0, Math.min(y - itemLength / 2, palletDimensions.length - itemLength));
      
      // Check collision with tolerance for edge-to-edge placement
      const COLLISION_TOLERANCE = 0.1;
      const hasCollision = placedCases.some(c => {
        if (c.z !== selectedLayer) return false;
        const cW = c.rotation === 90 || c.rotation === 270 ? c.length : c.width;
        const cL = c.rotation === 90 || c.rotation === 270 ? c.width : c.length;
        const overlapX = Math.min(placeX + itemWidth, c.x + cW) - Math.max(placeX, c.x);
        const overlapY = Math.min(placeY + itemLength, c.y + cL) - Math.max(placeY, c.y);
        return overlapX > COLLISION_TOLERANCE && overlapY > COLLISION_TOLERANCE;
      });

      if (hasCollision) {
        toast.error("Can't place here - collision detected");
        return;
      }

      // Create and place the case
      const newCase: PlacedCase = {
        id: `placed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        caseId: selectedItemToPlace.case_id,
        caseType: selectedItemToPlace.case_type || "Standard",
        x: placeX,
        y: placeY,
        z: selectedLayer,
        rotation: 0,
        width: itemWidth,
        length: itemLength,
        height: selectedItemToPlace.height || 12,
        weight: Number(selectedItemToPlace.weight) || 50,
        condition: selectedItemToPlace.condition || "good",
        fragile: selectedItemToPlace.fragile || false,
        category: selectedItemToPlace.case_type || "General",
        allowRotation: selectedItemToPlace.allow_rotation !== false,
      };

      onUpdateCases([...placedCases, newCase]);
      toast.success("Item placed!");
      
      // Stay in place mode for quick multi-placement
    } else if (touchMode === 'pan') {
      // Check if tapping an existing item
      const tappedCase = casesOnLayer.find(c => {
        const cW = c.rotation === 90 || c.rotation === 270 ? c.length : c.width;
        const cL = c.rotation === 90 || c.rotation === 270 ? c.width : c.length;
        return x >= c.x && x <= c.x + cW && y >= c.y && y <= c.y + cL;
      });

      if (tappedCase) {
        setSelectedPlacedCase(tappedCase.id);
        setShowItemActions(true);
      } else {
        setSelectedPlacedCase(null);
      }
    }
  }, [touchMode, selectedItemToPlace, scale, panOffset, placedCases, selectedLayer, palletDimensions, casesOnLayer, onUpdateCases]);

  // Item actions
  const handleRotateItem = () => {
    if (!selectedPlacedCase) return;
    
    const updatedCases = placedCases.map(c => {
      if (c.id === selectedPlacedCase) {
        const newRotation = (c.rotation + 90) % 360;
        return { ...c, rotation: newRotation };
      }
      return c;
    });
    
    onUpdateCases(updatedCases);
    toast.success("Item rotated");
  };

  const handleDeleteItem = () => {
    if (!selectedPlacedCase) return;
    
    const updatedCases = placedCases.filter(c => c.id !== selectedPlacedCase);
    onUpdateCases(updatedCases);
    setSelectedPlacedCase(null);
    setShowItemActions(false);
    toast.success("Item removed");
  };

  // Select item from library
  const handleSelectItem = (item: any) => {
    setSelectedItemToPlace(item);
    setTouchMode('place');
    setShowItemLibrary(false);
    toast.info(`Tap on canvas to place "${item.case_id}"`, { duration: 3000 });
  };

  // Cancel placement mode
  const cancelPlacement = () => {
    setSelectedItemToPlace(null);
    setTouchMode('pan');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-background">
      {/* Top Stats Bar */}
      <div className="flex-shrink-0 px-4 py-2 bg-card border-b">
        <div className="flex items-center justify-between gap-2">
          {/* Weight indicator */}
          <div className="flex-1 max-w-[200px]">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Weight</span>
              <span className={cn(
                "font-medium",
                weightPercentage > 90 ? "text-destructive" : 
                weightPercentage > 75 ? "text-amber-500" : "text-foreground"
              )}>
                {totalWeight} / {maxWeight} lbs
              </span>
            </div>
            <Progress 
              value={Math.min(weightPercentage, 100)} 
              className={cn(
                "h-2",
                weightPercentage > 90 ? "[&>div]:bg-destructive" : 
                weightPercentage > 75 ? "[&>div]:bg-amber-500" : ""
              )}
            />
          </div>
          
          {/* Layer selector */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onLayerChange(Math.max(1, selectedLayer - 1))}
              disabled={selectedLayer <= 1}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <div className="text-center min-w-[60px]">
              <div className="text-xs text-muted-foreground">Layer</div>
              <div className="font-semibold">{selectedLayer}/{totalLayers}</div>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => onLayerChange(selectedLayer + 1)}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Item count */}
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Items</div>
            <div className="font-semibold">{casesOnLayer.length}</div>
          </div>
        </div>
      </div>

      {/* Placement Mode Banner */}
      {touchMode === 'place' && selectedItemToPlace && (
        <div className="flex-shrink-0 px-4 py-2 bg-primary/10 border-b border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                Placing: {selectedItemToPlace.case_id}
              </span>
              <Badge variant="outline" className="text-xs">
                {selectedItemToPlace.width}×{selectedItemToPlace.length}"
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={cancelPlacement}
              className="h-7 px-2"
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Canvas Area */}
      <div className="flex-1 overflow-hidden relative bg-muted/30" data-tour="mobile-pallet-canvas">
        <div
          ref={canvasRef}
          className="absolute inset-0 overflow-hidden touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={handleCanvasTap}
        >
          {/* Pallet Canvas */}
          <div
            className="absolute bg-card border-2 border-border shadow-inner"
            style={{
              width: `${canvasWidth}px`,
              height: `${canvasHeight}px`,
              left: `50%`,
              top: `50%`,
              transform: `translate(-50%, -50%) translate(${panOffset.x}px, ${panOffset.y}px)`,
            }}
          >
            {/* Grid */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
              <defs>
                <pattern id="mobile-grid" width={scale} height={scale} patternUnits="userSpaceOnUse">
                  <path d={`M ${scale} 0 L 0 0 0 ${scale}`} fill="none" stroke="currentColor" strokeWidth="0.5"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#mobile-grid)" />
            </svg>

            {/* Placed Cases */}
            {casesOnLayer.map((c) => {
              const cW = c.rotation === 90 || c.rotation === 270 ? c.length : c.width;
              const cL = c.rotation === 90 || c.rotation === 270 ? c.width : c.length;
              const isSelected = selectedPlacedCase === c.id;

              return (
                <div
                  key={c.id}
                  className={cn(
                    "absolute flex items-center justify-center text-xs font-medium rounded-sm transition-all",
                    "border-2 bg-primary/20",
                    isSelected 
                      ? "border-primary ring-2 ring-primary/50 z-10" 
                      : "border-primary/50",
                    c.fragile && "border-destructive bg-destructive/10"
                  )}
                  style={{
                    left: `${c.x * scale}px`,
                    top: `${c.y * scale}px`,
                    width: `${cW * scale}px`,
                    height: `${cL * scale}px`,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPlacedCase(c.id);
                    setShowItemActions(true);
                  }}
                >
                  <span className="truncate px-1 text-[10px]">{c.caseId}</span>
                </div>
              );
            })}

            {/* Placement preview */}
            {touchMode === 'place' && selectedItemToPlace && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
                  Tap to place
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-1">
          <Button
            variant="secondary"
            size="icon"
            className="h-10 w-10 shadow-md"
            onClick={() => setZoom(prev => Math.min(2, prev + 0.2))}
          >
            <ZoomIn className="h-5 w-5" />
          </Button>
          <div className="text-center text-xs text-muted-foreground bg-background/80 rounded py-0.5">
            {Math.round(zoom * 100)}%
          </div>
          <Button
            variant="secondary"
            size="icon"
            className="h-10 w-10 shadow-md"
            onClick={() => setZoom(prev => Math.max(0.3, prev - 0.2))}
          >
            <ZoomOut className="h-5 w-5" />
          </Button>
        </div>

        {/* Mode Toggle */}
        <div className="absolute top-4 left-4">
          <Button
            variant={touchMode === 'pan' ? 'secondary' : 'default'}
            size="sm"
            className="shadow-md gap-2"
            onClick={() => setTouchMode(touchMode === 'pan' ? 'place' : 'pan')}
          >
            {touchMode === 'pan' ? (
              <>
                <Hand className="h-4 w-4" />
                Pan Mode
              </>
            ) : (
              <>
                <Move className="h-4 w-4" />
                Place Mode
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="flex-shrink-0 px-4 py-3 bg-card border-t safe-area-inset-bottom" data-tour="mobile-pallet-specs">
        <div className="flex items-center justify-between gap-2">
          {/* Item Library */}
          <Drawer open={showItemLibrary} onOpenChange={setShowItemLibrary}>
            <DrawerTrigger asChild>
              <Button variant="outline" className="gap-2" data-tour="mobile-item-library">
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            </DrawerTrigger>
            <DrawerContent className="max-h-[80vh]">
              <DrawerHeader>
                <DrawerTitle>Select Item to Place</DrawerTitle>
              </DrawerHeader>
              <ScrollArea className="flex-1 px-4 pb-6">
                <div className="space-y-3">
                  {casesLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading items...</div>
                  ) : cases?.length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-muted-foreground">No items available</p>
                    </div>
                  ) : (
                    cases?.map((item) => (
                      <Card 
                        key={item.id} 
                        className="p-3 active:scale-[0.98] transition-transform cursor-pointer"
                        onClick={() => handleSelectItem(item)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm">{item.case_id}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.width || 12}" × {item.length || 12}" × {item.height || 12}" • {item.weight || 50} lbs
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {item.fragile && (
                              <Badge variant="destructive" className="text-xs">Fragile</Badge>
                            )}
                            <ChevronUp className="h-5 w-5 rotate-90 text-muted-foreground" />
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </DrawerContent>
          </Drawer>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={onSmartArrange}
              className="h-10 w-10"
            >
              <Wand2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={onReset}
              className="h-10 w-10"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          {/* Save */}
          <Button onClick={onSave} className="gap-2">
            <Save className="h-4 w-4" />
            Save
          </Button>
        </div>
      </div>

      {/* Item Actions Drawer */}
      <Drawer open={showItemActions} onOpenChange={setShowItemActions}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Item Actions</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-3">
            {selectedPlacedCase && (() => {
              const item = placedCases.find(c => c.id === selectedPlacedCase);
              if (!item) return null;
              return (
                <>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="font-medium">{item.caseId}</div>
                    <div className="text-sm text-muted-foreground">
                      {item.width}×{item.length}×{item.height}" • {item.weight} lbs
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={handleRotateItem}
                    >
                      <RotateCw className="h-4 w-4" />
                      Rotate
                    </Button>
                    <Button
                      variant="destructive"
                      className="gap-2"
                      onClick={handleDeleteItem}
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                </>
              );
            })()}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};
