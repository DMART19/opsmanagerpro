import { LucideIcon, TrendingUp, TrendingDown, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { useDemoPath } from "@/hooks/use-demo-path";

interface HeroStatCardProps {
  title: string;
  value: number;
  previousValue?: number;
  icon: LucideIcon;
  link?: string;
  loading?: boolean;
  subtitle?: string;
  accentColor?: "primary" | "success" | "warning";
  breakdown?: { label: string; value: number; color: string }[];
  animationDelay?: number;
}

// Animated counter hook with spring effect
const useCountUp = (target: number, duration: number = 1200, delay: number = 0) => {
  const [count, setCount] = useState(0);
  const startTime = useRef<number | null>(null);
  const animationFrame = useRef<number>();
  const hasStarted = useRef(false);

  useEffect(() => {
    if (target === 0) {
      setCount(0);
      return;
    }

    const startAnimation = () => {
      const animate = (timestamp: number) => {
        if (!startTime.current) startTime.current = timestamp;
        const progress = Math.min((timestamp - startTime.current) / duration, 1);
        
        // Easing function for smooth deceleration
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        setCount(Math.floor(easeOutQuart * target));

        if (progress < 1) {
          animationFrame.current = requestAnimationFrame(animate);
        }
      };

      animationFrame.current = requestAnimationFrame(animate);
    };

    const timer = setTimeout(() => {
      hasStarted.current = true;
      startAnimation();
    }, delay);

    return () => {
      clearTimeout(timer);
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [target, duration, delay]);

  return count;
};

// Compact horizontal bar chart with animation
const MiniBarChart = ({ data, delay = 0 }: { data: { label: string; value: number; color: string }[]; delay?: number }) => {
  const [animated, setAnimated] = useState(false);
  const total = data.reduce((sum, d) => sum + d.value, 0);
  
  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), delay + 400);
    return () => clearTimeout(timer);
  }, [delay]);

  if (total === 0) return null;
  
  return (
    <div className="flex h-2.5 w-full rounded-full overflow-hidden bg-muted/40 backdrop-blur-sm">
      {data.map((item, i) => {
        const width = (item.value / total) * 100;
        if (width < 0.5) return null;
        return (
          <div
            key={i}
            className={cn(
              "h-full transition-all duration-1000 ease-out",
              item.color
            )}
            style={{ 
              width: animated ? `${width}%` : '0%',
              transitionDelay: `${i * 150}ms`
            }}
          />
        );
      })}
    </div>
  );
};

export const HeroStatCard = ({
  title,
  value,
  previousValue,
  icon: Icon,
  link,
  loading,
  subtitle,
  accentColor = "primary",
  breakdown,
  animationDelay = 0,
}: HeroStatCardProps) => {
  const navigate = useNavigate();
  const { getPath } = useDemoPath();
  const [isVisible, setIsVisible] = useState(false);
  const animatedValue = useCountUp(loading ? 0 : value, 1200, animationDelay + 200);

  // Staggered entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), animationDelay);
    return () => clearTimeout(timer);
  }, [animationDelay]);

  const handleClick = () => {
    if (link && !loading) {
      navigate(getPath(link));
    }
  };

  // Calculate trend
  const trend = previousValue !== undefined && previousValue !== 0
    ? ((value - previousValue) / previousValue) * 100
    : null;

  const TrendIcon = trend === null ? null : trend >= 0 ? TrendingUp : TrendingDown;
  const trendColor = trend === null ? "text-muted-foreground" : trend >= 0 ? "text-success" : "text-warning";

  const accentGradients = {
    primary: "from-primary/10 via-primary/5 to-transparent",
    success: "from-success/10 via-success/5 to-transparent",
    warning: "from-warning/10 via-warning/5 to-transparent",
  };

  const iconBg = {
    primary: "bg-primary/12 dark:bg-primary/20",
    success: "bg-success/12 dark:bg-success/20",
    warning: "bg-warning/12 dark:bg-warning/20",
  };

  const glowColors = {
    primary: "group-hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.3)]",
    success: "group-hover:shadow-[0_0_30px_-5px_hsl(var(--success)/0.3)]",
    warning: "group-hover:shadow-[0_0_30px_-5px_hsl(var(--warning)/0.3)]",
  };

  if (loading) {
    return (
      <Card className="relative overflow-hidden p-6 sm:p-8 animate-pulse">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-2">
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-3 w-32 bg-muted/60 rounded" />
          </div>
          <div className="h-14 w-14 bg-muted rounded-2xl" />
        </div>
        <div className="h-14 w-36 bg-muted rounded mb-4" />
        <div className="h-3 w-full bg-muted/50 rounded-full" />
      </Card>
    );
  }

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
      {/* Subtle gradient background */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br transition-opacity duration-500",
        accentGradients[accentColor],
        "opacity-30 group-hover:opacity-60"
      )} />
      
      {/* Refined grid pattern for texture */}
      <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.025] bg-[radial-gradient(circle_at_1px_1px,currentColor_0.5px,transparent_0.5px)] bg-[length:20px_20px]" />
      
      {/* Glow effect on hover */}
      <div className={cn(
        "absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none",
        "ring-1 ring-inset ring-primary/8"
      )} />

      <div className="relative p-6 sm:p-8 h-full flex flex-col">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-sm font-semibold text-muted-foreground/80 uppercase tracking-wider">
              {title}
            </p>
            {subtitle && (
              <p className="text-[13px] text-muted-foreground/60 mt-2 font-medium max-w-[280px] leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          <div className={cn(
            "p-4 rounded-2xl transition-all duration-500 flex-shrink-0",
            iconBg[accentColor],
            "group-hover:scale-105 group-hover:rotate-2"
          )}
          style={{ transitionTimingFunction: "var(--ease-spring)" }}
          >
            <Icon className="h-6 w-6 text-primary" strokeWidth={1.75} />
          </div>
        </div>

        <div className="flex items-end justify-between mb-5 flex-1">
          <div>
            <p className="text-5xl sm:text-6xl font-bold tracking-tight tabular-nums text-foreground">
              {animatedValue.toLocaleString()}
            </p>
            
            {trend !== null && TrendIcon && (
              <div className={cn(
                "flex items-center gap-1.5 mt-3",
                trendColor
              )}>
                <TrendIcon className="h-4 w-4" strokeWidth={2} />
                <span className="text-sm font-medium">
                  {trend >= 0 ? "+" : ""}{trend.toFixed(1)}% from last period
                </span>
              </div>
            )}
          </div>

          {link && (
            <button className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground/70 group-hover:text-primary transition-colors duration-300">
              <span className="hidden sm:inline">View all</span>
              <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Status breakdown bar with legend */}
        {breakdown && breakdown.length > 0 && (
          <div className="space-y-3 mt-auto pt-4 border-t border-border/20">
            <MiniBarChart data={breakdown} delay={animationDelay} />
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
              {breakdown.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", item.color)} />
                  <span className="text-muted-foreground font-medium">{item.label}</span>
                  <span className="font-bold tabular-nums text-foreground">{item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
