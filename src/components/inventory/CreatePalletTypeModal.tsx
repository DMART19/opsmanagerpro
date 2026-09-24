import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreatePalletTypeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreatePalletTypeModal = ({ open, onOpenChange, onSuccess }: CreatePalletTypeModalProps) => {
  const [name, setName] = useState("");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [maxWeight, setMaxWeight] = useState("");
  const [palletType, setPalletType] = useState("Wood");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name || !length || !width || !maxWeight) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be logged in to create pallet types");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("custom_pallets").insert({
      name,
      length: parseFloat(length),
      width: parseFloat(width),
      height: height ? parseFloat(height) : null,
      max_weight: parseFloat(maxWeight),
      pallet_type: palletType,
      created_by: user.id,
    });

    setLoading(false);

    if (error) {
      toast.error("Failed to create pallet type");
      return;
    }

    toast.success("Pallet type created successfully");
    onSuccess();
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setName("");
    setLength("");
    setWidth("");
    setHeight("");
    setMaxWeight("");
    setPalletType("Wood");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Pallet Type</DialogTitle>
          <DialogDescription>
            Define a new reusable pallet specification
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Pallet Type Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Standard 48×40"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="length">Length (in) *</Label>
              <Input
                id="length"
                type="number"
                value={length}
                onChange={(e) => setLength(e.target.value)}
                placeholder="48"
              />
            </div>
            <div>
              <Label htmlFor="width">Width (in) *</Label>
              <Input
                id="width"
                type="number"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                placeholder="40"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="height">Height (in) - Optional</Label>
            <Input
              id="height"
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="6"
            />
          </div>

          <div>
            <Label htmlFor="maxWeight">Max Weight Capacity (lbs) *</Label>
            <Input
              id="maxWeight"
              type="number"
              value={maxWeight}
              onChange={(e) => setMaxWeight(e.target.value)}
              placeholder="2500"
            />
          </div>

          <div>
            <Label htmlFor="material">Material</Label>
            <Select value={palletType} onValueChange={setPalletType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Wood">Wood</SelectItem>
                <SelectItem value="Plastic">Plastic</SelectItem>
                <SelectItem value="Metal">Metal</SelectItem>
                <SelectItem value="Composite">Composite</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={loading}>
              {loading ? "Creating..." : "Create Pallet Type"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
