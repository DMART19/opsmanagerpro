import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useNavigate } from "react-router-dom";
import { Info, TrendingUp, CheckCircle2 } from "lucide-react";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { REPORTS_TOOLTIPS, ASSETS_TOOLTIPS } from "@/lib/tooltip-content";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useUnifiedStats } from "@/hooks/use-unified-stats";

const CustomTooltip = ({ active, payload, total }: any) => {
  if (active && payload && payload.length) {
    const entry = payload[0];
    const dataTotal = total || 1;
    const percentage = ((entry.value / dataTotal) * 100).toFixed(1);
    
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg min-w-[160px]">
        <div className="flex items-center gap-2 mb-2">
          <span 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: entry.payload.color }}
          />
          <p className="font-semibold text-foreground">{entry.name}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{entry.value}</span> resources
          </p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{percentage}%</span> of total
          </p>
        </div>
        <p className="text-xs text-primary mt-2 font-medium">Click to view →</p>
      </div>
    );
  }
  return null;
};

export const EquipmentUtilizationChart = () => {
  const navigate = useNavigate();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const { assets, loading } = useUnifiedStats();

  const data = [
    { name: "Available", value: assets.available, color: "#22c55e", filter: "available", tooltip: ASSETS_TOOLTIPS.statusAvailable },
    { name: "Assigned", value: assets.inUse, color: "#f59e0b", filter: "assigned", tooltip: ASSETS_TOOLTIPS.statusInUse },
    { name: "Under Service", value: assets.underService, color: "#94a3b8", filter: "under-service", tooltip: ASSETS_TOOLTIPS.statusService },
  ];

  const total = assets.total || 1; // Prevent division by zero
  const availablePercent = ((assets.available / total) * 100).toFixed(1);
  const isHealthy = parseFloat(availablePercent) >= 65;

  const handleStatusClick = (status: string) => {
    navigate(`/inventory?status=${status}`);
  };

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-semibold text-foreground">Resource Status Overview</h3>
            <UITooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[250px]">
                <p>{REPORTS_TOOLTIPS.assetUtilization}</p>
              </TooltipContent>
            </UITooltip>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Current distribution of {total.toLocaleString()} resources</p>
        </div>
        <Badge 
          variant="outline" 
          className={cn(
            "text-xs gap-1",
            isHealthy 
              ? "text-green-600 border-green-200 bg-green-50 dark:bg-green-950/20" 
              : "text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/20"
          )}
        >
          {isHealthy ? <CheckCircle2 className="h-3 w-3" /> : null}
          {isHealthy ? "Healthy" : "Review Capacity"}
        </Badge>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={90}
            innerRadius={55}
            fill="#8884d8"
            dataKey="value"
            className="cursor-pointer"
            onClick={(entry) => handleStatusClick(entry.filter)}
            onMouseEnter={(_, index) => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            stroke="hsl(var(--background))"
            strokeWidth={2}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color}
                opacity={hoveredIndex !== null && hoveredIndex !== index ? 0.5 : 1}
                className="transition-opacity duration-200 cursor-pointer"
                style={{
                  transform: hoveredIndex === index ? 'scale(1.05)' : 'scale(1)',
                  transformOrigin: 'center',
                }}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip total={total} />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Mini Summary - Clickable */}
      <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t">
        {data.map((item, index) => (
          <button 
            key={item.name}
            onClick={() => handleStatusClick(item.filter)}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            className={cn(
              "text-center p-2.5 rounded-lg transition-all duration-200 group border",
              hoveredIndex === index 
                ? "bg-accent border-border shadow-sm" 
                : "border-transparent hover:bg-accent/50"
            )}
          >
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <span 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <span 
                className="text-lg font-bold group-hover:underline"
                style={{ color: item.color }}
              >
                {item.value}
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground">{item.name}</div>
          </button>
        ))}
      </div>

      {/* Availability indicator */}
      <div className={cn(
        "mt-3 p-2.5 rounded-lg border flex items-center justify-center gap-2",
        isHealthy 
          ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800" 
          : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
      )}>
        <TrendingUp className={cn("h-4 w-4", isHealthy ? "text-green-600" : "text-amber-600")} />
        <span className={cn("text-sm", isHealthy ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-400")}>
          <span className="font-medium">{availablePercent}%</span> availability rate — {isHealthy ? "Healthy capacity" : "Monitor capacity"}
        </span>
      </div>
    </Card>
  );
};
