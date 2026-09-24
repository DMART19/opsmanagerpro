import { useState, useMemo, useEffect } from "react";
import { Search, Filter, X, Plus, ArrowUpDown, ChevronDown, LogOut, Package } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EquipmentDrawer } from "./EquipmentDrawer";
import { EnhancedPagination } from "./EnhancedPagination";
import { AssetCheckoutDialog } from "./AssetCheckoutDialog";
import { useEquipment } from "@/hooks/use-equipment";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const statusConfig = {
  available: { label: "Available", variant: "default" as const, color: "bg-success/10 text-success border-success/20" },
  checked_out: { label: "In Use", variant: "secondary" as const, color: "bg-warning/10 text-warning border-warning/20" },
  maintenance: { label: "Service", variant: "destructive" as const, color: "bg-destructive/10 text-destructive border-destructive/20" },
  retired: { label: "Retired", variant: "outline" as const, color: "bg-muted text-muted-foreground border-muted" },
};

const conditionConfig = {
  excellent: { label: "Excellent", color: "text-success" },
  good: { label: "Good", color: "text-primary" },
  fair: { label: "Fair", color: "text-warning" },
  poor: { label: "Poor", color: "text-destructive" },
  needs_repair: { label: "Needs Repair", color: "text-destructive" },
};

export const AllEquipment = () => {
  const { equipment, loading, refetch } = useEquipment();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEquipment, setSelectedEquipment] = useState<any | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  
  // Checkout dialog state
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [checkoutEquipment, setCheckoutEquipment] = useState<any | null>(null);

  // Advanced filter states
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [selectedWarehouses, setSelectedWarehouses] = useState<string[]>([]);

  // Get unique values from real data for filters
  const { uniqueCategories, uniqueWarehouses } = useMemo(() => {
    const categories = new Set<string>();
    const warehouses = new Set<string>();
    
    equipment.forEach(item => {
      if (item.category) categories.add(item.category);
      if (item.warehouse_id) warehouses.add(item.warehouse_id);
    });
    
    return {
      uniqueCategories: Array.from(categories).sort(),
      uniqueWarehouses: Array.from(warehouses).sort(),
    };
  }, [equipment]);

  // Get custodian info for checked-out equipment
  const [custodianMap, setCustodianMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadCustodians = async () => {
      const checkedOutEquipment = equipment.filter(e => e.status === "checked_out");
      if (checkedOutEquipment.length === 0) return;

      const { data, error } = await supabase
        .from("equipment_checkouts")
        .select(`
          equipment_id,
          staff:staff_id (
            first_name,
            last_name,
            email
          )
        `)
        .eq("status", "active")
        .in("equipment_id", checkedOutEquipment.map(e => e.id));

      if (!error && data) {
        const map: Record<string, string> = {};
        data.forEach(checkout => {
          const staff = checkout.staff as any;
          map[checkout.equipment_id] = staff ? `${staff.first_name} ${staff.last_name}` : "—";
        });
        setCustodianMap(map);
      }
    };

    loadCustodians();
  }, [equipment]);

  const handleRowClick = (equipment: any) => {
    setSelectedEquipment(equipment);
    setDrawerOpen(true);
  };

  const handleCheckoutClick = (e: React.MouseEvent, equipment: any) => {
    e.stopPropagation();
    setCheckoutEquipment(equipment);
    setCheckoutDialogOpen(true);
  };

  const handleCheckoutSuccess = () => {
    refetch();
  };

  const clearAllFilters = () => {
    setSelectedStatuses([]);
    setSelectedCategories([]);
    setSelectedConditions([]);
    setSelectedWarehouses([]);
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  // Apply search and filters
  const filteredEquipment = useMemo(() => {
    let filtered = [...equipment];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.name?.toLowerCase().includes(query) ||
        item.asset_tag?.toLowerCase().includes(query) ||
        item.serial_number?.toLowerCase().includes(query) ||
        custodianMap[item.id]?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter(item => selectedStatuses.includes(item.status));
    }

    // Category filter
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(item => selectedCategories.includes(item.category));
    }

    // Condition filter
    if (selectedConditions.length > 0) {
      filtered = filtered.filter(item => selectedConditions.includes(item.condition));
    }

    // Warehouse filter
    if (selectedWarehouses.length > 0) {
      filtered = filtered.filter(item => selectedWarehouses.includes(item.warehouse_id));
    }

    // Sorting
    if (sortBy) {
      filtered.sort((a, b) => {
        let aVal = a[sortBy];
        let bVal = b[sortBy];
        
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        
        if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
        if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [equipment, searchQuery, selectedStatuses, selectedCategories, selectedConditions, selectedWarehouses, sortBy, sortOrder, custodianMap]);

  // Pagination
  const totalPages = Math.ceil(filteredEquipment.length / itemsPerPage);
  const paginatedEquipment = filteredEquipment.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const activeFilterCount = selectedStatuses.length + selectedCategories.length + selectedConditions.length + selectedWarehouses.length;

  if (loading) {
    return (
      <Card className="p-4 sm:p-6">
        <div className="space-y-4">
          <div className="flex gap-3">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-4 sm:p-6">
        <div className="space-y-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by asset tag, equipment name, serial number, or custodian..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => setAdvancedFiltersOpen(true)}
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Advanced Filters</span>
              <span className="sm:hidden">Filters</span>
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2 rounded-full h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(statusConfig).map(([key, config]) => (
              <Badge
                key={key}
                variant={selectedStatuses.includes(key) ? "default" : "outline"}
                className="cursor-pointer hover:bg-accent transition-colors"
                onClick={() => {
                  if (selectedStatuses.includes(key)) {
                    setSelectedStatuses(selectedStatuses.filter(s => s !== key));
                  } else {
                    setSelectedStatuses([...selectedStatuses, key]);
                  }
                }}
              >
                {config.label}
                {selectedStatuses.includes(key) && (
                  <X className="ml-1 h-3 w-3" />
                )}
              </Badge>
            ))}
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear All
              </Button>
            )}
          </div>
        </div>

        {paginatedEquipment.length === 0 && filteredEquipment.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No assets found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {equipment.length === 0 
                ? "Add your first asset to get started"
                : "Try adjusting your search or filters"}
            </p>
            {equipment.length === 0 && (
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Asset
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block rounded-xl border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted/50 z-10">
                    <TableRow>
                      <TableHead 
                        className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors"
                        onClick={() => handleSort("asset_tag")}
                      >
                        <div className="flex items-center gap-2">
                          Asset Tag
                          <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="font-semibold cursor-pointer hover:bg-muted/70 transition-colors"
                        onClick={() => handleSort("name")}
                      >
                        <div className="flex items-center gap-2">
                          Name
                          <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold">Category</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold text-center">Stock</TableHead>
                      <TableHead className="font-semibold">Condition</TableHead>
                      <TableHead className="font-semibold">Assigned To</TableHead>
                      <TableHead className="font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedEquipment.map((item, index) => (
                      <TableRow
                        key={item.id}
                        className={`cursor-pointer hover:bg-accent/5 transition-colors ${
                          index % 2 === 0 ? "bg-background" : "bg-muted/20"
                        }`}
                        onClick={() => handleRowClick(item)}
                      >
                        <TableCell className="font-mono text-sm font-medium">
                          {item.asset_tag}
                        </TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-sm">{item.category || "—"}</TableCell>
                        <TableCell>
                          <Badge className={statusConfig[item.status as keyof typeof statusConfig]?.color || "bg-muted"}>
                            {statusConfig[item.status as keyof typeof statusConfig]?.label || item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="inline-flex items-center gap-1.5 text-sm">
                                  <span className={`font-semibold ${(item.available_quantity ?? 1) === 0 ? 'text-destructive' : (item.available_quantity ?? 1) <= 2 ? 'text-warning' : 'text-success'}`}>
                                    {item.available_quantity ?? 1}
                                  </span>
                                  <span className="text-muted-foreground">/</span>
                                  <span className="text-muted-foreground">{item.total_quantity ?? 1}</span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-xs space-y-1">
                                  <p>Available: {item.available_quantity ?? 1}</p>
                                  <p>Checked Out: {item.checked_out_quantity ?? 0}</p>
                                  <p>Total: {item.total_quantity ?? 1}</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className={`text-sm font-medium ${conditionConfig[item.condition as keyof typeof conditionConfig]?.color || "text-muted-foreground"}`}>
                          {conditionConfig[item.condition as keyof typeof conditionConfig]?.label || item.condition || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {item.status === "checked_out" || (item.checked_out_quantity ?? 0) > 0 
                            ? custodianMap[item.id] || "Assigned" 
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 h-8"
                            onClick={(e) => handleCheckoutClick(e, item)}
                            disabled={(item.available_quantity ?? 1) === 0}
                          >
                            <LogOut className="h-3.5 w-3.5" />
                            <span className="hidden xl:inline">Check Out</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-3">
              {paginatedEquipment.map((item) => (
                <Card
                  key={item.id}
                  className="p-4 cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all"
                  onClick={() => handleRowClick(item)}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-xs text-muted-foreground mb-1">
                          {item.asset_tag}
                        </div>
                        <h3 className="font-semibold text-sm mb-2 leading-tight">
                          {item.name}
                        </h3>
                      </div>
                      <Badge className={statusConfig[item.status as keyof typeof statusConfig]?.color || "bg-muted"}>
                        {statusConfig[item.status as keyof typeof statusConfig]?.label || item.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Stock:</span>
                        <span className={`ml-1 font-medium ${(item.available_quantity ?? 1) === 0 ? 'text-destructive' : 'text-foreground'}`}>
                          {item.available_quantity ?? 1}/{item.total_quantity ?? 1}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Condition:</span>
                        <span className={`ml-1 font-medium ${conditionConfig[item.condition as keyof typeof conditionConfig]?.color || "text-muted-foreground"}`}>
                          {conditionConfig[item.condition as keyof typeof conditionConfig]?.label || item.condition || "—"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Out:</span>
                        <span className="ml-1 font-medium">{item.checked_out_quantity ?? 0}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        View Details
                      </Button>
                      <Button 
                        size="sm" 
                        className="gap-1.5"
                        onClick={(e) => handleCheckoutClick(e, item)}
                        disabled={(item.available_quantity ?? 1) === 0}
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Check Out
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            <EnhancedPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={filteredEquipment.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(val) => {
                setItemsPerPage(val);
                setCurrentPage(1);
              }}
              itemsPerPageOptions={[10, 25, 50, 100]}
            />
          </>
        )}
      </Card>

      {/* Advanced Filters Drawer */}
      <Sheet open={advancedFiltersOpen} onOpenChange={setAdvancedFiltersOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Advanced Filters</SheetTitle>
            <SheetDescription>
              Apply multiple filters to refine your equipment search
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-220px)] pr-4 mt-6">
            <div className="space-y-6">
              {/* Status Filter */}
              <div>
                <Label className="text-base font-semibold mb-3 block">Status</Label>
                <div className="space-y-3">
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        id={`status-${key}`}
                        checked={selectedStatuses.includes(key)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedStatuses([...selectedStatuses, key]);
                          } else {
                            setSelectedStatuses(selectedStatuses.filter((s) => s !== key));
                          }
                        }}
                      />
                      <Label htmlFor={`status-${key}`} className="text-sm cursor-pointer">
                        {config.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category Filter */}
              {uniqueCategories.length > 0 && (
                <div>
                  <Label className="text-base font-semibold mb-3 block">Category</Label>
                  <div className="space-y-3">
                    {uniqueCategories.map((category) => (
                      <div key={category} className="flex items-center space-x-2">
                        <Checkbox
                          id={`category-${category}`}
                          checked={selectedCategories.includes(category)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedCategories([...selectedCategories, category]);
                            } else {
                              setSelectedCategories(selectedCategories.filter((c) => c !== category));
                            }
                          }}
                        />
                        <Label htmlFor={`category-${category}`} className="text-sm cursor-pointer">
                          {category}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Condition Filter */}
              <div>
                <Label className="text-base font-semibold mb-3 block">Condition</Label>
                <div className="space-y-3">
                  {Object.entries(conditionConfig).map(([key, config]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        id={`condition-${key}`}
                        checked={selectedConditions.includes(key)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedConditions([...selectedConditions, key]);
                          } else {
                            setSelectedConditions(selectedConditions.filter((c) => c !== key));
                          }
                        }}
                      />
                      <Label htmlFor={`condition-${key}`} className="text-sm cursor-pointer">
                        {config.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>

          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={clearAllFilters} className="flex-1">
              Clear All
            </Button>
            <Button onClick={() => setAdvancedFiltersOpen(false)} className="flex-1">
              Apply Filters
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Equipment Details Drawer */}
      <EquipmentDrawer
        equipment={selectedEquipment}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />

      {/* Checkout Dialog */}
      <AssetCheckoutDialog
        open={checkoutDialogOpen}
        onOpenChange={setCheckoutDialogOpen}
        equipment={checkoutEquipment}
        onSuccess={handleCheckoutSuccess}
      />
    </>
  );
};
