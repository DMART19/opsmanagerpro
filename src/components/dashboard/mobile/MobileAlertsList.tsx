import { useNavigate } from "react-router-dom";
import { AlertCircle, AlertTriangle, CheckCircle, Clock, ChevronRight, Bell } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Alert {
  id: string;
  type: "urgent" | "attention" | "info" | "success";
  title: string;
  description: string;
  action?: string;
  route?: string;
}

interface MobileAlertsListProps {
  alerts: Alert[];
  loading?: boolean;
  maxItems?: number;
}

const alertStyles = {
  urgent: {
    icon: AlertCircle,
    bg: "bg-destructive/10",
    border: "border-destructive/20",
    iconColor: "text-destructive",
    badge: "bg-destructive/10 text-destructive border-destructive/20",
  },
  attention: {
    icon: AlertTriangle,
    bg: "bg-warning/10",
    border: "border-warning/20",
    iconColor: "text-warning",
    badge: "bg-warning/10 text-warning border-warning/20",
  },
  info: {
    icon: Clock,
    bg: "bg-primary/10",
    border: "border-primary/20",
    iconColor: "text-primary",
    badge: "bg-primary/10 text-primary border-primary/20",
  },
  success: {
    icon: CheckCircle,
    bg: "bg-success/10",
    border: "border-success/20",
    iconColor: "text-success",
    badge: "bg-success/10 text-success border-success/20",
  },
};

export const MobileAlertsList = ({ 
  alerts, 
  loading, 
  maxItems = 5 
}: MobileAlertsListProps) => {
  const navigate = useNavigate();
  const displayAlerts = alerts.slice(0, maxItems);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="flex gap-3">
              <div className="h-10 w-10 bg-muted rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-3 w-full bg-muted rounded" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (displayAlerts.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-success/10 flex items-center justify-center">
            <CheckCircle className="h-7 w-7 text-success" />
          </div>
          <p className="font-medium text-foreground">All clear!</p>
          <p className="text-sm text-muted-foreground mt-1">
            No items need your attention right now.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {displayAlerts.map((alert) => {
        const style = alertStyles[alert.type];
        const Icon = style.icon;
        
        return (
          <Card
            key={alert.id}
            className={cn(
              "p-3 transition-all active:scale-[0.99]",
              alert.route && "cursor-pointer",
              style.border
            )}
            onClick={() => alert.route && navigate(alert.route)}
          >
            <div className="flex gap-3 items-start">
              <div className={cn("p-2 rounded-xl flex-shrink-0", style.bg)}>
                <Icon className={cn("h-4 w-4", style.iconColor)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium truncate">{alert.title}</p>
                  {alert.route && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {alert.description}
                </p>
                {alert.action && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 mt-1.5 text-xs font-medium"
                    onClick={(e) => {
                      e.stopPropagation();
                      alert.route && navigate(alert.route);
                    }}
                  >
                    {alert.action} →
                  </Button>
                )}
              </div>
            </div>
          </Card>
        );
      })}

      {alerts.length > maxItems && (
        <Button
          variant="ghost"
          className="w-full text-sm text-muted-foreground"
          onClick={() => navigate("/people")}
        >
          View all {alerts.length} alerts
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      )}
    </div>
  );
};
