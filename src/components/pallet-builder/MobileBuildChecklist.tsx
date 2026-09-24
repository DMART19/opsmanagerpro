import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  palletDone: boolean;
  itemsDone: boolean;
  arrangedDone: boolean;
  savedDone: boolean;
}

/**
 * Tiny inline checklist for the mobile Build Pallets flow.
 * Mobile-only — parent wraps in `lg:hidden`.
 */
export const MobileBuildChecklist = ({
  palletDone,
  itemsDone,
  arrangedDone,
  savedDone,
}: Props) => {
  const steps = [
    { label: "Pallet", done: palletDone },
    { label: "Items", done: itemsDone },
    { label: "Arranged", done: arrangedDone },
    { label: "Saved", done: savedDone },
  ];

  // Active = first not-done step
  const activeIdx = steps.findIndex((s) => !s.done);

  return (
    <div className="lg:hidden px-3 py-2 border-b border-border/40 bg-muted/20">
      <div className="flex items-center gap-1.5">
        {steps.map((s, i) => {
          const isActive = i === activeIdx;
          return (
            <div key={s.label} className="flex items-center gap-1.5 flex-1 min-w-0">
              <div
                className={cn(
                  "flex items-center gap-1 px-2 h-6 rounded-full text-[10.5px] font-medium tabular-nums shrink-0 transition-colors",
                  s.done
                    ? "bg-emerald-500/15 text-emerald-700 border border-emerald-500/30"
                    : isActive
                    ? "bg-primary/10 text-primary border border-primary/30"
                    : "bg-muted/60 text-muted-foreground/70 border border-transparent"
                )}
              >
                {s.done ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <span className="h-3 w-3 rounded-full border border-current opacity-60" />
                )}
                <span>{s.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "h-px flex-1 transition-colors",
                    s.done ? "bg-emerald-500/40" : "bg-border/60"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};