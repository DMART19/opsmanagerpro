import { useState, useEffect } from "react";
import { 
  Package, 
  Users, 
  CalendarCheck, 
  CheckCircle2,
  Circle,
  X,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { useDemoPath } from "@/hooks/use-demo-path";
import { useUnifiedStats } from "@/hooks/use-unified-stats";

const CHECKLIST_DISMISSED_KEY = "ops_mgmt_pro_checklist_dismissed";

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  icon: any;
  route: string;
  checkFn: () => boolean;
}

export const GettingStartedChecklist = () => {
  const navigate = useNavigate();
  const { getPath } = useDemoPath();
  const [dismissed, setDismissed] = useState(false);
  
  // Use unified stats for consistent counts across all pages
  const { assets, team, loading } = useUnifiedStats();

  useEffect(() => {
    const isDismissed = localStorage.getItem(CHECKLIST_DISMISSED_KEY);
    if (isDismissed) {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(CHECKLIST_DISMISSED_KEY, "true");
    setDismissed(true);
  };

  // Define checklist items with completion checks using unified stats
  const checklistItems: ChecklistItem[] = [
    {
      id: "inventory",
      title: "Add your first asset",
      description: "Equipment, tools, or resources you want to track",
      icon: Package,
      route: "/inventory",
      checkFn: () => !loading && assets.total > 0,
    },
    {
      id: "employees",
      title: "Add a team member",
      description: "People who use or manage your assets",
      icon: Users,
      route: "/people",
      checkFn: () => !loading && team.total > 0,
    },
    {
      id: "tasks",
      title: "Schedule a task",
      description: "Deadlines, reminders, or recurring work",
      icon: CalendarCheck,
      route: "/calendar",
      checkFn: () => false, // Would check task count
    },
  ];

  const completedCount = checklistItems.filter(item => item.checkFn()).length;
  const progressPercentage = (completedCount / checklistItems.length) * 100;
  const allComplete = completedCount === checklistItems.length;

  if (dismissed || allComplete) {
    return null;
  }

  return (
    <Card 
      className="p-4 sm:p-5 border-primary/10 bg-gradient-to-br from-primary/[0.02] via-background to-background relative overflow-hidden"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {/* Decorative elements */}
      <div className="absolute top-3 right-12 opacity-10">
        <Sparkles className="h-5 w-5 text-primary" />
      </div>
      <div className="absolute bottom-4 left-10 opacity-[0.06]">
        <Sparkles className="h-4 w-4 text-primary" />
      </div>

      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2.5 mb-1">
            <h3 className="text-lg font-semibold text-foreground">Getting Started</h3>
            <span className="text-sm text-muted-foreground font-medium tabular-nums">
              ({completedCount}/{checklistItems.length})
            </span>
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            Complete these steps to set up your workspace
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDismiss}
          className="h-8 w-8 text-muted-foreground hover:text-foreground -mt-1"
          title="Dismiss checklist"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <Progress value={progressPercentage} className="h-2" />
      </div>

      {/* Checklist items */}
      <div className="space-y-2">
        {checklistItems.map((item) => {
          const isComplete = item.checkFn();
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => !isComplete && navigate(getPath(item.route))}
              disabled={isComplete}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                isComplete
                  ? "bg-success/5 border-success/20 cursor-default"
                  : "bg-card hover:bg-accent/10 hover:border-primary/30 cursor-pointer group"
              }`}
            >
              <div className={`p-2 rounded-lg flex-shrink-0 ${
                isComplete 
                  ? "bg-success/10 text-success" 
                  : "bg-primary/10 text-primary group-hover:bg-primary/20"
              }`}>
                <Icon className="h-4 w-4" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {isComplete ? (
                    <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
                  )}
                  <span className={`font-medium text-sm ${
                    isComplete ? "text-muted-foreground line-through" : ""
                  }`}>
                    {item.title}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 ml-6">
                  {item.description}
                </p>
              </div>

              {!isComplete && (
                <ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Helper tip */}
      <div className="mt-4 pt-3 border-t border-border/50">
        <p className="text-xs text-muted-foreground text-center">
          Click any item to get started — you can always edit or delete later
        </p>
      </div>
    </Card>
  );
};
