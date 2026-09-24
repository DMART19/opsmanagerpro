import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LucideIcon, HelpCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useDemoPath } from "@/hooks/use-demo-path";

interface KPIItem {
  label: string;
  value: number;
  icon: LucideIcon;
  route: string;
  status?: "healthy" | "attention" | "urgent";
  zeroHint?: string;
}

interface MobileKPIGridProps {
  metrics: KPIItem[];
  loading?: boolean;
}

// Animated counter for KPI values
const AnimatedValue = ({ value }: { value: number }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (value === 0) {
      setDisplayValue(0);
      return;
    }

    let startTime: number | null = null;
    let frame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / 600, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(easeOut * value));

      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{displayValue}</>;
};

// Reduced visual weight for healthy/info states, emphasis on urgent only
const statusColors = {
  healthy: "text-muted-foreground",
  attention: "text-warning",
  urgent: "text-destructive",
};

const statusBg = {
  healthy: "bg-muted/50",
  attention: "bg-warning/8",
  urgent: "bg-destructive/10",
};

export const MobileKPIGrid = ({ metrics, loading }: MobileKPIGridProps) => {
  const navigate = useNavigate();
  const { getPath } = useDemoPath();

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-2.5 mb-5">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-3.5" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="animate-pulse">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 bg-muted rounded-xl" />
                <div className="h-3 w-16 bg-muted rounded" />
              </div>
              <div className="h-7 w-12 bg-muted rounded" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 mb-4">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        const status = metric.status || "healthy";
        const isZero = metric.value === 0;
        const isUrgent = status === "urgent";

        return (
          <Card
            key={metric.label}
            className={cn(
              "relative p-3 cursor-pointer overflow-hidden",
              "active:scale-[0.98] transition-all duration-200",
              // Only emphasize urgent cards visually
              isUrgent && "border-destructive/30"
            )}
            style={{ 
              boxShadow: isUrgent 
                ? "0 2px 8px -2px hsl(var(--destructive) / 0.15)" 
                : "var(--shadow-card)" 
            }}
            onClick={() => navigate(getPath(metric.route))}
          >
            {/* Subtle gradient background - only for urgent */}
            {isUrgent && (
              <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 to-transparent" />
            )}

            <div className="relative">
              {/* Header row: icon + label */}
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className={cn("p-1 rounded-md", statusBg[status])}>
                  <Icon className={cn("h-3.5 w-3.5", statusColors[status])} />
                </div>
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  {metric.label}
                </span>
              </div>

              {/* Value row */}
              <div className="flex items-baseline gap-2">
                <span className={cn(
                  "text-xl font-bold tabular-nums",
                  isZero ? "text-muted-foreground/60" : 
                  isUrgent ? "text-destructive" : "text-foreground"
                )}>
                  <AnimatedValue value={metric.value} />
                </span>
                
                {/* Zero state hint */}
                {isZero && metric.zeroHint && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-xs text-muted-foreground/50 flex items-center gap-0.5">
                        <HelpCircle className="h-3 w-3" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[200px] text-center">
                      <p className="text-xs">{metric.zeroHint}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>

              {/* Inline zero guidance (subtle) */}
              {isZero && metric.zeroHint && (
                <p className="text-[10px] text-muted-foreground/50 mt-0.5 leading-tight">
                  {metric.zeroHint}
                </p>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
};
