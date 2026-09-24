import { LucideIcon, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface MobileMetricCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  status?: "healthy" | "attention" | "urgent";
  statusLabel?: string;
  link?: string;
  loading?: boolean;
}

const statusStyles = {
  healthy: "border-success/30 bg-success/5",
  attention: "border-warning/30 bg-warning/5",
  urgent: "border-destructive/30 bg-destructive/5",
};

const statusTextStyles = {
  healthy: "text-success",
  attention: "text-warning",
  urgent: "text-destructive",
};

export const MobileMetricCard = ({
  title,
  value,
  icon: Icon,
  status = "healthy",
  statusLabel,
  link,
  loading,
}: MobileMetricCardProps) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card className="p-4 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 w-20 bg-muted rounded" />
            <div className="h-8 w-12 bg-muted rounded" />
          </div>
          <div className="h-10 w-10 bg-muted rounded-xl" />
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "p-4 transition-all active:scale-[0.98]",
        link && "cursor-pointer",
        status !== "healthy" && statusStyles[status]
      )}
      onClick={() => link && navigate(link)}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground truncate">
            {title}
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-2xl font-bold tabular-nums">{value}</p>
            {statusLabel && (
              <span className={cn("text-xs font-medium", statusTextStyles[status])}>
                {statusLabel}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn(
            "p-2.5 rounded-xl",
            status === "healthy" && "bg-primary/10",
            status === "attention" && "bg-warning/10",
            status === "urgent" && "bg-destructive/10"
          )}>
            <Icon className={cn(
              "h-5 w-5",
              status === "healthy" && "text-primary",
              status === "attention" && "text-warning",
              status === "urgent" && "text-destructive"
            )} />
          </div>
          {link && (
            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
          )}
        </div>
      </div>
    </Card>
  );
};
