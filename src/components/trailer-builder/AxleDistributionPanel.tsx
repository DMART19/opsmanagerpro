import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Scale } from "lucide-react";
import { AxleAnalysis } from "@/lib/trailer-axle-analysis";
import { cn } from "@/lib/utils";

interface Props {
  axles: AxleAnalysis | null;
}

const Bar = ({ label, value, max }: { label: string; value: number; max: number }) => {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const tone = pct >= 100 ? "bg-destructive" : pct >= 90 ? "bg-amber-500" : "bg-primary";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{value.toLocaleString()} lbs</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

export const AxleDistributionPanel = ({ axles }: Props) => {
  if (!axles) return null;
  const lateralPct = 50 + axles.lateralBias * 50;

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Scale className="h-4 w-4 text-primary" /> Weight &amp; Axle Distribution
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-md border border-border/60 bg-muted/20 px-2 py-1.5">
            <p className="text-muted-foreground">Total Weight</p>
            <p className={cn("font-semibold tabular-nums", axles.overloaded && "text-destructive")}>
              {axles.totalWeight.toLocaleString()} lbs
            </p>
          </div>
          <div className="rounded-md border border-border/60 bg-muted/20 px-2 py-1.5">
            <p className="text-muted-foreground">Remaining Payload</p>
            <p className="font-semibold tabular-nums">{axles.remainingPayload.toLocaleString()} lbs</p>
          </div>
        </div>

        <div className="space-y-2.5">
          <Bar label="Front Axle" value={axles.frontAxle} max={axles.frontLimit} />
          <Bar label="Drive Axle" value={axles.driveAxle} max={axles.driveLimit} />
          <Bar label="Rear Axle" value={axles.rearAxle} max={axles.rearLimit} />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Left {axles.left.toLocaleString()} lbs</span>
            <span className="text-muted-foreground">Right {axles.right.toLocaleString()} lbs</span>
          </div>
          <div className="relative h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "absolute inset-y-0 w-1 rounded-full",
                Math.abs(axles.lateralBias) > 0.15 ? "bg-amber-500" : "bg-primary"
              )}
              style={{ left: `calc(${Math.min(100, Math.max(0, lateralPct))}% - 2px)` }}
            />
            <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};