import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, ClipboardCheck, CheckCircle2, Info, ExternalLink, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const taskData = [
  { category: "Urgent Requests", avgDays: 1.2, count: 8, status: "excellent", filter: "urgent", sla: 2 },
  { category: "Scheduled Tasks", avgDays: 3.5, count: 24, status: "good", filter: "scheduled", sla: 5 },
  { category: "Inspections", avgDays: 2.8, count: 15, status: "good", filter: "inspection", sla: 4 },
  { category: "Updates", avgDays: 5.2, count: 12, status: "average", filter: "update", sla: 7 },
  { category: "Major Projects", avgDays: 8.7, count: 4, status: "slow", filter: "major", sla: 10 },
];

const statusConfig = {
  excellent: { label: "Excellent", color: "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400" },
  good: { label: "Good", color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400" },
  average: { label: "Average", color: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400" },
  slow: { label: "Slow", color: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400" },
};

export const MaintenanceWidget = () => {
  const navigate = useNavigate();
  const totalTasks = taskData.reduce((acc, curr) => acc + curr.count, 0);
  const avgTurnaround = (
    taskData.reduce((acc, curr) => acc + curr.avgDays * curr.count, 0) / totalTasks
  ).toFixed(1);
  const completedTasks = totalTasks - 4;
  
  // Calculate tasks within SLA
  const tasksWithinSLA = taskData.filter(t => t.avgDays <= t.sla).reduce((acc, curr) => acc + curr.count, 0);
  const slaPercent = ((tasksWithinSLA / totalTasks) * 100).toFixed(0);

  const maxDays = Math.max(...taskData.map(d => d.avgDays));

  const handleCategoryClick = (filter: string) => {
    navigate(`/calendar?view=list&taskType=${filter}`);
  };

  const handleViewAll = () => {
    navigate('/calendar?view=list');
  };

  return (
    <Card className="p-6">
      <div className="mb-5">
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-semibold text-foreground">Task Completion Time</h3>
          <UITooltip delayDuration={100}>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[250px]">
              <p>Average time to complete tasks by category. Click any category to view those tasks in the calendar.</p>
            </TooltipContent>
          </UITooltip>
        </div>
        <p className="text-sm text-muted-foreground mt-1">Performance by category</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5 p-3 bg-muted/30 rounded-lg">
        <div className="text-center">
          <div className="text-xl font-bold text-foreground">{avgTurnaround}</div>
          <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
            <Clock className="h-3 w-3" />
            Avg Days
          </div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-foreground">{totalTasks}</div>
          <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
            <ClipboardCheck className="h-3 w-3" />
            Total
          </div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-green-600">{slaPercent}%</div>
          <div className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
            <Target className="h-3 w-3" />
            Within SLA
          </div>
        </div>
      </div>

      {/* Horizontal Grouped Bars - Clickable */}
      <div className="space-y-3">
        {taskData.map((item) => {
          const barWidth = (item.avgDays / maxDays) * 100;
          const statusInfo = statusConfig[item.status as keyof typeof statusConfig];
          const withinSLA = item.avgDays <= item.sla;

          return (
            <button
              key={item.category}
              onClick={() => handleCategoryClick(item.filter)}
              className="w-full space-y-1.5 text-left hover:bg-accent/50 p-2 rounded-lg transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-foreground text-sm group-hover:underline">{item.category}</div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span>{item.count} tasks</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {item.avgDays} days
                    </span>
                    <span>•</span>
                    <span className={cn(
                      "text-xs",
                      withinSLA ? "text-green-600" : "text-amber-600"
                    )}>
                      SLA: {item.sla}d
                    </span>
                  </div>
                </div>
                <Badge variant="outline" className={cn("text-xs", statusInfo.color)}>
                  {statusInfo.label}
                </Badge>
              </div>
              
              {/* Horizontal Bar */}
              <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "absolute h-full rounded-full transition-all",
                    item.status === 'excellent' ? 'bg-gradient-to-r from-green-500 to-green-600' :
                    item.status === 'good' ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                    item.status === 'average' ? 'bg-gradient-to-r from-amber-500 to-amber-600' :
                    'bg-gradient-to-r from-red-500 to-red-600'
                  )}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* View All Link */}
      <div className="mt-5 pt-4 border-t">
        <Button variant="ghost" size="sm" onClick={handleViewAll} className="w-full gap-1.5">
          <ExternalLink className="h-3.5 w-3.5" />
          View All Tasks
        </Button>
      </div>
    </Card>
  );
};
