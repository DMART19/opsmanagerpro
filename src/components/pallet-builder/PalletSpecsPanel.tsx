import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Package, Weight, Layers, AlertTriangle, Grid3x3, Box, HelpCircle } from "lucide-react";
import { PlacedCase } from "@/types/pallet-builder";
import { BUILDER_TOOLTIPS } from "@/lib/tooltip-content";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PalletSpecsPanelProps {
  palletDimensions: { width: number; length: number };
  maxWeight: number;
  totalWeight: number;
  weightPercentage: number;
  placedCases: PlacedCase[];
}

export const PalletSpecsPanel = ({
  palletDimensions,
  maxWeight,
  totalWeight,
  weightPercentage,
  placedCases,
}: PalletSpecsPanelProps) => {
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
  const isUnbalanced = maxDeviation > avgQuadrant * 0.3; // 30% deviation threshold

  // Stack height check
  const maxStackHeight = 96; // inches
  const currentMaxHeight = Math.max(...placedCases.map(c => c.z * c.height), 0);
  const heightExceeded = currentMaxHeight > maxStackHeight;

  // Warnings
  const warnings = [];
  if (weightPercentage > 100) {
    warnings.push("Pallet weight exceeds maximum capacity!");
  } else if (weightPercentage > 90) {
    warnings.push("Pallet is near maximum weight capacity");
  }
  if (isUnbalanced) {
    warnings.push("Weight distribution is unbalanced");
  }
  if (heightExceeded) {
    warnings.push("Stack height exceeds safe limit (96\")");
  }
  if (spaceUtilization < 50 && totalCases > 0) {
    warnings.push("Low space utilization - consider adding more items");
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 border-b border-border">
        <CardTitle className="text-lg flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          Pallet Specs
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-6 overflow-y-auto max-h-[calc(100vh-20rem)] lg:max-h-none">
        {/* Dimensions */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Dimensions</h3>
          <div className="bg-muted/50 border border-border p-3 space-y-1" style={{ borderRadius: 0 }}>
            <div className="flex justify-between text-sm">
              <span>Width:</span>
              <span className="font-medium">{palletDimensions.width}"</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Length:</span>
              <span className="font-medium">{palletDimensions.length}"</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Type:</span>
              <span className="font-medium">
                {palletDimensions.width}×{palletDimensions.length}
              </span>
            </div>
          </div>
        </div>

        {/* Weight */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <Weight className="h-4 w-4" />
            Capacity Analysis
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                  aria-label="Help for capacity"
                >
                  <HelpCircle className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs text-sm">
                {BUILDER_TOOLTIPS.weightCapacity}
              </TooltipContent>
            </Tooltip>
          </h3>
          <div className="bg-muted/50 border border-border p-3 space-y-3" style={{ borderRadius: 0 }}>
            <div className="flex justify-between text-sm">
              <span>Total Weight:</span>
              <span className="font-bold text-primary">{totalWeight} lbs</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Max Capacity:</span>
              <span className="font-medium">{maxWeight} lbs</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Usage:</span>
                <span>{weightPercentage.toFixed(1)}%</span>
              </div>
              <Progress
                value={Math.min(weightPercentage, 100)}
                className={`h-2 ${
                  weightPercentage > 100
                    ? "[&>div]:bg-destructive"
                    : weightPercentage > 80
                    ? "[&>div]:bg-warning"
                    : "[&>div]:bg-success"
                }`}
              />
            </div>
          </div>
        </div>

        {/* Weight Distribution */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            Weight Distribution
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                  aria-label="Help for weight distribution"
                >
                  <HelpCircle className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs text-sm">
                {BUILDER_TOOLTIPS.weightDistribution}
              </TooltipContent>
            </Tooltip>
          </h3>
          <div className="bg-muted/50 border border-border p-3" style={{ borderRadius: 0 }}>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="bg-card border border-border p-2 text-xs" style={{ borderRadius: 0 }}>
                <div className="text-muted-foreground">NW</div>
                <div className="font-medium">{q2.toFixed(0)} lbs</div>
              </div>
              <div className="bg-card border border-border p-2 text-xs" style={{ borderRadius: 0 }}>
                <div className="text-muted-foreground">NE</div>
                <div className="font-medium">{q1.toFixed(0)} lbs</div>
              </div>
              <div className="bg-card border border-border p-2 text-xs" style={{ borderRadius: 0 }}>
                <div className="text-muted-foreground">SW</div>
                <div className="font-medium">{q3.toFixed(0)} lbs</div>
              </div>
              <div className="bg-card border border-border p-2 text-xs" style={{ borderRadius: 0 }}>
                <div className="text-muted-foreground">SE</div>
                <div className="font-medium">{q4.toFixed(0)} lbs</div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs">
              <div
                className={`w-2 h-2 rounded-full ${
                  !isUnbalanced ? "bg-success" : "bg-warning"
                }`}
              />
              <span className={!isUnbalanced ? "text-success" : "text-warning"}>
                {!isUnbalanced ? "Balanced" : "Unbalanced"}
              </span>
            </div>
          </div>
        </div>

        {/* Stack Info */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Stack Info
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                  aria-label="Help for utilization"
                >
                  <HelpCircle className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs text-sm">
                {BUILDER_TOOLTIPS.spaceUtilization}
              </TooltipContent>
            </Tooltip>
          </h3>
          <div className="bg-muted/50 border border-border p-3 space-y-2" style={{ borderRadius: 0 }}>
            <div className="flex justify-between text-sm">
              <span>Layers:</span>
              <span className="font-medium">{totalLayers}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Total Items:</span>
              <span className="font-medium">{placedCases.length}</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Utilization:</span>
                <span>{spaceUtilization.toFixed(1)}%</span>
              </div>
              <Progress
                value={Math.min(spaceUtilization, 100)}
                className={`h-2 ${
                  spaceUtilization > 90
                    ? "[&>div]:bg-warning"
                    : "[&>div]:bg-primary"
                }`}
              />
            </div>
          </div>
        </div>

        {/* Alerts */}
        {warnings.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Alerts
            </h3>
            <div className="space-y-2">
              {warnings.map((warning, idx) => (
                <div
                  key={idx}
                  className="bg-destructive/10 border border-destructive/30 p-2 text-xs text-destructive"
                  style={{ borderRadius: 0 }}
                >
                  {warning}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status Badge */}
        <div className="pt-4 border-t border-border">
          <Badge
            variant={warnings.length > 0 ? "destructive" : "default"}
            className="w-full justify-center py-2"
          >
            {warnings.length > 0 ? "Issues Detected" : "Ready for Use"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};
