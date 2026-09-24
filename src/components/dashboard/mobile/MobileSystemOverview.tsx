import { useState, useEffect } from "react";
import { ChevronDown, Package, Wrench, FileText, CheckCircle2, AlertTriangle, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface SystemStats {
  available: number;
  inUse: number;
  underService: number;
  credentialHealth: number; // percentage
}

interface MobileSystemOverviewProps {
  stats: SystemStats;
  loading?: boolean;
}

// Animated number for system stats
const AnimatedNumber = ({ value, suffix = "" }: { value: number | string; suffix?: string }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const numericValue = typeof value === "string" ? parseInt(value) : value;
  
  useEffect(() => {
    if (numericValue === 0) {
      setDisplayValue(0);
      return;
    }
    
    let startTime: number | null = null;
    let frame: number;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / 600, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(easeOut * numericValue));
      
      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };
    
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [numericValue]);
  
  return <>{displayValue}{suffix}</>;
};

export const MobileSystemOverview = ({ stats, loading }: MobileSystemOverviewProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  if (loading) {
    return (
      <Card className="p-4" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="flex items-center justify-between">
          <div className="h-5 w-32 bg-muted rounded animate-pulse" />
          <div className="h-5 w-5 bg-muted rounded animate-pulse" />
        </div>
      </Card>
    );
  }

  // Calculate overall health score
  const totalAssets = stats.available + stats.inUse + stats.underService;
  const assetHealth = totalAssets > 0 ? Math.round(((stats.available + stats.inUse) / totalAssets) * 100) : 100;
  const overallHealth = Math.round((assetHealth + stats.credentialHealth) / 2);
  
  // Determine health status message
  const getHealthMessage = () => {
    if (overallHealth >= 90) return "All systems operational";
    if (overallHealth >= 70) return "Minor issues to review";
    return "Attention required";
  };

  // Check for specific issues
  const hasServiceItems = stats.underService > 0;
  const hasCredentialIssues = stats.credentialHealth < 100;
  const allClear = !hasServiceItems && !hasCredentialIssues && overallHealth >= 90;

  const overviewItems = [
    { 
      label: "Available", 
      value: stats.available, 
      icon: Package,
      color: "text-success",
      bg: "bg-success/10",
      gradient: "from-success/10 to-transparent",
      detail: stats.available > 0 ? "Ready for use" : "None available",
      route: "/inventory?status=Available",
    },
    { 
      label: "In Use", 
      value: stats.inUse, 
      icon: Package,
      color: "text-primary",
      bg: "bg-primary/10",
      gradient: "from-primary/10 to-transparent",
      detail: stats.inUse > 0 ? "Currently deployed" : "Nothing checked out",
      route: "/inventory?status=In%20Use",
    },
    { 
      label: "Service", 
      value: stats.underService, 
      icon: Wrench,
      color: "text-warning",
      bg: "bg-warning/10",
      gradient: "from-warning/10 to-transparent",
      detail: stats.underService > 0 ? "Needs attention" : "All equipment operational",
      route: "/inventory?status=Under%20Service",
    },
    { 
      label: "Credentials", 
      value: stats.credentialHealth, 
      suffix: "%",
      icon: FileText,
      color: stats.credentialHealth >= 80 ? "text-success" : stats.credentialHealth >= 50 ? "text-warning" : "text-destructive",
      bg: stats.credentialHealth >= 80 ? "bg-success/10" : stats.credentialHealth >= 50 ? "bg-warning/10" : "bg-destructive/10",
      gradient: stats.credentialHealth >= 80 ? "from-success/10 to-transparent" : stats.credentialHealth >= 50 ? "from-warning/10 to-transparent" : "from-destructive/10 to-transparent",
      detail: stats.credentialHealth >= 100 ? "All up to date" : stats.credentialHealth >= 80 ? "Mostly current" : "Renewals needed",
      route: stats.credentialHealth >= 100 ? "/people?tab=requirements" : "/people?tab=requirements&focus=attention",
    },
  ];

  return (
    <Card 
      className="overflow-hidden"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full p-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-2.5">
            {/* Status icon */}
            <div className={cn(
              "p-1.5 rounded-lg",
              allClear ? "bg-success/10" : overallHealth >= 70 ? "bg-warning/10" : "bg-destructive/10"
            )}>
              {allClear ? (
                <CheckCircle2 className="h-4 w-4 text-success" />
              ) : (
                <AlertTriangle className={cn(
                  "h-4 w-4",
                  overallHealth >= 70 ? "text-warning" : "text-destructive"
                )} />
              )}
            </div>
            
            <div className="text-left">
              <span className="text-sm font-semibold block">System Health</span>
              <span className="text-xs text-muted-foreground">
                Alerts, tasks, and tracking operating normally
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Health indicator pill */}
            <span className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              overallHealth >= 80 ? "bg-success/10 text-success" : 
              overallHealth >= 50 ? "bg-warning/10 text-warning" : 
              "bg-destructive/10 text-destructive"
            )}>
              {overallHealth}%
            </span>
            <ChevronDown 
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                isOpen && "rotate-180"
              )} 
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3.5 pb-3.5 pt-1 grid grid-cols-2 gap-2.5">
            {overviewItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className={cn(
                    "relative overflow-hidden p-3 rounded-xl border border-border/50",
                    "transition-all duration-200 cursor-pointer active:scale-[0.98]",
                    "hover:border-border hover:shadow-sm"
                  )}
                  style={{
                    animationDelay: `${index * 50}ms`,
                  }}
                  onClick={() => navigate(item.route)}
                >
                  {/* Gradient background */}
                  <div className={cn(
                    "absolute inset-0 bg-gradient-to-br opacity-50",
                    item.gradient
                  )} />
                  
                  <div className="relative">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className={cn("p-1 rounded-md", item.bg)}>
                        <Icon className={cn("h-3 w-3", item.color)} />
                      </div>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">{item.label}</p>
                    </div>
                    <p className={cn("text-xl font-bold tabular-nums", item.color)}>
                      <AnimatedNumber value={item.value} suffix={item.suffix} />
                    </p>
                    {/* Contextual detail */}
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5 leading-tight">
                      {item.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Summary message when expanded */}
          {allClear && (
            <div className="mx-3.5 mb-3.5 p-2.5 rounded-lg bg-success/5 border border-success/20">
              <p className="text-xs text-success text-center font-medium flex items-center justify-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                No overdue items • All checks passing
              </p>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
