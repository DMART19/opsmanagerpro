import { Save, ArrowRight, Package, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";

export type MobilePalletPrimaryAction =
  | "choose-pallet"
  | "auto-arrange"
  | "save-build"
  | "overwrite-build"
  | "continue-load";

interface Props {
  primary: MobilePalletPrimaryAction;
  activeBuildName?: string | null;
  canAutoBuild: boolean;
  hasItems: boolean;
  onChoosePallet: () => void;
  onSaveClick: () => void;
  onOverwrite?: () => void;
  onContinueLoad: () => void;
  onAutoBuild: () => void;
  onAutoArrange?: () => void;
}

/**
 * Fixed bottom action bar shown only on mobile.
 * Surfaces the single most important next action plus an optional
 * Auto Build secondary. Parent page reserves `pb-24` so content
 * never sits underneath it.
 */
export const MobilePalletActionBar = ({
  primary,
  activeBuildName,
  hasItems,
  onChoosePallet,
  onSaveClick,
  onOverwrite,
  onContinueLoad,
  onAutoBuild,
  onAutoArrange,
}: Props) => {
  const primaryButton = (() => {
    switch (primary) {
      case "choose-pallet":
        return (
          <Button onClick={onChoosePallet} className="flex-1 h-12 gap-2 text-sm font-semibold">
            <Package className="h-4 w-4" />
            Choose Pallet
          </Button>
        );
      case "auto-arrange":
        return (
          <Button onClick={onAutoArrange ?? onAutoBuild} className="flex-1 h-12 gap-2 text-sm font-semibold">
            <LayoutGrid className="h-4 w-4" />
            Auto Arrange
          </Button>
        );
      case "save-build":
        return (
          <Button onClick={onSaveClick} className="flex-1 h-12 gap-2 text-sm font-semibold">
            <Save className="h-4 w-4" />
            Save Build
          </Button>
        );
      case "overwrite-build":
        return (
          <Button onClick={onOverwrite} className="flex-1 h-12 gap-2 text-sm font-semibold">
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        );
      case "continue-load":
        return (
          <Button onClick={onContinueLoad} className="flex-1 h-12 gap-2 text-sm font-semibold">
            <ArrowRight className="h-4 w-4" />
            Continue to Build Load
          </Button>
        );
    }
  })();

  return (
    <div
      className="lg:hidden fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="px-3 py-2.5 flex items-center gap-2">
        {primaryButton}
      </div>
      {activeBuildName && primary === "continue-load" && (
        <div className="px-3 pb-1.5 -mt-1 text-[11px] text-muted-foreground text-center truncate">
          Saved · {activeBuildName}
        </div>
      )}
    </div>
  );
};
