import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GripVertical, Package, Box, Layers, ArrowRight, Plus } from "lucide-react";
import { SavedPalletBuild } from "@/hooks/use-saved-pallet-builds";
import { LoadLibraryItem } from "@/hooks/use-load-library-assets";
import { cn } from "@/lib/utils";

type TabId = "pallets" | "items" | "containers";

interface LoadLibraryPanelProps {
  savedPallets: SavedPalletBuild[];
  items: LoadLibraryItem[];
  containers: LoadLibraryItem[];
  loading: boolean;
  onDragStartPallet: (pallet: SavedPalletBuild) => void;
  onDragStartAsset: (asset: LoadLibraryItem) => void;
  /** When true, play a one-time highlight animation */
  highlight?: boolean;
  /** Pallets already placed on the active trailer */
  loadedCount?: number;
  /** IDs of pallets already placed in the trailer (for status badges) */
  loadedPalletIds?: string[];
  /** Optional tap-to-place handlers (mobile-friendly). */
  onTapPlacePallet?: (pallet: SavedPalletBuild) => void;
  onTapPlaceAsset?: (asset: LoadLibraryItem) => void;
}

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "pallets", label: "Pallets", icon: Layers },
  { id: "items", label: "Items", icon: Package },
  { id: "containers", label: "Containers", icon: Box },
];

export const LoadLibraryPanel = ({
  savedPallets,
  items,
  containers,
  loading,
  onDragStartPallet,
  onDragStartAsset,
  highlight,
  loadedCount = 0,
  loadedPalletIds = [],
  onTapPlacePallet,
  onTapPlaceAsset,
}: LoadLibraryPanelProps) => {
  const [activeTab, setActiveTab] = useState<TabId>("pallets");
  const [showHint, setShowHint] = useState(false);
  const [animating, setAnimating] = useState(false);

  // One-time highlight when trailer is first selected
  useEffect(() => {
    if (highlight) {
      setShowHint(true);
      setAnimating(true);
      const timer = setTimeout(() => setAnimating(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [highlight]);

  const counts = {
    pallets: savedPallets.length,
    items: items.length,
    containers: containers.length,
  };

  return (
    <Card className={cn(
      "h-full flex flex-col transition-all duration-500 border-border/50 shadow-sm",
      animating && "ring-2 ring-primary/40 shadow-[0_0_16px_-4px_hsl(var(--primary)/0.3)]"
    )} style={{ flexShrink: 0 }}>
      <CardHeader className="pb-0 px-4 pt-4">
        <div className="flex items-center justify-between mb-2">
          <CardTitle className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Package className="h-3 w-3" />
            Awaiting Loading
          </CardTitle>
          <span className="text-[10px] tabular-nums text-muted-foreground">
            <span className="font-semibold text-foreground">{Math.max(0, savedPallets.length - loadedCount)}</span> left
          </span>
        </div>
        {showHint && (
          <p className="text-[11px] text-muted-foreground leading-relaxed mb-2 animate-fade-in">
            Drag pallets onto the vehicle.
          </p>
        )}
        {/* Tabs */}
        <div className="grid grid-cols-3 gap-0.5 bg-muted/40 rounded-lg p-0.5 mb-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count = counts[tab.id];
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center justify-center gap-1.5 py-2 rounded-md text-[11px] font-medium transition-all min-w-0",
                  isActive
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{tab.label}</span>
                <span className={cn(
                  "text-[10px] shrink-0",
                  isActive ? "text-muted-foreground" : "text-muted-foreground/40"
                )}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full" style={{ scrollbarGutter: "stable" }}>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="flex flex-col items-center gap-2">
                <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-muted-foreground">Loading…</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 px-3 py-3">
              {activeTab === "pallets" && (
                savedPallets.length === 0 ? (
                  <EmptyPalletState />
                ) : (
                  savedPallets.map(p => (
                    <PalletCard
                      key={p.id}
                      pallet={p}
                      onDragStart={onDragStartPallet}
                      onTapPlace={onTapPlacePallet}
                      loaded={loadedPalletIds.includes(p.id)}
                    />
                  ))
                )
              )}
              {activeTab === "items" && (
                items.length === 0 ? (
                  <EmptyTabState icon={Package} label="No items" hint="Add items to your inventory" />
                ) : (
                  items.map(item => (
                    <AssetCard key={item.id} asset={item} onDragStart={onDragStartAsset} onTapPlace={onTapPlaceAsset} />
                  ))
                )
              )}
              {activeTab === "containers" && (
                containers.length === 0 ? (
                  <EmptyTabState icon={Box} label="No containers" hint="Add containers to your inventory" />
                ) : (
                  containers.map(ctr => (
                    <AssetCard key={ctr.id} asset={ctr} onDragStart={onDragStartAsset} onTapPlace={onTapPlaceAsset} />
                  ))
                )
              )}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

/* ── Sub-components ── */

function MiniPreview({ width, length, className }: { width: number; length: number; className?: string }) {
  const maxDim = Math.max(width, length, 1);
  const w = (width / maxDim) * 24;
  const h = (length / maxDim) * 24;
  return (
    <div className={cn("w-8 h-8 rounded-md flex items-center justify-center shrink-0", className)}>
      <div
        className="rounded-[2px] border border-current opacity-50"
        style={{ width: Math.max(w, 6), height: Math.max(h, 6) }}
      />
    </div>
  );
}

function PalletCard({ pallet, onDragStart, onTapPlace, loaded }: { pallet: SavedPalletBuild; onDragStart: (p: SavedPalletBuild) => void; onTapPlace?: (p: SavedPalletBuild) => void; loaded?: boolean }) {
  const weight = pallet.pallet_data.placedCases.reduce((s, c) => s + (c.weight || 0), 0);
  const dims = pallet.pallet_data.palletDimensions;
  const caseCount = pallet.pallet_data.placedCases.length;
  // Derive a primary category from placed cases (first non-empty caseType label)
  const category = pallet.pallet_data.placedCases
    .map((c: any) => c.caseType)
    .find((t) => t && typeof t === "string");

  return (
    <div
      draggable
      onDragStart={() => onDragStart(pallet)}
      className={cn(
        "group flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border/40 bg-card",
        "cursor-grab active:cursor-grabbing",
        "shadow-sm hover:shadow-md hover:-translate-y-px hover:border-primary/40",
        "active:scale-[0.98] active:opacity-90",
        "transition-all duration-150",
        loaded && "opacity-60"
      )}
    >
      <MiniPreview width={dims.width} length={dims.length} className="bg-primary/10 text-primary" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-[12px] font-medium truncate group-hover:text-foreground flex-1">{pallet.name}</p>
          <span
            className={cn(
              "text-[8px] font-semibold uppercase tracking-wider px-1.5 py-px rounded shrink-0",
              loaded
                ? "bg-muted text-muted-foreground"
                : "bg-primary/10 text-primary"
            )}
          >
            {loaded ? "Loaded" : "Ready"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-[10px] text-muted-foreground tabular-nums">{weight.toLocaleString()} lbs</span>
          {category && (
            <>
              <span className="text-[10px] text-muted-foreground/30">·</span>
              <span className="text-[10px] text-muted-foreground capitalize truncate">{category}</span>
            </>
          )}
          <span className="text-[10px] text-muted-foreground/30">·</span>
          <span className="text-[10px] text-muted-foreground tabular-nums">{caseCount}c</span>
        </div>
      </div>
      {onTapPlace && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onTapPlace(pallet); }}
          className="lg:hidden inline-flex items-center justify-center h-9 w-9 rounded-lg bg-primary text-primary-foreground shrink-0 active:scale-95 transition-transform"
          aria-label={`Add ${pallet.name} to vehicle`}
        >
          <Plus className="h-4 w-4" />
        </button>
      )}
      <GripVertical className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground/70 shrink-0 transition-colors hidden lg:block" />
    </div>
  );
}

function AssetCard({ asset, onDragStart, onTapPlace }: { asset: LoadLibraryItem; onDragStart: (a: LoadLibraryItem) => void; onTapPlace?: (a: LoadLibraryItem) => void }) {
  const isContainer = asset.type === "container";

  return (
    <div
      draggable
      onDragStart={() => onDragStart(asset)}
      className={cn(
        "group flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border/40 bg-card",
        "cursor-grab active:cursor-grabbing",
        "shadow-sm hover:shadow-md hover:-translate-y-px hover:border-primary/40",
        "active:scale-[0.98] active:opacity-90",
        "transition-all duration-150"
      )}
    >
      <MiniPreview
        width={asset.width}
        length={asset.length}
        className={isContainer ? "bg-accent text-muted-foreground" : "bg-primary/10 text-primary"}
      />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium truncate group-hover:text-foreground">{asset.name}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-[10px] text-muted-foreground tabular-nums">{asset.width}"×{asset.length}"</span>
          {asset.weight > 0 && (
            <>
              <span className="text-[10px] text-muted-foreground/30">·</span>
              <span className="text-[10px] text-muted-foreground tabular-nums">{asset.weight.toLocaleString()}lb</span>
            </>
          )}
        </div>
      </div>
      {onTapPlace && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onTapPlace(asset); }}
          className="lg:hidden inline-flex items-center justify-center h-9 w-9 rounded-lg bg-primary text-primary-foreground shrink-0 active:scale-95 transition-transform"
          aria-label={`Add ${asset.name} to vehicle`}
        >
          <Plus className="h-4 w-4" />
        </button>
      )}
      <GripVertical className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground/70 shrink-0 transition-colors hidden lg:block" />
    </div>
  );
}

function EmptyTabState({ icon: Icon, label, hint }: { icon: React.ElementType; label: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center px-4">
      <div className="w-9 h-9 rounded-xl bg-muted/40 flex items-center justify-center mb-2.5">
        <Icon className="h-4 w-4 text-muted-foreground/50" />
      </div>
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="text-[10px] text-muted-foreground/60 mt-0.5">{hint}</p>
    </div>
  );
}

function EmptyPalletState() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center px-4">
      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mb-2.5">
        <Layers className="h-4 w-4 text-primary/60" />
      </div>
      <p className="text-[11px] font-medium text-foreground/80">No pallets available yet.</p>
      <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
        Create pallets in the Pallet Builder to use them here.
      </p>
      <Button
        variant="outline"
        size="sm"
        className="mt-3 h-7 text-[10px] gap-1.5"
        onClick={() => navigate("/pallet-builder")}
      >
        Open Pallet Builder
        <ArrowRight className="h-3 w-3" />
      </Button>
    </div>
  );
}
