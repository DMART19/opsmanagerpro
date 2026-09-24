import { useState, useMemo, useCallback, useRef } from "react";
import { Navigation } from "@/components/Navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { LegalFooter } from "@/components/LegalFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Package,
  FileDown,
  Wand2,
  Layers,
  Weight,
  AlertTriangle,
  CheckCircle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronDown,
  Check,
  Plus,
  Trash2,
  RotateCw,
  LayoutGrid,
  X,
} from "lucide-react";
import { PalletConfig } from "@/pages/PalletBuilder";
import { CustomPallet } from "@/hooks/use-custom-pallets";
import { PlacedCase, PalletLibraryItem } from "@/types/pallet-builder";
import { ExportModal } from "./ExportModal";
import { autoLoadPallet, AutoLoadItem, smartLayoutPallet, type AutoLoadStrategy, STRATEGY_META } from "@/lib/pallet-auto-load";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MobilePalletViewerProps {
  palletTypes: CustomPallet[];
  libraryItems: PalletLibraryItem[];
  isTourMode: boolean;
}

export const MobilePalletViewer = ({
  palletTypes,
  libraryItems,
  isTourMode,
}: MobilePalletViewerProps) => {
  const [selectedPallet, setSelectedPallet] = useState<PalletConfig | null>(null);
  const [placedCases, setPlacedCases] = useState<PlacedCase[]>([]);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [autoLoadStrategy, setAutoLoadStrategy] = useState<AutoLoadStrategy>("best_fit");
  const [zoom, setZoom] = useState(0.6);
  const [selectedItemToPlace, setSelectedItemToPlace] = useState<PalletLibraryItem | null>(null);
  const [selectedPlacedId, setSelectedPlacedId] = useState<string | null>(null);
  const [showItemDrawer, setShowItemDrawer] = useState(false);
  const [showPalletDrawer, setShowPalletDrawer] = useState(!selectedPallet);

  // Touch gesture state
  const canvasRef = useRef<HTMLDivElement>(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const lastTouchRef = useRef<{ dist: number; midX: number; midY: number } | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const metrics = useMemo(() => {
    const totalWeight = placedCases.reduce((sum, c) => sum + c.weight, 0);
    const maxWeight = selectedPallet?.maxWeight || 0;
    return {
      totalWeight,
      maxWeight,
      weightUsage: maxWeight > 0 ? Math.round((totalWeight / maxWeight) * 100) : 0,
      itemCount: placedCases.length,
      layers: placedCases.length > 0 ? Math.max(...placedCases.map(c => c.z)) : 0,
    };
  }, [placedCases, selectedPallet]);

  const baseScale = 4;
  const scale = baseScale * zoom;

  const handleSelectPallet = useCallback((pallet: CustomPallet) => {
    if (placedCases.length > 0) {
      if (!window.confirm("Changing pallet type will clear placed items. Continue?")) return;
    }
    setSelectedPallet({
      id: pallet.id,
      name: pallet.name,
      width: pallet.width,
      length: pallet.length,
      maxWeight: pallet.max_weight,
    });
    setPlacedCases([]);
    setShowPalletDrawer(false);
  }, [placedCases.length]);

  // Collision detection — tolerance prevents false positives at edges
  const COLLISION_TOLERANCE = 0.1;
  const checkCollision = useCallback((
    x: number, y: number, width: number, length: number, excludeId: string, layer: number
  ) => {
    return placedCases.some((c) => {
      if (c.id === excludeId || c.z !== layer) return false;
      const cW = c.rotation === 90 || c.rotation === 270 ? c.length : c.width;
      const cL = c.rotation === 90 || c.rotation === 270 ? c.width : c.length;
      const overlapX = Math.min(x + width, c.x + cW) - Math.max(x, c.x);
      const overlapY = Math.min(y + length, c.y + cL) - Math.max(y, c.y);
      return overlapX > COLLISION_TOLERANCE && overlapY > COLLISION_TOLERANCE;
    });
  }, [placedCases]);

  // Tap on canvas to place selected item
  const handleCanvasTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!selectedPallet || !canvasRef.current) return;

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

    const mouseX = (clientX - rect.left - panOffset.x) / scale;
    const mouseY = (clientY - rect.top - panOffset.y) / scale;

    if (selectedItemToPlace) {
      // Place selected item at tap position
      const itemW = Number(selectedItemToPlace.width) || 12;
      const itemL = Number(selectedItemToPlace.length) || 12;
      const itemH = Number(selectedItemToPlace.height) || 12;
      const itemWt = Number(selectedItemToPlace.weight) || 50;

      let x = Math.round(mouseX - itemW / 2);
      let y = Math.round(mouseY - itemL / 2);
      x = Math.max(0, Math.min(x, selectedPallet.width - itemW));
      y = Math.max(0, Math.min(y, selectedPallet.length - itemL));

      if (checkCollision(x, y, itemW, itemL, "", 1)) {
        toast.error("Can't place here — collision detected");
        return;
      }

      if (metrics.totalWeight + itemWt > selectedPallet.maxWeight) {
        toast.error("Exceeds weight limit");
        return;
      }

      const newCase: PlacedCase = {
        id: `placed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        caseId: selectedItemToPlace.name,
        caseType: selectedItemToPlace.category || "Standard",
        x, y, z: 1,
        rotation: 0,
        width: itemW, length: itemL, height: itemH, weight: itemWt,
        condition: selectedItemToPlace.condition || "good",
        fragile: selectedItemToPlace.fragile || false,
        category: selectedItemToPlace.category || "General",
        allowRotation: selectedItemToPlace.allowRotation !== false,
        source: selectedItemToPlace.source,
        sourceId: selectedItemToPlace.sourceId,
      };

      setPlacedCases(prev => [...prev, newCase]);
      setSelectedItemToPlace(null);
      setSelectedPlacedId(null);
      toast.success(`Placed ${newCase.caseId}`);
    } else {
      // Tap existing item to select it
      const tapped = placedCases.filter(c => c.z === 1).find(c => {
        const cW = c.rotation === 90 || c.rotation === 270 ? c.length : c.width;
        const cL = c.rotation === 90 || c.rotation === 270 ? c.width : c.length;
        return mouseX >= c.x && mouseX <= c.x + cW && mouseY >= c.y && mouseY <= c.y + cL;
      });
      setSelectedPlacedId(tapped ? tapped.id : null);
    }
  }, [selectedPallet, selectedItemToPlace, scale, panOffset, placedCases, checkCollision, metrics.totalWeight]);

  // Touch gestures for pinch-to-zoom and two-finger pan
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchRef.current = { dist: Math.hypot(dx, dy), midX: (e.touches[0].clientX + e.touches[1].clientX) / 2, midY: (e.touches[0].clientY + e.touches[1].clientY) / 2 };
    } else if (e.touches.length === 1 && !selectedItemToPlace) {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, [selectedItemToPlace]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchRef.current) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      setZoom(prev => Math.max(0.3, Math.min(1.5, prev + (dist - lastTouchRef.current!.dist) * 0.004)));
      setPanOffset(prev => ({ x: prev.x + midX - lastTouchRef.current!.midX, y: prev.y + midY - lastTouchRef.current!.midY }));
      lastTouchRef.current = { dist, midX, midY };
    } else if (e.touches.length === 1 && touchStartRef.current && !selectedItemToPlace) {
      const dx = e.touches[0].clientX - touchStartRef.current.x;
      const dy = e.touches[0].clientY - touchStartRef.current.y;
      setPanOffset(prev => ({ x: prev.x + dx * 0.5, y: prev.y + dy * 0.5 }));
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, [selectedItemToPlace]);

  const handleTouchEnd = useCallback(() => {
    lastTouchRef.current = null;
    touchStartRef.current = null;
  }, []);

  const handleAutoLoad = useCallback(() => {
    if (!selectedPallet) { toast.error("Select a pallet type first"); return; }
    const readyItems: AutoLoadItem[] = libraryItems
      .filter(item => item.width && item.width > 0 && item.length && item.length > 0 && item.height && item.height > 0 && item.weight && item.weight > 0)
      .map(item => ({ id: item.id, name: item.name, width: item.width!, length: item.length!, height: item.height!, weight: item.weight!, fragile: item.fragile, allowRotation: item.allowRotation, category: item.category || undefined, condition: item.condition || undefined, source: item.source, sourceId: item.sourceId }));
    if (readyItems.length === 0) { toast.error("No pallet-ready items", { description: "Items need dimensions and weight." }); return; }
    const result = autoLoadPallet(readyItems, { palletWidth: selectedPallet.width, palletLength: selectedPallet.length, maxWeight: selectedPallet.maxWeight, layer: 1, strictMode: false, strategy: autoLoadStrategy, existingItems: placedCases });
    if (result.totalPlaced === 0) { toast.error("Cannot auto-load", { description: "No items fit on the pallet." }); return; }
    setPlacedCases(prev => [...prev, ...result.placed]);
    toast.success(`Auto-loaded ${result.totalPlaced} items`);
  }, [selectedPallet, libraryItems, placedCases, autoLoadStrategy]);

  const handleSmartLayout = useCallback(() => {
    if (!selectedPallet || placedCases.length === 0) return;
    const result = smartLayoutPallet(placedCases.filter(c => c.z === 1), { palletWidth: selectedPallet.width, palletLength: selectedPallet.length, maxWeight: selectedPallet.maxWeight, layer: 1, strictMode: false, strategy: autoLoadStrategy });
    const otherItems = placedCases.filter(c => c.z !== 1);
    setPlacedCases([...otherItems, ...result.placed]);
    toast.success(`Rearranged ${result.totalPlaced} items`);
  }, [selectedPallet, placedCases, autoLoadStrategy]);

  const handleClear = useCallback(() => {
    if (placedCases.length === 0) return;
    if (window.confirm("Remove all items from the pallet?")) {
      setPlacedCases([]);
      setSelectedPlacedId(null);
      toast.success("Pallet cleared");
    }
  }, [placedCases.length]);

  const handleRotateItem = useCallback(() => {
    if (!selectedPlacedId || !selectedPallet) return;
    const item = placedCases.find(c => c.id === selectedPlacedId);
    if (!item || item.allowRotation === false) { toast.error("Cannot rotate"); return; }
    const newRot = (item.rotation + 90) % 360;
    const nW = newRot === 90 || newRot === 270 ? item.length : item.width;
    const nL = newRot === 90 || newRot === 270 ? item.width : item.length;
    if (item.x + nW > selectedPallet.width || item.y + nL > selectedPallet.length) { toast.error("Would exceed boundaries"); return; }
    if (checkCollision(item.x, item.y, nW, nL, item.id, item.z)) { toast.error("Would collide"); return; }
    setPlacedCases(prev => prev.map(c => c.id === selectedPlacedId ? { ...c, rotation: newRot } : c));
    toast.success("Rotated 90°");
  }, [selectedPlacedId, placedCases, selectedPallet, checkCollision]);

  const handleDeleteItem = useCallback(() => {
    if (!selectedPlacedId) return;
    setPlacedCases(prev => prev.filter(c => c.id !== selectedPlacedId));
    setSelectedPlacedId(null);
    toast.success("Item removed");
  }, [selectedPlacedId]);

  const handleSelectLibraryItem = useCallback((item: PalletLibraryItem) => {
    const ready = item.width && item.width > 0 && item.length && item.length > 0 && item.height && item.height > 0 && item.weight && item.weight > 0;
    if (!ready) { toast.error("Item needs dimensions", { description: "Set dimensions on desktop first." }); return; }
    setSelectedItemToPlace(item);
    setShowItemDrawer(false);
    toast.info(`Tap on canvas to place "${item.name}"`, { duration: 3000 });
  }, []);

  const cancelPlacement = () => {
    setSelectedItemToPlace(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />

      <main className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur">
          <div className="px-4 py-3">
            <Breadcrumbs items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Layout Builder" }
            ]} />
            <div className="mt-1.5 flex items-center justify-between">
              <h1 className="text-lg font-semibold">Layout Builder</h1>
              {selectedPallet && (
                <Badge variant="outline" className="text-xs">
                  {selectedPallet.name}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Metrics bar */}
        {selectedPallet && (
          <div className="flex items-center gap-3 px-4 py-2 border-b bg-card text-xs">
            <div className="flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium">{metrics.itemCount} items</span>
            </div>
            <Separator orientation="vertical" className="h-3" />
            <div className="flex items-center gap-1.5">
              <Weight className="h-3.5 w-3.5 text-muted-foreground" />
              <Badge
                variant={metrics.weightUsage > 90 ? "destructive" : metrics.weightUsage > 70 ? "outline" : "secondary"}
                className="text-[10px] px-1.5 py-0"
              >
                {metrics.totalWeight.toLocaleString()} / {metrics.maxWeight.toLocaleString()} lbs
              </Badge>
            </div>
            {metrics.weightUsage > 90 && (
              <>
                <Separator orientation="vertical" className="h-3" />
                <div className="flex items-center gap-1 text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span className="font-medium">{metrics.weightUsage >= 100 ? "Over limit" : "Near limit"}</span>
                </div>
              </>
            )}
            {/* Zoom */}
            <div className="ml-auto flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(Math.max(0.3, zoom - 0.15))}>
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <span className="text-[10px] text-muted-foreground w-8 text-center">{Math.round(zoom * 100)}%</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(Math.min(1.5, zoom + 0.15))}>
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setZoom(0.6); setPanOffset({ x: 0, y: 0 }); }}>
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Placement mode banner */}
        {selectedItemToPlace && (
          <div className="px-4 py-2 bg-primary/10 border-b border-primary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Placing: {selectedItemToPlace.name}</span>
                <Badge variant="outline" className="text-xs">
                  {selectedItemToPlace.width}×{selectedItemToPlace.length}"
                </Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={cancelPlacement} className="h-7 px-2">
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Selected item actions */}
        {selectedPlacedId && !selectedItemToPlace && (() => {
          const item = placedCases.find(c => c.id === selectedPlacedId);
          if (!item) return null;
          return (
            <div className="px-4 py-2 bg-muted/50 border-b flex items-center gap-2">
              <span className="text-sm font-medium flex-1 truncate">{item.caseId}</span>
              <Button variant="outline" size="sm" className="h-8 gap-1" onClick={handleRotateItem}>
                <RotateCw className="h-3.5 w-3.5" /> Rotate
              </Button>
              <Button variant="destructive" size="sm" className="h-8 gap-1" onClick={handleDeleteItem}>
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </Button>
              <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => setSelectedPlacedId(null)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        })()}

        {/* Canvas / Content */}
        {!selectedPallet ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <Package className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold mb-1">Choose a Pallet Type</h3>
            <p className="text-sm text-muted-foreground mb-4">Select a pallet to start building your layout</p>
            <Drawer open={showPalletDrawer} onOpenChange={setShowPalletDrawer}>
              <DrawerTrigger asChild>
                <Button className="gap-2"><Layers className="h-4 w-4" /> Select Pallet</Button>
              </DrawerTrigger>
              <DrawerContent className="max-h-[80vh]">
                <DrawerHeader><DrawerTitle>Select Pallet Type</DrawerTitle></DrawerHeader>
                <ScrollArea className="flex-1 px-4 pb-6">
                  <div className="space-y-2">
                    {palletTypes.map((pallet) => (
                      <button
                        key={pallet.id}
                        onClick={() => handleSelectPallet(pallet)}
                        className="w-full text-left p-3 rounded-lg border border-border hover:border-primary/50 transition-all active:scale-[0.98]"
                      >
                        <div className="font-medium text-sm">{pallet.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {pallet.width}" × {pallet.length}" • {pallet.max_weight.toLocaleString()} lbs max
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </DrawerContent>
            </Drawer>
          </div>
        ) : (
          <div
            className="flex-1 overflow-hidden relative bg-muted/30 touch-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onClick={handleCanvasTap}
          >
            {/* Canvas */}
            <div
              ref={canvasRef}
              className="absolute border-2 border-border bg-card shadow-inner"
              style={{
                width: `${(selectedPallet.width * scale)}px`,
                height: `${(selectedPallet.length * scale)}px`,
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) translate(${panOffset.x}px, ${panOffset.y}px)`,
              }}
            >
              {/* Grid */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-15">
                {Array.from({ length: Math.ceil(selectedPallet.width / 12) + 1 }).map((_, i) => (
                  <line key={`v-${i}`} x1={i * 12 * scale} y1={0} x2={i * 12 * scale} y2={selectedPallet.length * scale} stroke="currentColor" strokeWidth={0.5} />
                ))}
                {Array.from({ length: Math.ceil(selectedPallet.length / 12) + 1 }).map((_, i) => (
                  <line key={`h-${i}`} x1={0} y1={i * 12 * scale} x2={selectedPallet.width * scale} y2={i * 12 * scale} stroke="currentColor" strokeWidth={0.5} />
                ))}
              </svg>

              {/* Placed items */}
              {placedCases.filter(c => c.z === 1).map((c) => {
                const cW = (c.rotation === 90 || c.rotation === 270) ? c.length : c.width;
                const cL = (c.rotation === 90 || c.rotation === 270) ? c.width : c.length;
                const isSelected = selectedPlacedId === c.id;
                return (
                  <div
                    key={c.id}
                    className={cn(
                      "absolute border-2 rounded-sm flex items-center justify-center overflow-hidden transition-all",
                      isSelected
                        ? "border-primary ring-2 ring-primary/50 bg-primary/20 z-10"
                        : "border-primary/50 bg-primary/10",
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
                      setSelectedPlacedId(c.id);
                      setSelectedItemToPlace(null);
                    }}
                  >
                    <div className="text-center px-0.5">
                      <div className="text-[8px] font-bold truncate">{c.caseId}</div>
                      <div className="text-[7px] text-muted-foreground">{cW}×{cL}"</div>
                    </div>
                  </div>
                );
              })}

              {/* Tap-to-place hint */}
              {selectedItemToPlace && placedCases.filter(c => c.z === 1).length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-xs text-muted-foreground bg-background/80 px-3 py-1.5 rounded-lg">
                    Tap to place
                  </div>
                </div>
              )}

              {/* Empty state */}
              {placedCases.length === 0 && !selectedItemToPlace && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-[10px] text-muted-foreground/40">Tap "Add Item" to start</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom Action Bar */}
        {selectedPallet && (
          <div className="flex-shrink-0 px-4 py-3 bg-card border-t safe-area-inset-bottom">
            <div className="flex items-center gap-2">
              {/* Add Item */}
              <Drawer open={showItemDrawer} onOpenChange={setShowItemDrawer}>
                <DrawerTrigger asChild>
                  <Button variant="outline" className="gap-2 h-10">
                    <Plus className="h-4 w-4" /> Add Item
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="max-h-[80vh]">
                  <DrawerHeader><DrawerTitle>Select Item to Place</DrawerTitle></DrawerHeader>
                  <ScrollArea className="flex-1 px-4 pb-6">
                    <div className="space-y-2">
                      {libraryItems.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">No items available</p>
                      ) : (
                        libraryItems.map((item) => {
                          const ready = item.width && item.width > 0 && item.length && item.length > 0 && item.height && item.height > 0 && item.weight && item.weight > 0;
                          const placed = placedCases.some(c => c.sourceId === item.sourceId);
                          return (
                            <button
                              key={item.id}
                              onClick={() => handleSelectLibraryItem(item)}
                              className={cn(
                                "w-full text-left p-3 rounded-lg border transition-all active:scale-[0.98]",
                                placed ? "border-primary/30 bg-primary/5" : "border-border",
                                !ready && "opacity-50"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn("w-2 h-2 rounded-full shrink-0", ready ? "bg-primary" : "bg-warning")} />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium truncate">{item.name}</div>
                                  <div className="text-[11px] text-muted-foreground mt-0.5">
                                    {ready ? `${item.length}×${item.width}×${item.height}" • ${item.weight} lbs` : "Dimensions needed — set on desktop"}
                                  </div>
                                </div>
                                {placed && <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-primary border-primary/30 shrink-0">Placed</Badge>}
                                {item.fragile && <Badge variant="destructive" className="text-[9px] px-1.5 py-0 shrink-0">Fragile</Badge>}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                </DrawerContent>
              </Drawer>

              {/* Quick Actions */}
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="icon" className="h-10 w-10" onClick={handleAutoLoad} title="Auto Load">
                  <Wand2 className="h-4 w-4" />
                </Button>
                {placedCases.length > 0 && (
                  <Button variant="outline" size="icon" className="h-10 w-10" onClick={handleSmartLayout} title="Smart Layout">
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-10 w-10" title="Strategy">
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {(Object.keys(STRATEGY_META) as AutoLoadStrategy[]).map((key) => (
                      <DropdownMenuItem key={key} onClick={() => setAutoLoadStrategy(key)} className="flex items-start gap-2 py-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{STRATEGY_META[key].label}</span>
                            {autoLoadStrategy === key && <Check className="h-3.5 w-3.5 text-primary" />}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{STRATEGY_META[key].description}</p>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Export & Clear */}
              <div className="flex items-center gap-1.5 ml-auto">
                {placedCases.length > 0 && (
                  <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground" onClick={handleClear}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="h-10 gap-2"
                  disabled={placedCases.length === 0}
                  onClick={() => setExportModalOpen(true)}
                >
                  <FileDown className="h-4 w-4" /> Export
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      <LegalFooter />

      <ExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        placedCases={placedCases}
        palletWidth={selectedPallet?.width || 0}
        palletLength={selectedPallet?.length || 0}
        palletType={selectedPallet?.name || ""}
        maxWeight={selectedPallet?.maxWeight || 0}
      />
    </div>
  );
};
