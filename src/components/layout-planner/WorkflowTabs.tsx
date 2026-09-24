import { useSearchParams } from "react-router-dom";
import { useCallback } from "react";
import { Package, Truck, ClipboardCheck, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type LayoutPlannerTab = "pallets" | "trailers" | "summary";

export const LAYOUT_PLANNER_TABS: {
  id: LayoutPlannerTab;
  label: string;
  shortLabel: string;
  icon: any;
  tagline: string;
  context: string;
}[] = [
  {
    id: "pallets",
    label: "Build Pallets",
    shortLabel: "Pallets",
    icon: Package,
    tagline: "Organize inventory onto pallets",
    context: "Create stable pallets from available inventory.",
  },
  {
    id: "trailers",
    label: "Build Load",
    shortLabel: "Load",
    icon: Truck,
    tagline: "Place pallets into a vehicle or container",
    context: "Place pallets into a trailer, box truck, flatbed, pickup truck, van, or container.",
  },
  {
    id: "summary",
    label: "Ready to Ship",
    shortLabel: "Ship",
    icon: ClipboardCheck,
    tagline: "Review, validate, and export",
    context: "Review load quality, validate shipment requirements, and export documents.",
  },
];

export const useActiveLayoutPlannerTab = (): [LayoutPlannerTab, (t: LayoutPlannerTab) => void] => {
  const [params, setParams] = useSearchParams();
  const raw = (params.get("tab") || "pallets") as LayoutPlannerTab;
  const active = LAYOUT_PLANNER_TABS.some(t => t.id === raw) ? raw : "pallets";
  const setActive = (t: LayoutPlannerTab) => {
    const next = new URLSearchParams(params);
    next.set("tab", t);
    setParams(next, { replace: true });
  };
  return [active, setActive];
};

interface Props {
  active: LayoutPlannerTab;
  onChange: (t: LayoutPlannerTab) => void;
}

export const WorkflowTabs = ({ active, onChange }: Props) => {
  // Prefetch lazy tab chunks on hover/focus so switching feels instant.
  const prefetch = useCallback((id: LayoutPlannerTab) => {
    if (id === "pallets") import("@/pages/PalletBuilder");
    else if (id === "trailers") import("@/pages/TrailerBuilder");
  }, []);
  const activeIdx = LAYOUT_PLANNER_TABS.findIndex(t => t.id === active);
  return (
    <div className="border-b bg-background">
      <div className="max-w-[1920px] mx-auto px-4 lg:px-8 py-2.5">
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto scrollbar-hide">
          {LAYOUT_PLANNER_TABS.map((t, i) => {
            const Icon = t.icon;
            const isActive = active === t.id;
            const isCompleted = i < activeIdx;
            const isUpcoming = i > activeIdx;
            const stateLabel = isCompleted ? "Complete" : isActive ? "In Progress" : "Not Started";
            return (
              <div key={t.id} className="flex items-center gap-2 sm:gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => onChange(t.id)}
                  onMouseEnter={() => prefetch(t.id)}
                  onFocus={() => prefetch(t.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-2.5 pl-2 pr-3 sm:pr-3.5 py-1.5 rounded-xl border text-left transition-all",
                    isActive && "bg-primary text-primary-foreground border-primary shadow-sm",
                    isCompleted && "bg-emerald-500/8 border-emerald-500/30 text-foreground hover:bg-emerald-500/15",
                    isUpcoming && "bg-transparent border-border/60 text-muted-foreground hover:bg-muted/40"
                  )}
                >
                  <span
                    className={cn(
                      "flex items-center justify-center h-7 w-7 rounded-lg text-[11px] font-semibold shrink-0",
                      isActive && "bg-primary-foreground/15 text-primary-foreground",
                      isCompleted && "bg-emerald-500/15 text-emerald-600",
                      isUpcoming && "bg-muted text-muted-foreground/70"
                    )}
                  >
                    {isCompleted ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 hidden sm:inline",
                      isActive && "text-primary-foreground",
                      isCompleted && "text-emerald-600",
                      isUpcoming && "text-muted-foreground/60"
                    )}
                  />
                  <div className="flex flex-col leading-tight min-w-0">
                    <span
                      className={cn(
                        "text-[9px] uppercase tracking-wider font-semibold",
                        isActive
                          ? "text-primary-foreground/75"
                          : isCompleted
                          ? "text-emerald-700/80"
                          : "text-muted-foreground/70"
                      )}
                    >
                      {stateLabel}
                    </span>
                    <span className="text-[13px] sm:text-sm font-semibold whitespace-nowrap">
                      <span className="hidden sm:inline">{t.label}</span>
                      <span className="sm:hidden">{t.shortLabel}</span>
                    </span>
                  </div>
                </button>
                {i < LAYOUT_PLANNER_TABS.length - 1 && (
                  <span
                    className={cn(
                      "hidden sm:block h-px w-6 md:w-10 transition-colors",
                      i < activeIdx ? "bg-emerald-500/40" : "bg-border/60"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};