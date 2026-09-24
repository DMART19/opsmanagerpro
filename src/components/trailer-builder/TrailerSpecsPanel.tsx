import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CustomTrailer } from "@/hooks/use-custom-trailers";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertCircle, CheckCircle, Package, Ruler, Weight, MapPin,
  RotateCw, Copy, Trash2, Layers, ArrowUpDown, ChevronUp, ChevronDown,
  Box, Crosshair, Shield
} from "lucide-react";
import { PlacedPallet, getStopColor } from "@/types/trailer-builder";
import { getLoadZone, TrailerZone } from "@/lib/trailer-zones";
import { cn } from "@/lib/utils";

type ManifestSort = "position" | "weight" | "stop";
type SortDir = "asc" | "desc";

interface TrailerSpecsPanelProps {
  trailer: CustomTrailer | null;
  placedPallets: PlacedPallet[];
  selectedPalletId?: string | null;
  onSelectPallet?: (id: string | null) => void;
  onRotatePallet?: (id: string) => void;
  onDuplicatePallet?: (id: string) => void;
  onRemovePallet?: (id: string) => void;
}

export const TrailerSpecsPanel = ({ trailer, placedPallets, selectedPalletId, onSelectPallet, onRotatePallet, onDuplicatePallet, onRemovePallet }: TrailerSpecsPanelProps) => {
  const [sortBy, setSortBy] = useState<ManifestSort>("position");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const toggleSort = (col: ManifestSort) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
  };

  if (!trailer) {
    return (
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-2 px-3 pt-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
            Trailer Details
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <p className="text-xs text-muted-foreground">Select a trailer to view details.</p>
        </CardContent>
      </Card>
    );
  }

  const totalWeight = placedPallets.reduce((sum, p) =>
    sum + p.palletData.pallet_data.placedCases.reduce((s, c) => s + (c.weight || 0), 0), 0);
  const trailerArea = trailer.length * trailer.width;
  const usedArea = placedPallets.reduce((sum, p) => {
    const d = p.palletData.pallet_data.palletDimensions;
    return sum + d.width * d.length;
  }, 0);
  const usedPercent = (usedArea / trailerArea) * 100;
  const weightPercent = (totalWeight / trailer.max_weight) * 100;
  const isOverweight = totalWeight > trailer.max_weight;

  const selectedPallet = selectedPalletId ? placedPallets.find(p => p.id === selectedPalletId) : null;

  return (
    <Card className="flex flex-col border-border/50 shadow-sm overflow-hidden">
      <ScrollArea className="h-full">
        <div className="px-3 pt-3 pb-3 space-y-3">

          {/* ─── 1. Selected Load Details ─── */}
          <SelectedLoadSection
            pallet={selectedPallet}
            trailer={trailer}
            totalWeight={totalWeight}
            onRotate={onRotatePallet}
            onDuplicate={onDuplicatePallet}
            onRemove={onRemovePallet}
          />

          {/* ─── 2. Trailer Capacity ─── */}
          <SectionLabel label="Trailer Capacity" />
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { label: "Length", value: `${trailer.length}"` },
              { label: "Width", value: `${trailer.width}"` },
              { label: "Height", value: `${trailer.height}"` },
              { label: "Max Wt", value: `${(trailer.max_weight / 1000).toFixed(0)}k` },
            ].map(d => (
              <div key={d.label} className="bg-muted/30 rounded-md px-2 py-1.5 text-center">
                <p className="text-[8px] text-muted-foreground uppercase tracking-wide">{d.label}</p>
                <p className="text-xs font-semibold tabular-nums">{d.value}</p>
              </div>
            ))}
          </div>

          {/* Weight bar */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium flex items-center gap-1">
                <Weight className="h-3 w-3 text-muted-foreground" /> Weight
              </span>
              {isOverweight ? (
                <Badge variant="destructive" className="h-4 text-[9px] px-1.5 gap-0.5"><AlertCircle className="h-2.5 w-2.5" /> Over</Badge>
              ) : (
                <Badge variant="secondary" className="h-4 text-[9px] px-1.5 gap-0.5"><CheckCircle className="h-2.5 w-2.5" /> OK</Badge>
              )}
            </div>
            <Progress value={Math.min(weightPercent, 100)} className="h-1.5" />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
              <span className="tabular-nums">{totalWeight.toLocaleString()} / {trailer.max_weight.toLocaleString()} lbs</span>
              <span className={cn("tabular-nums", isOverweight && "text-destructive font-semibold")}>{weightPercent.toFixed(0)}%</span>
            </div>
          </div>

          {/* Floor space */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium">Floor Space</span>
              <span className="text-[10px] font-semibold tabular-nums">{usedPercent.toFixed(0)}%</span>
            </div>
            <Progress value={usedPercent} className="h-1.5" />
            <p className="text-[10px] text-muted-foreground mt-0.5">{placedPallets.length} load{placedPallets.length !== 1 ? "s" : ""} placed</p>
          </div>

          {/* ─── 3. Load Manifest ─── */}
          {placedPallets.length > 0 && (
            <>
              <Separator className="bg-border/40" />
              <LoadManifest
                trailer={trailer}
                placedPallets={placedPallets}
                selectedPalletId={selectedPalletId}
                onSelectPallet={onSelectPallet}
                sortBy={sortBy}
                sortDir={sortDir}
                toggleSort={toggleSort}
              />
            </>
          )}

          {trailer.notes && (
            <>
              <Separator className="bg-border/40" />
              <p className="text-[10px] text-muted-foreground">{trailer.notes}</p>
            </>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};

/* ── Section label ── */
function SectionLabel({ label }: { label: string }) {
  return (
    <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60 pt-1">{label}</p>
  );
}

/* ── 1. Selected Load Details ── */
function SelectedLoadSection({
  pallet,
  trailer,
  totalWeight,
  onRotate,
  onDuplicate,
  onRemove,
}: {
  pallet: PlacedPallet | null | undefined;
  trailer: CustomTrailer;
  totalWeight: number;
  onRotate?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onRemove?: (id: string) => void;
}) {
  if (!pallet) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 px-3 py-4 text-center">
        <Crosshair className="h-4 w-4 mx-auto text-muted-foreground/30 mb-1.5" />
        <p className="text-[11px] text-muted-foreground/60">Click a load to see details</p>
      </div>
    );
  }

  const stopColor = pallet.stopNumber ? getStopColor(pallet.stopNumber) : null;
  const palletWeight = pallet.palletData.pallet_data.placedCases.reduce((s, c) => s + (c.weight || 0), 0);
  const dims = pallet.palletData.pallet_data.palletDimensions;
  const caseCount = pallet.palletData.pallet_data.placedCases.length;
  const loadH = pallet.rotation === 90 ? dims.width : dims.length;
  const zone = getLoadZone(pallet.y, loadH, trailer.length);
  const isHeavy = palletWeight > (trailer.max_weight * 0.15);
  const hasFragile = pallet.palletData.pallet_data.placedCases.some((c: any) => c.fragile);
  const isStackable = pallet.palletData.pallet_data.placedCases.some((c: any) => c.stackable);

  return (
    <div className="rounded-lg border p-3 space-y-2.5 animate-scale-in"
      style={{
        borderColor: stopColor ? `${stopColor.border}44` : "hsl(var(--primary) / 0.15)",
        backgroundColor: stopColor ? stopColor.bg : "hsl(var(--primary) / 0.03)",
      }}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
          style={{ backgroundColor: stopColor ? `${stopColor.border}18` : "hsl(var(--primary) / 0.1)" }}>
          <Package className="h-3.5 w-3.5" style={{ color: stopColor?.text || "hsl(var(--primary))" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate">{pallet.palletData.name}</p>
          <p className="text-[9px] text-muted-foreground">{caseCount} case{caseCount !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-1.5">
        <StatCell label="Size" value={`${dims.width}" × ${dims.length}"`} />
        <StatCell label="Weight" value={`${palletWeight.toLocaleString()} lb`} />
        <StatCell label="Rotation" value={`${pallet.rotation}°`} />
        <StatCell label="Position" value={`${pallet.x.toFixed(0)}, ${pallet.y.toFixed(0)}"`} />
      </div>

      {/* Visual chips */}
      <div className="flex flex-wrap gap-1">
        <Chip
          color={zone.text}
          bg={zone.bg.replace(/[\d.]+\)$/, '0.18)')}
          icon={<Layers className="h-2.5 w-2.5" />}
          label={`${zone.label} Zone`}
        />
        {isHeavy && (
          <Chip
            color="hsl(var(--destructive))"
            bg="hsl(var(--destructive) / 0.08)"
            icon={<Weight className="h-2.5 w-2.5" />}
            label="Heavy Load"
          />
        )}
        {isStackable && (
          <Chip
            color="hsl(var(--primary))"
            bg="hsl(var(--primary) / 0.08)"
            icon={<Box className="h-2.5 w-2.5" />}
            label="Stackable"
          />
        )}
        {hasFragile && (
          <Chip
            color="hsl(30 80% 55%)"
            bg="hsl(30 80% 55% / 0.1)"
            icon={<Shield className="h-2.5 w-2.5" />}
            label="Fragile"
          />
        )}
        {pallet.stopNumber && (
          <Chip
            color={stopColor?.text || "hsl(var(--foreground))"}
            bg={stopColor?.bg || "hsl(var(--muted))"}
            icon={<MapPin className="h-2.5 w-2.5" />}
            label={`Stop ${pallet.stopNumber}${pallet.destination ? ` · ${pallet.destination}` : ""}`}
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 pt-0.5">
        <Button variant="outline" size="sm" className="h-6 text-[10px] flex-1 gap-1"
          onClick={() => onRotate?.(pallet.id)}>
          <RotateCw className="h-3 w-3" /> Rotate
        </Button>
        <Button variant="outline" size="sm" className="h-6 text-[10px] flex-1 gap-1"
          onClick={() => onDuplicate?.(pallet.id)}>
          <Copy className="h-3 w-3" /> Duplicate
        </Button>
        <Button variant="outline" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:border-destructive/30"
          onClick={() => onRemove?.(pallet.id)}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background/60 rounded-md px-2 py-1.5">
      <p className="text-[8px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-[11px] font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function Chip({ color, bg, icon, label }: { color: string; bg: string; icon: React.ReactNode; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium"
      style={{ color, backgroundColor: bg }}
    >
      {icon}
      {label}
    </span>
  );
}

/* ── 3. Load Manifest ── */
function LoadManifest({
  trailer,
  placedPallets,
  selectedPalletId,
  onSelectPallet,
  sortBy,
  sortDir,
  toggleSort,
}: {
  trailer: CustomTrailer;
  placedPallets: PlacedPallet[];
  selectedPalletId?: string | null;
  onSelectPallet?: (id: string | null) => void;
  sortBy: ManifestSort;
  sortDir: SortDir;
  toggleSort: (col: ManifestSort) => void;
}) {
  const enriched = placedPallets.map((p, i) => {
    const w = p.palletData.pallet_data.placedCases.reduce((s, c) => s + (c.weight || 0), 0);
    const dims = p.palletData.pallet_data.palletDimensions;
    const loadH = p.rotation === 90 ? dims.width : dims.length;
    const zone = getLoadZone(p.y, loadH, trailer.length);
    return { p, i, w, zone };
  });

  const sorted = [...enriched].sort((a, b) => {
    let cmp = 0;
    if (sortBy === "position") cmp = a.p.y - b.p.y;
    else if (sortBy === "weight") cmp = a.w - b.w;
    else if (sortBy === "stop") cmp = (a.p.stopNumber ?? 99) - (b.p.stopNumber ?? 99);
    return sortDir === "desc" ? -cmp : cmp;
  });

  const SortIcon = ({ col }: { col: ManifestSort }) => {
    if (sortBy !== col) return <ArrowUpDown className="h-2.5 w-2.5 text-muted-foreground/40" />;
    return sortDir === "asc"
      ? <ChevronUp className="h-2.5 w-2.5 text-primary" />
      : <ChevronDown className="h-2.5 w-2.5 text-primary" />;
  };

  return (
    <div>
      <SectionLabel label="Load Manifest" />

      {/* Column headers */}
      <div className="grid grid-cols-[20px_1fr_48px_44px_40px] gap-1 px-2 pb-1 mt-1.5 text-[8px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
        <span>#</span>
        <span>Name</span>
        <button onClick={() => toggleSort("position")} className="flex items-center gap-0.5 hover:text-foreground transition-colors">
          Pos <SortIcon col="position" />
        </button>
        <button onClick={() => toggleSort("weight")} className="flex items-center gap-0.5 hover:text-foreground transition-colors">
          Wt <SortIcon col="weight" />
        </button>
        <button onClick={() => toggleSort("stop")} className="flex items-center gap-0.5 hover:text-foreground transition-colors">
          Zone <SortIcon col="stop" />
        </button>
      </div>

      {/* Rows */}
      <div className="space-y-0 max-h-[200px] overflow-auto">
        {sorted.map(({ p, i, w, zone }) => {
          const sc = p.stopNumber ? getStopColor(p.stopNumber) : null;
          const isActive = selectedPalletId === p.id;
          return (
            <button key={p.id}
              onClick={() => onSelectPallet?.(isActive ? null : p.id)}
              className={cn(
                "w-full grid grid-cols-[20px_1fr_48px_44px_40px] gap-1 items-center text-[10px] px-2 py-1.5 rounded transition-colors text-left",
                isActive
                  ? "bg-primary/10 text-primary font-medium ring-1 ring-primary/20"
                  : "hover:bg-muted/40 cursor-pointer"
              )}>
              {p.stopNumber ? (
                <span className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-bold shrink-0"
                  style={{ backgroundColor: sc?.bg, color: sc?.text }}>
                  {p.stopNumber}
                </span>
              ) : (
                <span className="text-muted-foreground text-[9px]">{i + 1}</span>
              )}
              <span className="truncate">{p.palletData.name}</span>
              <span className="text-muted-foreground tabular-nums font-mono text-[9px]">
                {p.x.toFixed(0)},{p.y.toFixed(0)}
              </span>
              <span className="text-muted-foreground tabular-nums">{w}lb</span>
              <span className="text-[8px] font-medium truncate" style={{ color: zone.text }}>
                {zone.shortLabel}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
