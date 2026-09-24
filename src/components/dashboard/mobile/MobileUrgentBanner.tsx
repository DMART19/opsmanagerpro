import { AlertTriangle, X, ChevronRight, Sparkles } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useDemoPath } from "@/hooks/use-demo-path";

interface MobileUrgentBannerProps {
  count: number;
  route?: string;
}

export const MobileUrgentBanner = ({ count, route = "/people" }: MobileUrgentBannerProps) => {
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();
  const { getPath } = useDemoPath();

  if (dismissed || count === 0) return null;

  return (
    <div 
      className={cn(
        "relative overflow-hidden",
        "flex items-center justify-between gap-3 px-4 py-3.5 mb-4",
        "bg-gradient-to-r from-destructive/15 via-destructive/10 to-destructive/5",
        "border border-destructive/25 rounded-2xl",
        "cursor-pointer active:scale-[0.99] transition-all duration-200"
      )}
      style={{
        boxShadow: "0 4px 12px -2px hsl(var(--destructive) / 0.15)",
      }}
      onClick={() => navigate(getPath(route))}
      role="alert"
    >
      {/* Subtle animated glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-destructive/5 to-transparent animate-pulse" />
      
      <div className="relative flex items-center gap-3 flex-1 min-w-0">
        <div className="p-2 rounded-xl bg-destructive/15 flex-shrink-0">
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </div>
        <div className="min-w-0">
          <span className="text-sm font-semibold text-foreground">
            <span className="text-destructive font-bold">{count}</span> item{count !== 1 ? 's' : ''} need attention
          </span>
        </div>
      </div>
      <div className="relative flex items-center gap-1 flex-shrink-0">
        <span className="text-xs font-medium text-destructive/80">View</span>
        <ChevronRight className="h-4 w-4 text-destructive/60" />
        <button
          onClick={(e) => {
            e.stopPropagation();
            setDismissed(true);
          }}
          className="ml-1 p-1.5 rounded-lg hover:bg-destructive/15 active:bg-destructive/25 transition-colors"
          aria-label="Dismiss alert"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
};
