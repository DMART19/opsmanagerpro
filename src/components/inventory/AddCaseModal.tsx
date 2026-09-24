import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Box, Loader2, Link2, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AddCaseModalProps {
  open: boolean;
  onClose: () => void;
  palletId: string;
  palletName: string;
  sectionId: string;
  onCaseAdded: () => void;
}

export const AddCaseModal = ({ 
  open, 
  onClose, 
  palletId,
  palletName,
  sectionId,
  onCaseAdded 
}: AddCaseModalProps) => {
  // Mode state
  const [mode, setMode] = useState<"create" | "link">("create");
  
  // Create mode states
  const [caseId, setCaseId] = useState("");
  const [useAutoId, setUseAutoId] = useState(true);
  const [caseType, setCaseType] = useState("");
  const [length, setLength] = useState("12");
  const [width, setWidth] = useState("12");
  const [height, setHeight] = useState("12");
  const [weight, setWeight] = useState("50");
  const [allowRotation, setAllowRotation] = useState(true);
  const [stackable, setStackable] = useState(true);
  const [maxStackHeight, setMaxStackHeight] = useState("48");
  const [fragile, setFragile] = useState(false);
  const [condition, setCondition] = useState("good");
  const [contents, setContents] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [nextAutoId, setNextAutoId] = useState("");
  
  // Link mode states
  const [searchQuery, setSearchQuery] = useState("");
  const [existingCases, setExistingCases] = useState<any[]>([]);
  const [selectedCases, setSelectedCases] = useState<string[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  // Pallets list for dropdown
  const [pallets, setPallets] = useState<any[]>([]);

  useEffect(() => {
    if (open && useAutoId && mode === "create") {
      generateNextCaseId();
    }
  }, [open, useAutoId, palletId, mode]);

  useEffect(() => {
    if (open && mode === "link") {
      searchExistingCases();
    }
  }, [open, mode, searchQuery]);

  useEffect(() => {
    if (open) {
      loadPallets();
    }
  }, [open, sectionId]);

  const loadPallets = async () => {
    try {
      const { data, error } = await supabase
        .from("pallets")
        .select("id, pallet_id")
        .eq("section_id", sectionId)
        .order("pallet_id");

      if (error) throw error;
      setPallets(data || []);
    } catch (error) {
      console.error("Error loading pallets:", error);
    }
  };

  const generateNextCaseId = async () => {
    try {
      const { data, error } = await supabase
        .from("cases")
        .select("case_id")
        .eq("pallet_id", palletId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const existingIds = data?.map(c => {
        const match = c.case_id.match(/\d+$/);
        return match ? parseInt(match[0]) : 0;
      }) || [];

      const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
      const newId = `C${maxId + 1}`;
      setNextAutoId(newId);
    } catch (error) {
      console.error("Error generating case ID:", error);
      setNextAutoId("C1");
    }
  };

  const searchExistingCases = async () => {
    setLoadingSearch(true);
    try {
      let query = supabase
        .from("cases")
        .select("*")
        .is("pallet_id", null);

      if (searchQuery.trim()) {
        query = query.or(`case_id.ilike.%${searchQuery}%,case_type.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.order("created_at", { ascending: false }).limit(50);

      if (error) throw error;

      setExistingCases(data || []);
    } catch (error) {
      console.error("Error searching cases:", error);
      toast({
        title: "Error loading cases",
        description: "Failed to load existing cases",
        variant: "destructive"
      });
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleLinkCases = async () => {
    if (selectedCases.length === 0) {
      toast({
        title: "No cases selected",
        description: "Please select at least one case to link",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("cases")
        .update({ pallet_id: palletId })
        .in("id", selectedCases);

      if (error) throw error;

      toast({
        title: "Cases linked successfully",
        description: `${selectedCases.length} case(s) linked to ${palletName}`
      });

      setSelectedCases([]);
      setSearchQuery("");
      onCaseAdded();
      onClose();
    } catch (error: any) {
      console.error("Error linking cases:", error);
      toast({
        title: "Error linking cases",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const finalCaseId = useAutoId ? nextAutoId : caseId;
    
    if (!finalCaseId.trim()) {
      toast({ 
        title: "Case ID required", 
        description: "Please provide a case ID",
        variant: "destructive" 
      });
      return false;
    }

    if (!length || parseFloat(length) <= 0) {
      toast({ 
        title: "Invalid length", 
        description: "Length must be greater than 0",
        variant: "destructive" 
      });
      return false;
    }

    if (!width || parseFloat(width) <= 0) {
      toast({ 
        title: "Invalid width", 
        description: "Width must be greater than 0",
        variant: "destructive" 
      });
      return false;
    }

    if (!height || parseFloat(height) <= 0) {
      toast({ 
        title: "Invalid height", 
        description: "Height must be greater than 0",
        variant: "destructive" 
      });
      return false;
    }

    if (!weight || parseFloat(weight) <= 0) {
      toast({ 
        title: "Invalid weight", 
        description: "Weight must be greater than 0",
        variant: "destructive" 
      });
      return false;
    }

    if (stackable && (!maxStackHeight || parseFloat(maxStackHeight) <= 0)) {
      toast({ 
        title: "Invalid stack height", 
        description: "Max stack height is required when stackable is enabled",
        variant: "destructive" 
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    const finalCaseId = useAutoId ? nextAutoId : caseId;

    try {
      const { data: existing } = await supabase
        .from("cases")
        .select("id")
        .eq("pallet_id", palletId)
        .eq("case_id", finalCaseId)
        .maybeSingle();

      if (existing) {
        toast({ 
          title: "Duplicate case ID", 
          description: `Case ${finalCaseId} already exists in this pallet`,
          variant: "destructive" 
        });
        setLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      const { error: insertError } = await supabase
        .from("cases")
        .insert({
          pallet_id: palletId,
          case_id: finalCaseId,
          case_type: caseType.trim() || "Standard",
          length: parseFloat(length) || 0,
          width: parseFloat(width) || 0,
          height: parseFloat(height) || 0,
          weight: parseFloat(weight) || 0,
          allow_rotation: allowRotation,
          stackable,
          max_stack_height: stackable ? (parseFloat(maxStackHeight) || null) : null,
          fragile,
          condition,
          contents: contents.trim() || null,
          notes: notes.trim() || null,
          created_by: user?.id
        });

      if (insertError) throw insertError;

      toast({ 
        title: "Case created successfully", 
        description: `Case ${finalCaseId} created successfully`
      });

      // Reset form
      setCaseId("");
      setCaseType("");
      setLength("12");
      setWidth("12");
      setHeight("12");
      setWeight("50");
      setAllowRotation(true);
      setStackable(true);
      setMaxStackHeight("48");
      setFragile(false);
      setCondition("good");
      setContents("");
      setNotes("");
      setUseAutoId(true);
      
      onCaseAdded();
      onClose();
    } catch (error: any) {
      console.error("Error creating case:", error);
      toast({ 
        title: "Error creating case", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setCaseId("");
    setCaseType("");
    setLength("12");
    setWidth("12");
    setHeight("12");
    setWeight("50");
    setAllowRotation(true);
    setStackable(true);
    setMaxStackHeight("48");
    setFragile(false);
    setCondition("good");
    setContents("");
    setNotes("");
    setUseAutoId(true);
    setSelectedCases([]);
    setSearchQuery("");
    setMode("create");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Box className="h-5 w-5 text-primary" />
            Add New Case
          </DialogTitle>
          <DialogDescription>
            Define a case container with full dimensions and properties for pallet layout.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "create" | "link")} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create New Case</TabsTrigger>
            <TabsTrigger value="link">
              <Link2 className="h-4 w-4 mr-1" />
              Link Existing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="flex-1 overflow-hidden">
            <ScrollArea className="h-[calc(90vh-200px)] pr-4">
              <div className="space-y-6 pb-6">
                {/* Case Identification */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground">Case Identification</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Case ID</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="e.g., A-12-C04"
                          value={useAutoId ? nextAutoId : caseId}
                          onChange={(e) => setCaseId(e.target.value)}
                          disabled={useAutoId}
                        />
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="auto-id"
                            checked={useAutoId}
                            onCheckedChange={(checked) => setUseAutoId(checked as boolean)}
                          />
                          <label htmlFor="auto-id" className="text-xs cursor-pointer whitespace-nowrap">
                            Auto
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Parent Pallet</Label>
                      <Select value={palletId} disabled>
                        <SelectTrigger>
                          <SelectValue placeholder="Select pallet">
                            {palletName}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {pallets.map((pallet) => (
                            <SelectItem key={pallet.id} value={pallet.id}>
                              {pallet.pallet_id}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Case Type</Label>
                    <Input
                      placeholder="e.g., Electronics Case, Supply Case"
                      value={caseType}
                      onChange={(e) => setCaseType(e.target.value)}
                    />
                  </div>
                </div>

                {/* Case Dimensions */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground">Case Dimensions (Required)</h3>
                  <p className="text-xs text-muted-foreground">
                    These values determine how the case will appear on pallets.
                  </p>
                  
                  <div className="grid grid-cols-4 gap-3">
                    <div className="space-y-2">
                      <Label>Length (in) *</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        value={length}
                        onChange={(e) => setLength(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Width (in) *</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        value={width}
                        onChange={(e) => setWidth(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Height (in) *</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Weight (lb) *</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Case Rules & Handling Properties */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground">Case Rules & Handling Properties</h3>
                  
                  {/* Orientation */}
                  <div className="space-y-3 p-4 border border-border rounded-md bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium">Orientation</Label>
                        <p className="text-xs text-muted-foreground">Allow case rotation during pallet layout</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="allow-rotation"
                          checked={allowRotation}
                          onCheckedChange={(checked) => setAllowRotation(checked as boolean)}
                        />
                        <label htmlFor="allow-rotation" className="text-sm cursor-pointer">
                          Allow Rotation
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Stacking */}
                  <div className="space-y-3 p-4 border border-border rounded-md bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium">Stacking</Label>
                        <p className="text-xs text-muted-foreground">Can this case support weight above it</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="stackable"
                          checked={stackable}
                          onCheckedChange={(checked) => setStackable(checked as boolean)}
                        />
                        <label htmlFor="stackable" className="text-sm cursor-pointer">
                          Stackable
                        </label>
                      </div>
                    </div>
                    
                    {stackable && (
                      <div className="space-y-2 pt-2">
                        <Label className="text-xs">Max Stack Height (in) *</Label>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={maxStackHeight}
                          onChange={(e) => setMaxStackHeight(e.target.value)}
                          className="max-w-[200px]"
                        />
                      </div>
                    )}
                  </div>

                  {/* Fragility */}
                  <div className="space-y-3 p-4 border border-border rounded-md bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium">Fragility</Label>
                        <p className="text-xs text-muted-foreground">Adds visual badge in layout builder</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="fragile"
                          checked={fragile}
                          onCheckedChange={(checked) => setFragile(checked as boolean)}
                        />
                        <label htmlFor="fragile" className="text-sm cursor-pointer">
                          Fragile Item
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Condition */}
                  <div className="space-y-2">
                    <Label>Condition</Label>
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

                {/* Optional Metadata */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground">Optional Metadata</h3>
                  
                  <div className="space-y-2">
                    <Label>Contents Description</Label>
                    <Textarea
                      placeholder="Describe what's inside this case..."
                      value={contents}
                      onChange={(e) => setContents(e.target.value)}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      placeholder="Additional notes..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Case"
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="link" className="flex-1 overflow-hidden">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search cases by ID or type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <ScrollArea className="h-[calc(90vh-280px)]">
                {loadingSearch ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : existingCases.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No unassigned cases found
                  </p>
                ) : (
                  <div className="space-y-2">
                    {existingCases.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center space-x-2 p-3 border border-border rounded-md hover:bg-muted/50 transition-colors"
                      >
                        <Checkbox
                          id={c.id}
                          checked={selectedCases.includes(c.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedCases([...selectedCases, c.id]);
                            } else {
                              setSelectedCases(selectedCases.filter(id => id !== c.id));
                            }
                          }}
                        />
                        <label htmlFor={c.id} className="flex-1 cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{c.case_id}</p>
                              <p className="text-sm text-muted-foreground">
                                {c.case_type} • {c.weight}lb • {c.condition}
                              </p>
                            </div>
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <div className="flex justify-between items-center pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  {selectedCases.length} case(s) selected
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleClose} disabled={loading}>
                    Cancel
                  </Button>
                  <Button onClick={handleLinkCases} disabled={loading || selectedCases.length === 0}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Linking...
                      </>
                    ) : (
                      "Link Cases"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
