import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Package, Search, AlertCircle, Plus, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { shipmentItemSchema } from "@/lib/validation";

interface AddItemModalProps {
  open: boolean;
  onClose: () => void;
  onAddItem: (item: any) => void;
  existingItems: any[];
  shipmentNumber: string;
  pallets: any[];
}

export const AddItemModal = ({ open, onClose, onAddItem, existingItems, shipmentNumber, pallets }: AddItemModalProps) => {
  const [equipment, setEquipment] = useState<any[]>([]);
  const [filteredEquipment, setFilteredEquipment] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEquipment, setSelectedEquipment] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  
  // Form fields
  const [palletId, setPalletId] = useState("");
  const [caseId, setCaseId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [condition, setCondition] = useState("Good");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  
  // Extracted from equipment
  const [unitWeight, setUnitWeight] = useState(25);
  const [dimensions, setDimensions] = useState({ length: 24, width: 18, height: 12 });

  useEffect(() => {
    if (open) {
      loadEquipment();
      resetForm();
    }
  }, [open]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      const filtered = equipment.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.asset_tag?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.serial_number?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredEquipment(filtered);
      setShowResults(true);
    } else {
      setShowResults(false);
      setFilteredEquipment([]);
    }
  }, [searchQuery, equipment]);

  const loadEquipment = async () => {
    const { data, error } = await supabase
      .from("equipment")
      .select("*")
      .eq("status", "available")
      .order("name");
    
    if (error) {
      toast({ title: "Error loading equipment", variant: "destructive" });
    } else {
      setEquipment(data || []);
    }
  };

  const resetForm = () => {
    setSearchQuery("");
    setSelectedEquipment(null);
    setPalletId("");
    setCaseId("");
    setQuantity(1);
    setCondition("Good");
    setNotes("");
    setTags([]);
    setUnitWeight(25);
    setDimensions({ length: 24, width: 18, height: 12 });
    setShowResults(false);
  };

  const handleSelectEquipment = (item: any) => {
    setSelectedEquipment(item);
    setSearchQuery(item.name);
    setShowResults(false);
    
    // Auto-populate from equipment data
    setCondition(item.condition || "Good");
    // In real scenario, these would come from equipment table
    setUnitWeight(25); // Default weight in lbs
    setDimensions({ length: 24, width: 18, height: 12 }); // Default dimensions in inches
  };

  const handleAddTag = (tag: string) => {
    if (!tags.includes(tag)) {
      setTags([...tags, tag]);
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const getExistingCases = () => {
    if (!palletId || palletId === "new-pallet") return [];
    const pallet = pallets.find(p => p.id === palletId);
    return pallet?.cases || [];
  };

  const calculateVolume = () => {
    return (dimensions.length * dimensions.width * dimensions.height) / 1728; // Convert to cubic feet
  };

  const calculateTotalWeight = () => {
    return quantity * unitWeight;
  };

  const getAvailableStock = () => {
    // In real scenario, this would check actual inventory
    return 10;
  };

  const validateQuantity = () => {
    const available = getAvailableStock();
    return quantity <= available;
  };

  const handleConfirm = () => {
    if (!selectedEquipment) {
      toast({ title: "Please select equipment", variant: "destructive" });
      return;
    }

    const newItem = {
      pallet_id: palletId,
      case_id: caseId,
      equipment_id: selectedEquipment.id,
      item_name: selectedEquipment.name,
      quantity: quantity,
      unit_weight: unitWeight,
      total_weight: calculateTotalWeight(),
      dimensions_length: dimensions.length,
      dimensions_width: dimensions.width,
      dimensions_height: dimensions.height,
      volume: calculateVolume(),
      condition: condition,
      notes: tags.length > 0 ? tags.map(t => `#${t}`).join(" ") + " " + notes : notes,
    };

    try {
      shipmentItemSchema.parse(newItem);
      
      if (!validateQuantity()) {
        toast({ title: "Quantity exceeds available stock", variant: "destructive" });
        return;
      }

      onAddItem(newItem);
      toast({ 
        title: "Item added successfully!", 
        description: `${selectedEquipment.name} added to ${shipmentNumber}` 
      });
      onClose();
    } catch (error: any) {
      toast({ 
        title: "Validation error", 
        description: error.errors?.[0]?.message || "Please check all fields",
        variant: "destructive" 
      });
    }
  };

  const getConditionColor = (cond: string) => {
    switch (cond?.toLowerCase()) {
      case "excellent": return "bg-green-500";
      case "good": return "bg-blue-500";
      case "fair": return "bg-yellow-500";
      case "poor": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="bg-gradient-to-r from-[#0D1321] to-[#2F5FFF] text-white px-6 py-4">
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Package className="h-6 w-6" />
            Add Item from Inventory
          </DialogTitle>
          <DialogDescription className="text-gray-200">
            Search and select equipment to include in this shipment
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 px-6">
          <div className="space-y-6 py-6">
            {/* Search Section */}
            <Card className="p-4 border-l-4 border-l-[#2F5FFF] bg-[#F6F8FB]">
              <Label className="text-sm font-semibold text-[#0D1321] mb-2 block">
                Search Equipment
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, serial, or asset tag..."
                  className="pl-10 bg-white"
                  onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
                />
                  
                  {/* Dropdown Results */}
                  {showResults && filteredEquipment.length > 0 && (
                    <Card className="absolute top-full mt-1 w-full z-50 max-h-64 overflow-y-auto bg-white shadow-xl border-2">
                      {filteredEquipment.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => handleSelectEquipment(item)}
                          className="p-3 hover:bg-[#F6F8FB] cursor-pointer border-b last:border-b-0 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-semibold text-[#0D1321]">{item.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {item.asset_tag} • {item.serial_number}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Section: {item.location_in_warehouse || "Unassigned"}
                              </p>
                            </div>
                            <Badge className={getConditionColor(item.condition)}>
                              {item.condition || "Good"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </Card>
                  )}
              </div>
            </Card>

            {/* Selected Equipment Display */}
            {selectedEquipment && (
              <Card className="p-4 bg-gradient-to-br from-[#2F5FFF]/10 to-white border-2 border-[#2F5FFF]">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-xl text-[#0D1321]">{selectedEquipment.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Asset Tag: {selectedEquipment.asset_tag} • Serial: {selectedEquipment.serial_number}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Category: {selectedEquipment.category} • Location: {selectedEquipment.location_in_warehouse || "Unassigned"}
                    </p>
                  </div>
                  <Badge className={getConditionColor(selectedEquipment.condition)}>
                    {selectedEquipment.condition || "Good"}
                  </Badge>
                </div>
              </Card>
            )}

            {/* Equipment Details Section */}
            {selectedEquipment && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Form Fields */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-semibold">
                      Pallet <span className="text-red-500">*</span>
                    </Label>
                    {pallets.length === 0 ? (
                      <div className="mt-1 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                        No pallets available. Please create a pallet first.
                      </div>
                    ) : (
                      <Select value={palletId} onValueChange={(val) => { setPalletId(val); setCaseId(""); }}>
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
                    )}
                  </div>

                  <div>
                    <Label className="text-sm font-semibold">
                      Case <span className="text-red-500">*</span>
                    </Label>
                    {!palletId ? (
                      <div className="mt-1 bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-600">
                        Select a pallet first
                      </div>
                    ) : getExistingCases().length === 0 ? (
                      <div className="mt-1 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                        No cases in this pallet. Please create a case first.
                      </div>
                    ) : (
                      <Select value={caseId} onValueChange={setCaseId}>
                        <SelectTrigger className="mt-1 bg-white">
                          <SelectValue placeholder="Select case" />
                        </SelectTrigger>
                        <SelectContent className="bg-white z-50">
                          {getExistingCases().map((caseItem: any) => (
                            <SelectItem key={caseItem.id} value={caseItem.id}>
                              {caseItem.id} • {caseItem.description || "No description"} • {caseItem.items?.length || 0} items
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm font-semibold">Quantity</Label>
                    <Input 
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      min={1}
                      className="mt-1"
                    />
                    <div className="flex items-center gap-2 mt-2">
                      {validateQuantity() ? (
                        <p className="text-xs text-green-600 font-medium">
                          ✓ {getAvailableStock()} available in stock
                        </p>
                      ) : (
                        <div className="flex items-center gap-1 text-red-600">
                          <AlertCircle className="h-4 w-4" />
                          <p className="text-xs font-medium">
                            Only {getAvailableStock()} available
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold">Condition</Label>
                    <Select value={condition} onValueChange={setCondition}>
                      <SelectTrigger className="mt-1 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white z-50">
                        <SelectItem value="Excellent">Excellent</SelectItem>
                        <SelectItem value="Good">Good</SelectItem>
                        <SelectItem value="Fair">Fair</SelectItem>
                        <SelectItem value="Poor">Poor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-semibold">Quick Tags</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {["Fragile", "HazMat", "Priority", "Heavy", "Oversized"].map(tag => (
                        <Button
                          key={tag}
                          type="button"
                          variant={tags.includes(tag) ? "default" : "outline"}
                          size="sm"
                          onClick={() => tags.includes(tag) ? handleRemoveTag(tag) : handleAddTag(tag)}
                          className={tags.includes(tag) ? "bg-[#2F5FFF]" : ""}
                        >
                          #{tag}
                        </Button>
                      ))}
                    </div>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {tags.map(tag => (
                          <Badge key={tag} className="bg-[#2F5FFF] gap-1">
                            #{tag}
                            <X 
                              className="h-3 w-3 cursor-pointer" 
                              onClick={() => handleRemoveTag(tag)}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm font-semibold">Additional Notes</Label>
                    <Textarea 
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any special handling instructions..."
                      rows={2}
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Right Column - Live Summary */}
                <div>
                  <Card className="sticky top-4 p-6 bg-gradient-to-br from-[#0D1321] to-[#2F5FFF] text-white shadow-xl">
                    <h3 className="text-xl font-bold mb-4">Live Summary</h3>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center pb-2 border-b border-white/20">
                        <span className="text-sm text-gray-200">Item Name</span>
                        <span className="font-semibold">{selectedEquipment.name}</span>
                      </div>
                      
                      <div className="flex justify-between items-center pb-2 border-b border-white/20">
                        <span className="text-sm text-gray-200">Pallet / Case</span>
                        <span className="font-semibold">
                          {palletId || "—"} / {caseId || "—"}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center pb-2 border-b border-white/20">
                        <span className="text-sm text-gray-200">Quantity</span>
                        <span className="font-semibold">{quantity} units</span>
                      </div>
                      
                      <div className="flex justify-between items-center pb-2 border-b border-white/20">
                        <span className="text-sm text-gray-200">Unit Weight</span>
                        <span className="font-semibold">{unitWeight} lb</span>
                      </div>
                      
                      <div className="flex justify-between items-center pb-2 border-b border-white/20">
                        <span className="text-sm text-gray-200">Dimensions</span>
                        <span className="font-semibold text-sm">
                          {dimensions.length}×{dimensions.width}×{dimensions.height} in
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center pb-2 border-b border-white/20">
                        <span className="text-sm text-gray-200">Volume</span>
                        <span className="font-semibold">{calculateVolume().toFixed(2)} ft³</span>
                      </div>
                      
                      <div className="flex justify-between items-center pt-2 mt-4 border-t-2 border-white/40">
                        <span className="font-semibold text-lg">Total Weight</span>
                        <span className="font-bold text-2xl text-yellow-300">
                          {calculateTotalWeight().toFixed(1)} lb
                        </span>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer Buttons */}
        <div className="border-t bg-white px-6 py-4 flex justify-end gap-3 sticky bottom-0">
          <Button variant="outline" onClick={onClose} className="min-w-24">
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!selectedEquipment || !palletId || !caseId || pallets.length === 0 || getExistingCases().length === 0}
            className="bg-[#2F5FFF] hover:bg-[#2F5FFF]/90 min-w-32"
          >
            <Plus className="mr-2 h-4 w-4" />
            Confirm & Add
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
