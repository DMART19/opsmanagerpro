import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, RotateCw, Copy, Trash2 } from "lucide-react";
import { PlacedPallet, getStopColor } from "@/types/trailer-builder";
import {
  CARGO_KINDS, CargoProperties, cargoOf, footprintOf, heightOf, weightOf,
  formatFeetInches, stackLevelOf,
} from "@/lib/trailer-cargo";

interface Props {
  pallet: PlacedPallet | null;
  all: PlacedPallet[];
  onUpdate: (id: string, updates: Partial<PlacedPallet>) => void;
  onRotate: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
}

export const CargoInspectorPanel = ({ pallet, all, onUpdate, onRotate, onDuplicate, onRemove }: Props) => {
  if (!pallet) return null;
  const c = cargoOf(pallet);
  const fp = footprintOf(pallet);
  const stop = pallet.stopNumber ? getStopColor(pallet.stopNumber) : null;

  const setCargo = (patch: Partial<CargoProperties>) =>
    onUpdate(pallet.id, { cargo: { ...c, ...patch } });

  const toggles: { key: keyof CargoProperties; label: string }[] = [
    { key: "stackable", label: "Stackable" },
    { key: "fragile", label: "Fragile" },
    { key: "hazmat", label: "Hazmat" },
    { key: "keepUpright", label: "Keep Upright" },
    { key: "tempControlled", label: "Temp Controlled" },
    { key: "cannotRotate", label: "Cannot Rotate" },
    { key: "requiresBlocking", label: "Requires Blocking" },
    { key: "requiresStraps", label: "Requires Straps" },
  ];

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          <span className="truncate">{pallet.palletData?.name || "Cargo"}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <Stat label="Footprint" value={`${fp.w}" × ${fp.l}"`} />
          <Stat label="Height" value={formatFeetInches(heightOf(pallet))} />
          <Stat label="Weight" value={`${weightOf(pallet).toLocaleString()} lbs`} />
          <Stat label="Stack Level" value={`L${stackLevelOf(pallet, all)}`} />
          <Stat label="Orientation" value={`${pallet.rotation}°`} />
          <Stat label="Position" value={`${pallet.x}", ${pallet.y}"`} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[11px]">Cargo Type</Label>
            <Select value={c.kind} onValueChange={(v) => setCargo({ kind: v as CargoProperties["kind"] })}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CARGO_KINDS.map(k => (
                  <SelectItem key={k.value} value={k.value} className="text-xs">{k.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Delivery Stop</Label>
            <Select
              value={pallet.stopNumber ? String(pallet.stopNumber) : "none"}
              onValueChange={(v) => onUpdate(pallet.id, { stopNumber: v === "none" ? undefined : Number(v) })}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-xs">None</SelectItem>
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <SelectItem key={n} value={String(n)} className="text-xs">Stop {n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Max Stack Height</Label>
            <Input
              type="number" min={1} className="h-9 text-xs"
              value={c.maxStackHeight}
              onChange={(e) => setCargo({ maxStackHeight: Math.max(1, Number(e.target.value) || 1) })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Max Weight Above</Label>
            <Input
              type="number" min={0} className="h-9 text-xs"
              value={c.maxWeightAbove}
              onChange={(e) => setCargo({ maxWeightAbove: Math.max(0, Number(e.target.value) || 0) })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          {toggles.map(t => (
            <div key={t.key} className="flex items-center justify-between gap-2">
              <Label className="text-[11px] text-muted-foreground">{t.label}</Label>
              <Switch
                checked={Boolean(c[t.key])}
                onCheckedChange={(v) => setCargo({ [t.key]: v } as Partial<CargoProperties>)}
              />
            </div>
          ))}
        </div>

        <div className="space-y-1">
          <Label className="text-[11px]">Notes</Label>
          <Textarea
            className="text-xs min-h-[60px]"
            value={c.notes || ""}
            onChange={(e) => setCargo({ notes: e.target.value })}
            placeholder="Handling notes…"
          />
        </div>

        {stop && (
          <div className="flex items-center gap-2 text-[11px]">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: stop.border }} />
            <span className="text-muted-foreground">{stop.label}</span>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <Button
            size="sm" variant="outline" className="h-8 text-xs flex-1"
            disabled={c.cannotRotate || c.keepUpright}
            onClick={() => onRotate(pallet.id)}
          >
            <RotateCw className="h-3.5 w-3.5 mr-1" /> Rotate
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs flex-1" onClick={() => onDuplicate(pallet.id)}>
            <Copy className="h-3.5 w-3.5 mr-1" /> Duplicate
          </Button>
          <Button
            size="sm" variant="ghost"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(pallet.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border border-border/60 bg-muted/20 px-2 py-1.5">
    <p className="text-muted-foreground">{label}</p>
    <p className="font-semibold tabular-nums truncate">{value}</p>
  </div>
);