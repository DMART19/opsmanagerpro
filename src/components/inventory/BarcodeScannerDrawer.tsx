import { useState, useEffect, useRef, useCallback } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { CacheInventoryItem } from "@/hooks/use-cache-inventory";
import { cn } from "@/lib/utils";
import {
  ScanLine,
  Loader2,
  Package,
  Plus,
  Minus,
  Box,
  AlertTriangle,
  X,
  Camera,
  Zap,
  Eye,
  Pencil,
  Search,
  ArrowRightLeft,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";

interface BarcodeScannerDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemFound: (item: CacheInventoryItem) => void;
  onCodeNotFound?: (code: string) => void;
  onAddStock?: (item: CacheInventoryItem) => void;
  onRemoveStock?: (item: CacheInventoryItem) => void;
  onAssignContainer?: (item: CacheInventoryItem) => void;
  onEditItem?: (item: CacheInventoryItem) => void;
  onMoveToContainer?: (item: CacheInventoryItem) => void;
  /** If provided, "Create New Item" appears in not-found state */
  onCreateNewItem?: (code: string) => void;
  /** If provided, "Search Inventory" appears in not-found state */
  onSearchInventory?: (code: string) => void;
  /** Scan-to-move mode: after scanning an item, scan a container to move into */
  scanToMoveItem?: CacheInventoryItem | null;
  onScanToMoveComplete?: (item: CacheInventoryItem, container: CacheInventoryItem) => void;
}

type ScanState = "scanning" | "searching" | "found" | "not_found" | "error" | "move_success";

// Haptic feedback helper
const triggerHaptic = () => {
  try {
    if (navigator.vibrate) navigator.vibrate(50);
  } catch { /* ignore */ }
};

// Debounce duplicate scans (same code within 2s)
const DEDUP_WINDOW_MS = 2000;

export const BarcodeScannerDrawer = ({
  open,
  onOpenChange,
  onItemFound,
  onCodeNotFound,
  onAddStock,
  onRemoveStock,
  onAssignContainer,
  onEditItem,
  onMoveToContainer,
  onCreateNewItem,
  onSearchInventory,
  scanToMoveItem,
  onScanToMoveComplete,
}: BarcodeScannerDrawerProps) => {
  const [scanState, setScanState] = useState<ScanState>("scanning");
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [foundItem, setFoundItem] = useState<CacheInventoryItem | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [continuousMode, setContinuousMode] = useState(false);
  const [moveTargetName, setMoveTargetName] = useState<string | null>(null);
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<any>(null);
  const isInitializedRef = useRef(false);
  const lastScannedRef = useRef<{ code: string; time: number } | null>(null);

  const isMoveMode = !!scanToMoveItem;

  const cleanup = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        const state = html5QrCodeRef.current.getState();
        if (state === 2) await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch { /* ignore */ }
      html5QrCodeRef.current = null;
    }
    isInitializedRef.current = false;
  }, []);

  const lookupItem = useCallback(async (code: string) => {
    console.log("[Scanner] lookupItem called with code:", code);
    
    // Dedup check
    const now = Date.now();
    if (lastScannedRef.current && lastScannedRef.current.code === code && now - lastScannedRef.current.time < DEDUP_WINDOW_MS) {
      console.log("[Scanner] Duplicate scan ignored:", code);
      // Resume scanning if in continuous mode
      if (continuousMode && html5QrCodeRef.current) {
        try { html5QrCodeRef.current.resume(); } catch { /* ignore */ }
      }
      return;
    }
    lastScannedRef.current = { code, time: now };

    setScanState("searching");
    setScannedCode(code);
    triggerHaptic();

    try {
      const { data, error } = await supabase
        .from("cache_inventory")
        .select(`
          *,
          asset_status:asset_status_id ( id, name ),
          manufacturer_ref:manufacturer_id ( id, name ),
          category_ref:category_id ( id, name ),
          asset_group_ref:asset_group_id ( id, name ),
          container_type_ref:container_type_id ( id, name ),
          container_status_ref:container_status_id ( id, name ),
          container_group_ref:container_group_id ( id, name )
        `)
        .or(`barcode.eq.${code},serial_number.eq.${code},id_cache_fema.eq.${code}`)
        .is("deleted_at", null)
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      console.log("[Scanner] DB lookup result:", data ? `Found item: ${data.description || data.id}` : "No match");

      if (data) {
        const mapped: CacheInventoryItem = {
          ...data,
          custom_data: (data.custom_data as Record<string, any> | null) ?? null,
          quantity_available: data.quantity_available ?? 0,
          quantity_out: data.quantity_out ?? 0,
          is_internal: data.is_internal ?? false,
          asset_type: data.asset_type as "item" | "container",
          subcategory: (data.category_ref as any)?.name ?? null,
          manufacturer: (data.manufacturer_ref as any)?.name ?? null,
          status_item: (data.asset_status as any)?.name ?? null,
          group_abbv: (data.asset_group_ref as any)?.name ?? null,
          container_type_name: (data.container_type_ref as any)?.name ?? null,
          container_status_name: (data.container_status_ref as any)?.name ?? null,
          container_group_name: (data.container_group_ref as any)?.name ?? null,
        };

        // If in move mode, this scanned item should be a container
        if (isMoveMode && scanToMoveItem && onScanToMoveComplete) {
          if (mapped.asset_type === "container") {
            setMoveTargetName(mapped.description || mapped.box_number || "Container");
            setScanState("move_success");
            onScanToMoveComplete(scanToMoveItem, mapped);
          } else {
            setFoundItem(mapped);
            setScanState("found");
            toast({ title: "Not a container", description: "Please scan a container barcode to move this item.", variant: "destructive" });
            // Resume scanning
            if (html5QrCodeRef.current) {
              try { html5QrCodeRef.current.resume(); } catch { /* ignore */ }
            }
            setScanState("scanning");
          }
          return;
        }

        setFoundItem(mapped);
        setScanState("found");

        // In continuous mode, auto-navigate after brief display
        if (continuousMode) {
          setTimeout(() => {
            onItemFound(mapped);
            toast({
              title: (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  Item found via barcode scan
                </span>
              ) as any,
              description: mapped.description || mapped.barcode,
            });
          }, 800);
        }
      } else {
        setFoundItem(null);
        setScanState("not_found");
      }
    } catch (err: any) {
      setErrorMessage(err.message);
      setScanState("error");
    }
  }, [continuousMode, isMoveMode, scanToMoveItem, onScanToMoveComplete, onItemFound]);

  const initScanner = useCallback(async () => {
    if (isInitializedRef.current || !scannerRef.current) return;
    isInitializedRef.current = true;

    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");

      // Support all common barcode + QR formats
      const formatsToSupport = [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.DATA_MATRIX,
        Html5QrcodeSupportedFormats.ITF,
        Html5QrcodeSupportedFormats.CODABAR,
      ];

      const scanner = new Html5Qrcode("barcode-scanner-region", {
        formatsToSupport,
        verbose: false,
      });
      html5QrCodeRef.current = scanner;

      console.log("[Scanner] Initializing with formats:", formatsToSupport.map(f => Html5QrcodeSupportedFormats[f]));

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 30,                                      // Higher FPS for faster detection
          qrbox: { width: 300, height: 160 },           // Rectangular box optimized for 1D barcodes
          aspectRatio: 1,
          disableFlip: false,
          // Request higher resolution for screen-based codes
          videoConstraints: {
            facingMode: "environment",
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            focusMode: { ideal: "continuous" } as any,
          } as any,
        },
        (decodedText: string) => {
          console.log("[Scanner] Barcode detected:", decodedText);
          if (!continuousMode) scanner.pause();
          lookupItem(decodedText);
        },
        () => { /* frame processed — no match */ }
      );

      console.log("[Scanner] Started successfully");
    } catch (err: any) {
      console.error("[Scanner] Init error:", err);
      setErrorMessage(
        err?.message?.includes("NotAllowedError") || err?.message?.includes("Permission")
          ? "Camera permission denied. Please allow camera access and try again."
          : "Could not start camera. Make sure no other app is using it."
      );
      setScanState("error");
    }
  }, [lookupItem, continuousMode]);

  useEffect(() => {
    if (open) {
      setScanState("scanning");
      setScannedCode(null);
      setFoundItem(null);
      setErrorMessage(null);
      setMoveTargetName(null);
      lastScannedRef.current = null;
      const timer = setTimeout(initScanner, 400);
      return () => clearTimeout(timer);
    } else {
      cleanup();
    }
  }, [open, initScanner, cleanup]);

  useEffect(() => {
    return () => { cleanup(); };
  }, [cleanup]);

  const handleScanAgain = useCallback(async () => {
    setScanState("scanning");
    setScannedCode(null);
    setFoundItem(null);
    setErrorMessage(null);

    if (html5QrCodeRef.current) {
      try {
        html5QrCodeRef.current.resume();
      } catch {
        await cleanup();
        isInitializedRef.current = false;
        setTimeout(initScanner, 200);
      }
    } else {
      isInitializedRef.current = false;
      setTimeout(initScanner, 200);
    }
  }, [cleanup, initScanner]);

  const handleViewItem = () => {
    if (foundItem) {
      onOpenChange(false);
      setTimeout(() => onItemFound(foundItem), 200);
    }
  };

  const handleAction = (action: (item: CacheInventoryItem) => void) => {
    if (!foundItem) return;
    onOpenChange(false);
    setTimeout(() => action(foundItem), 200);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92dvh]">
        <DrawerHeader className="text-center pb-2">
          <DrawerTitle className="text-lg font-semibold flex items-center justify-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            {isMoveMode ? "Scan Container" : "Scan Item"}
          </DrawerTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {isMoveMode
              ? `Scan a container to move "${scanToMoveItem?.description || "item"}" into`
              : "Point camera at barcode or QR code"
            }
          </p>
          {/* Continuous mode toggle */}
          {!isMoveMode && (
            <div className="flex items-center justify-center gap-2 mt-2">
              <Switch
                id="continuous-mode"
                checked={continuousMode}
                onCheckedChange={setContinuousMode}
                className="scale-90"
              />
              <Label htmlFor="continuous-mode" className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
                Continuous Scan
              </Label>
            </div>
          )}
        </DrawerHeader>

        <div className="px-4 pb-6 space-y-4">
          {/* Camera viewport */}
          {scanState === "scanning" && (
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-square max-w-[320px] mx-auto shadow-lg">
              <div id="barcode-scanner-region" ref={scannerRef} className="w-full h-full" />
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 border-2 border-primary/30 rounded-2xl" />
                {/* Scan target area — rectangular for 1D barcodes */}
                <div className="absolute left-[8%] right-[8%] top-[30%] bottom-[30%]">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-primary rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-primary rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] border-primary rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] border-primary rounded-br-lg" />
                  {/* Animated scan line */}
                  <div className="absolute left-2 right-2 top-1/2 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" />
                </div>
                {/* Semi-transparent overlay outside scan zone */}
                <div className="absolute inset-0">
                  <div className="absolute top-0 left-0 right-0 h-[30%] bg-black/40 rounded-t-2xl" />
                  <div className="absolute bottom-0 left-0 right-0 h-[30%] bg-black/40 rounded-b-2xl" />
                  <div className="absolute top-[30%] bottom-[30%] left-0 w-[8%] bg-black/40" />
                  <div className="absolute top-[30%] bottom-[30%] right-0 w-[8%] bg-black/40" />
                </div>
                {/* Instruction text */}
                <div className="absolute bottom-[12%] left-1/2 -translate-x-1/2 text-white/80 text-[11px] font-medium text-center whitespace-nowrap">
                  Align barcode within the frame
                </div>
                {/* Mode badge */}
                {continuousMode && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-primary/90 text-primary-foreground text-[10px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 z-10">
                    <RefreshCw className="h-2.5 w-2.5" />
                    CONTINUOUS
                  </div>
                )}
                {isMoveMode && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-warning/90 text-warning-foreground text-[10px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 z-10">
                    <ArrowRightLeft className="h-2.5 w-2.5" />
                    SCAN CONTAINER
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Searching */}
          {scanState === "searching" && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm font-medium text-muted-foreground">
                Looking up <span className="font-mono text-foreground">{scannedCode}</span>…
              </p>
            </div>
          )}

          {/* Found item — Warehouse Speed Mode */}
          {scanState === "found" && foundItem && (
            <div className="space-y-3 animate-fade-in">
              {/* Item card */}
              <div className="rounded-2xl border border-border/30 bg-muted/20 p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-base truncate">
                        {foundItem.description || foundItem.id_cache_fema || "Unnamed Item"}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      {foundItem.barcode && <span className="font-mono truncate">{foundItem.barcode}</span>}
                      {foundItem.section && (
                        <>
                          <span className="text-muted-foreground/30">•</span>
                          <span className="truncate">{foundItem.section}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-2xl font-bold tabular-nums">{foundItem.quantity_available ?? 0}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Available</div>
                  </div>
                </div>
                {/* Scan match banner */}
                <div className="mt-2 pt-2 border-t border-border/20 flex items-center gap-1.5 text-xs text-success">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Item found via barcode scan</span>
                </div>
              </div>

              {/* Warehouse Quick Actions — large touch targets */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Zap className="h-3 w-3" />
                  Warehouse Actions
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {onAddStock && (
                    <Button
                      variant="outline"
                      className="h-16 rounded-xl flex flex-col items-center justify-center gap-1.5 border-border/20 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 active:scale-[0.96] transition-all duration-150 shadow-sm"
                      onClick={() => handleAction(onAddStock)}
                    >
                      <Plus className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Add Stock</span>
                    </Button>
                  )}
                  {onRemoveStock && (
                    <Button
                      variant="outline"
                      className="h-16 rounded-xl flex flex-col items-center justify-center gap-1.5 border-border/20 bg-destructive/5 hover:bg-destructive/10 active:scale-[0.96] transition-all duration-150 shadow-sm"
                      onClick={() => handleAction(onRemoveStock)}
                      disabled={(foundItem.quantity_available ?? 0) <= 0}
                    >
                      <Minus className="h-6 w-6 text-destructive" />
                      <span className="text-xs font-semibold text-destructive">Remove Stock</span>
                    </Button>
                  )}
                  {onMoveToContainer && (
                    <Button
                      variant="outline"
                      className="h-16 rounded-xl flex flex-col items-center justify-center gap-1.5 border-border/20 bg-accent/30 hover:bg-accent/50 active:scale-[0.96] transition-all duration-150 shadow-sm"
                      onClick={() => handleAction(onMoveToContainer)}
                    >
                      <ArrowRightLeft className="h-6 w-6 text-accent-foreground/70" />
                      <span className="text-xs font-semibold text-accent-foreground/70">Move</span>
                    </Button>
                  )}
                  {onAssignContainer && !onMoveToContainer && (
                    <Button
                      variant="outline"
                      className="h-16 rounded-xl flex flex-col items-center justify-center gap-1.5 border-border/20 bg-muted/30 hover:bg-muted/50 active:scale-[0.96] transition-all duration-150 shadow-sm"
                      onClick={() => handleAction(onAssignContainer)}
                    >
                      <Box className="h-6 w-6 text-muted-foreground" />
                      <span className="text-xs font-semibold text-muted-foreground">Container</span>
                    </Button>
                  )}
                  {onEditItem && (
                    <Button
                      variant="outline"
                      className="h-16 rounded-xl flex flex-col items-center justify-center gap-1.5 border-border/20 bg-muted/20 hover:bg-muted/40 active:scale-[0.96] transition-all duration-150 shadow-sm"
                      onClick={() => handleAction(onEditItem)}
                    >
                      <Pencil className="h-6 w-6 text-muted-foreground" />
                      <span className="text-xs font-semibold text-muted-foreground">Edit Item</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* View Details + Scan Again */}
              <div className="flex gap-2">
                <Button
                  onClick={handleViewItem}
                  className="flex-1 h-12 rounded-xl text-base font-semibold active:scale-[0.98] transition-transform duration-150"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Button>
                <Button
                  variant="outline"
                  onClick={handleScanAgain}
                  className="h-12 rounded-xl px-4 active:scale-[0.98] transition-transform duration-150"
                >
                  <Camera className="h-4 w-4 mr-1.5" />
                  Scan Again
                </Button>
              </div>
            </div>
          )}

          {/* Not found — actionable options */}
          {scanState === "not_found" && (
            <div className="flex flex-col items-center justify-center py-8 gap-4 animate-fade-in">
              <div className="h-16 w-16 rounded-2xl bg-warning/10 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-warning" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-base mb-1">No Match Found</h3>
                <p className="text-sm text-muted-foreground">
                  Code <span className="font-mono text-foreground">{scannedCode}</span> is not in inventory
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full max-w-xs">
                {onCreateNewItem && scannedCode && (
                  <Button
                    onClick={() => {
                      onOpenChange(false);
                      setTimeout(() => onCreateNewItem(scannedCode), 200);
                    }}
                    className="h-14 rounded-xl text-base font-semibold active:scale-[0.98] transition-transform duration-150"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Create New Item
                  </Button>
                )}
                {onCodeNotFound && scannedCode && !onCreateNewItem && (
                  <Button
                    onClick={() => {
                      onOpenChange(false);
                      setTimeout(() => onCodeNotFound(scannedCode), 200);
                    }}
                    className="h-14 rounded-xl text-base active:scale-[0.98] transition-transform duration-150"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Use Code
                  </Button>
                )}
                {onSearchInventory && scannedCode && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      onOpenChange(false);
                      setTimeout(() => onSearchInventory(scannedCode), 200);
                    }}
                    className="h-14 rounded-xl text-base active:scale-[0.98] transition-transform duration-150"
                  >
                    <Search className="h-5 w-5 mr-2" />
                    Search Inventory
                  </Button>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={handleScanAgain}
                    className="flex-1 h-12 rounded-xl active:scale-[0.98] transition-transform duration-150"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Scan Again
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => onOpenChange(false)}
                    className="h-12 rounded-xl px-4"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Move success */}
          {scanState === "move_success" && (
            <div className="flex flex-col items-center justify-center py-10 gap-4 animate-fade-in">
              <div className="h-16 w-16 rounded-2xl bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-base mb-1">Item Moved</h3>
                <p className="text-sm text-muted-foreground">
                  Moved to <span className="font-medium text-foreground">{moveTargetName}</span>
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleScanAgain}
                  className="h-12 rounded-xl active:scale-[0.98] transition-transform duration-150"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Scan Next
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="h-12 rounded-xl px-4"
                >
                  Done
                </Button>
              </div>
            </div>
          )}

          {/* Error */}
          {scanState === "error" && (
            <div className="flex flex-col items-center justify-center py-10 gap-4 animate-fade-in">
              <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
                <X className="h-8 w-8 text-destructive" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-base mb-1">Scanner Error</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  {errorMessage || "Something went wrong. Please try again."}
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleScanAgain} className="h-12 rounded-xl active:scale-[0.98] transition-transform duration-150">
                  Try Again
                </Button>
                <Button variant="outline" onClick={() => onOpenChange(false)} className="h-12 rounded-xl">
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};
