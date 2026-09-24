import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Check } from "lucide-react";

interface PalletPreset {
  id: string;
  name: string;
  width: number;
  length: number;
  height?: number;
  maxWeight: number;
  material: string;
  description: string;
  popular?: boolean;
}

const PALLET_PRESETS: PalletPreset[] = [
  {
    id: "gma-48x40",
    name: "Standard GMA 48×40",
    width: 48,
    length: 40,
    height: 6,
    maxWeight: 2500,
    material: "Wood",
    description: "Most common pallet in North America. Ideal for grocery and retail.",
    popular: true,
  },
  {
    id: "euro-800x1200",
    name: "Euro Pallet",
    width: 31.5,
    length: 47.2,
    height: 5.7,
    maxWeight: 3300,
    material: "Wood",
    description: "European standard (800×1200mm). Common in international shipping.",
  },
  {
    id: "half-pallet",
    name: "Half Pallet 48×20",
    width: 48,
    length: 20,
    height: 6,
    maxWeight: 1250,
    material: "Wood",
    description: "Half-size pallet for smaller loads or display purposes.",
  },
  {
    id: "plastic-48x40",
    name: "Plastic 48×40",
    width: 48,
    length: 40,
    height: 6,
    maxWeight: 2800,
    material: "Plastic",
    description: "Durable, hygienic option for food & pharmaceutical industries.",
  },
];

interface PalletTypePresetsProps {
  existingTypes: string[];
  onSelectPreset: (preset: PalletPreset) => void;
  onCreateCustom: () => void;
}

export const PalletTypePresets = ({
  existingTypes,
  onSelectPreset,
  onCreateCustom,
}: PalletTypePresetsProps) => {
  const isPresetAdded = (presetName: string) => 
    existingTypes.some(name => name.toLowerCase() === presetName.toLowerCase());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Quick-add industry standard pallets or create your own
        </p>
        <Button variant="outline" onClick={onCreateCustom} className="gap-2">
          <Plus className="h-4 w-4" />
          Custom Type
        </Button>
      </div>
      
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PALLET_PRESETS.map((preset) => {
          const added = isPresetAdded(preset.name);
          
          return (
            <Card 
              key={preset.id} 
              className={`relative transition-all duration-200 ${
                added 
                  ? 'border-primary/30 bg-primary/5' 
                  : 'hover:border-primary/50 hover:shadow-sm cursor-pointer'
              }`}
              onClick={() => !added && onSelectPreset(preset)}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-sm leading-tight">{preset.name}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{preset.material}</p>
                  </div>
                  {preset.popular && !added && (
                    <Badge variant="secondary" className="text-[10px] px-1.5">Popular</Badge>
                  )}
                  {added && (
                    <div className="p-1 bg-primary/20 rounded-full">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                  )}
                </div>
                
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dimensions</span>
                    <span className="font-medium">{preset.width}" × {preset.length}"</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Weight</span>
                    <span className="font-medium">{preset.maxWeight.toLocaleString()} lbs</span>
                  </div>
                </div>
                
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {preset.description}
                </p>
                
                {!added && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="w-full h-8 text-xs gap-1.5"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectPreset(preset);
                    }}
                  >
                    <Plus className="h-3 w-3" />
                    Add to Library
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export { PALLET_PRESETS };
export type { PalletPreset };
