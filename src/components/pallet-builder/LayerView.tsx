import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Layers, ChevronUp, ChevronDown } from "lucide-react";
import { PlacedCase } from "@/types/pallet-builder";

interface LayerViewProps {
  placedCases: PlacedCase[];
  selectedLayer: number;
  onLayerChange: (layer: number) => void;
  palletDimensions: { width: number; length: number };
}

export const LayerView = ({
  placedCases,
  selectedLayer,
  onLayerChange,
  palletDimensions,
}: LayerViewProps) => {
  const maxLayers = Math.max(...placedCases.map((c) => c.z), 3);
  const layers = Array.from({ length: maxLayers }, (_, i) => i + 1);

  const getCasesForLayer = (layer: number) => {
    return placedCases.filter((c) => c.z === layer);
  };

  return (
    <Card className="h-full">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10 border-b border-border">
        <CardTitle className="text-lg flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          Layer View
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Layer Selector */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onLayerChange(Math.max(1, selectedLayer - 1))}
              disabled={selectedLayer === 1}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <div className="text-center min-w-[120px]">
              <div className="text-2xl font-bold text-primary">Layer {selectedLayer}</div>
              <div className="text-xs text-muted-foreground">
                {getCasesForLayer(selectedLayer).length} cases
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onLayerChange(Math.min(maxLayers, selectedLayer + 1))}
              disabled={selectedLayer === maxLayers}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
          </div>

          {/* Layer Stack Visualization */}
          <div className="space-y-2">
            {layers.reverse().map((layer) => {
              const casesInLayer = getCasesForLayer(layer);
              const totalWeight = casesInLayer.reduce((sum, c) => sum + c.weight, 0);
              const isSelected = layer === selectedLayer;

              return (
                <div
                  key={layer}
                  onClick={() => onLayerChange(layer)}
                  className={`relative cursor-pointer transition-all ${
                    isSelected
                      ? "bg-primary/20 border-2 border-primary"
                      : "bg-muted/50 border border-border hover:bg-muted"
                  } p-4`}
                  style={{
                    marginLeft: `${(layer - 1) * 8}px`,
                    borderRadius: 0,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 flex items-center justify-center font-bold border-2 ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted-foreground/20 text-muted-foreground border-muted-foreground"
                        }`}
                        style={{ borderRadius: 0 }}
                      >
                        {layer}
                      </div>
                      <div>
                        <div className="font-medium">Layer {layer}</div>
                        <div className="text-xs text-muted-foreground">
                          {casesInLayer.length} cases • {totalWeight} lbs
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="text-xs font-medium text-primary">Selected</div>
                    )}
                  </div>

                  {/* Mini preview */}
                  {casesInLayer.length > 0 && (
                    <div className="mt-3 grid grid-cols-6 gap-1">
                      {casesInLayer.slice(0, 12).map((c) => (
                        <div
                          key={c.id}
                          className="w-full aspect-square bg-primary/30 border border-primary/50"
                          style={{ borderRadius: 0 }}
                          title={c.caseId}
                        />
                      ))}
                      {casesInLayer.length > 12 && (
                        <div className="w-full aspect-square bg-muted border border-border flex items-center justify-center text-[10px] text-muted-foreground" style={{ borderRadius: 0 }}>
                          +{casesInLayer.length - 12}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="bg-muted/30 border border-border p-4 space-y-2 text-sm" style={{ borderRadius: 0 }}>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Layers:</span>
              <span className="font-medium">{maxLayers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Cases:</span>
              <span className="font-medium">{placedCases.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Weight:</span>
              <span className="font-medium">
                {placedCases.reduce((sum, c) => sum + c.weight, 0)} lbs
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
