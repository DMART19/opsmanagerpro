import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, Cell } from "recharts";
import { Info, AlertTriangle, CheckCircle2, Send, Target } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { REPORTS_TOOLTIPS } from "@/lib/tooltip-content";
import { cn } from "@/lib/utils";

const data = [
  { month: "Jan", valid: 142, expiring: 8, expired: 2 },
  { month: "Feb", valid: 145, expiring: 6, expired: 1 },
  { month: "Mar", valid: 148, expiring: 4, expired: 0 },
  { month: "Apr", valid: 150, expiring: 5, expired: 1 },
  { month: "May", valid: 152, expiring: 7, expired: 2 },
  { month: "Jun", valid: 149, expiring: 9, expired: 3 },
  { month: "Jul", valid: 153, expiring: 10, expired: 2 },
  { month: "Aug", valid: 155, expiring: 8, expired: 1 },
  { month: "Sep", valid: 151, expiring: 12, expired: 4 },
  { month: "Oct", valid: 154, expiring: 11, expired: 2 },
  { month: "Nov", valid: 156, expiring: 12, expired: 3 },
  { month: "Dec", valid: 153, expiring: 14, expired: 5 },
];

const TARGET_COMPLIANCE = 95; // Target compliance percentage

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum: number, entry: any) => sum + entry.value, 0);
    const validEntry = payload.find((p: any) => p.dataKey === 'valid');
    const complianceRate = validEntry ? ((validEntry.value / total) * 100).toFixed(1) : '0';
    
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg min-w-[180px]">
        <p className="font-semibold text-foreground mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between text-sm mb-1">
            <div className="flex items-center gap-2">
              <span 
                className="w-2.5 h-2.5 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}</span>
            </div>
            <span className="font-medium">{entry.value}</span>
          </div>
        ))}
        <div className="mt-2 pt-2 border-t flex justify-between">
          <span className="text-xs text-muted-foreground">Compliance Rate</span>
          <span className={cn(
            "text-xs font-semibold",
            parseFloat(complianceRate) >= TARGET_COMPLIANCE ? "text-green-600" : "text-amber-600"
          )}>
            {complianceRate}%
          </span>
        </div>
        <p className="text-xs text-primary mt-2 font-medium">Click to view details →</p>
      </div>
    );
  }
  return null;
};

export const CertificationTrendsChart = () => {
  const navigate = useNavigate();
  const [actionsTaken, setActionsTaken] = useState(false);
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);
  const currentData = data[data.length - 1];
  const totalAtRisk = currentData.expiring + currentData.expired;

  const handleTakeAction = () => {
    setActionsTaken(true);
    toast({
      title: "Actions Taken Successfully",
      description: `Notifications sent and tasks created for ${totalAtRisk} items requiring attention.`,
    });
  };

  const handleStatusClick = (status: 'valid' | 'expiring' | 'expired') => {
    navigate(`/people?tab=compliance&credentialStatus=${status}`);
  };

  const handleBarClick = (data: any) => {
    if (data && data.activePayload) {
      navigate('/people?tab=compliance');
    }
  };

  // Calculate compliance rate
  const totalCredentials = currentData.valid + currentData.expiring + currentData.expired;
  const complianceRate = ((currentData.valid / totalCredentials) * 100).toFixed(1);
  const isAboveTarget = parseFloat(complianceRate) >= TARGET_COMPLIANCE;

  // Calculate trend
  const prevData = data[data.length - 2];
  const prevTotal = prevData.valid + prevData.expiring + prevData.expired;
  const prevRate = (prevData.valid / prevTotal) * 100;
  const currentRate = (currentData.valid / totalCredentials) * 100;
  const trendChange = (currentRate - prevRate).toFixed(1);

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-semibold text-foreground">Compliance Trends</h3>
            <UITooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[250px]">
                <p>{REPORTS_TOOLTIPS.credentialTrends}</p>
              </TooltipContent>
            </UITooltip>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            12-month compliance status overview • Hover for details, click to explore
          </p>
        </div>
        
        {/* CTA Button */}
        <div className="flex items-center gap-3">
          {actionsTaken ? (
            <Badge className="bg-green-100 text-green-700 border-green-200 gap-1.5 py-1.5 px-3 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Actions Taken
            </Badge>
          ) : totalAtRisk > 0 && (
            <Button onClick={handleTakeAction} className="gap-2">
              <Send className="h-4 w-4" />
              Take Action ({totalAtRisk} items)
            </Button>
          )}
        </div>
      </div>

      {/* Insight Banner */}
      {totalAtRisk > 0 && !actionsTaken && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <span className="font-medium">{totalAtRisk} items</span> require attention to maintain compliance. 
            Take action to ensure timely renewal.
          </p>
        </div>
      )}

      <ResponsiveContainer width="100%" height={320}>
        <BarChart 
          data={data} 
          onClick={handleBarClick} 
          className="cursor-pointer"
          onMouseMove={(state) => {
            if (state?.activePayload?.[0]) {
              setHoveredMonth(state.activePayload[0].payload.month);
            }
          }}
          onMouseLeave={() => setHoveredMonth(null)}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
          <XAxis dataKey="month" className="text-xs" tickLine={false} axisLine={false} />
          <YAxis className="text-xs" tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: 16 }} />
          <Bar 
            dataKey="valid" 
            stackId="a" 
            fill="#22c55e" 
            name="Compliant" 
            className="cursor-pointer transition-opacity"
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-valid-${index}`}
                opacity={hoveredMonth && hoveredMonth !== entry.month ? 0.4 : 1}
              />
            ))}
          </Bar>
          <Bar 
            dataKey="expiring" 
            stackId="a" 
            fill="#f59e0b" 
            name="Expiring Soon" 
            className="cursor-pointer transition-opacity"
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-expiring-${index}`}
                opacity={hoveredMonth && hoveredMonth !== entry.month ? 0.4 : 1}
              />
            ))}
          </Bar>
          <Bar 
            dataKey="expired" 
            stackId="a" 
            fill="#ef4444" 
            name="Overdue" 
            radius={[4, 4, 0, 0]} 
            className="cursor-pointer transition-opacity"
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-expired-${index}`}
                opacity={hoveredMonth && hoveredMonth !== entry.month ? 0.4 : 1}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Key Counts - Clickable with Target Benchmark */}
      <div className="mt-6 pt-6 border-t">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-foreground">Current Status</span>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Target: ≥{TARGET_COMPLIANCE}% compliant</span>
            {isAboveTarget && <CheckCircle2 className="h-4 w-4 text-green-600" />}
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <button 
            onClick={() => handleStatusClick('valid')}
            className="text-center p-3 rounded-lg hover:bg-accent transition-colors group border border-transparent hover:border-border"
          >
            <div className="text-2xl font-bold text-green-600 group-hover:underline">{currentData.valid}</div>
            <div className="text-xs text-muted-foreground mt-1">Compliant</div>
            <div className={cn(
              "text-xs mt-0.5 font-medium",
              isAboveTarget ? "text-green-600" : "text-amber-600"
            )}>
              {complianceRate}% of total
            </div>
          </button>
          <button 
            onClick={() => handleStatusClick('expiring')}
            className="text-center p-3 rounded-lg hover:bg-accent transition-colors group border border-transparent hover:border-border"
          >
            <div className="text-2xl font-bold text-amber-600 group-hover:underline">{currentData.expiring}</div>
            <div className="text-xs text-muted-foreground mt-1">Expiring Soon</div>
            <div className="text-xs text-amber-600 mt-0.5">Action recommended</div>
          </button>
          <button 
            onClick={() => handleStatusClick('expired')}
            className="text-center p-3 rounded-lg hover:bg-accent transition-colors group border border-transparent hover:border-border"
          >
            <div className="text-2xl font-bold text-amber-600 group-hover:underline">{currentData.expired}</div>
            <div className="text-xs text-muted-foreground mt-1">Overdue</div>
            <div className="text-xs text-amber-600 mt-0.5">Requires attention</div>
          </button>
        </div>

        {/* Trend indicator */}
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span className={cn(
            "font-medium",
            parseFloat(trendChange) >= 0 ? "text-green-600" : "text-amber-600"
          )}>
            {parseFloat(trendChange) >= 0 ? '+' : ''}{trendChange}%
          </span>
          <span>vs previous month</span>
        </div>
      </div>
    </Card>
  );
};
