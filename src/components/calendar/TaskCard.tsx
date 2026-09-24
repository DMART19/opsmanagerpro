import { useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Clock, AlertCircle, MapPin, Flag, Edit, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CalendarTask, taskTypeColors, priorityColors, isOverdue } from "./types";
import { useFormatters } from "@/hooks/use-formatters";
import { useIsMobile } from "@/hooks/use-mobile";

interface TaskCardProps {
  task: CalendarTask;
  onClick: () => void;
  onEdit?: (task: CalendarTask) => void;
  onDelete?: (task: CalendarTask) => void;
  variant?: "compact" | "full";
  showDate?: boolean;
}

export const TaskCard = ({ task, onClick, onEdit, onDelete, variant = "full", showDate = false }: TaskCardProps) => {
  const overdue = isOverdue(task);
  const typeColor = taskTypeColors[task.type];
  const { formatTimeString } = useFormatters();
  const isMobile = useIsMobile();

  const handleClick = useCallback((e: React.MouseEvent) => {
    onClick();
  }, [onClick]);

  if (variant === "compact") {
    return (
      <button
        onClick={onClick}
        className={cn(
          "w-full text-left p-1.5 rounded-md text-xs font-medium truncate transition-all duration-200",
          "hover:opacity-80 active:scale-[0.98]",
          typeColor?.light,
          typeColor?.text,
          overdue && "underline decoration-destructive/50 decoration-1 underline-offset-2"
        )}
      >
        <span className="truncate">{task.title}</span>
      </button>
    );
  }

  const cardContent = (
    <div
      className={cn(
        "group/card relative w-full text-left p-4 rounded-xl transition-all duration-200",
        "bg-card hover:bg-accent/30 hover:shadow-sm active:scale-[0.99]",
        "border-l-3 cursor-pointer",
        typeColor?.border,
        overdue && "bg-destructive/[0.02]"
      )}
      onClick={handleClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Desktop hover actions */}
      {!isMobile && (onEdit || onDelete) && (
        <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity duration-150 z-10">
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(task); }}
              className="h-7 w-7 flex items-center justify-center rounded-md bg-background/80 backdrop-blur-sm border border-border/50 text-muted-foreground hover:text-foreground hover:bg-background shadow-sm transition-all duration-150 active:scale-95"
              aria-label="Edit event"
            >
              <Edit className="h-3.5 w-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(task); }}
              className="h-7 w-7 flex items-center justify-center rounded-md bg-background/80 backdrop-blur-sm border border-border/50 text-muted-foreground hover:text-destructive hover:bg-destructive/5 shadow-sm transition-all duration-150 active:scale-95"
              aria-label="Delete event"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-semibold text-foreground flex-1 line-clamp-2">{task.title}</h4>
        <div className="flex flex-wrap gap-1.5 shrink-0">
          <Badge
            className={cn(
              "text-[10px] border-0 capitalize font-medium",
              typeColor?.light,
              typeColor?.text
            )}
          >
            {task.type}
          </Badge>
          {task.priority === "high" && (
            <Badge
              variant="outline"
              className={cn("text-[10px] gap-0.5", priorityColors.high)}
            >
              <Flag className="h-2.5 w-2.5" />
              High
            </Badge>
          )}
        </div>
      </div>

      {/* Overdue indicator - subtle */}
      {overdue && (
        <div className="flex items-center gap-1.5 text-destructive/70 text-xs mb-2">
          <AlertCircle className="h-3.5 w-3.5" />
          <span className="font-medium">Overdue</span>
        </div>
      )}
      
      <div className="space-y-1.5 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 shrink-0 opacity-60" />
          <span>{formatTimeString(task.startTime)} - {formatTimeString(task.endTime)}</span>
        </div>
        
        {showDate && (
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0 opacity-60" />
            <span className="truncate">{task.warehouse}</span>
          </div>
        )}
        
        {task.assignees.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2">
            {task.assignees.slice(0, 3).map((assignee, idx) => (
              <Avatar key={idx} className="h-6 w-6 border-2 border-background">
                <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
                  {assignee.split(" ").map(n => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
            ))}
            {task.assignees.length > 3 && (
              <span className="text-xs text-muted-foreground ml-1">
                +{task.assignees.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return cardContent;
};
