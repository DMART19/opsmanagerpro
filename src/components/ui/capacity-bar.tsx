import { cn } from "@/lib/utils";

interface CapacityBarProps {
  label?: string;
  value: number;
  max: number;
  unit?: string;
  /** Render a more compact variant (no secondary line). */
  compact?: boolean;
  className?: string;
  /** Override the auto status. */
  status?: "ok" | "warning" | "critical";
}

/**
 * Labeled progress bar with traffic-light coloring at 80% / 95%.
 * Used across Pallet Health, Live Metrics Header, Trailer panels.
 */
export const CapacityBar = ({
  label,
  value,
  max,
  unit,
  compact,
  className,
  status,
}: CapacityBarProps) => {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const rawPct = max > 0 ? Math.round((value / max) * 100) : 0;
  const computed: "ok" | "warning" | "critical" =
    status ?? (rawPct > 95 ? "critical" : rawPct >= 80 ? "warning" : "ok");

  const fillClass =
    computed === "critical" ? "bg-destructive"
    : computed === "warning" ? "bg-warning"
    : "bg-primary";

  const textClass =
    computed === "critical" ? "text-destructive"
    : computed === "warning" ? "text-warning"
    : "text-muted-foreground";

  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[11px] text-muted-foreground">{label}</span>
          <span className={cn("text-[11px] font-medium tabular-nums", textClass)}>{rawPct}%</span>
        </div>
      )}
      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500 ease-out", fillClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {!compact && (
        <p className="text-[11px] text-muted-foreground tabular-nums">
          {value.toLocaleString()}{unit ? ` ${unit}` : ""}
          {max > 0 && <> / {max.toLocaleString()}{unit ? ` ${unit}` : ""}</>}
        </p>
      )}
    </div>
  );
};