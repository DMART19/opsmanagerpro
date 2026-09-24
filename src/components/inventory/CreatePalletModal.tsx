import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Package, MapPin, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface PalletType {
  id: string;
  name: string;
  length: number;
  width: number;
  height: number | null;
  max_weight: number;
  pallet_type: string;
}

interface CreatePalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  palletTypes: PalletType[];
}

export const CreatePalletModal = ({ open, onOpenChange, onSuccess, palletTypes }: CreatePalletModalProps) => {
  const [palletId, setPalletId] = useState("");
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [maxCapacity, setMaxCapacity] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

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

  const selectedType = palletTypes.find(type => type.id === selectedTypeId);

  useEffect(() => {
    if (selectedType) {
      setMaxCapacity(selectedType.max_weight.toString());
    }
  }, [selectedType]);

  // Generate a suggested pallet ID
  useEffect(() => {
    if (open && !palletId) {
      const prefix = selectedType?.name?.substring(0, 3).toUpperCase() || "PAL";
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      setPalletId(`${prefix}-${randomNum}`);
    }
  }, [open, selectedType]);

  const handleCreate = async () => {
    if (!palletId || !selectedTypeId || !sectionId) {
      toast.error("Please complete all required fields");
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("pallets").insert({
      pallet_id: palletId,
      pallet_type: selectedType?.name || "",
      section_id: sectionId,
      max_capacity: parseInt(maxCapacity) || 24,
      notes,
      status: "available",
      condition: "good",
      current_weight: 0,
      created_by: user?.id,
    });

    setLoading(false);

    if (error) {
      toast.error("Failed to create pallet");
      return;
    }

    toast.success("Pallet created successfully! You can now add cases and items.");
    onSuccess();
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setPalletId("");
    setSelectedTypeId("");
    setSectionId("");
    setMaxCapacity("");
    setNotes("");
    setShowAdvanced(false);
  };

  const currentStep = !selectedTypeId ? 1 : !sectionId ? 2 : 3;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Build New Pallet
          </DialogTitle>
          <DialogDescription>
            Create a physical pallet in your warehouse
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center gap-2 py-2">
          {[
            { step: 1, label: "Type" },
            { step: 2, label: "Location" },
            { step: 3, label: "Details" },
          ].map((item, index) => (
            <div key={item.step} className="flex items-center">
              <div className="flex items-center gap-1.5">
                <div
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                    currentStep > item.step
                      ? "bg-primary text-primary-foreground"
                      : currentStep === item.step
                      ? "bg-primary/20 text-primary border border-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {currentStep > item.step ? <Check className="h-3 w-3" /> : item.step}
                </div>
                <span className={cn(
                  "text-xs",
                  currentStep >= item.step ? "text-foreground" : "text-muted-foreground"
                )}>
                  {item.label}
                </span>
              </div>
              {index < 2 && (
                <div className={cn(
                  "w-8 h-0.5 mx-2",
                  currentStep > item.step ? "bg-primary" : "bg-muted"
                )} />
              )}
            </div>
          ))}
        </div>

        <div className="space-y-5">
          {/* Step 1: Select Pallet Type */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">1</span>
              Select Pallet Type *
            </Label>
            <div className="grid grid-cols-2 gap-2 max-h-[180px] overflow-y-auto pr-1">
              {palletTypes.map((type) => (
                <Card
                  key={type.id}
                  className={cn(
                    "cursor-pointer transition-all",
                    selectedTypeId === type.id
                      ? "ring-2 ring-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  )}
                  onClick={() => setSelectedTypeId(type.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium">{type.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {type.width}" × {type.length}" • {type.max_weight} lbs
                        </p>
                      </div>
                      {selectedTypeId === type.id && (
                        <div className="p-1 bg-primary rounded-full">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Step 2: Assign Location */}
          <div className={cn("space-y-3 transition-opacity", !selectedTypeId && "opacity-50 pointer-events-none")}>
            <Label className="flex items-center gap-2">
              <span className={cn(
                "w-5 h-5 rounded-full text-xs flex items-center justify-center font-medium",
                selectedTypeId ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              )}>2</span>
              Assign Location *
            </Label>
            <Select value={sectionId} onValueChange={setSectionId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose warehouse section" />
              </SelectTrigger>
              <SelectContent>
                {sections.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3" />
                      {section.section_code} - {section.section_name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Step 3: Pallet ID & Details */}
          <div className={cn("space-y-4 transition-opacity", (!selectedTypeId || !sectionId) && "opacity-50 pointer-events-none")}>
            <Label className="flex items-center gap-2">
              <span className={cn(
                "w-5 h-5 rounded-full text-xs flex items-center justify-center font-medium",
                selectedTypeId && sectionId ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              )}>3</span>
              Pallet ID & Details
            </Label>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="palletId" className="text-xs text-muted-foreground">Pallet ID *</Label>
                <Input
                  id="palletId"
                  value={palletId}
                  onChange={(e) => setPalletId(e.target.value)}
                  placeholder="e.g. PAL-1234"
                  className="mt-1"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  A unique identifier for this pallet
                </p>
              </div>

              {/* Advanced Settings */}
              <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between h-8 text-xs">
                    <span className="flex items-center gap-1.5">
                      <Settings className="h-3 w-3" />
                      Optional settings
                    </span>
                    <ChevronDown className={cn("h-3 w-3 transition-transform", showAdvanced && "rotate-180")} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-3">
                  <div>
                    <Label htmlFor="maxCapacity" className="text-xs text-muted-foreground">Max Capacity (cases)</Label>
                    <Input
                      id="maxCapacity"
                      type="number"
                      value={maxCapacity}
                      onChange={(e) => setMaxCapacity(e.target.value)}
                      placeholder="24"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes" className="text-xs text-muted-foreground">Notes</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Additional notes..."
                      className="mt-1 min-h-[60px]"
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>

          {/* Summary */}
          {selectedType && sectionId && (
            <Card className="bg-muted/30">
              <CardContent className="p-3">
                <p className="text-xs font-medium mb-2">Summary</p>
                <div className="text-xs space-y-1 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Type</span>
                    <span className="text-foreground">{selectedType.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dimensions</span>
                    <span className="text-foreground">{selectedType.width}" × {selectedType.length}"</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Location</span>
                    <span className="text-foreground">{sections.find(s => s.id === sectionId)?.section_code}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={loading || !palletId || !selectedTypeId || !sectionId}
            >
              {loading ? "Creating..." : "Build Pallet"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
