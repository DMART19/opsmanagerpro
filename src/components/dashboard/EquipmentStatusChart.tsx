import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Info, CheckCircle2, Clock, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMemo, useEffect, useState, useRef } from "react";
import { useUnifiedStats } from "@/hooks/use-unified-stats";
import { useDemoPath } from "@/hooks/use-demo-path";

interface StatusData {
  label: string;
  value: number;
  color: string;
  bgColor: string;
  icon: typeof CheckCircle2;
}

// Animated number hook with spring effect
const useAnimatedNumber = (target: number, duration: number = 800) => {
  const [value, setValue] = useState(0);
  const startTime = useRef<number | null>(null);
  const animationFrame = useRef<number>();
  
  useEffect(() => {
    if (target === 0) {
      setValue(0);
      return;
    }
    
    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(easeOut * target));
      
      if (progress < 1) {
        animationFrame.current = requestAnimationFrame(animate);
      }
    };
    
    animationFrame.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
    };
  }, [target, duration]);
  
  return value;
};

// Animated donut segment
const AnimatedDonutSegment = ({ 
  percentage, 
  offset, 
  color, 
  delay = 0 
}: { 
  percentage: number; 
  offset: number; 
  color: string;
  delay?: number;
}) => {
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  const circumference = 2 * Math.PI * 55;
  
  useEffect(() => {
    const timeout = setTimeout(() => {
      setAnimatedPercentage(percentage);
    }, delay);
    return () => clearTimeout(timeout);
  }, [percentage, delay]);
  
  const dashLength = (animatedPercentage / 100) * circumference;
  
  return (
    <circle
      cx="70"
      cy="70"
      r="55"
      fill="none"
      className={color}
      stroke="currentColor"
      strokeWidth="14"
      strokeDasharray={`${dashLength} ${circumference}`}
      strokeDashoffset={-offset}
      strokeLinecap="round"
      transform="rotate(-90 70 70)"
      style={{ 
        transition: "stroke-dasharray 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    />
  );
};

export const EquipmentStatusChart = ({ onAddAsset }: { onAddAsset?: () => void }) => {
  const navigate = useNavigate();
  const { getPath } = useDemoPath();
  const { assets, loading } = useUnifiedStats();

  // Animated values
  const animatedTotal = useAnimatedNumber(assets.total);

  // Status data with icons - uses unified stats directly
  const statusData: StatusData[] = [
    { 
      label: "Available", 
      value: assets.available, 
      color: "text-success",
      bgColor: "bg-success/10",
      icon: CheckCircle2,
    },
    { 
      label: "In Use", 
      value: assets.inUse, 
      color: "text-warning",
      bgColor: "bg-warning/10",
      icon: Clock,
    },
    { 
      label: "Service", 
      value: assets.underService, 
      color: "text-primary",
      bgColor: "bg-primary/10",
      icon: Wrench,
    },
  ];

  const total = assets.total || 1;
  const hasData = assets.total > 0;

  // Calculate available percentage for prominent display
  const availablePercentage = hasData ? Math.round((assets.available / total) * 100) : 0;
  if (loading) {
    return (
      <Card className="p-5 sm:p-6" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="flex items-start justify-between mb-5">
          <div className="space-y-2">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <div className="flex items-center justify-center mb-6">
          <Skeleton className="h-[140px] w-[140px] rounded-full" />
        </div>
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5 sm:p-6" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-foreground">Asset Status</h3>
          <p className="text-sm text-muted-foreground mt-1 font-medium">
            {availablePercentage}% available right now
          </p>
        </div>
        <Tooltip delayDuration={300}>
          <TooltipTrigger>
            <div className="p-1.5 rounded-md hover:bg-muted/50 transition-colors">
              <Info className="h-4 w-4 text-muted-foreground/40 hover:text-muted-foreground" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-[220px] text-xs font-medium">
            Click any status to filter assets
          </TooltipContent>
        </Tooltip>
      </div>

      {!hasData ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/60 flex items-center justify-center">
            <Package className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-semibold text-foreground/70 mb-1">No assets tracked yet</p>
          <p className="text-xs text-muted-foreground/60 mb-5">
            Add your first item to see status breakdown
          </p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onAddAsset ? onAddAsset() : navigate(getPath("/inventory"))}
            className="gap-2"
          >
            <Package className="h-4 w-4" />
            Add Asset
          </Button>
        </div>
      ) : (
        <>
          {/* Donut Chart with percentage */}
          <div className="mb-6 flex items-center justify-center">
            <div className="relative">
              <svg width="140" height="140" viewBox="0 0 140 140" className="drop-shadow-sm">
                {/* Background circle */}
                <circle
                  cx="70"
                  cy="70"
                  r="55"
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="14"
                  opacity="0.4"
                />
                {/* Animated segments */}
                {(() => {
                  let offset = 0;
                  const circumference = 2 * Math.PI * 55;
                  return statusData.map((status, index) => {
                    const percentage = (status.value / total) * 100;
                    const dashLength = (percentage / 100) * circumference;
                    const segment = (
                      <AnimatedDonutSegment
                        key={status.label}
                        percentage={percentage}
                        offset={offset}
                        color={status.color}
                        delay={index * 150}
                      />
                    );
                    offset += dashLength;
                    return segment;
                  });
                })()}
              </svg>
              {/* Center content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold tabular-nums tracking-tight">{animatedTotal.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground font-medium">Total</span>
              </div>
            </div>
          </div>

          {/* Status cards - clickable with micro-copy */}
          <div className="space-y-2">
            {statusData.map((status) => {
              const StatusIcon = status.icon;
              const percentage = ((status.value / total) * 100).toFixed(1);
              const statusParam = status.label.toLowerCase().replace(' ', '-');
              
              // Context-aware micro-copy
              const getMicroCopy = () => {
                if (status.label === "Available") {
                  return status.value === total ? "All assets ready" : `${status.value} ready to use`;
                }
                if (status.label === "In Use") {
                  return status.value === 0 ? "None checked out" : `${status.value} currently assigned`;
                }
                if (status.label === "Service") {
                  return status.value === 0 ? "No items in service" : `${status.value} under maintenance`;
                }
                return null;
              };
              
              return (
                <Tooltip key={status.label} delayDuration={200}>
                  <TooltipTrigger asChild>
                    <div
                      onClick={() => navigate(getPath(`/inventory?status=${statusParam}`))}
                      className={`flex items-center justify-between p-3 rounded-xl ${status.bgColor} transition-all hover:scale-[1.01] cursor-pointer hover:ring-2 hover:ring-primary/20 group`}
                    >
                      <div className="flex items-center gap-3">
                        <StatusIcon className={`h-4 w-4 ${status.color}`} />
                        <div>
                          <span className="text-sm font-medium block">{status.label}</span>
                          <span className="text-[10px] text-muted-foreground/70">{getMicroCopy()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground tabular-nums">{percentage}%</span>
                        <span className={`text-lg font-bold tabular-nums ${status.color}`}>
                          {status.value.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p className="text-xs">Click to view {status.label.toLowerCase()} assets</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>

          {/* Health indicator */}
          {availablePercentage >= 90 && (
            <div className="mt-4 pt-4 border-t border-border/30 text-center">
              <span className="inline-flex items-center gap-1.5 text-xs text-success font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {availablePercentage}% availability — Healthy
              </span>
            </div>
          )}
        </>
      )}
    </Card>
  );
};
