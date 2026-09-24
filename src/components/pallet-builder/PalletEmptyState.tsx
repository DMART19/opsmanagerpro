import { Package, Sparkles, MousePointerClick, MoveDiagonal, CheckCircle2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PalletLibraryItem } from "@/types/pallet-builder";

interface Props {
  onAutoBuild: () => void;
  onManualFocus: () => void;
  onPickItem?: (item: PalletLibraryItem) => void;
  suggestions?: PalletLibraryItem[];
  canAutoBuild: boolean;
  hasPallet?: boolean;
}

/**
 * Guided empty state shown in the center of the pallet canvas.
 * Two clear CTAs (Auto / Manual) plus a four-step onboarding strip.
 */
export const PalletEmptyState = ({
  onAutoBuild,
  onManualFocus,
  canAutoBuild,
}: Props) => {
  const steps = [
    { label: "Select", icon: MousePointerClick },
    { label: "Arrange", icon: MoveDiagonal },
    { label: "Validate", icon: CheckCircle2 },
    { label: "Save", icon: Save },
  ];

  return (
    <div className="pointer-events-auto w-full max-w-lg rounded-2xl border border-border/60 bg-background/95 backdrop-blur shadow-xl px-7 py-8 text-center">
      <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-5">
        <Package className="h-7 w-7" />
      </div>

      <h2 className="text-xl font-semibold tracking-tight">Build Your Pallet</h2>
      <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto">
        Select items from the left panel or generate a pallet automatically.
      </p>

      <div className="flex flex-col sm:flex-row gap-2 mt-6 justify-center">
        <Button onClick={onAutoBuild} disabled={!canAutoBuild} className="gap-2 min-w-[160px]">
          <Sparkles className="h-4 w-4" />
          Auto Build
        </Button>
        <Button onClick={onManualFocus} variant="outline" className="gap-2 min-w-[160px]">
          Build Manually
        </Button>
      </div>

      <div className="mt-8 pt-6 border-t border-border/50">
        <div className="flex items-center justify-between gap-1 max-w-md mx-auto">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="flex items-center gap-1 flex-1">
                <div className="flex flex-col items-center gap-1.5 flex-1">
                  <div className="h-8 w-8 rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground">{s.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className="h-px flex-1 bg-border/60 -mt-5" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};