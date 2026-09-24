import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Plus, 
  Package, 
  Box, 
  Wrench, 
  PackagePlus, 
  Wand2, 
  LayoutGrid,
  LayoutList,
  QrCode,
  ChevronDown
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ShipmentBuilderProps {
  pallets: any[];
  onAddPallet: () => void;
  onAddCase: () => void;
  onAddItem: () => void;
  onBulkAdd: () => void;
}

export const ShipmentBuilder = ({ 
  pallets, 
  onAddPallet, 
  onAddCase, 
  onAddItem, 
  onBulkAdd 
}: ShipmentBuilderProps) => {
  const [view, setView] = useState<"table" | "hierarchy">("hierarchy");

  const calculateTotals = () => {
    let totalWeight = 0;
    let totalVolume = 0;
    let totalItems = 0;
    let totalCases = 0;

    pallets.forEach(pallet => {
      pallet.cases?.forEach((caseItem: any) => {
        totalCases++;
        totalWeight += caseItem.totalWeight || 0;
        caseItem.items?.forEach((item: any) => {
          totalItems += item.quantity || 0;
          totalVolume += item.volume || 0;
        });
      });
    });

    return {
      totalWeight,
      totalVolume,
      totalItems,
      totalPallets: pallets.length,
      totalCases,
    };
  };

  const getConditionColor = (condition: string) => {
    switch (condition.toLowerCase()) {
      case "excellent": return "bg-green-500";
      case "good": return "bg-blue-500";
      case "fair": return "bg-yellow-500";
      case "poor": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const totals = calculateTotals();
  const isEmpty = pallets.length === 0;

  const ActionButtons = () => (
    <div className="flex flex-wrap gap-2">
      <Button onClick={onAddPallet} variant="secondary" size="sm" className="gap-2">
        <Package className="h-4 w-4" />
        Pallet
      </Button>
      <Button onClick={onAddCase} variant="secondary" size="sm" className="gap-2">
        <Box className="h-4 w-4" />
        Case
      </Button>
      <Button onClick={onAddItem} variant="secondary" size="sm" className="gap-2">
        <Wrench className="h-4 w-4" />
        Item
      </Button>
      <Button onClick={onBulkAdd} variant="secondary" size="sm" className="gap-2">
        <PackagePlus className="h-4 w-4" />
        Bulk Add
      </Button>
    </div>
  );

  const EmptyState = () => (
    <div className="text-center py-16 bg-gradient-to-br from-muted/30 to-background rounded-lg border border-border/50">
      <div className="mb-6">
        <Wand2 className="h-20 w-20 text-primary mx-auto mb-4" />
        <p className="text-2xl font-bold text-foreground mb-2">Start Building Your Transfer</p>
        <p className="text-muted-foreground text-lg">
          Organize your transfer with containers, cases, and items
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={onAddPallet} className="gap-2">
          <Package className="h-5 w-5" />
          Add Container
        </Button>
        <Button onClick={onAddCase} variant="outline" className="gap-2">
          <Box className="h-5 w-5" />
          Add Case
        </Button>
        <Button onClick={onAddItem} variant="outline" className="gap-2">
          <Wrench className="h-5 w-5" />
          Add Item
        </Button>
        <Button onClick={onBulkAdd} variant="outline" className="gap-2">
          <PackagePlus className="h-5 w-5" />
          Bulk Add from Inventory
        </Button>
      </div>
      <div className="mt-8 text-sm text-muted-foreground">
        <p className="font-semibold mb-2">Quick Start Guide:</p>
        <div className="flex justify-center gap-8 text-left">
          <div className="flex items-start gap-2">
            <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">1</span>
            <div>
              <p className="font-medium">Create Containers</p>
              <p className="text-xs">Top-level groupings</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">2</span>
            <div>
              <p className="font-medium">Add Cases</p>
              <p className="text-xs">Nested in containers</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">3</span>
            <div>
              <p className="font-medium">Add Items</p>
              <p className="text-xs">Assets inside cases</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const TableView = () => (
    <div className="space-y-3">
      {/* Table Header */}
      <div className="bg-gradient-to-r from-[#0D1321] to-[#2F5FFF] text-white p-3 rounded-lg grid grid-cols-12 gap-2 text-sm font-semibold">
        <div className="col-span-3">Container ID</div>
        <div className="col-span-2">Type</div>
        <div className="col-span-2">Items</div>
        <div className="col-span-2">Weight (lb)</div>
        <div className="col-span-2">Volume (ft³)</div>
        <div className="col-span-1">Status</div>
      </div>

      {/* Table Rows */}
      {pallets.map((pallet) => (
        <div key={pallet.id} className="space-y-2">
          {/* Pallet Row */}
          <div className="bg-gradient-to-r from-[#F6F8FB] to-white border-l-4 border-l-[#2F5FFF] p-3 rounded-lg grid grid-cols-12 gap-2 items-center hover:shadow-md transition-all">
            <div className="col-span-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-[#2F5FFF]" title="Pallet" />
              <span className="font-bold text-[#0D1321]">{pallet.id}</span>
            </div>
            <div className="col-span-2 text-sm text-muted-foreground">Pallet</div>
            <div className="col-span-2 text-sm font-semibold">{pallet.itemCount || 0}</div>
            <div className="col-span-2 text-sm font-semibold text-[#2F5FFF]">{pallet.totalWeight?.toFixed(1) || 0}</div>
            <div className="col-span-2 text-sm font-semibold text-[#2F5FFF]">{pallet.totalVolume?.toFixed(1) || 0}</div>
            <div className="col-span-1">
              <Badge variant="outline" className="text-xs">{pallet.section || "—"}</Badge>
            </div>
          </div>

          {/* Cases */}
          {pallet.cases?.map((caseItem: any) => (
            <div key={caseItem.id} className="ml-8 space-y-1">
              {/* Case Row */}
              <div className="bg-white border border-border p-3 rounded-lg grid grid-cols-12 gap-2 items-center hover:shadow-sm transition-all">
                <div className="col-span-3 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-400" title="Case" />
                  <span className="font-semibold text-[#0D1321]">{caseItem.id}</span>
                </div>
                <div className="col-span-2 text-sm text-muted-foreground">Case</div>
                <div className="col-span-2 text-sm">{caseItem.items?.length || 0}</div>
                <div className="col-span-2 text-sm font-semibold">{caseItem.totalWeight?.toFixed(2) || 0}</div>
                <div className="col-span-2 text-sm">
                  {caseItem.dimensions?.length}×{caseItem.dimensions?.width}×{caseItem.dimensions?.height} in
                </div>
                <div className="col-span-1">
                  {caseItem.description && <Badge variant="outline" className="text-xs">{caseItem.description}</Badge>}
                </div>
              </div>

              {/* Items */}
              {caseItem.items?.map((item: any, idx: number) => (
                <div key={idx} className="ml-8 bg-gradient-to-r from-white to-[#F6F8FB] border border-border p-2 rounded grid grid-cols-12 gap-2 items-center text-sm hover:shadow-sm transition-all">
                  <div className="col-span-3 flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-green-500" title="Item" />
                    <span className="font-medium">{item.item_name}</span>
                  </div>
                  <div className="col-span-2 text-muted-foreground">Item</div>
                  <div className="col-span-2">Qty: {item.quantity}</div>
                  <div className="col-span-2 font-semibold">{item.total_weight?.toFixed(2)}</div>
                  <div className="col-span-2 text-muted-foreground">{item.volume?.toFixed(2)}</div>
                  <div className="col-span-1">
                    <Badge className={getConditionColor(item.condition)}>{item.condition}</Badge>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  const HierarchyView = () => (
    <div className="space-y-4">
      {pallets.map((pallet) => (
        <Collapsible key={pallet.id} defaultOpen className="animate-fade-in">
          <CollapsibleTrigger className="w-full group">
            <div className="flex items-center justify-between p-5 bg-gradient-to-r from-[#F6F8FB] to-white rounded-lg border-2 border-[#2F5FFF]/20 hover:border-[#2F5FFF] transition-all shadow-md hover:shadow-lg">
              <div className="flex items-center gap-4">
                <div className="bg-[#2F5FFF] p-3 rounded-lg shadow-md">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-xl text-[#0D1321]">{pallet.id}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-sm text-muted-foreground font-medium">
                      {pallet.cases?.length || 0} cases
                    </p>
                    <span className="text-muted-foreground">•</span>
                    <p className="text-sm text-muted-foreground font-medium">
                      {pallet.itemCount || 0} items
                    </p>
                    {pallet.section && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <Badge variant="outline" className="text-xs">
                          Section {pallet.section}
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6 mr-4">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground font-semibold">Weight</p>
                  <p className="font-bold text-lg text-[#2F5FFF]">
                    {pallet.totalWeight?.toFixed(1) || 0} lb
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground font-semibold">Volume</p>
                  <p className="font-bold text-lg text-[#2F5FFF]">
                    {pallet.totalVolume?.toFixed(1) || 0} ft³
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={(e) => e.stopPropagation()}
                  className="hover-scale"
                >
                  <QrCode className="h-4 w-4" />
                </Button>
                <ChevronDown className="h-5 w-5 text-muted-foreground group-data-[state=open]:rotate-180 transition-transform duration-300" />
              </div>
            </div>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="mt-3 ml-8 space-y-3 animate-accordion-down">
            {!pallet.cases || pallet.cases.length === 0 ? (
              <div className="p-4 bg-muted/30 rounded-lg border border-border text-center">
                <p className="text-sm text-muted-foreground">No cases in this pallet yet</p>
              </div>
            ) : (
              pallet.cases.map((caseItem: any) => (
                <Collapsible key={caseItem.id} defaultOpen>
                  <div className="border-l-2 border-[#2F5FFF] pl-4">
                    <CollapsibleTrigger className="w-full group/case">
                      <div className="p-4 bg-white rounded-lg border border-border shadow-sm hover:shadow-md transition-all hover:border-[#2F5FFF]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="bg-white border-2 border-[#2F5FFF] p-2 rounded">
                              <Box className="h-5 w-5 text-[#2F5FFF]" />
                            </div>
                            <div className="text-left">
                              <p className="font-semibold text-lg text-[#0D1321]">{caseItem.id}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {caseItem.description && (
                                  <Badge variant="outline" className="text-xs">
                                    {caseItem.description}
                                  </Badge>
                                )}
                                <span className="text-sm text-muted-foreground">
                                  • {caseItem.items?.length || 0} items
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-sm font-bold text-[#0D1321]">
                                {caseItem.totalWeight?.toFixed(2) || 0} lb
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {caseItem.dimensions?.length || 0}×{caseItem.dimensions?.width || 0}×{caseItem.dimensions?.height || 0} in
                              </p>
                            </div>
                            <ChevronDown className="h-4 w-4 text-muted-foreground group-data-[state=open]/case:rotate-180 transition-transform duration-300" />
                          </div>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="mt-2 ml-6 space-y-2 animate-accordion-down">
                      {!caseItem.items || caseItem.items.length === 0 ? (
                        <div className="p-3 bg-muted/30 rounded border border-border text-center">
                          <p className="text-xs text-muted-foreground">No items in this case yet</p>
                        </div>
                      ) : (
                        caseItem.items.map((item: any, idx: number) => (
                          <div key={idx} className="p-3 bg-gradient-to-r from-white to-[#F6F8FB] rounded-lg border border-border shadow-sm hover:shadow-md transition-all animate-fade-in">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="bg-green-500/10 p-2 rounded">
                                  <Wrench className="h-4 w-4 text-green-600" />
                                </div>
                                <div>
                                  <p className="font-semibold text-base text-[#0D1321]">{item.item_name}</p>
                                  <div className="flex items-center gap-3 mt-1">
                                    <p className="text-sm text-muted-foreground">
                                      Qty: <span className="font-semibold">{item.quantity}</span>
                                    </p>
                                    <span className="text-muted-foreground">•</span>
                                    <p className="text-sm text-muted-foreground">
                                      {item.dimensions_length}×{item.dimensions_width}×{item.dimensions_height} in
                                    </p>
                                    <span className="text-muted-foreground">•</span>
                                    <p className="text-sm text-muted-foreground">
                                      {item.volume?.toFixed(2)} ft³
                                    </p>
                                  </div>
                                  {item.notes && (
                                    <p className="text-sm text-muted-foreground mt-1 italic">
                                      {item.notes}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <Badge className={getConditionColor(item.condition)}>
                                  {item.condition}
                                </Badge>
                                <div className="text-right">
                                  <p className="text-sm font-bold text-[#0D1321]">
                                    {item.total_weight?.toFixed(2)} lb
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {item.unit_weight} lb/unit
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))
            )}
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );

  return (
    <Card className="shadow-lg border-l-4 border-l-[#2F5FFF]">
      <CardHeader className="bg-gradient-to-r from-[#2F5FFF] to-[#0D1321] text-white rounded-t-lg">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Shipment Builder</CardTitle>
            <CardDescription className="text-gray-200 mt-1">
              Build and visualize your shipment structure
            </CardDescription>
          </div>
          <ActionButtons />
        </div>
      </CardHeader>
      
      <CardContent className="pt-6">
        {isEmpty ? (
          <EmptyState />
        ) : (
          <>
            {/* View Toggle */}
            <div className="mb-6 flex items-center justify-between">
              <Tabs value={view} onValueChange={(v) => setView(v as "table" | "hierarchy")} className="w-full">
                <TabsList className="grid w-[400px] grid-cols-2">
                  <TabsTrigger value="hierarchy" className="gap-2">
                    <LayoutGrid className="h-4 w-4" />
                    Hierarchy View
                  </TabsTrigger>
                  <TabsTrigger value="table" className="gap-2">
                    <LayoutList className="h-4 w-4" />
                    Table View
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Summary Stats */}
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="flex items-center gap-1">
                    <Package className="h-4 w-4 text-[#2F5FFF]" />
                    <span className="text-2xl font-bold text-[#0D1321]">{totals.totalPallets}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Pallets</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center gap-1">
                    <Box className="h-4 w-4 text-[#2F5FFF]" />
                    <span className="text-2xl font-bold text-[#0D1321]">{totals.totalCases}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Cases</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center gap-1">
                    <Wrench className="h-4 w-4 text-[#2F5FFF]" />
                    <span className="text-2xl font-bold text-[#0D1321]">{totals.totalItems}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Items</p>
                </div>
              </div>
            </div>

            {/* Content Views */}
            {view === "table" ? <TableView /> : <HierarchyView />}
          </>
        )}
      </CardContent>
      
      {/* Always-visible totals footer */}
      {!isEmpty && (
        <div className="sticky bottom-0 bg-gradient-to-r from-[#0D1321] to-[#2F5FFF] text-white px-6 py-4 rounded-b-lg">
          <div className="flex items-center justify-between">
            <p className="font-bold text-lg">Shipment Totals</p>
            <div className="flex items-center gap-8">
              <div className="text-right">
                <p className="text-xs text-gray-200">Total Items</p>
                <p className="font-bold text-xl">{totals.totalItems}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-200">Total Weight</p>
                <p className="font-bold text-xl">{totals.totalWeight.toFixed(1)} lb</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-200">Total Volume</p>
                <p className="font-bold text-xl">{totals.totalVolume.toFixed(1)} ft³</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
