/**
 * OperatorGlobalBar — Top control bar with self-healing controls.
 * Fix All, Heal All, Re-run Engine, Manual Mode toggle, Lock.
 */
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Lock,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Unlock,
  Wrench,
  Heart,
  RotateCcw,
} from "lucide-react";

interface OperatorGlobalBarProps {
  issueCount: number;
  isScanning: boolean;
  manualMode: boolean;
  locked: boolean;
  onFixAll: () => void;
  onRerunEngine: () => void;
  onManualModeChange: (value: boolean) => void;
  onLockChange: (value: boolean) => void;
  // Self-healing
  failedCount?: number;
  recoveringCount?: number;
  isHealingAll?: boolean;
  onHealAll?: () => void;
  onStopHealing?: () => void;
}

export function OperatorGlobalBar({
  issueCount,
  isScanning,
  manualMode,
  locked,
  onFixAll,
  onRerunEngine,
  onManualModeChange,
  onLockChange,
  failedCount = 0,
  recoveringCount = 0,
  isHealingAll = false,
  onHealAll,
  onStopHealing,
}: OperatorGlobalBarProps) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-muted/40 border border-border/50 flex-wrap">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Self-healing controls */}
        {onHealAll && !isHealingAll && (issueCount > 0 || failedCount > 0) && (
          <Button
            variant="default"
            size="sm"
            className="gap-1.5 text-xs h-7"
            onClick={onHealAll}
            disabled={locked || isScanning}
          >
            <Heart className="h-3 w-3" />
            Heal All ({issueCount + failedCount})
          </Button>
        )}
        {isHealingAll && onStopHealing && (
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5 text-xs h-7"
            onClick={onStopHealing}
          >
            <Loader2 className="h-3 w-3 animate-spin" />
            Stop Healing
          </Button>
        )}

        {failedCount > 0 && !isHealingAll && (
          <Badge variant="destructive" className="text-[10px] h-5 gap-0.5">
            <ShieldAlert className="h-2.5 w-2.5" /> {failedCount} failed
          </Badge>
        )}
        {recoveringCount > 0 && (
          <Badge variant="warning" className="text-[10px] h-5 gap-0.5">
            <RotateCcw className="h-2.5 w-2.5 animate-spin" /> {recoveringCount} recovering
          </Badge>
        )}

        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs h-7"
          onClick={onRerunEngine}
          disabled={locked || isScanning || isHealingAll}
        >
          {isScanning ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          Re-run Engine
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="manual-mode" className="text-[11px] text-muted-foreground cursor-pointer">
            Manual
          </Label>
          <Switch
            id="manual-mode"
            checked={manualMode}
            onCheckedChange={onManualModeChange}
            disabled={locked}
            className="scale-75"
          />
        </div>

        <button
          onClick={() => onLockChange(!locked)}
          className={cn(
            "flex items-center gap-1 text-[11px] px-2 py-1 rounded-md transition-colors",
            locked
              ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
              : "text-muted-foreground hover:bg-muted"
          )}
          aria-label={locked ? "Unlock engine" : "Lock engine"}
        >
          {locked ? (
            <Lock className="h-3 w-3" />
          ) : (
            <Unlock className="h-3 w-3" />
          )}
          {locked ? "Locked" : "Lock"}
        </button>
      </div>
    </div>
  );
}
