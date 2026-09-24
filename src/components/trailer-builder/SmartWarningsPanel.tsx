import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ShieldAlert, Info, CheckCircle2 } from "lucide-react";
import { SmartWarning } from "@/lib/trailer-smart-warnings";
import { cn } from "@/lib/utils";

interface Props {
  warnings: SmartWarning[];
  onHighlight: (cargoIds: string[]) => void;
  activeWarningId?: string | null;
}

const cfg = {
  critical: { Icon: ShieldAlert, cls: "text-destructive border-destructive/30 bg-destructive/5" },
  warning: { Icon: AlertTriangle, cls: "text-amber-500 border-amber-500/30 bg-amber-500/5" },
  info: { Icon: Info, cls: "text-sky-500 border-sky-500/30 bg-sky-500/5" },
} as const;

export const SmartWarningsPanel = ({ warnings, onHighlight, activeWarningId }: Props) => (
  <Card className="border-border/60 shadow-sm">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-primary" /> Smart Warnings
        {warnings.length > 0 && (
          <span className="ml-auto text-[11px] font-semibold tabular-nums text-muted-foreground">
            {warnings.length}
          </span>
        )}
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-2">
      {warnings.length === 0 ? (
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> No issues detected.
        </div>
      ) : (
        warnings.map(w => {
          const { Icon, cls } = cfg[w.severity];
          return (
            <button
              key={w.id}
              type="button"
              onClick={() => onHighlight(w.cargoIds)}
              className={cn(
                "w-full flex items-start gap-2 rounded-md border px-2.5 py-1.5 text-left transition-colors hover:bg-muted/40",
                cls,
                activeWarningId === w.id && "ring-1 ring-ring"
              )}
            >
              <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span className="text-[11px] leading-relaxed text-foreground">{w.message}</span>
            </button>
          );
        })
      )}
    </CardContent>
  </Card>
);