import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LucideIcon, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface MetricItem {
  label: string;
  value: number;
  icon: LucideIcon;
  route: string;
  status?: "healthy" | "attention" | "urgent";
}

interface MobileMetricCarouselProps {
  metrics: MetricItem[];
  loading?: boolean;
}

// Animated counter hook for mobile
const useCountUp = (target: number, duration: number = 800) => {
  const [count, setCount] = useState(0);
  const startTime = useRef<number | null>(null);
  const animationFrame = useRef<number>();

  useEffect(() => {
    if (target === 0) {
      setCount(0);
      return;
    }

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

    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [target, duration]);

  return count;
};

const statusColors = {
  healthy: "text-primary",
  attention: "text-warning",
  urgent: "text-destructive",
};

const statusBg = {
  healthy: "bg-primary/10",
  attention: "bg-warning/10",
  urgent: "bg-destructive/10",
};

const statusGradients = {
  healthy: "from-primary/5 via-transparent to-transparent",
  attention: "from-warning/5 via-transparent to-transparent",
  urgent: "from-destructive/5 via-transparent to-transparent",
};

// Individual animated metric card
const AnimatedMetricCard = ({ 
  metric, 
  onClick 
}: { 
  metric: MetricItem; 
  onClick: () => void;
}) => {
  const Icon = metric.icon;
  const status = metric.status || "healthy";
  const animatedValue = useCountUp(metric.value, 1000);

  return (
    <Card
      className={cn(
        "flex-shrink-0 w-[75%] snap-center cursor-pointer overflow-hidden relative",
        "active:scale-[0.98] transition-all duration-200"
      )}
      style={{
        boxShadow: "var(--shadow-card)",
      }}
      onClick={onClick}
    >
      {/* Premium gradient overlay */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-60",
        statusGradients[status]
      )} />
      
      <div className="relative p-5">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              {metric.label}
            </p>
            <div className="flex items-baseline gap-2">
              <p className={cn(
                "text-4xl font-bold tabular-nums tracking-tight",
                statusColors[status]
              )}>
                {animatedValue}
              </p>
              {status === "healthy" && metric.value > 0 && (
                <TrendingUp className="h-4 w-4 text-success/60" />
              )}
            </div>
          </div>
          <div className={cn(
            "p-3 rounded-2xl transition-transform duration-200",
            statusBg[status]
          )}>
            <Icon className={cn("h-6 w-6", statusColors[status])} />
          </div>
        </div>
      </div>
    </Card>
  );
};

export const MobileMetricCarousel = ({ metrics, loading }: MobileMetricCarouselProps) => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollRef.current) return;
      const scrollLeft = scrollRef.current.scrollLeft;
      const cardWidth = scrollRef.current.offsetWidth * 0.75;
      const newIndex = Math.round(scrollLeft / cardWidth);
      setActiveIndex(Math.min(newIndex, metrics.length - 1));
    };

    const ref = scrollRef.current;
    ref?.addEventListener("scroll", handleScroll, { passive: true });
    return () => ref?.removeEventListener("scroll", handleScroll);
  }, [metrics.length]);

  if (loading) {
    return (
      <div className="mb-6">
        <div className="flex gap-3 overflow-hidden px-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-shrink-0 w-[75%] p-5 rounded-xl border bg-card">
              <div className="animate-pulse">
                <div className="h-3 w-16 bg-muted rounded mb-3" />
                <div className="h-10 w-20 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-1.5 mt-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-1.5 w-1.5 rounded-full bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6" data-tour="mobile-metrics">
      {/* Carousel Container */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {metrics.map((metric) => (
          <AnimatedMetricCard
            key={metric.label}
            metric={metric}
            onClick={() => navigate(metric.route)}
          />
        ))}
      </div>

      {/* Pagination Dots */}
      <div className="flex justify-center gap-2 mt-4">
        {metrics.map((_, index) => (
          <button
            key={index}
            className={cn(
              "rounded-full transition-all duration-300",
              index === activeIndex 
                ? "w-6 h-2 bg-primary" 
                : "w-2 h-2 bg-muted-foreground/20"
            )}
            onClick={() => {
              scrollRef.current?.scrollTo({
                left: index * (scrollRef.current.offsetWidth * 0.75 + 12),
                behavior: "smooth",
              });
            }}
            aria-label={`Go to metric ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};
