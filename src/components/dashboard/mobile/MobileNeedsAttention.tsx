import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  AlertCircle, 
  AlertTriangle, 
  Clock, 
  ChevronDown, 
  ChevronRight,
  CheckCircle2,
  Sparkles
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface AttentionItem {
  id: string;
  type: "critical" | "warning" | "info";
  count: number;
  label: string;
  description?: string;
  action: string;
  route: string;
}

interface MobileNeedsAttentionProps {
  items: AttentionItem[];
  loading?: boolean;
}

const typeConfig = {
  critical: {
    icon: AlertCircle,
    dot: "bg-destructive",
    text: "text-destructive",
    bg: "bg-destructive/8",
    border: "border-destructive/20",
    summary: "critical",
  },
  warning: {
    icon: AlertTriangle,
    dot: "bg-warning",
    text: "text-warning",
    bg: "bg-warning/8",
    border: "border-warning/15",
    summary: "needs review",
  },
  info: {
    icon: Clock,
    dot: "bg-muted-foreground",
    text: "text-muted-foreground",
    bg: "bg-muted/50",
    border: "border-muted",
    summary: "scheduled",
  },
};

export const MobileNeedsAttention = ({ items, loading }: MobileNeedsAttentionProps) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  // Separate critical items from non-critical
  const criticalItems = items.filter(i => i.type === "critical");
  const otherItems = items.filter(i => i.type !== "critical");
  
  const criticalCount = criticalItems.reduce((sum, i) => sum + i.count, 0);
  const warningCount = items.filter(i => i.type === "warning").reduce((sum, i) => sum + i.count, 0);
  const totalItems = items.reduce((sum, i) => sum + i.count, 0);

  if (loading) {
    return (
      <Card className="p-4" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="flex items-center gap-3 animate-pulse">
          <div className="h-10 w-10 bg-muted rounded-xl" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="h-3 w-24 bg-muted rounded" />
          </div>
          <div className="h-8 w-8 bg-muted rounded-lg" />
        </div>
      </Card>
    );
  }

  // All clear state
  if (items.length === 0 || totalItems === 0) {
    return (
      <Card 
        className="p-4"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-success/10">
            <CheckCircle2 className="h-5 w-5 text-success" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Nothing urgent</p>
            <p className="text-xs text-muted-foreground">All items are up to date</p>
          </div>
          <Sparkles className="h-4 w-4 text-success/40" />
        </div>
      </Card>
    );
  }

  // Build summary text
  const getSummaryText = () => {
    const parts: string[] = [];
    if (criticalCount > 0) {
      parts.push(`${criticalCount} expired`);
    }
    if (warningCount > 0) {
      parts.push(`${warningCount} expiring soon`);
    }
    if (parts.length === 0) {
      return `${totalItems} item${totalItems !== 1 ? 's' : ''} to review`;
    }
    return parts.join(", ");
  };

  // Get primary action route based on most critical item
  const getPrimaryRoute = () => {
    if (criticalItems.length > 0) return criticalItems[0].route;
    if (items.length > 0) return items[0].route;
    return "/people";
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card 
        className={cn(
          "overflow-hidden transition-all duration-200",
          criticalCount > 0 && "border-destructive/25"
        )}
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        {/* Collapsible Header - Summary View */}
        <CollapsibleTrigger asChild>
          <div 
            className={cn(
              "flex items-center gap-3 p-4 cursor-pointer transition-colors",
              "hover:bg-muted/30 active:bg-muted/50"
            )}
          >
            {/* Status Icon */}
            <div className={cn(
              "p-2.5 rounded-xl",
              criticalCount > 0 ? "bg-destructive/10" : "bg-warning/10"
            )}>
              {criticalCount > 0 ? (
                <AlertCircle className="h-5 w-5 text-destructive" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-warning" />
              )}
            </div>
            
            {/* Summary Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {totalItems} item{totalItems !== 1 ? 's' : ''} need attention
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {getSummaryText()}
              </p>
            </div>
            
            {/* Expand/Collapse Icon */}
            <div className="flex items-center gap-2">
              <ChevronDown 
                className={cn(
                  "h-5 w-5 text-muted-foreground transition-transform duration-200",
                  isOpen && "rotate-180"
                )} 
              />
            </div>
          </div>
        </CollapsibleTrigger>

        {/* Expanded Detail View */}
        <CollapsibleContent>
          <div className="border-t border-border/50">
            {items.map((item, index) => {
              const config = typeConfig[item.type];
              const Icon = config.icon;
              
              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 transition-colors",
                    "active:bg-muted/30",
                    index !== items.length - 1 && "border-b border-border/30"
                  )}
                  onClick={() => navigate(item.route)}
                >
                  {/* Icon */}
                  <div className={cn("p-2 rounded-lg", config.bg)}>
                    <Icon className={cn("h-4 w-4", config.text)} />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      <span className={cn("font-bold tabular-nums", config.text)}>
                        {item.count}
                      </span>{" "}
                      <span className="text-foreground/80">{item.label}</span>
                    </p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.description}
                      </p>
                    )}
                  </div>
                  
                  {/* Action */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8 px-3 text-xs font-medium rounded-lg",
                      "bg-background/60 hover:bg-background",
                      item.type === "critical" ? "text-destructive" : config.text
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(item.route);
                    }}
                  >
                    {item.action}
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
