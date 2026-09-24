import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, PackagePlus, Wand2, Package, Box, Wrench } from "lucide-react";

interface LoadOutContentsProps {
  pallets: any[];
  onAddPallet: () => void;
  onAddCase: () => void;
  onAddItem: () => void;
  onBulkAdd: () => void;
}

export const LoadOutContents = ({ pallets, onAddPallet, onAddCase, onAddItem, onBulkAdd }: LoadOutContentsProps) => {
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

  const totals = calculateTotals();
  const isEmpty = pallets.length === 0;

  return (
    <Card className="shadow-lg border-l-4 border-l-[#2F5FFF]">
      <CardHeader className="bg-gradient-to-r from-[#2F5FFF] to-[#0D1321] text-white rounded-t-lg">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl">Load-Out Contents</CardTitle>
            <CardDescription className="text-gray-200 mt-1">
              Build your shipment with pallets, cases, and items
            </CardDescription>
          </div>
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
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {isEmpty ? (
          <div className="text-center py-16 bg-gradient-to-br from-muted/30 to-background rounded-lg border border-border/50">
            <div className="mb-6">
              <Wand2 className="h-20 w-20 text-[#2F5FFF] mx-auto mb-4" />
              <p className="text-2xl font-bold text-[#0D1321] mb-2">Start Building Your Shipment</p>
              <p className="text-muted-foreground text-lg">
                Organize your shipment with pallets, cases, and items
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Button onClick={onAddPallet} className="bg-[#2F5FFF] gap-2">
                <Package className="h-5 w-5" />
                Add Pallet
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
                  <span className="bg-[#2F5FFF] text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">1</span>
                  <div>
                    <p className="font-medium">Create Pallets</p>
                    <p className="text-xs">Top-level containers</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="bg-[#2F5FFF] text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">2</span>
                  <div>
                    <p className="font-medium">Add Cases</p>
                    <p className="text-xs">Nested in pallets</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="bg-[#2F5FFF] text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">3</span>
                  <div>
                    <p className="font-medium">Add Items</p>
                    <p className="text-xs">Inventory inside cases</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Summary View */}
            <div className="mb-6 p-4 bg-[#F6F8FB] rounded-lg border">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                <div>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Package className="h-4 w-4 text-[#2F5FFF]" />
                    <p className="text-xs text-muted-foreground font-semibold">Pallets</p>
                  </div>
                  <p className="text-2xl font-bold text-[#0D1321]">{totals.totalPallets}</p>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Box className="h-4 w-4 text-[#2F5FFF]" />
                    <p className="text-xs text-muted-foreground font-semibold">Cases</p>
                  </div>
                  <p className="text-2xl font-bold text-[#0D1321]">{totals.totalCases}</p>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Wrench className="h-4 w-4 text-[#2F5FFF]" />
                    <p className="text-xs text-muted-foreground font-semibold">Items</p>
                  </div>
                  <p className="text-2xl font-bold text-[#0D1321]">{totals.totalItems}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold mb-1">Weight</p>
                  <p className="text-2xl font-bold text-[#2F5FFF]">{totals.totalWeight.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">lbs</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-semibold mb-1">Volume</p>
                  <p className="text-2xl font-bold text-[#2F5FFF]">{totals.totalVolume.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">ft³</p>
                </div>
              </div>
            </div>

            {/* Hierarchy Preview */}
            <div className="space-y-3">
              {pallets.map((pallet) => (
                <div key={pallet.id} className="border-l-4 border-l-[#2F5FFF] bg-gradient-to-r from-[#F6F8FB] to-white p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="bg-[#2F5FFF] p-2 rounded">
                        <Package className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-lg text-[#0D1321]">{pallet.id}</p>
                        <p className="text-sm text-muted-foreground">
                          {pallet.cases?.length || 0} cases • {pallet.itemCount || 0} items
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[#2F5FFF]">
                        {pallet.totalWeight?.toFixed(1) || 0} lb
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {pallet.totalVolume?.toFixed(1) || 0} ft³
                      </p>
                    </div>
                  </div>
                  
                  {pallet.cases && pallet.cases.length > 0 && (
                    <div className="ml-8 mt-3 space-y-2">
                      {pallet.cases.map((caseItem: any) => (
                        <div key={caseItem.id} className="bg-white p-3 rounded border border-border">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Box className="h-4 w-4 text-[#2F5FFF]" />
                              <p className="font-semibold">{caseItem.id}</p>
                              {caseItem.description && (
                                <Badge variant="outline">{caseItem.description}</Badge>
                              )}
                              <span className="text-sm text-muted-foreground">
                                • {caseItem.items?.length || 0} items
                              </span>
                            </div>
                            <p className="text-sm font-semibold">{caseItem.totalWeight?.toFixed(1) || 0} lb</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
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
