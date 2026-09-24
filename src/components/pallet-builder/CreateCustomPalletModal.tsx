import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CreateCustomPalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (pallet: {
    name: string;
    width: number;
    length: number;
    height?: number;
    max_weight: number;
    pallet_type: string;
  }) => void;
}

export const CreateCustomPalletModal = ({
  open,
  onOpenChange,
  onSave,
}: CreateCustomPalletModalProps) => {
  const [formData, setFormData] = useState({
    name: "",
    width: "",
    length: "",
    height: "",
    max_weight: "",
    pallet_type: "Wood",
  });

  const handleSave = () => {
    if (!formData.name || !formData.width || !formData.length || !formData.max_weight) {
      return;
    }

    onSave({
      name: formData.name,
      width: parseFloat(formData.width),
      length: parseFloat(formData.length),
      height: formData.height ? parseFloat(formData.height) : undefined,
      max_weight: parseFloat(formData.max_weight),
      pallet_type: formData.pallet_type,
    });

    // Reset form
    setFormData({
      name: "",
      width: "",
      length: "",
      height: "",
      max_weight: "",
      pallet_type: "Wood",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Custom Pallet Size</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Pallet Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Large Warehouse Pallet"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="width">Width (inches) *</Label>
              <Input
                id="width"
                type="number"
                value={formData.width}
                onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                placeholder="48"
                min="1"
                step="0.1"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="length">Length (inches) *</Label>
              <Input
                id="length"
                type="number"
                value={formData.length}
                onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                placeholder="40"
                min="1"
                step="0.1"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="height">Height (inches)</Label>
            <Input
              id="height"
              type="number"
              value={formData.height}
              onChange={(e) => setFormData({ ...formData, height: e.target.value })}
              placeholder="6 (optional)"
              min="1"
              step="0.1"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="max_weight">Max Weight Capacity (lb) *</Label>
            <Input
              id="max_weight"
              type="number"
              value={formData.max_weight}
              onChange={(e) => setFormData({ ...formData, max_weight: e.target.value })}
              placeholder="2500"
              min="1"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pallet_type">Pallet Material</Label>
            <Select
              value={formData.pallet_type}
              onValueChange={(value) => setFormData({ ...formData, pallet_type: value })}
            >
              <SelectTrigger id="pallet_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Wood">Wood</SelectItem>
                <SelectItem value="Plastic">Plastic</SelectItem>
                <SelectItem value="Metal">Metal</SelectItem>
                <SelectItem value="Composite">Composite</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Pallet
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
