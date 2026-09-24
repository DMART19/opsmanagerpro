import { Button } from "@/components/ui/button";
import { Wand2, Save, Truck, Plus, ArrowRight, Package } from "lucide-react";
import { cn } from "@/lib/utils";

type State = "no-trailer" | "no-pallets-built" | "no-pallets" | "needs-attention" | "ready";

interface Props {
  state: State;
  hasTrailers: boolean;
  loaded: number;
  onSelectTrailer: () => void;
  onCreateTrailer: () => void;
  onBuildPallets: () => void;
  onAutoLoad: () => void;
  onSave: () => void;
  onOpenReview: () => void;
}

export function MobileTrailerActionBar({
  state,
  hasTrailers,
  loaded,
  onSelectTrailer,
  onCreateTrailer,
  onBuildPallets,
  onAutoLoad,
  onSave,
  onOpenReview,
}: Props) {
  let primary: { label: string; icon: React.ReactNode; onClick: () => void } = {
    label: "Auto Load Vehicle",
    icon: <Wand2 className="h-4 w-4" />,
    onClick: onAutoLoad,
  };
  let secondary: { label: string; icon: React.ReactNode; onClick: () => void } | null = null;

  if (state === "no-trailer") {
    primary = hasTrailers
      ? { label: "Select Vehicle", icon: <Truck className="h-4 w-4" />, onClick: onSelectTrailer }
      : { label: "Create Vehicle", icon: <Plus className="h-4 w-4" />, onClick: onCreateTrailer };
  } else if (state === "no-pallets-built") {
    primary = { label: "Build Pallets", icon: <Package className="h-4 w-4" />, onClick: onBuildPallets };
  } else if (state === "no-pallets") {
    primary = { label: "Auto Load Vehicle", icon: <Wand2 className="h-4 w-4" />, onClick: onAutoLoad };
  } else if (state === "ready") {
    primary = { label: "Continue to Ready to Ship", icon: <ArrowRight className="h-4 w-4" />, onClick: onOpenReview };
    secondary = { label: "Save", icon: <Save className="h-4 w-4" />, onClick: onSave };
  } else {
    // needs-attention — pallets placed but warnings present
    primary = { label: "Continue to Review", icon: <ArrowRight className="h-4 w-4" />, onClick: onOpenReview };
    secondary = { label: "Save", icon: <Save className="h-4 w-4" />, onClick: onSave };
  }

  return (
    <div
      className={cn(
        "lg:hidden fixed bottom-0 inset-x-0 z-40",
        "border-t border-border/60 bg-background/95 backdrop-blur-md shadow-[0_-4px_16px_rgba(0,0,0,0.06)]",
        "px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      )}
    >
      <div className="flex items-center gap-2">
        {loaded > 0 && (
          <div className="hidden sm:flex flex-col text-[10px] leading-tight text-muted-foreground pr-2">
            <span className="font-semibold text-foreground text-xs">{loaded}</span>
            <span>loaded</span>
          </div>
        )}
        {secondary && (
          <Button
            variant="outline"
            size="sm"
            className="h-11 flex-1 text-sm font-medium"
            onClick={secondary.onClick}
          >
            {secondary.icon}
            <span className="ml-1.5">{secondary.label}</span>
          </Button>
        )}
        <Button
          size="sm"
          className={cn("h-11 text-sm font-semibold", secondary ? "flex-[2]" : "flex-1")}
          onClick={primary.onClick}
        >
          {primary.icon}
          <span className="ml-1.5">{primary.label}</span>
        </Button>
      </div>
    </div>
  );
}