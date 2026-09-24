import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MoveVertical, AlertTriangle } from "lucide-react";
import { CustomTrailer } from "@/hooks/use-custom-trailers";
import { PlacedPallet } from "@/types/trailer-builder";
import { formatFeetInches, topHeightOf } from "@/lib/trailer-cargo";
import { cn } from "@/lib/utils";

interface Props {
  trailer: CustomTrailer | null;
  placedPallets: PlacedPallet[];
}

export const HeightClearancePanel = ({ trailer, placedPallets }: Props) => {
  if (!trailer) return null;
  const maxH = trailer.height || 0;
  const tallest = placedPallets.reduce((m, p) => Math.max(m, topHeightOf(p, placedPallets)), 0);
  const remaining = maxH - tallest;
  const over = maxH > 0 && remaining < 0;
  const pct = maxH > 0 ? Math.min(100, Math.round((tallest / maxH) * 100)) : 0;

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <MoveVertical className="h-4 w-4 text-primary" /> Height &amp; Clearance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-[11px] text-center">
          <div className="rounded-md border border-border/60 bg-muted/20 px-2 py-1.5">
            <p className="text-muted-foreground">Vehicle</p>
            <p className="font-semibold tabular-nums">{formatFeetInches(maxH)}</p>
          </div>
          <div className="rounded-md border border-border/60 bg-muted/20 px-2 py-1.5">
            <p className="text-muted-foreground">Highest Cargo</p>
            <p className="font-semibold tabular-nums">{formatFeetInches(tallest)}</p>
          </div>
          <div className={cn(
            "rounded-md border px-2 py-1.5",
            over ? "border-destructive/40 bg-destructive/10" : "border-border/60 bg-muted/20"
          )}>
            <p className="text-muted-foreground">Remaining</p>
            <p className={cn("font-semibold tabular-nums", over && "text-destructive")}>
              {over ? `-${formatFeetInches(Math.abs(remaining))}` : formatFeetInches(Math.max(0, remaining))}
            </p>
          </div>
        </div>

        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", over ? "bg-destructive" : pct >= 90 ? "bg-amber-500" : "bg-primary")}
            style={{ width: `${pct}%` }}
          />
        </div>

        {over && (
          <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-2.5 py-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
            <p className="text-[11px] text-destructive">Cargo exceeds vehicle height — unstack or reposition.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};