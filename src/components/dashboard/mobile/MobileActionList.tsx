import { useNavigate } from "react-router-dom";
import { ChevronRight, AlertCircle, AlertTriangle, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface ActionItem {
  id: string;
  type: "urgent" | "warning" | "info";
  count: number;
  label: string;
  action: string;
  route: string;
}

interface MobileActionListProps {
  items: ActionItem[];
  loading?: boolean;
  maxItems?: number;
}

const typeConfig = {
  urgent: {
    icon: AlertCircle,
    dot: "bg-destructive",
    text: "text-destructive",
    bg: "bg-destructive/5",
    border: "border-destructive/20",
  },
  warning: {
    icon: AlertTriangle,
    dot: "bg-warning",
    text: "text-warning",
    bg: "bg-warning/5",
    border: "border-warning/20",
  },
  info: {
    icon: Clock,
    dot: "bg-primary",
    text: "text-primary",
    bg: "bg-primary/5",
    border: "border-primary/20",
  },
};

export const MobileActionList = ({ items, loading, maxItems = 4 }: MobileActionListProps) => {
  const navigate = useNavigate();
  const displayItems = items.slice(0, maxItems);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center gap-3 animate-pulse">
              <div className="h-3 w-3 rounded-full bg-muted" />
              <div className="h-4 flex-1 bg-muted rounded" />
              <div className="h-8 w-16 bg-muted rounded-lg" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (displayItems.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {displayItems.map((item, index) => {
        const config = typeConfig[item.type];
        const Icon = config.icon;
        
        return (
          <Card
            key={item.id}
            className={cn(
              "overflow-hidden transition-all duration-200",
              "active:scale-[0.99]",
              item.type === "urgent" && "border-destructive/30"
            )}
            style={{
              boxShadow: "var(--shadow-card)",
              animationDelay: `${index * 50}ms`,
            }}
          >
            <div 
              className={cn(
                "flex items-center gap-3 p-4 transition-colors",
                config.bg
              )}
            >
              {/* Icon with glow effect */}
              <div className={cn(
                "relative flex-shrink-0 p-2 rounded-xl",
                config.bg
              )}>
                <Icon className={cn("h-4 w-4", config.text)} />
              </div>
              
              {/* Label */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  <span className={cn("font-bold tabular-nums text-base", config.text)}>
                    {item.count}
                  </span>{" "}
                  <span className="text-foreground/80">{item.label}</span>
                </p>
              </div>
              
              {/* Action Button */}
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "flex-shrink-0 h-9 px-4 text-sm font-medium rounded-xl",
                  "bg-background/80 hover:bg-background",
                  config.text
                )}
                onClick={() => navigate(item.route)}
              >
                {item.action}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
