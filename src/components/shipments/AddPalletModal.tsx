import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Package } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AddPalletModalProps {
  open: boolean;
  onClose: () => void;
  onAddPallet: (pallet: any) => void;
  existingPallets: any[];
}

export const AddPalletModal = ({ open, onClose, onAddPallet, existingPallets }: AddPalletModalProps) => {
  const [palletId, setPalletId] = useState("");
  const [section, setSection] = useState("");
  const [rowBay, setRowBay] = useState("");
  const [dimensions, setDimensions] = useState({ length: "48", width: "40", height: "6" });
  const [notes, setNotes] = useState("");
  const [useAutoId, setUseAutoId] = useState(true);

  const generatePalletId = () => {
    const existingIds = existingPallets.map(p => p.id);
    let counter = 1;
    while (existingIds.includes(`P${counter}`)) {
      counter++;
    }
    return `P${counter}`;
  };

  const handleConfirm = () => {
    const finalPalletId = useAutoId ? generatePalletId() : palletId;
    
    if (!finalPalletId) {
      toast({ title: "Please provide a pallet ID", variant: "destructive" });
      return;
    }

    if (existingPallets.some(p => p.id === finalPalletId)) {
      toast({ title: "Pallet ID already exists", variant: "destructive" });
      return;
    }

    const newPallet = {
      id: finalPalletId,
      section,
      rowBay,
      dimensions: {
        length: parseFloat(dimensions.length) || 0,
        width: parseFloat(dimensions.width) || 0,
        height: parseFloat(dimensions.height) || 0,
      },
      notes,
      cases: [],
      totalWeight: 0,
      totalVolume: 0,
      itemCount: 0,
    };

    onAddPallet(newPallet);
    toast({ title: "Pallet created", description: `Pallet ${finalPalletId} added successfully` });
    
    // Reset form
    setPalletId("");
    setSection("");
    setRowBay("");
    setDimensions({ length: "48", width: "40", height: "6" });
    setNotes("");
    setUseAutoId(true);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="bg-gradient-to-r from-[#0D1321] to-[#2F5FFF] text-white px-6 py-4 -mt-6 -mx-6 rounded-t-lg">
          <DialogTitle className="text-2xl flex items-center gap-2">
            <div className="bg-[#2F5FFF] p-2 rounded">
              <Package className="h-6 w-6" />
            </div>
            Add Pallet
          </DialogTitle>
          <DialogDescription className="text-gray-200">
            Create a new pallet to organize cases and items
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <input
                type="checkbox"
                id="autoId"
                checked={useAutoId}
                onChange={(e) => setUseAutoId(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="autoId" className="cursor-pointer">
                Auto-generate Pallet ID
              </Label>
            </div>
            {!useAutoId && (
              <Input 
                value={palletId}
                onChange={(e) => setPalletId(e.target.value)}
                placeholder="Enter pallet ID (e.g., P1, PALLET-A)"
              />
            )}
            {useAutoId && (
              <div className="text-sm text-muted-foreground bg-[#F6F8FB] p-3 rounded">
                Will auto-generate: <span className="font-mono font-bold">{generatePalletId()}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Section</Label>
              <Input 
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="e.g., A, B, Storage-1"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label>Row / Bay</Label>
              <Input 
                value={rowBay}
                onChange={(e) => setRowBay(e.target.value)}
                placeholder="e.g., R3-B2"
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label>Dimensions (inches)</Label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              <Input 
                type="number"
                value={dimensions.length}
                onChange={(e) => setDimensions({...dimensions, length: e.target.value})}
                placeholder="Length"
              />
              <Input 
                type="number"
                value={dimensions.width}
                onChange={(e) => setDimensions({...dimensions, width: e.target.value})}
                placeholder="Width"
              />
              <Input 
                type="number"
                value={dimensions.height}
                onChange={(e) => setDimensions({...dimensions, height: e.target.value})}
                placeholder="Height"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Standard pallet: 48×40×6 inches
            </p>
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Special instructions or location details..."
              rows={2}
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} className="bg-[#2F5FFF]">
            Create Pallet
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
