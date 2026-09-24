import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus, Package, Boxes } from "lucide-react";
import { useCases } from "@/hooks/use-cases";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useCustomCategories } from "@/hooks/use-custom-categories";
import { useCustomPallets } from "@/hooks/use-custom-pallets";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ContainerLibraryProps {
  onAddCase: (caseData: any) => void;
}

export const ContainerLibrary = ({ onAddCase }: ContainerLibraryProps) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateCaseDialog, setShowCreateCaseDialog] = useState(false);
  const [showCreatePalletDialog, setShowCreatePalletDialog] = useState(false);

  const { cases, loading: casesLoading, refetch: refetchCases } = useCases();
  const { categories: customCategories } = useCustomCategories();
  const { customPallets: palletTypes } = useCustomPallets();

  // Case creation states
  const [newCaseId, setNewCaseId] = useState("");
  const [newCaseType, setNewCaseType] = useState("Standard");
  const [newCaseLength, setNewCaseLength] = useState(12);
  const [newCaseWidth, setNewCaseWidth] = useState(12);
  const [newCaseHeight, setNewCaseHeight] = useState(12);
  const [newCaseWeight, setNewCaseWeight] = useState(50);
  const [newCaseCondition, setNewCaseCondition] = useState("good");
  const [newCaseFragile, setNewCaseFragile] = useState(false);
  const [newCaseContents, setNewCaseContents] = useState("");
  const [newCaseNotes, setNewCaseNotes] = useState("");
  const [creatingCase, setCreatingCase] = useState(false);

  // Filter cases based on search
  const filteredCases = cases?.filter((c) => {
    const matchesSearch = c.case_id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.contents?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  }) || [];

  const handleAddCaseToBuilder = (caseData: any) => {
    onAddCase({
      id: caseData.id,
      caseId: caseData.case_id,
      caseType: caseData.case_type || "Standard",
      width: caseData.width || 12,
      length: caseData.length || 12,
      height: caseData.height || 12,
      weight: caseData.weight || 50,
      condition: caseData.condition || "good",
      fragile: caseData.fragile || false,
      category: caseData.case_type,
      allowRotation: caseData.allow_rotation !== false,
      x: 0,
      y: 0,
      z: 1,
      rotation: 0,
    });
  };

  const handleCreateCase = async () => {
    if (!newCaseId) {
      toast.error("Case ID is required");
      return;
    }

    try {
      setCreatingCase(true);

      // Get first section for standalone case
      const { data: sections } = await supabase
        .from("warehouse_sections")
        .select("id")
        .limit(1);

      if (!sections || sections.length === 0) {
        toast.error("No warehouse sections found. Please create a section first.");
        return;
      }

      // Create a temporary pallet for standalone case (filtered from UI selectors)
      const { data: tempPallet, error: palletError } = await supabase
        .from("pallets")
        .insert({
          pallet_id: `_internal_${Date.now()}`,
          section_id: sections[0].id,
          pallet_type: "Internal",
          status: "available",
        })
        .select()
        .single();

      if (palletError) throw palletError;

      const { error: caseError } = await supabase
        .from("cases")
        .insert({
          case_id: newCaseId,
          pallet_id: tempPallet.id,
          case_type: newCaseType,
          length: newCaseLength,
          width: newCaseWidth,
          height: newCaseHeight,
          weight: newCaseWeight,
          condition: newCaseCondition,
          fragile: newCaseFragile,
          contents: newCaseContents,
          notes: newCaseNotes,
          stackable: true,
          allow_rotation: true,
        });

      if (caseError) throw caseError;

      toast.success("Case created successfully");
      setShowCreateCaseDialog(false);
      resetCaseForm();
      refetchCases();
    } catch (error: any) {
      console.error("Error creating case:", error);
      toast.error(error.message || "Failed to create case");
    } finally {
      setCreatingCase(false);
    }
  };

  const resetCaseForm = () => {
    setNewCaseId("");
    setNewCaseType("Standard");
    setNewCaseLength(12);
    setNewCaseWidth(12);
    setNewCaseHeight(12);
    setNewCaseWeight(50);
    setNewCaseCondition("good");
    setNewCaseFragile(false);
    setNewCaseContents("");
    setNewCaseNotes("");
  };

  const isEmpty = filteredCases.length === 0;

  return (
    <>
      <Card className="h-auto lg:h-[calc(100vh-4rem)] flex flex-col">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 border-b border-border flex-shrink-0">
          <CardTitle className="text-lg flex items-center gap-2">
            <Boxes className="h-5 w-5 text-primary" />
            Item Library
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 flex-1 flex flex-col overflow-hidden">
          <div className="space-y-4 flex-shrink-0">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Create Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={() => navigate('/inventory?action=addCase')}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add New Item
              </Button>
            </div>
          </div>

          {/* Container List - Scrollable Area */}
          <div className="flex-1 mt-4 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="space-y-3 pr-4">
                {casesLoading ? (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    Loading containers...
                  </div>
                ) : isEmpty ? (
                  <div className="text-center py-8 space-y-2">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
                    <p className="text-sm text-muted-foreground">No items found.</p>
                    <p className="text-xs text-muted-foreground">Create an item to get started.</p>
                  </div>
                ) : (
                  <>
                    {/* Cases */}
                    {filteredCases.map((caseItem) => (
                      <Card
                        key={caseItem.id}
                        className="cursor-move hover:border-primary transition-colors"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("application/json", JSON.stringify(caseItem));
                          e.dataTransfer.effectAllowed = "copy";
                        }}
                        onClick={() => handleAddCaseToBuilder(caseItem)}
                      >
                        <CardContent className="p-3">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="font-medium text-sm">{caseItem.case_id}</div>
                                <div className="text-xs text-muted-foreground">{caseItem.case_type || "Standard"}</div>
                              </div>
                              <div className="flex gap-1">
                                {caseItem.fragile && (
                                  <Badge variant="destructive" className="text-xs">
                                    Fragile
                                  </Badge>
                                )}
                                <Badge variant="outline" className="text-xs">
                                  <Package className="h-3 w-3 mr-1" />
                                  Case
                                </Badge>
                              </div>
                            </div>
                            <Separator />
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-muted-foreground">Dimensions:</span>
                                <div className="font-medium">
                                  {caseItem.length || 12}" × {caseItem.width || 12}" × {caseItem.height || 12}"
                                </div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Weight:</span>
                                <div className="font-medium">{caseItem.weight || 50} lbs</div>
                              </div>
                            </div>
                            {caseItem.contents && (
                              <div className="text-xs">
                                <span className="text-muted-foreground">Contents: </span>
                                <span className="font-medium">{caseItem.contents}</span>
                              </div>
                            )}
                            <Badge variant="secondary" className="text-xs">
                              {caseItem.condition || "good"}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </>
                )}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      {/* Create Case Dialog */}
      <Dialog open={showCreateCaseDialog} onOpenChange={setShowCreateCaseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Case</DialogTitle>
            <DialogDescription>Add a new case to the container library</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="case-id">Case ID *</Label>
              <Input
                id="case-id"
                value={newCaseId}
                onChange={(e) => setNewCaseId(e.target.value)}
                placeholder="e.g., C-001"
              />
            </div>
            <div>
              <Label htmlFor="case-type">Case Type</Label>
              <Select value={newCaseType} onValueChange={setNewCaseType}>
                <SelectTrigger id="case-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Standard">Standard</SelectItem>
                  <SelectItem value="Heavy Duty">Heavy Duty</SelectItem>
                  <SelectItem value="Waterproof">Waterproof</SelectItem>
                  <SelectItem value="Custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label htmlFor="length">Length (in)</Label>
                <Input
                  id="length"
                  type="number"
                  value={newCaseLength}
                  onChange={(e) => setNewCaseLength(Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="width">Width (in)</Label>
                <Input
                  id="width"
                  type="number"
                  value={newCaseWidth}
                  onChange={(e) => setNewCaseWidth(Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="height">Height (in)</Label>
                <Input
                  id="height"
                  type="number"
                  value={newCaseHeight}
                  onChange={(e) => setNewCaseHeight(Number(e.target.value))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="weight">Weight (lbs)</Label>
              <Input
                id="weight"
                type="number"
                value={newCaseWeight}
                onChange={(e) => setNewCaseWeight(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="condition">Condition</Label>
              <Select value={newCaseCondition} onValueChange={setNewCaseCondition}>
                <SelectTrigger id="condition">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="fragile"
                checked={newCaseFragile}
                onCheckedChange={setNewCaseFragile}
              />
              <Label htmlFor="fragile">Fragile</Label>
            </div>
            <div>
              <Label htmlFor="contents">Contents</Label>
              <Input
                id="contents"
                value={newCaseContents}
                onChange={(e) => setNewCaseContents(e.target.value)}
                placeholder="What's inside?"
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={newCaseNotes}
                onChange={(e) => setNewCaseNotes(e.target.value)}
                placeholder="Additional notes..."
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateCaseDialog(false);
                  resetCaseForm();
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateCase}
                disabled={creatingCase}
                className="flex-1"
              >
                {creatingCase ? "Creating..." : "Create Case"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Pallet Dialog - using existing CreatePalletModal */}
      {showCreatePalletDialog && (
        <Dialog open={showCreatePalletDialog} onOpenChange={setShowCreatePalletDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Pallet</DialogTitle>
              <DialogDescription>
                Create a new pallet from global pallet types
              </DialogDescription>
            </DialogHeader>
            <div className="text-sm text-muted-foreground">
              Please use the Pallets tab in Inventory to create new pallets with full configuration.
            </div>
            <Button onClick={() => setShowCreatePalletDialog(false)}>
              Close
            </Button>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
