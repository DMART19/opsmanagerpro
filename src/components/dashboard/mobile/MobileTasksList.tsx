import { useNavigate } from "react-router-dom";
import { useDemoPath } from "@/hooks/use-demo-path";
import { 
  Calendar, 
  Users, 
  FileText, 
  ClipboardCheck, 
  Wrench,
  ChevronRight,
  CheckCircle2
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  type: string;
  title: string;
  description?: string;
  dueDate?: Date;
  status?: "pending" | "completed";
}

interface MobileTasksListProps {
  tasks: Task[];
  loading?: boolean;
  emptyMessage?: string;
}

const getTaskIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case "meeting":
      return Users;
    case "training":
      return ClipboardCheck;
    case "deadline":
    case "report":
      return FileText;
    case "maintenance":
    case "service":
      return Wrench;
    default:
      return Calendar;
  }
};

const formatDate = (date: Date): string => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const taskDate = new Date(date);
  taskDate.setHours(0, 0, 0, 0);
  
  const diffDays = Math.ceil((taskDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays < 7) return taskDate.toLocaleDateString(undefined, { weekday: "short" });
  return taskDate.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export const MobileTasksList = ({ 
  tasks, 
  loading, 
  emptyMessage = "No tasks scheduled" 
}: MobileTasksListProps) => {
  const navigate = useNavigate();
  const { getPath } = useDemoPath();

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-3 animate-pulse">
            <div className="flex gap-3">
              <div className="h-10 w-10 bg-muted rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-3 w-full bg-muted rounded" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-muted/50 flex items-center justify-center">
            <Calendar className="h-7 w-7 text-muted-foreground/40" />
          </div>
          <p className="font-medium text-muted-foreground">{emptyMessage}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => navigate(getPath("/calendar"))}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Open Calendar
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => {
        const Icon = getTaskIcon(task.type);
        const isCompleted = task.status === "completed";
        
        return (
          <Card
            key={task.id}
            className={cn(
              "p-3 transition-all active:scale-[0.99] cursor-pointer",
              isCompleted && "opacity-60"
            )}
            onClick={() => navigate(getPath("/calendar"))}
          >
            <div className="flex gap-3 items-start">
              <div className={cn(
                "p-2 rounded-xl flex-shrink-0",
                isCompleted ? "bg-success/10" : "bg-primary/10"
              )}>
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : (
                  <Icon className="h-4 w-4 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={cn(
                    "text-sm font-medium truncate",
                    isCompleted && "line-through"
                  )}>
                    {task.title}
                  </p>
                  {task.dueDate && (
                    <Badge 
                      variant="secondary" 
                      className="text-xs flex-shrink-0"
                    >
                      {formatDate(task.dueDate)}
                    </Badge>
                  )}
                </div>
                {task.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {task.description}
                  </p>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/40 mt-2 flex-shrink-0" />
            </div>
          </Card>
        );
      })}

      <Button
        variant="ghost"
        className="w-full text-sm text-muted-foreground"
        onClick={() => navigate(getPath("/calendar"))}
      >
        View all tasks
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
};
