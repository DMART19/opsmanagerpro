import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Package, Weight, Layers, AlertTriangle, Ruler, Scale, BarChart3 } from "lucide-react";
import { PlacedCase } from "@/types/pallet-builder";
import { cn } from "@/lib/utils";

interface TabbedSpecsPanelProps {
  palletDimensions: { width: number; length: number };
  maxWeight: number;
  totalWeight: number;
  weightPercentage: number;
  placedCases: PlacedCase[];
  selectedLayer: number;
  onLayerChange: (layer: number) => void;
}

export const TabbedSpecsPanel = ({
  palletDimensions,
  maxWeight,
  totalWeight,
  weightPercentage,
  placedCases,
  selectedLayer,
  onLayerChange,
}: TabbedSpecsPanelProps) => {
  const totalLayers = Math.max(...placedCases.map((c) => c.z), 1);
  const totalCases = placedCases.length;
  
  // Calculate space utilization
  const palletArea = palletDimensions.width * palletDimensions.length;
  const usedArea = placedCases.reduce((sum, c) => {
    const w = (c.rotation === 90 || c.rotation === 270) ? c.length : c.width;
    const l = (c.rotation === 90 || c.rotation === 270) ? c.width : c.length;
    return sum + (w * l);
  }, 0);
  const spaceUtilization = Math.min((usedArea / palletArea) * 100, 100);

  // Weight distribution by quadrant
  const getQuadrantWeight = (quadrant: number) => {
    const midX = palletDimensions.width / 2;
    const midY = palletDimensions.length / 2;
    
    return placedCases.reduce((sum, c) => {
      const cX = c.x + c.width / 2;
      const cY = c.y + c.length / 2;
      
      let inQuadrant = false;
      if (quadrant === 1) inQuadrant = cX >= midX && cY < midY;
      else if (quadrant === 2) inQuadrant = cX < midX && cY < midY;
      else if (quadrant === 3) inQuadrant = cX < midX && cY >= midY;
      else if (quadrant === 4) inQuadrant = cX >= midX && cY >= midY;
      
      return sum + (inQuadrant ? c.weight : 0);
    }, 0);
  };

  const q1 = getQuadrantWeight(1);
  const q2 = getQuadrantWeight(2);
  const q3 = getQuadrantWeight(3);
  const q4 = getQuadrantWeight(4);
  const avgQuadrant = totalWeight / 4;
  const maxDeviation = Math.max(
    Math.abs(q1 - avgQuadrant),
    Math.abs(q2 - avgQuadrant),
    Math.abs(q3 - avgQuadrant),
    Math.abs(q4 - avgQuadrant)
  );
  const isUnbalanced = totalWeight > 0 && maxDeviation > avgQuadrant * 0.3;

  // Stack height check
  const maxStackHeight = 96;
  const currentMaxHeight = Math.max(...placedCases.map(c => c.z * c.height), 0);
  const heightExceeded = currentMaxHeight > maxStackHeight;

  // Warnings
  const warnings = [];
  if (weightPercentage > 100) warnings.push("Weight exceeds maximum capacity!");
  else if (weightPercentage > 90) warnings.push("Near maximum weight capacity");
  if (isUnbalanced) warnings.push("Weight distribution unbalanced");
  if (heightExceeded) warnings.push(`Stack height exceeds ${maxStackHeight}"`);

  // Get weight status color
  const getWeightColor = () => {
    if (weightPercentage > 100) return "text-destructive";
    if (weightPercentage > 80) return "text-amber-600";
    return "text-emerald-600";
  };

  // Layer items count
  const getLayerItemCount = (layer: number) => 
    placedCases.filter(c => c.z === layer).length;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 border-b">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          Pallet Specs
        </CardTitle>
      </CardHeader>
      
      <Tabs defaultValue="specs" className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-3 grid grid-cols-2">
          <TabsTrigger value="specs" className="text-xs">
            <Scale className="h-3 w-3 mr-1.5" />
            Specs
          </TabsTrigger>
          <TabsTrigger value="layers" className="text-xs">
            <Layers className="h-3 w-3 mr-1.5" />
            Layers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="specs" className="flex-1 overflow-auto p-4 pt-3 space-y-5 m-0">
          {/* Dimensions - Compact */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Ruler className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Dimensions</span>
            </div>
            <span className="font-semibold text-sm">
              {palletDimensions.width}" × {palletDimensions.length}"
            </span>
          </div>

          {/* Weight Capacity - PROMINENT */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Weight className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Weight Capacity</span>
              </div>
              <Badge variant={weightPercentage > 100 ? "destructive" : "secondary"}>
                {weightPercentage.toFixed(0)}%
              </Badge>
            </div>
            
            <div className="relative">
              <Progress
                value={Math.min(weightPercentage, 100)}
                className={cn(
                  "h-4 rounded-md",
                  weightPercentage > 100 
                    ? "[&>div]:bg-destructive" 
                    : weightPercentage > 80 
                      ? "[&>div]:bg-amber-500" 
                      : "[&>div]:bg-emerald-500"
                )}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-bold text-white drop-shadow-sm">
                  {totalWeight.toLocaleString()} / {maxWeight.toLocaleString()} lbs
                </span>
              </div>
            </div>
            
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0 lbs</span>
              <span className={cn("font-semibold", getWeightColor())}>
                {(maxWeight - totalWeight).toLocaleString()} lbs remaining
              </span>
              <span>{maxWeight.toLocaleString()} lbs</span>
            </div>
          </div>

          {/* Weight Distribution - ENHANCED */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">Weight Distribution</span>
              <Badge 
                variant={isUnbalanced ? "destructive" : "secondary"}
                className={cn(
                  "text-[10px]",
                  !isUnbalanced && "bg-emerald-50 text-emerald-700 border-emerald-200"
                )}
              >
                {isUnbalanced ? "⚠ Unbalanced" : "✓ Balanced"}
              </Badge>
            </div>
            
            {/* Visual Grid - Larger & More Prominent */}
            <div className="grid grid-cols-2 gap-1.5 p-3 bg-muted/30 rounded-lg border">
              {[
                { label: "NW", value: q2 },
                { label: "NE", value: q1 },
                { label: "SW", value: q3 },
                { label: "SE", value: q4 },
              ].map(({ label, value }) => {
                const deviation = avgQuadrant > 0 
                  ? Math.abs(value - avgQuadrant) / avgQuadrant 
                  : 0;
                const isHigh = deviation > 0.3;
                
                return (
                  <div 
                    key={label}
                    className={cn(
                      "p-3 rounded-md text-center transition-colors",
                      isHigh 
                        ? "bg-amber-100 border border-amber-300" 
                        : "bg-card border"
                    )}
                  >
                    <div className="text-[10px] text-muted-foreground mb-0.5">{label}</div>
                    <div className={cn(
                      "text-base font-bold",
                      isHigh ? "text-amber-700" : "text-foreground"
                    )}>
                      {value.toFixed(0)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">lbs</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Space Utilization */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Items Placed</span>
            </div>
            <div className="text-right">
              <span className="font-semibold text-sm">{totalCases} items</span>
              <span className="text-xs text-muted-foreground ml-2">
                ({spaceUtilization.toFixed(0)}% fill)
              </span>
            </div>
          </div>

          {/* Alerts */}
          {warnings.length > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center gap-1.5 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">Alerts</span>
              </div>
              <div className="space-y-1.5">
                {warnings.map((warning, idx) => (
                  <div
                    key={idx}
                    className="text-xs p-2 rounded bg-destructive/10 text-destructive border border-destructive/20"
                  >
                    {warning}
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="layers" className="flex-1 overflow-auto p-4 pt-3 space-y-4 m-0">
          {/* Layer Summary */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="text-sm text-muted-foreground">Total Layers</span>
            <span className="font-semibold">{totalLayers}</span>
          </div>

          {/* Layer Selector */}
          <div className="space-y-2">
            <span className="text-sm font-medium">Select Layer</span>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: Math.max(totalLayers, 4) }, (_, i) => i + 1).map((layer) => {
                const itemCount = getLayerItemCount(layer);
                const isActive = selectedLayer === layer;
                
                return (
                  <button
                    key={layer}
                    onClick={() => onLayerChange(layer)}
                    className={cn(
                      "p-3 rounded-lg border text-center transition-all",
                      isActive 
                        ? "bg-primary text-primary-foreground border-primary" 
                        : "bg-card hover:border-primary/50"
                    )}
                  >
                    <div className="text-lg font-bold">{layer}</div>
                    <div className={cn(
                      "text-[10px]",
                      isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                    )}>
                      {itemCount} items
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current Layer Details */}
          <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Layer {selectedLayer}</span>
              <Badge variant="outline">{getLayerItemCount(selectedLayer)} items</Badge>
            </div>
            
            {getLayerItemCount(selectedLayer) > 0 ? (
              <div className="space-y-2">
                {placedCases
                  .filter(c => c.z === selectedLayer)
                  .slice(0, 5)
                  .map((c, idx) => (
                    <div 
                      key={c.id}
                      className="flex items-center justify-between text-xs p-2 bg-card rounded border"
                    >
                      <span className="font-medium truncate max-w-[120px]">{c.caseId}</span>
                      <span className="text-muted-foreground">{c.weight} lbs</span>
                    </div>
                  ))}
                {getLayerItemCount(selectedLayer) > 5 && (
                  <div className="text-xs text-center text-muted-foreground">
                    +{getLayerItemCount(selectedLayer) - 5} more items
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No items on this layer
              </div>
            )}
          </div>

          {/* Height Warning */}
          {heightExceeded && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
              <div className="text-xs text-destructive">
                Stack height ({currentMaxHeight}") exceeds safe limit ({maxStackHeight}")
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
};
