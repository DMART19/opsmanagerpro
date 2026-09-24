import { useState } from "react";
import { Keyboard, ChevronDown } from "lucide-react";
import { MANIPULATION_KEYMAP } from "@/lib/manipulation/keymap";
import { cn } from "@/lib/utils";

/** Shared control cheat-sheet so both builders advertise identical controls. */
export default function ControlsLegend({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("viewport-glass rounded-xl overflow-hidden text-xs", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 font-medium text-foreground/90 hover:bg-foreground/5"
      >
        <Keyboard className="h-3.5 w-3.5" />
        Controls
        <ChevronDown className={cn("ml-auto h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ul className="max-h-64 overflow-y-auto border-t border-border/40 px-3 py-2 space-y-1">
          {MANIPULATION_KEYMAP.map((k) => (
            <li key={k.keys} className="flex items-center justify-between gap-3">
              <span className="rounded bg-foreground/10 px-1.5 py-0.5 font-mono text-[10px] text-foreground/80">
                {k.keys}
              </span>
              <span className="text-muted-foreground text-[11px]">{k.action}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
