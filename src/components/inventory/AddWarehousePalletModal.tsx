import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AddWarehousePalletModalProps {
  open: boolean;
  onClose: () => void;
  sectionId: string;
  sectionName: string;
  onPalletAdded: () => void;
}

export const AddWarehousePalletModal = ({ 
  open, 
  onClose, 
  sectionId, 
  sectionName,
  onPalletAdded 
}: AddWarehousePalletModalProps) => {
  const [palletId, setPalletId] = useState("");
  const [useAutoId, setUseAutoId] = useState(true);
  const [palletType, setPalletType] = useState("Standard 48x40");
  const [maxCapacity, setMaxCapacity] = useState("24");
  const [currentWeight, setCurrentWeight] = useState("0");
  const [status, setStatus] = useState("available");
  const [condition, setCondition] = useState("good");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [nextAutoId, setNextAutoId] = useState("");

  // Generate next available pallet ID
  useEffect(() => {
    if (open && useAutoId) {
      generateNextPalletId();
    }
  }, [open, useAutoId]);

  const generateNextPalletId = async () => {
    try {
      const { data, error } = await supabase
        .from("pallets")
        .select("pallet_id")
        .eq("section_id", sectionId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Extract numeric IDs and find the highest
      const existingIds = data?.map(p => {
        const match = p.pallet_id.match(/\d+$/);
        return match ? parseInt(match[0]) : 0;
      }) || [];

      const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
      const newId = `P${maxId + 1}`;
      setNextAutoId(newId);
    } catch (error) {
      console.error("Error generating pallet ID:", error);
      setNextAutoId("P1");
    }
  };

  const maxCapacityNum = parseInt(maxCapacity, 10) || 0;
  const currentWeightNum = parseFloat(currentWeight) || 0;

  const validateForm = () => {
    const finalPalletId = useAutoId ? nextAutoId : palletId;
    
    if (!finalPalletId.trim()) {
      toast({ 
        title: "Pallet ID required", 
        description: "Please provide a pallet ID",
        variant: "destructive" 
      });
      return false;
    }

    if (maxCapacityNum <= 0) {
      toast({ 
        title: "Invalid capacity", 
        description: "Capacity must be greater than 0",
        variant: "destructive" 
      });
      return false;
    }

    if (currentWeightNum < 0) {
      toast({ 
        title: "Invalid weight", 
        description: "Weight cannot be negative",
        variant: "destructive" 
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    const finalPalletId = useAutoId ? nextAutoId : palletId;

    try {
      // Check for duplicate pallet ID
      const { data: existing } = await supabase
        .from("pallets")
        .select("id")
        .eq("section_id", sectionId)
        .eq("pallet_id", finalPalletId)
        .maybeSingle();

      if (existing) {
        toast({ 
          title: "Duplicate pallet ID", 
          description: `Pallet ${finalPalletId} already exists in this section`,
          variant: "destructive" 
        });
        setLoading(false);
        return;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Insert new pallet
      const { error: insertError } = await supabase
        .from("pallets")
        .insert({
          section_id: sectionId,
          pallet_id: finalPalletId,
          pallet_type: palletType,
          max_capacity: maxCapacityNum,
          current_weight: currentWeightNum,
          status,
          condition,
          notes: notes.trim() || null,
          created_by: user?.id
        });

      if (insertError) throw insertError;

      // Update section utilization
      const { data: sectionData } = await supabase
        .from("pallets")
        .select("id")
        .eq("section_id", sectionId);

      const palletCount = sectionData?.length || 0;

      const { data: section } = await supabase
        .from("warehouse_sections")
        .select("max_capacity")
        .eq("id", sectionId)
        .single();

      if (section) {
        const utilization = (palletCount / section.max_capacity) * 100;
        await supabase
          .from("warehouse_sections")
          .update({ current_capacity: palletCount })
          .eq("id", sectionId);
      }

      toast({ 
        title: "✅ Pallet added successfully", 
        description: `Pallet ${finalPalletId} has been added to ${sectionName}` 
      });

      // Reset form
      setPalletId("");
      setPalletType("Standard 48x40");
      setMaxCapacity("24");
      setCurrentWeight("0");
      setStatus("available");
      setCondition("good");
      setNotes("");
      setUseAutoId(true);

      onPalletAdded();
      onClose();
    } catch (error: any) {
      console.error("Error adding pallet:", error);
      toast({ 
        title: "Error adding pallet", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="bg-gradient-to-r from-[#0D1321] to-[#2F5FFF] text-white px-6 py-4 -mt-6 -mx-6 rounded-t-lg">
          <DialogTitle className="text-2xl flex items-center gap-2">
            <div className="bg-[#2F5FFF] p-2 rounded">
              <Package className="h-6 w-6" />
            </div>
            Add Pallet to {sectionName}
          </DialogTitle>
          <DialogDescription className="text-gray-200">
            Create a new pallet in this warehouse section
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {/* Pallet ID */}
          <div>
            <div className="flex items-center gap-4 mb-2">
              <input
                type="checkbox"
                id="autoId"
                checked={useAutoId}
                onChange={(e) => setUseAutoId(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-[#2F5FFF] focus:ring-[#2F5FFF]"
              />
              <Label htmlFor="autoId" className="cursor-pointer text-sm font-medium">
                Auto-generate Pallet ID
              </Label>
            </div>
            {!useAutoId && (
              <Input 
                value={palletId}
                onChange={(e) => setPalletId(e.target.value)}
                placeholder="Enter pallet ID (e.g., P1, PALLET-A)"
                className="mt-1"
              />
            )}
            {useAutoId && (
              <div className="text-sm text-muted-foreground bg-[#F6F8FB] p-3 rounded border border-[#E5E9F2]">
                Next available ID: <span className="font-mono font-bold text-[#0D1321]">{nextAutoId}</span>
              </div>
            )}
          </div>

          {/* Section (read-only) */}
          <div>
            <Label>Section</Label>
            <Input 
              value={sectionName}
              disabled
              className="mt-1 bg-gray-50"
            />
          </div>

          {/* Pallet Type */}
          <div>
            <Label>Pallet Type</Label>
            <Select value={palletType} onValueChange={setPalletType}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Standard 48x40">Standard 48×40</SelectItem>
                <SelectItem value="Standard 48x48">Standard 48×48</SelectItem>
                <SelectItem value="Euro 1200x800">Euro 1200×800</SelectItem>
                <SelectItem value="Half Pallet 48x20">Half Pallet 48×20</SelectItem>
                <SelectItem value="Custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Capacity & Weight */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Max Capacity (items)</Label>
              <Input 
                type="number"
                min="1"
                value={maxCapacity}
                onChange={(e) => setMaxCapacity(e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label>Current Weight (lbs)</Label>
              <Input 
                type="number"
                min="0"
                step="0.1"
                value={currentWeight}
                onChange={(e) => setCurrentWeight(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Status & Condition */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="in-use">In Use</SelectItem>
                  <SelectItem value="full">Full</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Condition</Label>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                  <SelectItem value="damaged">Damaged</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>Notes</Label>
            <Textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Special instructions, location details, or other notes..."
              rows={3}
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            className="bg-[#2F5FFF] hover:bg-[#1e4acc]"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Pallet"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
