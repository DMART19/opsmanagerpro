import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateTrailerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (trailer: {
    name: string;
    length: number;
    width: number;
    height: number;
    max_weight: number;
    notes: string | null;
  }) => void;
}

const VEHICLE_TYPES = [
  "Dry Van Trailer",
  "Reefer Trailer",
  "Box Truck",
  "Flatbed",
  "Pickup Truck",
  "Cargo Van",
  "Shipping Container",
  "Custom",
] as const;

type VehicleType = (typeof VEHICLE_TYPES)[number];

const PRESETS: Array<{
  id: string;
  label: string;
  type: VehicleType;
  length: number;
  width: number;
  height: number;
  max_weight: number;
}> = [
  { id: "dryvan53", label: "53' Dry Van", type: "Dry Van Trailer", length: 636, width: 102, height: 110, max_weight: 45000 },
  { id: "box26", label: "26' Box Truck", type: "Box Truck", length: 312, width: 96, height: 96, max_weight: 26000 },
  { id: "cont20", label: "20' Container", type: "Shipping Container", length: 232, width: 92, height: 94, max_weight: 47900 },
  { id: "pickup", label: "Pickup Bed", type: "Pickup Truck", length: 80, width: 65, height: 0, max_weight: 2000 },
  { id: "flatbed", label: "Flatbed", type: "Flatbed", length: 636, width: 102, height: 0, max_weight: 48000 },
  { id: "custom", label: "Custom", type: "Custom", length: 0, width: 0, height: 0, max_weight: 0 },
];

export const CreateTrailerModal = ({ open, onOpenChange, onCreate }: CreateTrailerModalProps) => {
  const [name, setName] = useState("");
  const [type, setType] = useState<VehicleType | "">("");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [maxWeight, setMaxWeight] = useState("");
  const [notes, setNotes] = useState("");

  const isFlatbed = type === "Flatbed";
  const heightRequired = !isFlatbed;

  const applyPreset = (p: typeof PRESETS[number]) => {
    setType(p.type);
    if (p.id !== "custom") {
      setLength(p.length ? String(p.length) : "");
      setWidth(p.width ? String(p.width) : "");
      setHeight(p.height ? String(p.height) : "");
      setMaxWeight(p.max_weight ? String(p.max_weight) : "");
    }
  };

  const handleCreate = () => {
    if (!name.trim() || !type || !length || !width || !maxWeight) {
      return;
    }
    if (heightRequired && !height) {
      return;
    }
    const typedNotes = type && type !== "Custom"
      ? `[${type}]${notes.trim() ? ` ${notes.trim()}` : ""}`
      : notes.trim();
    onCreate({
      name: name.trim(),
      length: parseFloat(length),
      width: parseFloat(width),
      height: height ? parseFloat(height) : 0,
      max_weight: parseFloat(maxWeight),
      notes: typedNotes || null,
    });
    setName("");
    setType("");
    setLength("");
    setWidth("");
    setHeight("");
    setMaxWeight("");
    setNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Load Vehicle</DialogTitle>
          <DialogDescription>
            Define the vehicle or container used for this load.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label className="text-xs text-muted-foreground">Quick presets</Label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <Button
                  key={p.id}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => applyPreset(p)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="type">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as VehicleType)}>
              <SelectTrigger id="type">
                <SelectValue placeholder="Select vehicle or container type" />
              </SelectTrigger>
              <SelectContent>
                {VEHICLE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="name">Vehicle / Container Name</Label>
            <Input
              id="name"
              placeholder="e.g., 53ft Dry Van, 26ft Box Truck, F-250 Pickup, 20ft Container"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="length">Interior Length (in)</Label>
              <Input
                id="length"
                type="number"
                placeholder="636"
                value={length}
                onChange={(e) => setLength(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="width">Interior Width (in)</Label>
              <Input
                id="width"
                type="number"
                placeholder="102"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="height">
                Interior Height (in){isFlatbed && <span className="text-muted-foreground"> (optional)</span>}
              </Label>
              <Input
                id="height"
                type="number"
                placeholder="110"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="maxWeight">Max Load Weight (lbs)</Label>
            <Input
              id="maxWeight"
              type="number"
              placeholder="45000"
              value={maxWeight}
              onChange={(e) => setMaxWeight(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Load Notes</Label>
            <Textarea
              id="notes"
              placeholder="e.g., reefer, liftgate, open bed, temperature controlled, side loading"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || !type || !length || !width || !maxWeight || (heightRequired && !height)}
          >
            Create Vehicle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
