import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Package, Box, Search, Plus, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { usePallets } from "@/hooks/use-pallets";
import { useCases } from "@/hooks/use-cases";
import { toast } from "@/hooks/use-toast";

interface ContainersProps {
  openAddCaseDialog?: boolean;
  onAddCaseDialogClose?: () => void;
}

export const Containers = ({ openAddCaseDialog = false, onAddCaseDialogClose }: ContainersProps) => {
  const { pallets, loading: palletsLoading } = usePallets();
  const { cases, loading: casesLoading } = useCases();
  
  const [openPallets, setOpenPallets] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [itemTypeFilter, setItemTypeFilter] = useState("all");

  const togglePallet = (palletId: string) => {
    setOpenPallets((prev) =>
      prev.includes(palletId)
        ? prev.filter((id) => id !== palletId)
        : [...prev, palletId]
    );
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setItemTypeFilter("all");
  };

  // Group cases by pallet
  const palletGroups = pallets?.map(pallet => ({
    pallet,
    cases: cases?.filter(c => c.pallet_id === pallet.id) || []
  })) || [];

  // Filter containers
  const filteredPalletGroups = palletGroups.filter(({ pallet, cases: palletCases }) => {
    const matchesSearch =
      pallet.pallet_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      palletCases.some((c) => c.case_id.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "all" || pallet.status === statusFilter;
    const matchesType =
      itemTypeFilter === "all" ||
      palletCases.some((c) => c.case_type?.toLowerCase().includes(itemTypeFilter.toLowerCase()));
    return matchesSearch && matchesStatus && matchesType;
  });

  // Calculate summary stats
  const totalPallets = pallets?.length || 0;
  const totalCases = cases?.length || 0;
  const availableCount = pallets?.filter((p) => p.status === "available").length || 0;
  const maintenanceCount = pallets?.filter((p) => p.status === "maintenance").length || 0;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      available: "default",
      maintenance: "destructive",
      reserved: "secondary",
    };
    return (
      <Badge variant={variants[status] || "default"} className="text-xs capitalize">
        {status}
      </Badge>
    );
  };

  return (
    <div>
      <Card className="border-none shadow-none">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <div className="text-2xl font-bold">{totalPallets}</div>
            <div className="text-sm text-muted-foreground">Total Pallets</div>
          </div>
          <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
            <div className="text-2xl font-bold">{totalCases}</div>
            <div className="text-sm text-muted-foreground">Total Cases</div>
          </div>
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="text-2xl font-bold">{availableCount}</div>
            <div className="text-sm text-muted-foreground">Available</div>
          </div>
          <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
            <div className="text-2xl font-bold">{maintenanceCount}</div>
            <div className="text-sm text-muted-foreground">Under Service</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Container Hierarchy</h2>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              className="gap-2" 
              onClick={() => {
                toast({
                  title: "Add Case",
                  description: "To add a case, please use the Assets page or Layout Builder."
                });
              }}
            >
              <Plus className="h-4 w-4" />
              Add Case
            </Button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="space-y-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by pallet ID or case ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="reserved">Reserved</SelectItem>
              </SelectContent>
            </Select>
            <Select value={itemTypeFilter} onValueChange={setItemTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Case Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="heavy">Heavy</SelectItem>
                <SelectItem value="fragile">Fragile</SelectItem>
              </SelectContent>
            </Select>
            {(searchQuery || statusFilter !== "all" || itemTypeFilter !== "all") && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2">
                <X className="h-4 w-4" />
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* Main Hierarchy Display */}
        <div className="space-y-3">
          {palletsLoading || casesLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading containers...
            </div>
          ) : filteredPalletGroups.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No containers found matching your filters.</p>
            </div>
          ) : (
            filteredPalletGroups.map(({ pallet, cases: palletCases }) => {
              const isOpen = openPallets.includes(pallet.id);
              return (
                <Collapsible
                  key={pallet.id}
                  open={isOpen}
                  onOpenChange={() => togglePallet(pallet.id)}
                  className="border rounded-lg hover:shadow-md transition-all"
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center gap-4 p-4 hover:bg-accent/50 transition-colors">
                      {isOpen ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                      <Package className="h-5 w-5 text-primary" />
                      <div className="flex-1 text-left">
                        <div className="font-semibold">{pallet.pallet_id}</div>
                        <div className="text-sm text-muted-foreground">{pallet.pallet_type}</div>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Cases: </span>
                          <span className="font-medium">{palletCases.length}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Weight: </span>
                          <span className="font-medium">{pallet.current_weight || 0} lbs</span>
                        </div>
                        {getStatusBadge(pallet.status || "available")}
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="border-t bg-muted/30">
                      {palletCases.length === 0 ? (
                        <div className="p-4 text-sm text-muted-foreground text-center">
                          No cases on this pallet
                        </div>
                      ) : (
                        <div className="divide-y">
                          {palletCases.map((caseItem) => (
                            <div
                              key={caseItem.id}
                              className="flex items-center gap-4 p-3 hover:bg-accent/30 transition-colors"
                            >
                              <Box className="h-4 w-4 text-muted-foreground ml-8" />
                              <div className="flex-1">
                                <div className="font-medium text-sm">{caseItem.case_id}</div>
                                <div className="text-xs text-muted-foreground">
                                  {caseItem.case_type} • {caseItem.weight || 0} lbs
                                  {caseItem.fragile && " • Fragile"}
                                </div>
                              </div>
                              {caseItem.condition && (
                                <Badge variant="outline" className="text-xs capitalize">
                                  {caseItem.condition}
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
};
