import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  Send, 
  ClipboardPlus, 
  Download,
  Lightbulb
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Insight {
  id: string;
  type: 'action' | 'success' | 'info';
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  priority?: 'high' | 'medium' | 'low';
}

export const ActionableInsightsPanel = () => {
  const navigate = useNavigate();

  const handleSendReminders = () => {
    toast({
      title: "Notifications Sent",
      description: "Reminders sent to 5 team members with overdue items.",
    });
  };

  const handleCreateTask = () => {
    navigate('/calendar?action=new');
  };

  const handleExportAudit = () => {
    toast({
      title: "Preparing Audit Report",
      description: "Your formatted PDF report is being generated...",
    });
  };

  const insights: Insight[] = [
    {
      id: '1',
      type: 'action',
      message: '5 items are overdue — review now',
      actionLabel: 'Review',
      onAction: () => navigate('/people?tab=compliance&status=overdue'),
      priority: 'high',
    },
    {
      id: '2',
      type: 'success',
      message: 'Average resolution time improved by 12% — no action needed',
      priority: 'low',
    },
    {
      id: '3',
      type: 'info',
      message: '14 items approaching deadline this month',
      actionLabel: 'View',
      onAction: () => navigate('/people?tab=compliance&status=expiring'),
      priority: 'medium',
    },
  ];

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

  const getInsightStyles = (type: string, priority?: string) => {
    if (type === 'success') {
      return 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200';
    }
    if (type === 'action' && priority === 'high') {
      return 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200';
    }
    return 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200';
  };

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-foreground">What should I do next?</h3>
      </div>

      {/* Insights List */}
      <div className="space-y-2.5 mb-5">
        {insights.map((insight) => {
          const Icon = getInsightIcon(insight.type);
          return (
            <div
              key={insight.id}
              className={cn(
                "flex items-center justify-between gap-3 p-3 rounded-lg border transition-colors",
                getInsightStyles(insight.type, insight.priority)
              )}
            >
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm font-medium truncate">{insight.message}</span>
              </div>
              {insight.actionLabel && insight.onAction && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={insight.onAction}
                  className="h-7 px-2.5 gap-1 text-xs flex-shrink-0 hover:bg-white/50 dark:hover:bg-black/20"
                >
                  {insight.actionLabel}
                  <ArrowRight className="h-3 w-3" />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="pt-4 border-t">
        <p className="text-xs text-muted-foreground mb-3 font-medium">Quick Actions</p>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSendReminders}
            className="gap-1.5 text-xs h-8"
          >
            <Send className="h-3.5 w-3.5" />
            Send Reminders
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCreateTask}
            className="gap-1.5 text-xs h-8"
          >
            <ClipboardPlus className="h-3.5 w-3.5" />
            Create Task
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportAudit}
            className="gap-1.5 text-xs h-8"
          >
            <Download className="h-3.5 w-3.5" />
            Export for Audit
          </Button>
        </div>
      </div>
    </Card>
  );
};
