import { LucideIcon, ArrowRight, ChevronRight, HelpCircle, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AnimatedStatCardProps {
  title: string;
  total: number;
  tooltip?: string;
  breakdown?: {
    label: string;
    value: number;
    color: "success" | "warning" | "destructive" | "primary";
    filterParam?: string;
  }[];
  icon: LucideIcon;
  link?: string;
  loading?: boolean;
  emptyMessage?: string;
  optionalFeatureHint?: string;
  helperText?: string;
  sparklineData?: number[];
  animationDelay?: number;
}

// Animated counter hook
const useCountUp = (target: number, duration: number = 800, delay: number = 0) => {
  const [count, setCount] = useState(0);
  const startTime = useRef<number | null>(null);
  const animationFrame = useRef<number>();

  useEffect(() => {
    if (target === 0) {
      setCount(0);
      return;
    }

    const startAnimation = () => {
      startTime.current = null;
      
      const animate = (timestamp: number) => {
        if (!startTime.current) startTime.current = timestamp;
        const progress = Math.min((timestamp - startTime.current) / duration, 1);
        
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        setCount(Math.floor(easeOutQuart * target));

        if (progress < 1) {
          animationFrame.current = requestAnimationFrame(animate);
        }
      };

      animationFrame.current = requestAnimationFrame(animate);
    };

    const timer = setTimeout(startAnimation, delay);

    return () => {
      clearTimeout(timer);
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [target, duration, delay]);

  return count;
};

// Mini sparkline component
const Sparkline = ({ data, color = "primary" }: { data: number[]; color?: string }) => {
  if (!data || data.length < 2) return null;
  
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * 60;
    const y = 20 - ((value - min) / range) * 16;
    return `${x},${y}`;
  }).join(' ');

  const colorClass = {
    primary: "stroke-primary",
    success: "stroke-success",
    warning: "stroke-warning",
    destructive: "stroke-destructive",
  }[color] || "stroke-primary";

  return (
    <svg width="60" height="24" className="opacity-70 group-hover:opacity-100 transition-opacity">
      <polyline
        fill="none"
        className={colorClass}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

const colorClasses = {
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  primary: "text-primary",
};

const dotColorClasses = {
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  primary: "bg-primary",
};

// Progress bar for breakdown items
const BreakdownBar = ({ value, total, color }: { value: number; total: number; color: string }) => {
  const [animated, setAnimated] = useState(false);
  const percentage = total > 0 ? (value / total) * 100 : 0;
  
  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <div className="w-16 h-1.5 bg-muted/50 rounded-full overflow-hidden">
      <div 
        className={cn(
          "h-full rounded-full transition-all duration-700 ease-out",
          dotColorClasses[color as keyof typeof dotColorClasses]
        )}
        style={{ width: animated ? `${Math.min(percentage, 100)}%` : '0%' }}
      />
    </div>
  );
};

export const AnimatedStatCard = ({ 
  title, 
  total, 
  tooltip,
  breakdown, 
  icon: Icon, 
  link, 
  loading, 
  emptyMessage,
  optionalFeatureHint,
  helperText,
  sparklineData,
  animationDelay = 0,
}: AnimatedStatCardProps) => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const animatedTotal = useCountUp(loading ? 0 : total, 800, animationDelay + 150);

  // Staggered entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), animationDelay);
    return () => clearTimeout(timer);
  }, [animationDelay]);

  const handleClick = () => {
    if (link && !loading) {
      navigate(link);
    }
  };

  const handleBreakdownClick = (e: React.MouseEvent, filterParam?: string) => {
    if (filterParam && link) {
      e.stopPropagation();
      navigate(`${link}?status=${filterParam}`);
    }
  };

  if (loading) {
    return (
      <Card className="p-5 animate-pulse" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-36" />
          </div>
          <Skeleton className="h-12 w-12 rounded-2xl" />
        </div>
        <Skeleton className="h-10 w-20 mb-4" />
        <div className="space-y-2.5 pt-4 border-t border-border/30">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  const isEmpty = total === 0;
  const breakdownTotal = breakdown?.reduce((sum, item) => sum + item.value, 0) || total;

  return (
    <Card 
      onClick={handleClick}
      className={cn(
        "group relative overflow-hidden transition-all h-full",
        link ? "cursor-pointer" : "",
        // Entrance animation
        isVisible 
          ? "opacity-100 translate-y-0" 
          : "opacity-0 translate-y-4"
      )}
      style={{
        boxShadow: "var(--shadow-card)",
        transitionDuration: "500ms",
        transitionTimingFunction: "var(--ease-spring)",
      }}
      onMouseEnter={(e) => {
        if (link) {
          e.currentTarget.style.boxShadow = "var(--shadow-card-hover)";
          e.currentTarget.style.transform = "translateY(-3px)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "var(--shadow-card)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Subtle hover gradient */}
      {link && (
        <div 
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{ background: "linear-gradient(180deg, hsl(var(--primary) / 0.02) 0%, transparent 100%)" }}
        />
      )}
      
      {/* Glow ring on hover */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none ring-1 ring-inset ring-primary/6" />
      
      <div className="relative p-5 h-full flex flex-col">
        <div className="flex items-start justify-between mb-1">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-muted-foreground/80 tracking-wide truncate">{title}</p>
              {tooltip && (
                <Tooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors"
                      aria-label={`Help for ${title}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <HelpCircle className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-sm font-medium">
                    {tooltip}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            {helperText && (
              <p className="text-[13px] text-muted-foreground/50 mt-1.5 leading-relaxed max-w-[200px] font-medium">
                {helperText}
              </p>
            )}
          </div>
          <div className={cn(
            "p-3 bg-primary/8 dark:bg-primary/12 rounded-2xl transition-all duration-500",
            "group-hover:bg-primary/12 dark:group-hover:bg-primary/18 group-hover:scale-105 group-hover:rotate-2"
          )}
          style={{ transitionTimingFunction: "var(--ease-spring)" }}
          >
            <Icon className="h-5 w-5 text-primary" strokeWidth={1.75} />
          </div>
        </div>
        
        <div className="flex items-end justify-between mt-4 mb-4 flex-1">
          <p className="text-4xl font-bold tracking-tight tabular-nums text-foreground">
            {animatedTotal.toLocaleString()}
          </p>
          
          {sparklineData && sparklineData.length > 1 && (
            <Sparkline data={sparklineData} />
          )}
        </div>
        
        {/* Empty state - improved guidance messaging */}
        {isEmpty && emptyMessage ? (
          <div className="pt-4 border-t border-border/25">
            {optionalFeatureHint ? (
              <div className="flex items-start gap-2.5 text-muted-foreground">
                <Sparkles className="h-4 w-4 flex-shrink-0 mt-0.5 text-primary/60" strokeWidth={2} />
                <div>
                  <span className="text-xs leading-relaxed font-medium block">{optionalFeatureHint}</span>
                  {link && (
                    <button className="inline-flex items-center gap-1 text-xs text-primary font-semibold mt-1.5 hover:gap-1.5 transition-all">
                      Set up now <ArrowRight className="h-3 w-3" strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground font-medium">{emptyMessage}</p>
                {link && (
                  <button className="inline-flex items-center gap-1.5 text-sm text-primary font-semibold hover:gap-2.5 transition-all">
                    Get started <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </button>
                )}
              </div>
            )}
          </div>
        ) : breakdown && breakdown.length > 0 ? (
          <div className="pt-4 border-t border-border/25">
            <div className="space-y-2.5">
              {breakdown.map((item, index) => (
                <div 
                  key={index} 
                  className={cn(
                    "flex items-center justify-between group/item",
                    item.filterParam ? "cursor-pointer hover:bg-muted/40 dark:hover:bg-muted/20 -mx-2 px-2 py-1.5 rounded-lg transition-all duration-200" : ""
                  )}
                  onClick={(e) => handleBreakdownClick(e, item.filterParam)}
                >
                  <span className="text-sm text-muted-foreground flex items-center gap-2 font-medium">
                    <span className={cn("w-2 h-2 rounded-full", dotColorClasses[item.color])} />
                    {item.label}
                    {item.filterParam && (
                      <ChevronRight className="h-3 w-3 opacity-0 group-hover/item:opacity-100 group-hover/item:translate-x-0.5 transition-all" strokeWidth={2.5} />
                    )}
                  </span>
                  <div className="flex items-center gap-3">
                    <BreakdownBar value={item.value} total={breakdownTotal} color={item.color} />
                    <span className={cn(
                      "font-bold tabular-nums text-sm min-w-[24px] text-right",
                      colorClasses[item.color]
                    )}>
                      {item.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : total > 0 && link ? (
          <div className="pt-4 border-t border-border/25">
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 group-hover:text-primary transition-all font-semibold">
              <span className="opacity-70">→</span>
              View details
              <ChevronRight className="h-3 w-3 group-hover:translate-x-1 transition-transform duration-300" strokeWidth={2.5} />
            </p>
          </div>
        ) : null}
      </div>
    </Card>
  );
};
