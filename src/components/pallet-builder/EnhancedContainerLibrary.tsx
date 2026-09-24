import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus, Package, Boxes, Weight, Ruler } from "lucide-react";
import { useCases } from "@/hooks/use-cases";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface EnhancedContainerLibraryProps {
  onAddCase: (caseData: any) => void;
}

export const EnhancedContainerLibrary = ({ onAddCase }: EnhancedContainerLibraryProps) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const { cases, loading: casesLoading } = useCases();

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

  const isEmpty = filteredCases.length === 0;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 border-b flex-shrink-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Boxes className="h-4 w-4 text-primary" />
          Item Library
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 flex-1 flex flex-col overflow-hidden">
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        {/* Add Button */}
        <Button
          onClick={() => navigate('/inventory?action=addCase')}
          variant="outline"
          size="sm"
          className="w-full mb-3"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add New Item
        </Button>

        {/* Container List */}
        <ScrollArea className="flex-1">
          <div className="space-y-2 pr-2">
            {casesLoading ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                Loading items...
              </div>
            ) : isEmpty ? (
              <div className="text-center py-8 space-y-2">
                <Package className="h-10 w-10 text-muted-foreground mx-auto opacity-50" />
                <p className="text-sm text-muted-foreground">No items found</p>
              </div>
            ) : (
              filteredCases.map((caseItem) => (
                <Card
                  key={caseItem.id}
                  className={cn(
                    "cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all",
                    "active:scale-[0.98]"
                  )}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/json", JSON.stringify(caseItem));
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => handleAddCaseToBuilder(caseItem)}
                >
                  <CardContent className="p-3">
                    {/* Header Row - Name + Badges */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm truncate">{caseItem.case_id}</div>
                        <div className="text-xs text-muted-foreground">{caseItem.case_type || "Standard"}</div>
                      </div>
                      {caseItem.fragile && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 shrink-0">
                          Fragile
                        </Badge>
                      )}
                    </div>
                    
                    {/* Key Attributes - PROMINENT */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-1.5 p-2 bg-muted/50 rounded">
                        <Ruler className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-semibold">
                          {caseItem.length || 12}×{caseItem.width || 12}×{caseItem.height || 12}"
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 p-2 bg-muted/50 rounded">
                        <Weight className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-semibold">{caseItem.weight || 50} lbs</span>
                      </div>
                    </div>
                    
                    {/* Contents - Secondary */}
                    {caseItem.contents && (
                      <div className="text-[11px] text-muted-foreground mt-2 truncate">
                        {caseItem.contents}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
