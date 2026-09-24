import { Package, Users, FileText, Wrench, CheckCircle, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface QuickStat {
  label: string;
  value: number;
  status: "healthy" | "attention" | "urgent";
  route?: string;
  icon: React.ElementType;
}

interface MobileQuickStatsProps {
  stats: QuickStat[];
  loading?: boolean;
}

const statusColors = {
  healthy: "text-success",
  attention: "text-warning",
  urgent: "text-destructive",
};

const statusBg = {
  healthy: "bg-success/10",
  attention: "bg-warning/10",
  urgent: "bg-destructive/10",
};

export const MobileQuickStats = ({ stats, loading }: MobileQuickStatsProps) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card className="p-4">
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="text-center animate-pulse">
              <div className="h-10 w-10 mx-auto bg-muted rounded-xl mb-2" />
              <div className="h-5 w-8 mx-auto bg-muted rounded" />
              <div className="h-3 w-12 mx-auto bg-muted rounded mt-1" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="grid grid-cols-4 gap-2">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <button
              key={stat.label}
              className={cn(
                "flex flex-col items-center p-2 rounded-xl transition-all",
                "active:scale-95 active:bg-muted/50",
                stat.route && "cursor-pointer"
              )}
              onClick={() => stat.route && navigate(stat.route)}
            >
              <div className={cn(
                "p-2 rounded-xl mb-1.5",
                statusBg[stat.status]
              )}>
                <Icon className={cn("h-4 w-4", statusColors[stat.status])} />
              </div>
              <span className={cn(
                "text-lg font-bold tabular-nums",
                statusColors[stat.status]
              )}>
                {stat.value}
              </span>
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                {stat.label}
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
};
