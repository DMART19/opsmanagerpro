import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Package, QrCode, ChevronDown, Box, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PackagingBreakdownProps {
  pallets: any[];
}

export const PackagingBreakdown = ({ pallets }: PackagingBreakdownProps) => {
  const getConditionColor = (condition: string) => {
    switch (condition.toLowerCase()) {
      case "excellent": return "bg-green-500";
      case "good": return "bg-blue-500";
      case "fair": return "bg-yellow-500";
      case "poor": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <Card className="shadow-lg border-l-4 border-l-[#0D1321]">
      <CardHeader className="bg-gradient-to-r from-[#0D1321] to-[#2F5FFF] text-white rounded-t-lg">
        <CardTitle className="text-2xl">Packaging Breakdown</CardTitle>
        <CardDescription className="text-gray-200 mt-1">
          Hierarchical view organized by pallet and case
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        {pallets.length === 0 ? (
          <div className="text-center py-12 bg-muted/20 rounded-lg border border-border/50">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">No pallets configured yet</p>
            <p className="text-sm text-muted-foreground mt-2">Add pallets to see the packaging structure</p>
          </div>
        ) : (
          pallets.map((pallet) => (
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
                  <div className="p-4 bg-muted/30 rounded-lg border border-border/50 text-center">
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
          ))
        )}
      </CardContent>
    </Card>
  );
};
