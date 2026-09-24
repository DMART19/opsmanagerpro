import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GripVertical, Package } from "lucide-react";
import { SavedPalletBuild } from "@/hooks/use-saved-pallet-builds";
import { cn } from "@/lib/utils";

interface PalletLibraryPanelProps {
  savedPallets: SavedPalletBuild[];
  loading: boolean;
  onDragStart: (pallet: SavedPalletBuild) => void;
}

export const PalletLibraryPanel = ({ savedPallets, loading, onDragStart }: PalletLibraryPanelProps) => {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 px-3 pt-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Package className="h-3.5 w-3.5 text-muted-foreground" />
          Pallet Library
          {savedPallets.length > 0 && (
            <span className="ml-auto text-[10px] text-muted-foreground font-normal">{savedPallets.length}</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="flex flex-col items-center gap-2">
                <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-muted-foreground">Loading…</p>
              </div>
            </div>
          ) : savedPallets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="w-10 h-10 rounded-xl bg-muted/40 flex items-center justify-center mb-3">
                <Package className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <p className="text-xs font-medium text-muted-foreground">No saved pallets</p>
              <p className="text-[10px] text-muted-foreground/70 mt-1">
                Build and save pallets first
              </p>
            </div>
          ) : (
            <div className="space-y-1 px-2 py-2">
              {savedPallets.map((pallet) => (
                <PalletCard key={pallet.id} pallet={pallet} onDragStart={onDragStart} />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

function PalletCard({ pallet, onDragStart }: { pallet: SavedPalletBuild; onDragStart: (p: SavedPalletBuild) => void }) {
  const weight = pallet.pallet_data.placedCases.reduce((s, c) => s + (c.weight || 0), 0);
  const dims = pallet.pallet_data.palletDimensions;
  const caseCount = pallet.pallet_data.placedCases.length;

  return (
    <div
      draggable
      onDragStart={() => onDragStart(pallet)}
      className={cn(
        "group flex items-center gap-2.5 px-2.5 py-2 rounded-lg border border-transparent",
        "cursor-grab active:cursor-grabbing",
        "hover:bg-accent/50 hover:border-border",
        "active:bg-accent active:border-primary/30 active:shadow-sm",
        "transition-all duration-150"
      )}
    >
      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/60 shrink-0 transition-colors" />

      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{pallet.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-muted-foreground">{dims.width}"×{dims.length}"</span>
          <span className="text-[10px] text-muted-foreground/40">·</span>
          <span className="text-[10px] text-muted-foreground">{weight.toLocaleString()}lb</span>
          <span className="text-[10px] text-muted-foreground/40">·</span>
          <span className="text-[10px] text-muted-foreground">{caseCount}c</span>
        </div>
      </div>
    </div>
  );
}
