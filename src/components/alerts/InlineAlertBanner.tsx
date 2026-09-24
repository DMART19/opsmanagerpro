/**
 * Inline Alert Banner Component
 * 
 * Displays actionable alerts inline on relevant pages (Team, Items, Containers).
 * Shows max 3 alerts with "View all" expansion.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  ChevronRight, 
  ChevronDown,
  CheckCircle2 
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { GuardrailAlert, alertSeverityConfig } from "@/types/alerts";
import { ResolveCredentialFromAlert } from "./ResolveCredentialFromAlert";
import { ScheduleRenewalFromAlert } from "./ScheduleRenewalFromAlert";

interface InlineAlertBannerProps {
  alerts: GuardrailAlert[];
  loading?: boolean;
  maxVisible?: number;
  className?: string;
  showAllClear?: boolean;
  onAlertResolved?: () => void;
  onOpenContainerDrawer?: (container: any) => void;
  onOpenItemDrawer?: (item: any) => void;
}

const severityIcons = {
  critical: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

export const InlineAlertBanner = ({ 
  alerts, 
  loading, 
  maxVisible = 3,
  className,
  showAllClear = false,
  onAlertResolved,
  onOpenContainerDrawer,
  onOpenItemDrawer,
}: InlineAlertBannerProps) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [resolvingAlert, setResolvingAlert] = useState<GuardrailAlert | null>(null);
  const [renewingAlert, setRenewingAlert] = useState<GuardrailAlert | null>(null);
  const [severityFilter, setSeverityFilter] = useState<"all" | "critical" | "warning">("all");

  const handleAlertAction = (alert: GuardrailAlert) => {
    if (alert.action.openModal === "resolve_credential") {
      setResolvingAlert(alert);
    } else if (alert.action.openModal === "schedule_renewal") {
      setRenewingAlert(alert);
    } else if (alert.action.openModal === "open_container_drawer" && onOpenContainerDrawer) {
      onOpenContainerDrawer(alert.metadata?.container);
    } else if (alert.action.openModal === "open_item_drawer" && onOpenItemDrawer) {
      onOpenItemDrawer(alert.metadata?.item);
    } else {
      navigate(alert.action.route);
    }
  };

  const handleResolutionSuccess = () => {
    setResolvingAlert(null);
    onAlertResolved?.();
  };

  const handleRenewalSuccess = () => {
    setRenewingAlert(null);
    onAlertResolved?.();
  };

  if (loading) {
    return (
      <Card className={cn("p-2.5 animate-pulse", className)}>
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 bg-muted rounded" />
          <div className="flex-1 space-y-1">
            <div className="h-3.5 w-48 bg-muted rounded" />
            <div className="h-3 w-32 bg-muted rounded" />
          </div>
        </div>
      </Card>
    );
  }

  // All clear state
  if (alerts.length === 0) {
    if (!showAllClear) return null;
    
    return (
      <Card className={cn("p-2.5", className)} style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <p className="text-sm font-medium text-foreground">All clear — no issues</p>
        </div>
      </Card>
    );
  }

  const criticalCount = alerts.filter(a => a.severity === "critical").length;
  const warningCount = alerts.filter(a => a.severity === "warning").length;
  
  // Auto-collapse when no critical alerts
  const filteredAlerts = severityFilter === "all" 
    ? alerts 
    : alerts.filter(a => a.severity === severityFilter);
  
  const visibleAlerts = isExpanded ? filteredAlerts : filteredAlerts.slice(0, maxVisible);
  const hasMore = filteredAlerts.length > maxVisible;

  return (
    <>
      <Card 
        className={cn(
          "overflow-hidden",
          criticalCount > 0 && "border-destructive/20",
          warningCount > 0 && criticalCount === 0 && "border-warning/15",
          className
        )}
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        {/* Compact header — click to expand/collapse */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/30 transition-colors"
        >
          <div className={cn(
            "p-1 rounded",
            criticalCount > 0 ? "bg-destructive/10" : "bg-warning/10"
          )}>
            {criticalCount > 0 ? (
              <AlertCircle className="h-3.5 w-3.5 text-destructive" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5 text-warning" />
            )}
          </div>
          <span className="text-sm font-medium flex-1 text-left">
            {alerts.length} {alerts.length === 1 ? "alert" : "alerts"}
          </span>
          
          {/* Severity filter buttons — only when open */}
          {isOpen && (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <span
                onClick={() => setSeverityFilter("all")}
                className={cn(
                  "px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer",
                  severityFilter === "all" 
                    ? "bg-muted text-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                All ({alerts.length})
              </span>
              {criticalCount > 0 && (
                <span
                  onClick={() => setSeverityFilter("critical")}
                  className={cn(
                    "px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer",
                    severityFilter === "critical"
                      ? "bg-destructive/10 text-destructive"
                      : "text-destructive/60 hover:text-destructive"
                  )}
                >
                  Critical ({criticalCount})
                </span>
              )}
              {warningCount > 0 && (
                <span
                  onClick={() => setSeverityFilter("warning")}
                  className={cn(
                    "px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer",
                    severityFilter === "warning"
                      ? "bg-warning/10 text-warning"
                      : "text-warning/60 hover:text-warning"
                  )}
                >
                  Warning ({warningCount})
                </span>
              )}
            </div>
          )}
          
          <ChevronDown className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0",
            isOpen && "rotate-180"
          )} />
        </button>

        {/* Alert list — only visible when open */}
        {isOpen && (
          <>
            <div className="border-t border-border/30">
              {visibleAlerts.map((alert, idx) => (
                <SingleAlertRow 
                  key={alert.id} 
                  alert={alert} 
                  onAction={handleAlertAction}
                  showBorder={idx !== visibleAlerts.length - 1}
                />
              ))}
            </div>

            {/* Expand/collapse footer */}
            {hasMore && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors border-t border-border/30 flex items-center justify-center gap-1"
              >
                {isExpanded ? "Show less" : `View all ${filteredAlerts.length} alerts`}
                <ChevronDown className={cn(
                  "h-3 w-3 transition-transform",
                  isExpanded && "rotate-180"
                )} />
              </button>
            )}
          </>
        )}
      </Card>

      {/* Resolve Credential Modal */}
      <ResolveCredentialFromAlert
        alert={resolvingAlert}
        open={!!resolvingAlert}
        onOpenChange={(open) => !open && setResolvingAlert(null)}
        onSuccess={handleResolutionSuccess}
      />

      {/* Schedule Renewal Modal */}
      <ScheduleRenewalFromAlert
        alert={renewingAlert}
        open={!!renewingAlert}
        onOpenChange={(open) => !open && setRenewingAlert(null)}
        onSuccess={handleRenewalSuccess}
      />
    </>
  );
};

interface SingleAlertRowProps {
  alert: GuardrailAlert;
  onAction: (alert: GuardrailAlert) => void;
  showBorder?: boolean;
}

const SingleAlertRow = ({ alert, onAction, showBorder = false }: SingleAlertRowProps) => {
  const config = alertSeverityConfig[alert.severity];
  const Icon = severityIcons[alert.severity];

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-muted/30 transition-colors",
        showBorder && "border-b border-border/20"
      )}
      onClick={() => onAction(alert)}
    >
      <Icon className={cn("h-3.5 w-3.5 flex-shrink-0", config.textColor)} />
      
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-foreground truncate">{alert.title}</p>
        <p className="text-[11px] text-muted-foreground truncate">{alert.description}</p>
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-6 px-2 text-[11px] font-medium rounded shrink-0",
          alert.severity === "critical" && "text-destructive hover:text-destructive",
          alert.severity === "warning" && "text-warning hover:text-warning"
        )}
        onClick={(e) => {
          e.stopPropagation();
          onAction(alert);
        }}
      >
        {alert.action.label}
        <ChevronRight className="h-3 w-3 ml-0.5" />
      </Button>
    </div>
  );
};
