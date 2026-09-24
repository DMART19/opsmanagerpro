import { useDraggable } from "@dnd-kit/core";
import { Repeat, Edit, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CalendarTask, taskTypeColors, isOverdue } from "./types";

interface DraggableTaskItemProps {
  task: CalendarTask;
  onTaskClick: (task: CalendarTask) => void;
  onEditTask?: (task: CalendarTask) => void;
  onDeleteTask?: (task: CalendarTask) => void;
}

export const DraggableTaskItem = ({ task, onTaskClick, onEditTask, onDeleteTask }: DraggableTaskItemProps) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const taskOverdue = isOverdue(task);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "group/item relative text-[11px] px-2 py-1.5 rounded-lg truncate font-medium",
        "transition-all duration-150 cursor-grab active:cursor-grabbing",
        "hover:scale-[1.02] active:scale-[0.98]",
        taskTypeColors[task.type]?.light,
        taskTypeColors[task.type]?.text,
        taskOverdue && "underline decoration-destructive/50 decoration-1 underline-offset-2",
        isDragging && "opacity-50 shadow-lg scale-105 z-50"
      )}
      onClick={(e) => {
        e.stopPropagation();
        onTaskClick(task);
      }}
    >
      {/* Hover actions - desktop only */}
      {(onEditTask || onDeleteTask) && (
        <div className="absolute -top-1 -right-1 flex items-center gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity duration-150 z-20">
          {onEditTask && (
            <button
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onEditTask(task); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="h-5 w-5 flex items-center justify-center rounded bg-background border border-border/50 text-muted-foreground hover:text-foreground shadow-sm transition-all duration-150"
            >
              <Edit className="h-2.5 w-2.5" />
            </button>
          )}
          {onDeleteTask && (
            <button
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDeleteTask(task); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="h-5 w-5 flex items-center justify-center rounded bg-background border border-border/50 text-muted-foreground hover:text-destructive shadow-sm transition-all duration-150"
            >
              <Trash2 className="h-2.5 w-2.5" />
            </button>
          )}
        </div>
      )}
      {task.isRecurring || task.isOccurrence ? (
        <span className="flex items-center gap-1 truncate">
          <Repeat className="h-3 w-3 shrink-0 opacity-60" />
          <span className="truncate">{task.title}</span>
        </span>
      ) : task.title}
    </div>
  );
};
