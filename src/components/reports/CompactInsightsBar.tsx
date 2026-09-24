import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  Send, 
  ClipboardPlus, 
  Download,
  Lightbulb,
  ChevronRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface Insight {
  id: string;
  type: 'action' | 'success' | 'info';
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  priority?: 'high' | 'medium' | 'low';
}

export const CompactInsightsBar = () => {
  const navigate = useNavigate();
  const [actionsTaken, setActionsTaken] = useState<string[]>([]);

  const handleSendReminders = () => {
    setActionsTaken(prev => [...prev, 'reminders']);
    toast({
      title: "Reminders Sent",
      description: "Notifications sent to 5 team members.",
    });
  };

  const handleCreateTask = () => {
    navigate('/calendar?action=new');
  };

  const handleExportAudit = () => {
    setActionsTaken(prev => [...prev, 'export']);
    toast({
      title: "Preparing Report",
      description: "Your PDF is being generated...",
    });
  };

  const insights: Insight[] = [
    {
      id: '1',
      type: 'action',
      message: '5 items overdue',
      actionLabel: 'Review',
      onAction: () => navigate('/people?tab=compliance&status=overdue'),
      priority: 'high',
    },
    {
      id: '2',
      type: 'info',
      message: '14 approaching deadline',
      actionLabel: 'View',
      onAction: () => navigate('/people?tab=compliance&status=expiring'),
      priority: 'medium',
    },
    {
      id: '3',
      type: 'success',
      message: 'Resolution time ↓12%',
      priority: 'low',
    },
  ];

  const getInsightStyles = (type: string, priority?: string) => {
    if (type === 'success') {
      return 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300';
    }
    if (type === 'action' && priority === 'high') {
      return 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300';
    }
    return 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300';
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'action':
        return AlertTriangle;
      case 'success':
        return CheckCircle2;
      default:
        return Lightbulb;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 p-4 rounded-xl bg-muted/30 border">
      {/* Insights - Horizontal scrollable on mobile */}
      <div className="flex-1 flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
        <div className="flex items-center gap-1.5 shrink-0 mr-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Insights</span>
        </div>
        
        {insights.map((insight) => {
          const Icon = getInsightIcon(insight.type);
          return (
            <div
              key={insight.id}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium shrink-0 transition-colors",
                getInsightStyles(insight.type, insight.priority)
              )}
            >
              <Icon className="h-3 w-3" />
              <span className="whitespace-nowrap">{insight.message}</span>
              {insight.actionLabel && insight.onAction && (
                <button 
                  onClick={insight.onAction}
                  className="flex items-center gap-0.5 hover:underline font-semibold"
                >
                  {insight.actionLabel}
                  <ChevronRight className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide mr-1 hidden lg:inline">
          Actions
        </span>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleSendReminders}
          disabled={actionsTaken.includes('reminders')}
          className="gap-1.5 text-xs h-7"
        >
          <Send className="h-3 w-3" />
          <span className="hidden sm:inline">Reminders</span>
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleCreateTask}
          className="gap-1.5 text-xs h-7"
        >
          <ClipboardPlus className="h-3 w-3" />
          <span className="hidden sm:inline">Task</span>
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleExportAudit}
          disabled={actionsTaken.includes('export')}
          className="gap-1.5 text-xs h-7"
        >
          <Download className="h-3 w-3" />
          <span className="hidden sm:inline">Export</span>
        </Button>
      </div>
    </div>
  );
};
