import { CheckCircle, AlertTriangle, AlertCircle, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MobileSystemHealthProps {
  healthScore: number; // 0-100
  status: "healthy" | "attention" | "critical";
  message: string;
  subMessage?: string;
}

const statusConfig = {
  healthy: {
    icon: CheckCircle,
    color: "text-success",
    bg: "bg-success/10",
    border: "border-success/20",
    label: "All systems healthy",
  },
  attention: {
    icon: AlertTriangle,
    color: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/20",
    label: "Needs attention",
  },
  critical: {
    icon: AlertCircle,
    color: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/20",
    label: "Action required",
  },
};

export const MobileSystemHealth = ({
  healthScore,
  status,
  message,
  subMessage,
}: MobileSystemHealthProps) => {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Card className={cn(
      "p-4 border-2 transition-all",
      config.border
    )}>
      <div className="flex items-start gap-3">
        <div className={cn("p-2.5 rounded-xl", config.bg)}>
          <Icon className={cn("h-5 w-5", config.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className={cn("text-sm font-semibold", config.color)}>
              {config.label}
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span className="tabular-nums">{healthScore}%</span>
            </div>
          </div>
          <p className="text-sm text-foreground">{message}</p>
          {subMessage && (
            <p className="text-xs text-muted-foreground mt-1">{subMessage}</p>
          )}
        </div>
      </div>
    </Card>
  );
};
