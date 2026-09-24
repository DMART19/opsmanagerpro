import { useRef, useState, useCallback } from "react";
import { CustomTrailer } from "@/hooks/use-custom-trailers";
import { SavedPalletBuild } from "@/hooks/use-saved-pallet-builds";
import { LoadLibraryItem } from "@/hooks/use-load-library-assets";
import { PlacedPallet } from "@/types/trailer-builder";
import { TrailerLoadScore } from "@/lib/trailer-load-score";
import { TrailerCanvas } from "@/components/trailer-builder/TrailerCanvas";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Truck, Wand2, Package, Layers, Box, AlertTriangle, CheckCircle2,
  Plus, ArrowRight, Settings2, ChevronRight,
} from "lucide-react";
import {
  Popover, PopoverTrigger, PopoverContent,
} from "@/components/ui/popover";

interface Props {
  trailer: CustomTrailer;
  placedPallets: PlacedPallet[];
  score: TrailerLoadScore | null;
  savedPallets: SavedPalletBuild[];
  items: LoadLibraryItem[];
  containers: LoadLibraryItem[];
  loading: boolean;
  draggedPallet: SavedPalletBuild | null;
  selectedPalletId: string | null;
  onSelectPallet: (id: string | null) => void;
  onPlacePallet: (p: PlacedPallet) => void;
  onRemovePallet: (id: string) => void;
  onUpdatePallet: (id: string, updates: Partial<PlacedPallet>) => void;
  onDuplicatePallet: (id: string) => void;
  onTapPlacePallet: (p: SavedPalletBuild) => void;
  onTapPlaceAsset: (a: LoadLibraryItem) => void;
  onAutoLoad: () => void;
  onChangeVehicle: () => void;
}

type Tab = "pallets" | "items" | "containers";

/**
 * Mobile-only Build Load layout.
 *  1. Vehicle Summary
 *  2. Awaiting Loading  (above preview, per spec)
 *  3. Trailer Preview   (or compact empty card)
 *  4. Loaded Progress
 *
 * Desktop is untouched.
 */
export function MobileBuildLoad(props: Props) {
  const {
    trailer, placedPallets, score, savedPallets, items, containers, loading,
    draggedPallet, selectedPalletId, onSelectPallet,
    onPlacePallet, onRemovePallet, onUpdatePallet, onDuplicatePallet,
    onTapPlacePallet, onTapPlaceAsset, onAutoLoad, onChangeVehicle,
  } = props;

  const previewRef = useRef<HTMLDivElement>(null);
  const [pulse, setPulse] = useState(false);

  const focusPreview = useCallback(() => {
    previewRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setPulse(true);
    window.setTimeout(() => setPulse(false), 1200);
  }, []);

  const handleTapPallet = useCallback((p: SavedPalletBuild) => {
    onTapPlacePallet(p);
    focusPreview();
  }, [onTapPlacePallet, focusPreview]);

  const handleTapAsset = useCallback((a: LoadLibraryItem) => {
    onTapPlaceAsset(a);
    focusPreview();
  }, [onTapPlaceAsset, focusPreview]);

  const isEmpty = placedPallets.length === 0;
  const remaining = Math.max(0, savedPallets.length - placedPallets.length);

  return (
    <div className="lg:hidden flex flex-col gap-3 min-w-0">
      <VehicleSummaryCard
        trailer={trailer}
        score={score}
        loaded={placedPallets.length}
        onChange={onChangeVehicle}
      />

      <AwaitingLoadingSection
        savedPallets={savedPallets}
        items={items}
        containers={containers}
        loading={loading}
        loadedPalletIds={placedPallets.map(p => p.palletId)}
        onTapPallet={handleTapPallet}
        onTapAsset={handleTapAsset}
      />

      <div
        ref={previewRef}
        className={cn(
          "rounded-xl border border-border/60 bg-card/80 overflow-hidden transition-shadow",
          pulse && "ring-2 ring-primary/60 shadow-[0_0_24px_-6px_hsl(var(--primary)/0.5)]"
        )}
        style={{ touchAction: "pan-y pinch-zoom" }}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-muted/20">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Truck className="h-3.5 w-3.5" />
            Trailer Preview
          </div>
          <span className="text-[10px] tabular-nums text-muted-foreground">
            <span className="font-semibold text-foreground">{placedPallets.length}</span> placed
          </span>
        </div>

        {isEmpty ? (
          <EmptyTrailerCard onAutoLoad={onAutoLoad} hasPallets={savedPallets.length > 0} />
        ) : (
          <div className="h-[46vh] min-h-[280px] max-w-full overflow-hidden">
            <TrailerCanvas
              trailer={trailer}
              placedPallets={placedPallets}
              onPlacePallet={onPlacePallet}
              onRemovePallet={onRemovePallet}
              onUpdatePallet={onUpdatePallet}
              onDuplicatePallet={onDuplicatePallet}
              draggedPallet={draggedPallet}
              selectedPalletId={selectedPalletId}
              onSelectPallet={onSelectPallet}
            />
          </div>
        )}
      </div>

      {!isEmpty && (
        <LoadedProgressCard
          trailer={trailer}
          score={score}
          loaded={placedPallets.length}
          remaining={remaining}
        />
      )}
    </div>
  );
}

/* ───────────────────────── Vehicle Summary ───────────────────────── */

function VehicleSummaryCard({
  trailer, score, loaded, onChange,
}: {
  trailer: CustomTrailer;
  score: TrailerLoadScore | null;
  loaded: number;
  onChange: () => void;
}) {
  const weight = score?.totalWeight ?? 0;
  const maxWeight = trailer.max_weight || 1;
  const weightPct = Math.min(100, Math.round((weight / maxWeight) * 100));
  const util = score?.utilization ?? 0;
  const warnings = score?.warnings ?? 0;
  const critical = score?.criticalWarnings ?? 0;
  // Trailer type heuristic — show only if present on the record
  const trailerType = (trailer as any).type || (trailer as any).trailer_type || null;

  const warnTone =
    critical > 0
      ? "bg-destructive/10 text-destructive border-destructive/30"
      : warnings > 0
      ? "bg-amber-500/10 text-amber-700 border-amber-500/30"
      : "bg-emerald-500/10 text-emerald-700 border-emerald-500/30";
  const warnLabel = warnings === 0 ? "All clear" : `${warnings} warning${warnings === 1 ? "" : "s"}`;

  return (
    <div className="rounded-xl border border-border/60 bg-card/90 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-border/50">
        <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Truck className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold truncate leading-tight">{trailer.name}</div>
          <div className="text-[11px] text-muted-foreground tabular-nums truncate">
            {trailerType && <span className="capitalize">{trailerType} · </span>}
            {trailer.length}" × {trailer.width}" × {trailer.height}"
          </div>
        </div>
        <Button variant="ghost" size="sm" className="h-8 text-[11px] text-muted-foreground -mr-1" onClick={onChange}>
          Change
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2.5 px-3 py-3">
        <MetricBar
          label="Weight"
          value={`${weight.toLocaleString()} / ${maxWeight.toLocaleString()} lb`}
          pct={weightPct}
          tone={weightPct >= 100 ? "danger" : weightPct >= 90 ? "warn" : "primary"}
        />
        <MetricBar
          label="Capacity"
          value={`${util}%`}
          pct={util}
          tone={util >= 95 ? "danger" : util >= 80 ? "primary" : "muted"}
        />
        <div className="flex items-center justify-between rounded-lg bg-muted/40 px-2.5 py-1.5">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Loaded</span>
          <span className="text-sm font-semibold tabular-nums">{loaded}</span>
        </div>
        <div className={cn("flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium", warnTone)}>
          {warnings === 0 ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
          <span className="truncate">{warnLabel}</span>
        </div>
      </div>
    </div>
  );
}

function MetricBar({
  label, value, pct, tone,
}: { label: string; value: string; pct: number; tone: "primary" | "warn" | "danger" | "muted" }) {
  return (
    <div className="rounded-lg bg-muted/40 px-2.5 py-1.5 col-span-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className="text-[11px] tabular-nums font-medium">{value}</span>
      </div>
      <div className="h-1.5 mt-1 rounded-full bg-background overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            tone === "danger" && "bg-destructive",
            tone === "warn" && "bg-amber-500",
            tone === "primary" && "bg-primary",
            tone === "muted" && "bg-muted-foreground/50",
          )}
          style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
        />
      </div>
    </div>
  );
}

/* ───────────────────────── Awaiting Loading ───────────────────────── */

function AwaitingLoadingSection({
  savedPallets, items, containers, loading,
  loadedPalletIds, onTapPallet, onTapAsset,
}: {
  savedPallets: SavedPalletBuild[];
  items: LoadLibraryItem[];
  containers: LoadLibraryItem[];
  loading: boolean;
  loadedPalletIds: string[];
  onTapPallet: (p: SavedPalletBuild) => void;
  onTapAsset: (a: LoadLibraryItem) => void;
}) {
  const [tab, setTab] = useState<Tab>("pallets");
  const remaining = Math.max(0, savedPallets.length - loadedPalletIds.length);

  const tabs: { id: Tab; label: string; icon: React.ElementType; count: number }[] = [
    { id: "pallets", label: "Pallets", icon: Layers, count: savedPallets.length },
    { id: "items", label: "Items", icon: Package, count: items.length },
    { id: "containers", label: "Containers", icon: Box, count: containers.length },
  ];

  return (
    <div className="rounded-xl border border-border/60 bg-card/90 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-muted/10">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Package className="h-3.5 w-3.5" />
          Awaiting Loading
        </div>
        <span className="text-[10px] tabular-nums text-muted-foreground">
          <span className="font-semibold text-foreground">{remaining}</span> left
        </span>
      </div>

      <div className="px-2.5 pt-2">
        <div className="grid grid-cols-3 gap-0.5 bg-muted/40 rounded-lg p-0.5">
          {tabs.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center justify-center gap-1 py-1.5 rounded-md text-[11px] font-medium transition-all min-w-0",
                  active ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{t.label}</span>
                <span className="text-[10px] text-muted-foreground/60 shrink-0">({t.count})</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-h-[42vh] overflow-y-auto px-2.5 py-2.5 space-y-1.5">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tab === "pallets" ? (
          savedPallets.length === 0 ? (
            <EmptyLine icon={Layers} label="No pallets built yet" hint="Build pallets to load them here" />
          ) : (
            savedPallets.map(p => (
              <MobilePalletRow
                key={p.id}
                pallet={p}
                loaded={loadedPalletIds.includes(p.id)}
                onPlace={() => onTapPallet(p)}
              />
            ))
          )
        ) : tab === "items" ? (
          items.length === 0 ? (
            <EmptyLine icon={Package} label="No items" hint="Add items to your inventory" />
          ) : (
            items.map(it => (
              <MobileAssetRow key={it.id} asset={it} onPlace={() => onTapAsset(it)} />
            ))
          )
        ) : (
          containers.length === 0 ? (
            <EmptyLine icon={Box} label="No containers" hint="Add containers to your inventory" />
          ) : (
            containers.map(ct => (
              <MobileAssetRow key={ct.id} asset={ct} onPlace={() => onTapAsset(ct)} />
            ))
          )
        )}
      </div>
    </div>
  );
}

function MobilePalletRow({
  pallet, loaded, onPlace,
}: { pallet: SavedPalletBuild; loaded: boolean; onPlace: () => void }) {
  const weight = pallet.pallet_data.placedCases.reduce((s, c) => s + (c.weight || 0), 0);
  const caseCount = pallet.pallet_data.placedCases.length;
  const category = pallet.pallet_data.placedCases
    .map((c: any) => c.caseType)
    .find((t) => t && typeof t === "string");

  return (
    <div className={cn(
      "flex items-center gap-2.5 rounded-xl border border-border/50 bg-card px-2.5 py-2 shadow-sm",
      loaded && "opacity-60"
    )}>
      <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Layers className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-[13px] font-medium truncate flex-1">{pallet.name}</p>
          {loaded && (
            <span className="text-[8px] font-semibold uppercase tracking-wider px-1.5 py-px rounded bg-muted text-muted-foreground shrink-0">
              Loaded
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground">
          <span className="tabular-nums">{weight.toLocaleString()} lb</span>
          {category && (<><span className="text-muted-foreground/30">·</span><span className="capitalize truncate">{category}</span></>)}
          <span className="text-muted-foreground/30">·</span>
          <span className="tabular-nums">{caseCount} item{caseCount === 1 ? "" : "s"}</span>
        </div>
      </div>
      <Button
        size="sm"
        onClick={onPlace}
        disabled={loaded}
        className="h-9 px-3 text-xs font-semibold gap-1 shrink-0"
      >
        Place <ChevronRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function MobileAssetRow({
  asset, onPlace,
}: { asset: LoadLibraryItem; onPlace: () => void }) {
  const isContainer = asset.type === "container";
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-card px-2.5 py-2 shadow-sm">
      <div className={cn(
        "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
        isContainer ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
      )}>
        {isContainer ? <Box className="h-4 w-4" /> : <Package className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium truncate">{asset.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground">
          <span className="tabular-nums">{asset.width}"×{asset.length}"</span>
          {asset.weight > 0 && (<><span className="text-muted-foreground/30">·</span><span className="tabular-nums">{asset.weight.toLocaleString()} lb</span></>)}
        </div>
      </div>
      <Button size="sm" onClick={onPlace} className="h-9 px-3 text-xs font-semibold gap-1 shrink-0">
        Place <ChevronRight className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function EmptyLine({
  icon: Icon, label, hint,
}: { icon: React.ElementType; label: string; hint: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="h-9 w-9 rounded-xl bg-muted/40 flex items-center justify-center mb-2">
        <Icon className="h-4 w-4 text-muted-foreground/60" />
      </div>
      <p className="text-[12px] font-medium text-foreground/80">{label}</p>
      <p className="text-[11px] text-muted-foreground/70 mt-0.5">{hint}</p>
    </div>
  );
}

/* ───────────────────────── Empty Trailer ───────────────────────── */

function EmptyTrailerCard({
  onAutoLoad, hasPallets,
}: { onAutoLoad: () => void; hasPallets: boolean }) {
  return (
    <div className="px-5 py-8 flex flex-col items-center text-center gap-3">
      <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
        <Truck className="h-6 w-6" />
      </div>
      <div>
        <h3 className="text-base font-semibold">Trailer Empty</h3>
        <p className="text-[13px] text-muted-foreground mt-1 max-w-[260px] mx-auto leading-relaxed">
          Select a pallet below to begin loading.
        </p>
      </div>
      <Button
        onClick={onAutoLoad}
        disabled={!hasPallets}
        className="h-10 mt-1 px-4 text-sm font-semibold gap-1.5"
      >
        <Wand2 className="h-4 w-4" />
        Auto Load Vehicle
      </Button>
    </div>
  );
}

/* ───────────────────────── Loaded Progress ───────────────────────── */

function LoadedProgressCard({
  trailer, score, loaded, remaining,
}: {
  trailer: CustomTrailer;
  score: TrailerLoadScore | null;
  loaded: number;
  remaining: number;
}) {
  const weight = score?.totalWeight ?? 0;
  const maxWeight = trailer.max_weight || 1;
  const weightPct = Math.min(100, Math.round((weight / maxWeight) * 100));
  const util = score?.utilization ?? 0;
  const warnings = score?.warnings ?? 0;

  return (
    <div className="rounded-xl border border-border/60 bg-card/90 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-muted/10">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Loaded
        </div>
        <span className="text-[10px] tabular-nums text-muted-foreground">
          <span className="font-semibold text-foreground">{loaded}</span> · <span className="font-semibold text-foreground">{remaining}</span> remaining
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 px-3 py-3">
        <Stat label="Pallets" value={String(loaded)} />
        <Stat label="Remaining" value={String(remaining)} />
        <Stat label="Weight" value={`${weight.toLocaleString()} lb`} />
        <Stat label="Utilization" value={`${util}%`} />
        <div className={cn(
          "col-span-2 flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium",
          warnings === 0
            ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
            : "bg-amber-500/10 text-amber-700 border-amber-500/30"
        )}>
          {warnings === 0 ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
          {warnings === 0 ? "No warnings" : `${warnings} warning${warnings === 1 ? "" : "s"}`}
        </div>
      </div>

      <div className="px-3 pb-3">
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full transition-all rounded-full",
              weightPct >= 100 ? "bg-destructive" : weightPct >= 90 ? "bg-amber-500" : "bg-primary"
            )}
            style={{ width: `${weightPct}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-muted-foreground tabular-nums">
          <span>0</span>
          <span>{weightPct}% of {maxWeight.toLocaleString()} lb</span>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold tabular-nums leading-tight">{value}</div>
    </div>
  );
}
