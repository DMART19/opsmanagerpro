import { useState, useEffect, useRef } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export type QuickAdjustMode = "add" | "remove";

interface QuickAdjustModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: QuickAdjustMode;
  currentQuantity: number;
  onConfirm: (newQuantity: number) => Promise<void>;
}

const MODE_CONFIG: Record<QuickAdjustMode, { title: string; verb: string; icon: typeof Plus; accentClass: string; btnClass: string }> = {
  add: {
    title: "Add Stock",
    verb: "add",
    icon: Plus,
    accentClass: "text-emerald-600 dark:text-emerald-400",
    btnClass: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm",
  },
  remove: {
    title: "Remove Stock",
    verb: "remove",
    icon: Minus,
    accentClass: "text-destructive",
    btnClass: "bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-sm",
  },
};

const PRESETS = [1, 5, 10, 25];

export const QuickAdjustModal = ({
  open,
  onOpenChange,
  mode,
  currentQuantity,
  onConfirm,
}: QuickAdjustModalProps) => {
  const [value, setValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const config = MODE_CONFIG[mode];
  const Icon = config.icon;

  useEffect(() => {
    if (open) {
      setValue("");
      setError(null);
      setIsSaving(false);
      // Focus input after drawer animation
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  const handleConfirm = async () => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num <= 0) {
      setError("Enter a number greater than 0");
      return;
    }

    const newQty = mode === "add" ? currentQuantity + num : currentQuantity - num;
    if (newQty < 0) {
      setError(`Cannot remove more than ${currentQuantity}`);
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await onConfirm(newQty);
      onOpenChange(false);
    } catch {
      setError("Failed to update. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const previewQty = (() => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num <= 0) return null;
    return mode === "add" ? currentQuantity + num : Math.max(0, currentQuantity - num);
  })();

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85dvh]">
        <DrawerHeader className="text-center pb-2">
          <div className={cn("mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl", 
            mode === "add" ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-destructive/10"
          )}>
            <Icon className={cn("h-6 w-6", config.accentClass)} />
          </div>
          <DrawerTitle className="text-lg font-semibold">{config.title}</DrawerTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Current stock: <span className="font-semibold text-foreground tabular-nums">{currentQuantity}</span>
          </p>
        </DrawerHeader>

        <div className="px-6 pb-4 space-y-4">
          {/* Quick preset buttons */}
          <div className="flex items-center justify-center gap-2">
            {PRESETS.map((preset) => {
              const wouldGoBelowZero = mode === "remove" && preset > currentQuantity;
              return (
                <button
                  key={preset}
                  type="button"
                  disabled={wouldGoBelowZero || isSaving}
                  onClick={() => {
                    setValue(String(preset));
                    setError(null);
                  }}
                  className={cn(
                    "h-10 min-w-[3rem] px-3 rounded-xl text-sm font-semibold tabular-nums",
                    "border border-border/30 transition-all duration-150 active:scale-[0.95]",
                    value === String(preset)
                      ? mode === "add"
                        ? "bg-emerald-100 border-emerald-300 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-400"
                        : "bg-destructive/10 border-destructive/30 text-destructive"
                      : "bg-muted/40 text-foreground hover:bg-muted/60",
                    wouldGoBelowZero && "opacity-40 cursor-not-allowed"
                  )}
                >
                  {mode === "add" ? "+" : "−"}{preset}
                </button>
              );
            })}
          </div>

          {/* Manual input */}
          <div className="space-y-2">
            <Label htmlFor="adjust-qty" className="text-xs font-medium text-muted-foreground">
              Quantity to {config.verb}
            </Label>
            <Input
              ref={inputRef}
              id="adjust-qty"
              type="number"
              inputMode="numeric"
              min={1}
              max={mode === "remove" ? currentQuantity : undefined}
              placeholder="Enter amount"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConfirm();
              }}
              disabled={isSaving}
              className={cn(
                "h-14 text-center text-2xl font-bold tabular-nums rounded-xl",
                error && "border-destructive focus-visible:ring-destructive"
              )}
            />
            {error && (
              <p className="text-xs text-destructive text-center animate-fade-in">{error}</p>
            )}
          </div>

          {/* Preview */}
          {previewQty !== null && !error && (
            <div className="text-center text-sm text-muted-foreground animate-fade-in">
              New stock level: <span className={cn("font-bold tabular-nums", config.accentClass)}>{previewQty}</span>
            </div>
          )}
        </div>

        <DrawerFooter className="pt-0 pb-6 px-6 gap-2">
          <Button
            onClick={handleConfirm}
            disabled={isSaving || !value}
            className={cn("h-12 rounded-xl text-base font-semibold active:scale-[0.98] transition-transform duration-150", config.btnClass)}
          >
            {isSaving ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <Icon className="h-5 w-5 mr-2" />
            )}
            {isSaving ? "Updating…" : `${config.title}`}
          </Button>
          <DrawerClose asChild>
            <Button variant="ghost" className="h-11 rounded-xl text-muted-foreground">
              Cancel
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
