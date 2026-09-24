import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Info, ShieldCheck, Clock, CheckCircle2, Package, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// Executive KPI data - would connect to real data in production
const kpiData = {
  resourceAvailability: {
    value: 71.4,
    trend: 3.2,
    target: 70,
    label: "Resource Availability",
    description: "Percentage of resources ready for use or assignment",
    whatGoodLooks: "Above 65% indicates healthy capacity",
    whyItMatters: "Ensures teams have access to needed resources",
    icon: Package,
  },
  complianceRisk: {
    value: 19,
    approachingCount: 14,
    overdueCount: 5,
    label: "Compliance & Readiness Risk",
    description: "Items requiring renewal, validation, or review",
    whatGoodLooks: "Fewer than 10 items needing attention",
    whyItMatters: "Prevents compliance gaps and operational risks",
    icon: ShieldCheck,
  },
  workCompletion: {
    value: 84.2,
    trend: -2.1,
    target: 80,
    label: "Work Completion Rate",
    description: "Work completed within expected targets",
    whatGoodLooks: "Above 80% completion rate",
    whyItMatters: "Indicates operational efficiency and reliability",
    icon: CheckCircle2,
  },
  avgResolutionTime: {
    value: 3.8,
    trend: -0.5,
    target: 4.0,
    label: "Average Resolution Time",
    description: "Average time to completion vs defined SLA",
    whatGoodLooks: "Below 4 days average",
    whyItMatters: "Faster resolution improves team productivity",
    unit: "days",
    icon: Clock,
  },
};

const getStatusInfo = (value: number, target: number, isInverse: boolean = false) => {
  const diff = isInverse ? target - value : value - target;
  if (diff >= 5) return { 
    color: "text-green-700 bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800 dark:text-green-300",
    label: "Healthy",
    iconColor: "text-green-600"
  };
  if (diff >= 0) return { 
    color: "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300",
    label: "Within Target",
    iconColor: "text-amber-600"
  };
  return { 
    color: "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300",
    label: "Needs Attention",
    iconColor: "text-amber-600"
  };
};

const getComplianceStatusInfo = (total: number) => {
  if (total <= 5) return { 
    color: "text-green-700 bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800 dark:text-green-300",
    label: "Healthy",
    iconColor: "text-green-600"
  };
  if (total <= 15) return { 
    color: "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300",
    label: "Needs Attention",
    iconColor: "text-amber-600"
  };
  return { 
    color: "text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300",
    label: "Review Recommended",
    iconColor: "text-amber-600"
  };
};

interface KPICardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: number;
  target?: number;
  description: string;
  whatGoodLooks?: string;
  whyItMatters?: string;
  icon: React.ElementType;
  statusInfo: { color: string; label: string; iconColor: string };
  subtext?: string;
  onClick?: () => void;
}

const KPICard = ({ 
  label, 
  value, 
  unit = "%", 
  trend, 
  target, 
  description,
  whatGoodLooks,
  whyItMatters,
  icon: Icon, 
  statusInfo,
  subtext,
  onClick 
}: KPICardProps) => {
  const TrendIcon = trend && trend > 0 ? TrendingUp : trend && trend < 0 ? TrendingDown : Minus;
  const trendColor = trend && trend > 0 ? "text-green-600" : trend && trend < 0 ? "text-amber-600" : "text-muted-foreground";
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-4 rounded-xl border-2 transition-all duration-200 text-left w-full group",
        "hover:shadow-lg hover:scale-[1.02] cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20",
        statusInfo.color
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4", statusInfo.iconColor)} />
          <span className="text-xs font-medium opacity-80">{label}</span>
        </div>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <Info className="h-3.5 w-3.5 opacity-50 hover:opacity-100 cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-[280px] p-3" side="bottom">
            <div className="space-y-2">
              <p className="font-medium text-sm">{label}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
              {whyItMatters && (
                <div className="pt-2 border-t">
                  <p className="text-xs"><span className="font-medium">Why it matters:</span> {whyItMatters}</p>
                </div>
              )}
              {whatGoodLooks && (
                <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>{whatGoodLooks}</span>
                </div>
              )}
              {target && <p className="text-xs font-medium mt-1">Target: {target}{unit}</p>}
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
      
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold">{value}</span>
        {unit && <span className="text-sm opacity-70 mb-0.5">{unit}</span>}
      </div>
      
      {/* Confidence Indicator Badge */}
      <div className="mt-2">
        <Badge variant="outline" className={cn(
          "text-[10px] px-1.5 py-0.5 font-medium border-current/30 bg-transparent",
          statusInfo.color
        )}>
          {statusInfo.label}
        </Badge>
      </div>
      
      {trend !== undefined && (
        <div className={cn("flex items-center gap-1 mt-2 text-xs", trendColor)}>
          <TrendIcon className="h-3 w-3" />
          <span>{trend > 0 ? "+" : ""}{trend}% vs last month</span>
        </div>
      )}
      
      {subtext && (
        <p className="text-xs opacity-70 mt-1">{subtext}</p>
      )}
      
      {/* Click hint on hover */}
      <div className="mt-2 text-[10px] opacity-0 group-hover:opacity-60 transition-opacity text-current">
        Click to explore →
      </div>
    </button>
  );
};

export const ExecutiveSummary = () => {
  const navigate = useNavigate();

  return (
    <Card className="p-6">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">System Health Overview</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Key performance indicators at a glance • Click any card to explore details
          </p>
        </div>
        <Badge variant="outline" className="text-xs gap-1 text-green-600 border-green-200 bg-green-50 dark:bg-green-950/20">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          Live
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label={kpiData.resourceAvailability.label}
          value={kpiData.resourceAvailability.value}
          trend={kpiData.resourceAvailability.trend}
          target={kpiData.resourceAvailability.target}
          description={kpiData.resourceAvailability.description}
          whatGoodLooks={kpiData.resourceAvailability.whatGoodLooks}
          whyItMatters={kpiData.resourceAvailability.whyItMatters}
          icon={kpiData.resourceAvailability.icon}
          statusInfo={getStatusInfo(kpiData.resourceAvailability.value, kpiData.resourceAvailability.target)}
          onClick={() => navigate('/inventory?status=available')}
        />
        
        <KPICard
          label={kpiData.complianceRisk.label}
          value={kpiData.complianceRisk.value}
          unit=" items"
          description={kpiData.complianceRisk.description}
          whatGoodLooks={kpiData.complianceRisk.whatGoodLooks}
          whyItMatters={kpiData.complianceRisk.whyItMatters}
          icon={kpiData.complianceRisk.icon}
          statusInfo={getComplianceStatusInfo(kpiData.complianceRisk.value)}
          subtext={`${kpiData.complianceRisk.approachingCount} approaching • ${kpiData.complianceRisk.overdueCount} overdue`}
          onClick={() => navigate('/people?tab=compliance')}
        />
        
        <KPICard
          label={kpiData.workCompletion.label}
          value={kpiData.workCompletion.value}
          trend={kpiData.workCompletion.trend}
          target={kpiData.workCompletion.target}
          description={kpiData.workCompletion.description}
          whatGoodLooks={kpiData.workCompletion.whatGoodLooks}
          whyItMatters={kpiData.workCompletion.whyItMatters}
          icon={kpiData.workCompletion.icon}
          statusInfo={getStatusInfo(kpiData.workCompletion.value, kpiData.workCompletion.target)}
          onClick={() => navigate('/calendar?view=month')}
        />
        
        <KPICard
          label={kpiData.avgResolutionTime.label}
          value={kpiData.avgResolutionTime.value}
          unit=" days"
          trend={kpiData.avgResolutionTime.trend}
          target={kpiData.avgResolutionTime.target}
          description={kpiData.avgResolutionTime.description}
          whatGoodLooks={kpiData.avgResolutionTime.whatGoodLooks}
          whyItMatters={kpiData.avgResolutionTime.whyItMatters}
          icon={kpiData.avgResolutionTime.icon}
          statusInfo={getStatusInfo(kpiData.avgResolutionTime.value, kpiData.avgResolutionTime.target, true)}
          subtext="vs defined SLA"
          onClick={() => navigate('/calendar?view=list')}
        />
      </div>
    </Card>
  );
};
