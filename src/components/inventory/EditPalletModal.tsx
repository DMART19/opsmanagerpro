import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

interface EditPalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pallet: {
    id: string;
    pallet_id: string;
    pallet_type: string;
    section_id: string;
    status: string;
    condition: string;
    max_capacity: number;
    notes: string | null;
  };
  onSuccess: () => void;
}

export const EditPalletModal = ({ open, onOpenChange, pallet, onSuccess }: EditPalletModalProps) => {
  const [palletId, setPalletId] = useState(pallet.pallet_id);
  const [sectionId, setSectionId] = useState(pallet.section_id);
  const [status, setStatus] = useState(pallet.status);
  const [condition, setCondition] = useState(pallet.condition);
  const [maxCapacity, setMaxCapacity] = useState(pallet.max_capacity.toString());
  const [notes, setNotes] = useState(pallet.notes || "");
  const [loading, setLoading] = useState(false);

  const { data: sections = [] } = useQuery({
    queryKey: ["warehouse-sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouse_sections")
        .select("id, section_code, section_name")
        .order("section_code");
      
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    setPalletId(pallet.pallet_id);
    setSectionId(pallet.section_id);
    setStatus(pallet.status);
    setCondition(pallet.condition);
    setMaxCapacity(pallet.max_capacity.toString());
    setNotes(pallet.notes || "");
  }, [pallet]);

  const handleUpdate = async () => {
    if (!palletId || !sectionId) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("pallets")
      .update({
        pallet_id: palletId,
        section_id: sectionId,
        status,
        condition,
        max_capacity: parseInt(maxCapacity),
        notes: notes || null,
      })
      .eq("id", pallet.id);

    setLoading(false);

    if (error) {
      toast.error("Failed to update pallet");
      return;
    }

    toast.success("Pallet updated successfully");
    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Pallet</DialogTitle>
          <DialogDescription>
            Update pallet details and location
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="palletId">Pallet ID *</Label>
            <Input
              id="palletId"
              value={palletId}
              onChange={(e) => setPalletId(e.target.value)}
            />
          </div>

          <div>
            <Label>Pallet Type</Label>
            <Input value={pallet.pallet_type} disabled className="bg-muted" />
          </div>

          <div>
            <Label htmlFor="section">Section / Location *</Label>
            <Select value={sectionId} onValueChange={setSectionId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sections.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    {section.section_code} - {section.section_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="in use">In Use</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="in shipment">In Shipment</SelectItem>
                  <SelectItem value="empty">Empty</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="condition">Condition</Label>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="maxCapacity">Max Capacity (cases)</Label>
            <Input
              id="maxCapacity"
              type="number"
              value={maxCapacity}
              onChange={(e) => setMaxCapacity(e.target.value)}
            />
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
            <Button onClick={handleUpdate} disabled={loading}>
              {loading ? "Updating..." : "Update Pallet"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
