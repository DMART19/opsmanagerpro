/**
 * OpsMetricCards — Animated metric cards for the Ops Control Center
 */
import { cn } from "@/lib/utils";
import { AnimatedCounter } from "./AnimatedCounter";
import { AlertTriangle, XCircle, Clock, Flame } from "lucide-react";
import { motion } from "framer-motion";

interface MetricCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  active: boolean;
  onClick: () => void;
  variant: "default" | "critical" | "warning" | "info";
  delay?: number;
}

const variantStyles = {
  default: {
    ring: "ring-primary/20",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    activeBg: "bg-primary/5 border-primary/30",
    valueColor: "",
  },
  critical: {
    ring: "ring-destructive/20",
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
    activeBg: "bg-destructive/5 border-destructive/30",
    valueColor: "text-destructive",
  },
  warning: {
    ring: "ring-warning/20",
    iconBg: "bg-warning/10",
    iconColor: "text-warning",
    activeBg: "bg-warning/5 border-warning/30",
    valueColor: "text-warning",
  },
  info: {
    ring: "ring-primary/15",
    iconBg: "bg-primary/8",
    iconColor: "text-primary/80",
    activeBg: "bg-primary/5 border-primary/25",
    valueColor: "",
  },
};

const MetricCard = ({ label, value, icon: Icon, active, onClick, variant, delay = 0 }: MetricCardProps) => {
  const styles = variantStyles[variant];
  const isHighValue = variant === "critical" && value > 0;

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-start gap-3 rounded-2xl border bg-card p-5",
        "transition-all duration-200 ease-out text-left",
        "hover:shadow-md hover:-translate-y-0.5",
        "active:scale-[0.98] active:translate-y-0",
        active && styles.activeBg,
        !active && "border-border/50",
        isHighValue && "shadow-[0_0_20px_-8px_hsl(var(--destructive)/0.25)]"
      )}
    >
      <div className="flex items-center justify-between w-full">
        <div className={cn(
          "p-2 rounded-xl transition-colors",
          styles.iconBg,
        )}>
          <Icon className={cn("h-4.5 w-4.5", styles.iconColor)} />
        </div>
        {isHighValue && (
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-60" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive" />
          </span>
        )}
      </div>
      <div>
        <AnimatedCounter
          value={value}
          className={cn(
            "text-2xl font-bold tabular-nums tracking-tight",
            value > 0 ? styles.valueColor : "text-muted-foreground/40"
          )}
        />
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </motion.button>
  );
};

interface OpsMetricCardsProps {
  stats: { errors24h: number; critical24h: number; unresolved: number; last60: number };
  activePill: string | null;
  onPillClick: (pill: string) => void;
}

export const OpsMetricCards = ({ stats, activePill, onPillClick }: OpsMetricCardsProps) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <MetricCard
        label="Errors (24h)"
        value={stats.errors24h}
        icon={AlertTriangle}
        active={activePill === "errors24h"}
        onClick={() => onPillClick("errors24h")}
        variant="warning"
        delay={0}
      />
      <MetricCard
        label="Critical (24h)"
        value={stats.critical24h}
        icon={XCircle}
        active={activePill === "critical24h"}
        onClick={() => onPillClick("critical24h")}
        variant="critical"
        delay={0.05}
      />
      <MetricCard
        label="Unresolved"
        value={stats.unresolved}
        icon={Flame}
        active={activePill === "unresolved"}
        onClick={() => onPillClick("unresolved")}
        variant="default"
        delay={0.1}
      />
      <MetricCard
        label="Last 60 min"
        value={stats.last60}
        icon={Clock}
        active={activePill === "last60"}
        onClick={() => onPillClick("last60")}
        variant="info"
        delay={0.15}
      />
    </div>
  );
};
