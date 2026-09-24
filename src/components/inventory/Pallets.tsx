import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Package, Edit, Trash2, Layers, Box, Download, ChevronDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CreatePalletTypeModal } from "./CreatePalletTypeModal";
import { CreatePalletModal } from "./CreatePalletModal";
import { EditPalletModal } from "./EditPalletModal";
import { PalletMetricsBar } from "./PalletMetricsBar";
import { PalletStepIndicator } from "./PalletStepIndicator";
import { PalletTypePresets, PALLET_PRESETS, type PalletPreset } from "./PalletTypePresets";
import { EmptyState } from "@/components/ui/empty-state";
import { useCustomPallets } from "@/hooks/use-custom-pallets";
import { usePallets } from "@/hooks/use-pallets";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ActivePallet {
  id: string;
  pallet_id: string;
  pallet_type: string;
  section_id: string;
  status: string;
  condition: string;
  current_weight: number;
  max_capacity: number;
  notes: string | null;
  section?: {
    section_code: string;
    section_name: string;
  };
  cases?: Array<{
    id: string;
    case_id: string;
    contents: string;
    weight: number;
  }>;
}

export const Pallets = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createTypeModalOpen, setCreateTypeModalOpen] = useState(false);
  const [createPalletModalOpen, setCreatePalletModalOpen] = useState(false);
  const [editPalletModalOpen, setEditPalletModalOpen] = useState(false);
  const [selectedPallet, setSelectedPallet] = useState<ActivePallet | null>(null);
  const [expandedPallets, setExpandedPallets] = useState<Set<string>>(new Set());

  const { customPallets, loading: loadingTypes, refetch: refetchPallets, createCustomPallet } = useCustomPallets();
  const { pallets, loading: loadingPallets, refetch: refetchActivePallets } = usePallets();

  const hasTypes = customPallets.length > 0;
  const hasPallets = pallets.length > 0;

  // Fetch extended pallet data with relations
  const { data: activePallets = [] } = useQuery({
    queryKey: ["active-pallets-extended", pallets],
    enabled: pallets.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pallets")
        .select(`
          *,
          section:warehouse_sections(section_code, section_name),
          cases(id, case_id, contents, weight)
        `)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ActivePallet[];
    },
  });

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalCapacity = activePallets.reduce((sum, p) => sum + (p.max_capacity || 0), 0);
    const usedCapacity = activePallets.reduce((sum, p) => sum + (p.current_weight || 0), 0);
    return {
      totalTypes: customPallets.length,
      activePallets: activePallets.length,
      totalCapacity,
      usedCapacity,
    };
  }, [customPallets, activePallets]);

  const handleAddPreset = async (preset: PalletPreset) => {
    const result = await createCustomPallet({
      name: preset.name,
      width: preset.width,
      length: preset.length,
      height: preset.height,
      max_weight: preset.maxWeight,
      pallet_type: preset.material,
    });
    
    if (result) {
      toast.success(`${preset.name} added to your pallet types`);
    }
  };

  const handleDeletePallet = async (palletId: string) => {
    const { error } = await supabase.from("pallets").update({ deleted_at: new Date().toISOString() } as any).eq("id", palletId);
    
    if (error) {
      toast.error("Failed to delete pallet");
      return;
    }
    
    toast.success("Pallet deleted successfully");
    refetchActivePallets();
  };

  const handleOpenInBuilder = (pallet: ActivePallet) => {
    navigate("/pallet-builder", { state: { palletId: pallet.id } });
  };

  const togglePalletExpansion = (palletId: string) => {
    const newExpanded = new Set(expandedPallets);
    if (newExpanded.has(palletId)) {
      newExpanded.delete(palletId);
    } else {
      newExpanded.add(palletId);
    }
    setExpandedPallets(newExpanded);
  };

  const handleExport = async (format: "csv" | "excel" | "pdf") => {
    try {
      const exportData = filteredPallets.map(pallet => ({
        "Pallet ID": pallet.pallet_id,
        "Type": pallet.pallet_type,
        "Location": pallet.section?.section_code || "Unassigned",
        "Status": pallet.status,
        "Condition": pallet.condition,
        "Current Weight": pallet.current_weight || 0,
        "Max Capacity": pallet.max_capacity,
        "Cases Count": pallet.cases?.length || 0,
        "Notes": pallet.notes || "",
      }));

      const filename = `pallets_export_${new Date().toISOString().split('T')[0]}`;

      if (format === "excel") {
        const { createExcelFile } = await import("@/lib/excel-utils");
        await createExcelFile(exportData, `${filename}.xlsx`, "Pallets");
      } else if (format === "csv") {
        const { createCsvFile } = await import("@/lib/excel-utils");
        createCsvFile(exportData, `${filename}.csv`);
      } else if (format === "pdf") {
        const jsPDF = (await import("jspdf")).default;
        const doc = new jsPDF({ orientation: "landscape" });
        
        doc.setFontSize(16);
        doc.text("Pallets Report", 14, 15);
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 22);
        doc.text(`Total Pallets: ${exportData.length}`, 14, 28);
        
        let y = 38;
        const pageHeight = doc.internal.pageSize.height;
        
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("Pallet ID", 14, y);
        doc.text("Type", 50, y);
        doc.text("Location", 90, y);
        doc.text("Status", 120, y);
        doc.text("Weight", 160, y);
        doc.text("Cases", 200, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        
        exportData.forEach((item) => {
          if (y > pageHeight - 20) {
            doc.addPage();
            y = 20;
          }
          doc.text(item["Pallet ID"]?.substring(0, 15) || "", 14, y);
          doc.text(item["Type"]?.substring(0, 20) || "", 50, y);
          doc.text(item["Location"]?.substring(0, 15) || "", 90, y);
          doc.text(item["Status"] || "", 120, y);
          doc.text(`${item["Current Weight"]} / ${item["Max Capacity"]} lbs`, 160, y);
          doc.text(String(item["Cases Count"]), 200, y);
          y += 5;
        });
        
        doc.save(`${filename}.pdf`);
      }

      toast.success(`Exported ${exportData.length} pallets as ${format.toUpperCase()}`);
    } catch (error: any) {
      toast.error("Export failed: " + error.message);
    }
  };

  const filteredPallets = activePallets.filter((pallet) => {
    const matchesSearch =
      pallet.pallet_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pallet.pallet_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pallet.section?.section_code?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || pallet.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "available": return "bg-green-500";
      case "in use": return "bg-blue-500";
      case "service": return "bg-yellow-500";
      case "in transfer": return "bg-purple-500";
      case "empty": return "bg-gray-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="space-y-6">
      {/* Metrics Bar */}
      <PalletMetricsBar {...metrics} />

      {/* Step Indicator */}
      <PalletStepIndicator hasTypes={hasTypes} hasPallets={hasPallets} />

      {/* Step 1: Global Pallet Types Section */}
      <Card className={!hasTypes ? "ring-2 ring-primary/20" : ""}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${hasTypes ? 'bg-primary/10' : 'bg-primary'}`}>
                <Package className={`h-5 w-5 ${hasTypes ? 'text-primary' : 'text-primary-foreground'}`} />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Step 1: Define Pallet Types
                  {hasTypes && (
                    <Badge variant="outline" className="text-xs font-normal text-primary border-primary/30 bg-primary/10">
                      ✓ Complete
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Pallet types are reusable templates that define dimensions, weight limits, and material. 
                  You'll select from these when building pallets.
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Presets Section */}
          <PalletTypePresets
            existingTypes={customPallets.map(p => p.name)}
            onSelectPreset={handleAddPreset}
            onCreateCustom={() => setCreateTypeModalOpen(true)}
          />

          {/* Existing Types Grid */}
          {loadingTypes ? (
            <div className="text-center py-8 text-muted-foreground">Loading pallet types...</div>
          ) : customPallets.length > 0 && (
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Your Pallet Types ({customPallets.length})
              </h4>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {customPallets.map((type) => (
                  <Card key={type.id} className="bg-muted/30">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-sm">{type.name}</h4>
                          <p className="text-xs text-muted-foreground">{type.pallet_type}</p>
                        </div>
                      </div>
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Dimensions</span>
                          <span>{type.width}" × {type.length}"</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Max Weight</span>
                          <span>{type.max_weight.toLocaleString()} lbs</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Active Pallets Section */}
      <Card className={hasTypes && !hasPallets ? "ring-2 ring-primary/20" : ""}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${!hasTypes ? 'bg-muted' : hasPallets ? 'bg-primary/10' : 'bg-primary'}`}>
                <Layers className={`h-5 w-5 ${!hasTypes ? 'text-muted-foreground' : hasPallets ? 'text-primary' : 'text-primary-foreground'}`} />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Step 2: Build & Manage Pallets
                  {hasPallets && (
                    <Badge variant="outline" className="text-xs font-normal text-primary border-primary/30 bg-primary/10">
                      ✓ Active
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Create physical pallets in your warehouse using your defined pallet types.
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              {hasPallets && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Download className="h-4 w-4" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleExport("csv")}>
                      Export as CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("excel")}>
                      Export as Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("pdf")}>
                      Export as PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button 
                        onClick={() => setCreatePalletModalOpen(true)} 
                        className="gap-2"
                        disabled={!hasTypes}
                      >
                        <Plus className="h-4 w-4" />
                        Build Pallet
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!hasTypes && (
                    <TooltipContent>
                      <p>Create at least one pallet type first</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!hasTypes ? (
            <EmptyState
              icon={Package}
              title="Complete Step 1 First"
              description="Before you can build pallets, you need to define at least one pallet type. Pallet types set the dimensions, weight limits, and material specifications."
              tips={[
                "Use a preset like 'Standard GMA 48×40' to get started quickly",
                "Create custom types for non-standard pallet sizes",
                "Pallet types can be reused across unlimited pallets",
              ]}
            />
          ) : (
            <>
              {/* Search and Filters */}
              {hasPallets && (
                <div className="flex gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by Pallet ID, Type, or Location..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="in use">In Use</SelectItem>
                      <SelectItem value="service">Service</SelectItem>
                      <SelectItem value="in transfer">In Transfer</SelectItem>
                      <SelectItem value="empty">Empty</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Pallets List */}
              {loadingPallets ? (
                <div className="text-center py-8 text-muted-foreground">Loading pallets...</div>
              ) : filteredPallets.length === 0 ? (
                searchQuery || statusFilter !== "all" ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No pallets match your search criteria
                  </div>
                ) : (
                  <EmptyState
                    icon={Layers}
                    title="Ready to Build Your First Pallet"
                    description="You have pallet types defined. Now create your first physical pallet to start tracking inventory in your warehouse."
                    actionLabel="Build Pallet"
                    onAction={() => setCreatePalletModalOpen(true)}
                    tips={[
                      "Assign a unique Pallet ID for easy tracking",
                      "Choose a warehouse location for the pallet",
                      "Add cases and items after creation",
                    ]}
                    reassuranceText="Pallets can be edited or deleted anytime"
                  />
                )
              ) : (
                <div className="space-y-3">
                  {filteredPallets.map((pallet) => (
                    <Card key={pallet.id} className="overflow-hidden hover:shadow-sm transition-shadow">
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div>
                              <div className="text-sm font-medium">{pallet.pallet_id}</div>
                              <div className="text-xs text-muted-foreground">{pallet.pallet_type}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Location</div>
                              <div className="text-sm font-medium">
                                {pallet.section?.section_code || "Unassigned"}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Cases</div>
                              <div className="text-sm font-medium">{pallet.cases?.length || 0}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Weight</div>
                              <div className="text-sm font-medium">
                                {pallet.current_weight || 0} / {pallet.max_capacity} lbs
                              </div>
                            </div>
                            <div>
                              <Badge className={getStatusColor(pallet.status)}>
                                {pallet.status}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => togglePalletExpansion(pallet.id)}
                            >
                              <Box className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedPallet(pallet);
                                setEditPalletModalOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenInBuilder(pallet)}
                            >
                              <Layers className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePallet(pallet.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Expanded Cases View */}
                        {expandedPallets.has(pallet.id) && pallet.cases && pallet.cases.length > 0 && (
                          <div className="mt-4 pt-4 border-t">
                            <div className="text-sm font-medium mb-2">Cases on this pallet:</div>
                            <div className="space-y-2">
                              {pallet.cases.map((caseItem) => (
                                <div
                                  key={caseItem.id}
                                  className="flex items-center justify-between p-2 bg-muted rounded"
                                >
                                  <div className="flex items-center gap-4">
                                    <div className="text-sm font-medium">{caseItem.case_id}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {caseItem.contents}
                                    </div>
                                  </div>
                                  <div className="text-sm">{caseItem.weight} lbs</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <CreatePalletTypeModal
        open={createTypeModalOpen}
        onOpenChange={setCreateTypeModalOpen}
        onSuccess={refetchPallets}
      />
      <CreatePalletModal
        open={createPalletModalOpen}
        onOpenChange={setCreatePalletModalOpen}
        onSuccess={refetchActivePallets}
        palletTypes={customPallets}
      />
      {selectedPallet && (
        <EditPalletModal
          open={editPalletModalOpen}
          onOpenChange={setEditPalletModalOpen}
          pallet={selectedPallet}
          onSuccess={() => {
            refetchActivePallets();
            setSelectedPallet(null);
          }}
        />
      )}
    </div>
  );
};
