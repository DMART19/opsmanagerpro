import { ReactNode, useState } from "react";
import { format } from "date-fns";
import { Calendar, CheckSquare, Clock, Bell, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useTasks } from "@/hooks/use-tasks";
import { toast } from "sonner";

interface QuickAddPopoverProps {
  date: Date;
  onAddTask: (date: Date) => void;
  children: ReactNode;
}

const taskTypes = [
  { id: "task", label: "Task", icon: CheckSquare, color: "text-primary" },
  { id: "event", label: "Event", icon: Calendar, color: "text-success" },
  { id: "deadline", label: "Deadline", icon: Flag, color: "text-warning" },
  { id: "reminder", label: "Reminder", icon: Bell, color: "text-purple-500" },
] as const;

export const QuickAddPopover = ({ date, onAddTask, children }: QuickAddPopoverProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedType, setSelectedType] = useState<string>("task");
  const { createTask } = useTasks();

  const handleQuickAdd = async () => {
    if (!title.trim()) return;
    
    try {
      await createTask.mutateAsync({
        title: title.trim(),
        task_type: selectedType,
        priority: "medium",
        status: "pending",
        start_date: format(date, "yyyy-MM-dd"),
        end_date: format(date, "yyyy-MM-dd"),
      });
      
      toast.success("Task created");
      setTitle("");
      setSelectedType("task");
      setOpen(false);
    } catch (error) {
      toast.error("Failed to create task");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleQuickAdd();
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent 
        className="w-72 p-3" 
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-3">
          {/* Date Display */}
          <div className="text-xs text-muted-foreground font-medium">
            {format(date, "EEEE, MMM d")}
          </div>

          {/* Title Input */}
          <div>
            <Input
              placeholder="Task title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-9"
              autoFocus
            />
          </div>

          {/* Type Selection */}
          <div className="flex gap-1">
            {taskTypes.map(({ id, label, icon: Icon, color }) => (
              <button
                key={id}
                onClick={() => setSelectedType(id)}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-lg transition-all",
                  "text-xs font-medium",
                  selectedType === id
                    ? "bg-muted shadow-sm"
                    : "hover:bg-muted/50"
                )}
              >
                <Icon className={cn("h-4 w-4", color)} />
                <span className="text-[10px]">{label}</span>
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => {
                setOpen(false);
                onAddTask(date);
              }}
            >
              More options
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={handleQuickAdd}
              disabled={!title.trim() || createTask.isPending}
            >
              {createTask.isPending ? "Adding..." : "Add"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
