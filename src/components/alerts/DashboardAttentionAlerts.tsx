/**
 * Dashboard Attention Alerts
 * 
 * Shows critical and warning alerts that need immediate attention.
 * Used in both mobile and desktop dashboard views.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  AlertCircle, 
  AlertTriangle, 
  Clock, 
  ChevronDown, 
  ChevronRight,
  CheckCircle2,
  Sparkles,
  Users,
  Package,
  Box
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useGuardrailAlerts } from "@/hooks/use-guardrail-alerts";
import { GuardrailAlert, alertSeverityConfig } from "@/types/alerts";

interface DashboardAttentionAlertsProps {
  loading?: boolean;
  maxItems?: number;
  className?: string;
}

const categoryIcons = {
  team: Users,
  item: Package,
  container: Box,
};

const severityIcons = {
  critical: AlertCircle,
  warning: AlertTriangle,
  info: Clock,
};

export const DashboardAttentionAlerts = ({ 
  loading: externalLoading, 
  maxItems = 5,
  className,
}: DashboardAttentionAlertsProps) => {
  const navigate = useNavigate();
  const { dashboardAlerts, summary, loading: alertsLoading } = useGuardrailAlerts();
  const [isExpanded, setIsExpanded] = useState(false);

  const loading = externalLoading || alertsLoading;

  if (loading) {
    return (
      <Card className={cn("p-4", className)} style={{ boxShadow: "var(--shadow-card)" }}>
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
  if (dashboardAlerts.length === 0) {
    return (
      <Card className={cn("p-4", className)} style={{ boxShadow: "var(--shadow-card)" }}>
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

  const displayAlerts = isExpanded ? dashboardAlerts : dashboardAlerts.slice(0, maxItems);
  const hasMore = dashboardAlerts.length > maxItems;

  // Summary text
  const getSummaryText = () => {
    const parts: string[] = [];
    if (summary.critical > 0) parts.push(`${summary.critical} critical`);
    if (summary.warning > 0) parts.push(`${summary.warning} need attention`);
    return parts.join(", ");
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card 
        className={cn(
          "overflow-hidden transition-all duration-200",
          summary.critical > 0 && "border-destructive/25",
          className
        )}
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        {/* Header - Always visible */}
        <CollapsibleTrigger asChild>
          <div 
            className={cn(
              "flex items-center gap-3 p-4 cursor-pointer transition-colors",
              "hover:bg-muted/30 active:bg-muted/50"
            )}
          >
            <div className={cn(
              "p-2.5 rounded-xl",
              summary.critical > 0 ? "bg-destructive/10" : "bg-warning/10"
            )}>
              {summary.critical > 0 ? (
                <AlertCircle className="h-5 w-5 text-destructive" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-warning" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {dashboardAlerts.length} item{dashboardAlerts.length !== 1 ? 's' : ''} need attention
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {getSummaryText()}
              </p>
            </div>
            
            <ChevronDown 
              className={cn(
                "h-5 w-5 text-muted-foreground transition-transform duration-200",
                isExpanded && "rotate-180"
              )} 
            />
          </div>
        </CollapsibleTrigger>

        {/* Expanded Alert List */}
        <CollapsibleContent>
          <div className="border-t border-border/50">
            {displayAlerts.map((alert, index) => (
              <AlertRow 
                key={alert.id} 
                alert={alert} 
                onNavigate={navigate}
                isLast={index === displayAlerts.length - 1}
              />
            ))}
          </div>
          
          {/* View more link */}
          {hasMore && !isExpanded && (
            <Button
              variant="ghost"
              className="w-full text-sm text-muted-foreground h-9 rounded-none border-t border-border/30"
            >
              View all {dashboardAlerts.length} alerts
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

interface AlertRowProps {
  alert: GuardrailAlert;
  onNavigate: (path: string) => void;
  isLast?: boolean;
}

const AlertRow = ({ alert, onNavigate, isLast = false }: AlertRowProps) => {
  const config = alertSeverityConfig[alert.severity];
  const Icon = severityIcons[alert.severity];
  const CategoryIcon = categoryIcons[alert.category];

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer",
        "hover:bg-muted/30 active:bg-muted/40",
        !isLast && "border-b border-border/30"
      )}
      onClick={() => onNavigate(alert.action.route)}
    >
      {/* Icon */}
      <div className={cn("p-2 rounded-lg", config.bgColor)}>
        <Icon className={cn("h-4 w-4", config.textColor)} />
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-sm font-medium truncate min-w-0">{alert.title}</p>
          <CategoryIcon className="h-3 w-3 text-muted-foreground/50 flex-shrink-0" />
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {alert.description}
        </p>
      </div>
      
      {/* Action */}
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 px-3 text-xs font-medium rounded-lg shrink-0",
          "bg-background/60 hover:bg-background",
          alert.severity === "critical" && "text-destructive",
          alert.severity === "warning" && "text-warning"
        )}
        onClick={(e) => {
          e.stopPropagation();
          onNavigate(alert.action.route);
        }}
      >
        {alert.action.label}
        <ChevronRight className="h-3.5 w-3.5 ml-1" />
      </Button>
    </div>
  );
};

/**
 * Compact version for mobile
 */
export const MobileAttentionAlerts = ({ className }: { className?: string }) => {
  const navigate = useNavigate();
  const { dashboardAlerts, summary, loading } = useGuardrailAlerts();
  const [isOpen, setIsOpen] = useState(false);

  if (loading) {
    return (
      <Card className={cn("p-4", className)} style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="flex items-center gap-3 animate-pulse">
          <div className="h-10 w-10 bg-muted rounded-xl" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="h-3 w-24 bg-muted rounded" />
          </div>
        </div>
      </Card>
    );
  }

  if (dashboardAlerts.length === 0) {
    return (
      <Card className={cn("p-4", className)} style={{ boxShadow: "var(--shadow-card)" }}>
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

  const getSummaryText = () => {
    const parts: string[] = [];
    if (summary.critical > 0) parts.push(`${summary.critical} critical`);
    if (summary.warning > 0) parts.push(`${summary.warning} need review`);
    return parts.join(", ");
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card 
        className={cn(
          "overflow-hidden transition-all duration-200",
          summary.critical > 0 && "border-destructive/25",
          className
        )}
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30">
            <div className={cn(
              "p-2.5 rounded-xl",
              summary.critical > 0 ? "bg-destructive/10" : "bg-warning/10"
            )}>
              {summary.critical > 0 ? (
                <AlertCircle className="h-5 w-5 text-destructive" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-warning" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-foreground">
                {dashboardAlerts.length} item{dashboardAlerts.length !== 1 ? 's' : ''} need attention
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">{getSummaryText()}</p>
            </div>
            
            <ChevronDown className={cn(
              "h-5 w-5 text-muted-foreground transition-transform",
              isOpen && "rotate-180"
            )} />
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-border/50">
            {dashboardAlerts.map((alert, index) => (
              <AlertRow 
                key={alert.id} 
                alert={alert} 
                onNavigate={navigate}
                isLast={index === dashboardAlerts.length - 1}
              />
            ))}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
