import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Box } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AddCaseModalProps {
  open: boolean;
  onClose: () => void;
  onAddCase: (caseData: any) => void;
  pallets: any[];
}

export const AddCaseModal = ({ open, onClose, onAddCase, pallets }: AddCaseModalProps) => {
  const [caseId, setCaseId] = useState("");
  const [parentPalletId, setParentPalletId] = useState("");
  const [description, setDescription] = useState("");
  const [weight, setWeight] = useState("0");
  const [dimensions, setDimensions] = useState({ length: "24", width: "18", height: "12" });
  const [notes, setNotes] = useState("");
  const [useAutoId, setUseAutoId] = useState(true);

  const generateCaseId = () => {
    const allCases = pallets.flatMap(p => p.cases || []);
    const existingIds = allCases.map(c => c.id);
    let counter = 1;
    while (existingIds.includes(`C${counter}`)) {
      counter++;
    }
    return `C${counter}`;
  };

  const handleConfirm = () => {
    if (!parentPalletId) {
      toast({ title: "Please select a parent pallet", variant: "destructive" });
      return;
    }

    const finalCaseId = useAutoId ? generateCaseId() : caseId;
    
    if (!finalCaseId) {
      toast({ title: "Please provide a case ID", variant: "destructive" });
      return;
    }

    const parsedWeight = parseFloat(weight) || 0;
    const parsedDims = {
      length: parseFloat(dimensions.length) || 0,
      width: parseFloat(dimensions.width) || 0,
      height: parseFloat(dimensions.height) || 0,
    };
    const newCase = {
      id: finalCaseId,
      parentPalletId,
      description,
      weight: parsedWeight,
      dimensions: parsedDims,
      notes,
      items: [],
      totalWeight: parsedWeight,
      itemCount: 0,
    };

    onAddCase(newCase);
    toast({ title: "Case created", description: `Case ${finalCaseId} added to ${parentPalletId}` });
    
    // Reset form
    setCaseId("");
    setParentPalletId("");
    setDescription("");
    setWeight("0");
    setDimensions({ length: "24", width: "18", height: "12" });
    setNotes("");
    setUseAutoId(true);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="bg-gradient-to-r from-[#2F5FFF] to-[#0D1321] text-white px-6 py-4 -mt-6 -mx-6 rounded-t-lg">
          <DialogTitle className="text-2xl flex items-center gap-2">
            <div className="bg-white/20 p-2 rounded">
              <Box className="h-6 w-6" />
            </div>
            Add Case
          </DialogTitle>
          <DialogDescription className="text-gray-200">
            Create a new case inside a pallet
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {pallets.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <p className="text-yellow-800 font-medium">No pallets available</p>
              <p className="text-sm text-yellow-700 mt-1">Please create a pallet first before adding cases</p>
            </div>
          ) : (
            <>
              <div>
                <Label>
                  Parent Pallet <span className="text-red-500">*</span>
                </Label>
                <Select value={parentPalletId} onValueChange={setParentPalletId}>
                  <SelectTrigger className="mt-1 bg-white">
                    <SelectValue placeholder="Select pallet" />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-50">
                    {pallets.map((pallet) => (
                      <SelectItem key={pallet.id} value={pallet.id}>
                        {pallet.id} • {pallet.cases?.length || 0} cases • {pallet.itemCount || 0} items
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="flex items-center gap-4 mb-2">
                  <input
                    type="checkbox"
                    id="autoIdCase"
                    checked={useAutoId}
                    onChange={(e) => setUseAutoId(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="autoIdCase" className="cursor-pointer">
                    Auto-generate Case ID
                  </Label>
                </div>
                {!useAutoId && (
                  <Input 
                    value={caseId}
                    onChange={(e) => setCaseId(e.target.value)}
                    placeholder="Enter case ID (e.g., C1, CASE-A)"
                  />
                )}
                {useAutoId && (
                  <div className="text-sm text-muted-foreground bg-[#F6F8FB] p-3 rounded">
                    Will auto-generate: <span className="font-mono font-bold">{generateCaseId()}</span>
                  </div>
                )}
              </div>

              <div>
                <Label>Description</Label>
                <Input 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Medical Supplies, Power Tools"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Empty Case Weight (lbs)</Label>
                <Input 
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="0"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Weight of the empty case/container
                </p>
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
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Special handling or packing instructions..."
                  rows={2}
                  className="mt-1"
                />
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={pallets.length === 0}
            className="bg-[#2F5FFF]"
          >
            Create Case
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
