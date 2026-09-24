import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";
import { CheckCircle2, TrendingUp, TrendingDown, Info, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const data = [
  { month: "Jul", completed: 12, pending: 2, failed: 1 },
  { month: "Aug", completed: 15, pending: 1, failed: 0 },
  { month: "Sep", completed: 11, pending: 3, failed: 2 },
  { month: "Oct", completed: 14, pending: 2, failed: 1 },
  { month: "Nov", completed: 13, pending: 1, failed: 0 },
  { month: "Dec", completed: 16, pending: 2, failed: 1 },
];

const TARGET_RATE = 80; // Target completion rate percentage

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum: number, entry: any) => sum + entry.value, 0);
    const completed = payload.find((p: any) => p.dataKey === 'completed')?.value || 0;
    const completionRate = ((completed / total) * 100).toFixed(0);
    
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg min-w-[160px]">
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
          <span className="text-xs text-muted-foreground">Completion</span>
          <span className={cn(
            "text-xs font-semibold",
            parseInt(completionRate) >= TARGET_RATE ? "text-green-600" : "text-amber-600"
          )}>
            {completionRate}%
          </span>
        </div>
        <p className="text-xs text-primary mt-2 font-medium">Click to view tasks →</p>
      </div>
    );
  }
  return null;
};

export const AuditComplianceChart = () => {
  const navigate = useNavigate();
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);
  
  const totalReviews = data.reduce((acc, curr) => acc + curr.completed + curr.pending + curr.failed, 0);
  const completedReviews = data.reduce((acc, curr) => acc + curr.completed, 0);
  const completionRate = ((completedReviews / totalReviews) * 100).toFixed(1);

  // Calculate trend (comparing last month to previous)
  const lastMonth = data[data.length - 1];
  const prevMonth = data[data.length - 2];
  const lastMonthRate = (lastMonth.completed / (lastMonth.completed + lastMonth.pending + lastMonth.failed)) * 100;
  const prevMonthRate = (prevMonth.completed / (prevMonth.completed + prevMonth.pending + prevMonth.failed)) * 100;
  const trendChange = (lastMonthRate - prevMonthRate).toFixed(1);
  const isPositive = parseFloat(trendChange) > 0;
  
  // Determine status
  const currentRate = parseFloat(completionRate);
  const isAboveTarget = currentRate >= TARGET_RATE;

  const handleBarClick = (data: any) => {
    if (data && data.activePayload) {
      navigate(`/calendar?view=month&filter=tasks`);
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-semibold text-foreground">Work Completion Rate</h3>
            <UITooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[250px]">
                <p>Percentage of scheduled tasks completed during the selected time range. Click any bar to view tasks in the calendar.</p>
              </TooltipContent>
            </UITooltip>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Last 6 months performance</p>
        </div>
        <Badge 
          variant="outline" 
          className={cn(
            "gap-1",
            isAboveTarget 
              ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400" 
              : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400"
          )}
        >
          <CheckCircle2 className="h-3 w-3" />
          {completionRate}%
        </Badge>
      </div>

      <ResponsiveContainer width="100%" height={260}>
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
          <Legend wrapperStyle={{ paddingTop: 12 }} />
          <Bar dataKey="completed" fill="#22c55e" name="Completed" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell 
                key={`cell-completed-${index}`}
                opacity={hoveredMonth && hoveredMonth !== entry.month ? 0.4 : 1}
                className="transition-opacity"
              />
            ))}
          </Bar>
          <Bar dataKey="pending" fill="#f59e0b" name="Pending" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell 
                key={`cell-pending-${index}`}
                opacity={hoveredMonth && hoveredMonth !== entry.month ? 0.4 : 1}
                className="transition-opacity"
              />
            ))}
          </Bar>
          <Bar dataKey="failed" fill="#94a3b8" name="Incomplete" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell 
                key={`cell-failed-${index}`}
                opacity={hoveredMonth && hoveredMonth !== entry.month ? 0.4 : 1}
                className="transition-opacity"
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Trend and Target Context */}
      <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            {isPositive ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-amber-600" />
            )}
            <span className={isPositive ? 'text-green-600 font-medium' : 'text-amber-600 font-medium'}>
              {isPositive ? '+' : ''}{trendChange}%
            </span>
            <span className="text-muted-foreground">vs last month</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Target className="h-4 w-4" />
          <span>Target: {TARGET_RATE}%</span>
          {isAboveTarget && <CheckCircle2 className="h-4 w-4 text-green-600 ml-1" />}
        </div>
      </div>
    </Card>
  );
};
