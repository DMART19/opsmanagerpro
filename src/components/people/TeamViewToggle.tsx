import { cn } from "@/lib/utils";
import { Users, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

export type TeamViewMode = "members" | "compliance";

interface TeamViewToggleProps {
  view: TeamViewMode;
  onViewChange: (view: TeamViewMode) => void;
}

const views: { id: TeamViewMode; label: string; icon: typeof Users }[] = [
  { id: "members", label: "Directory", icon: Users },
  { id: "compliance", label: "Credentials", icon: ShieldCheck },
];

export const TeamViewToggle = ({ view, onViewChange }: TeamViewToggleProps) => {
  return (
    <div className="inline-flex items-center bg-muted/60 rounded-lg p-0.5 border border-border/40">
      {views.map((v) => {
        const isActive = view === v.id;
        return (
          <button
            key={v.id}
            onClick={() => onViewChange(v.id)}
            className={cn(
              "relative px-4 py-2 text-sm font-medium rounded-[7px] transition-colors duration-150 flex items-center gap-2",
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground/80"
            )}
          >
            {isActive && (
              <motion.div
                layoutId="team-view-pill"
                className="absolute inset-0 bg-background rounded-[7px] shadow-sm border border-border/50"
                transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <v.icon className="h-4 w-4" />
              {v.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
