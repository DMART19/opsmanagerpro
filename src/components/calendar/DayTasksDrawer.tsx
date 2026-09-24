import { format } from "date-fns";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarTask, isOverdue } from "./types";
import { TaskCard } from "./TaskCard";

interface DayTasksDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  tasks: CalendarTask[];
  onTaskClick: (task: CalendarTask) => void;
  onAddTask: (date: Date) => void;
}

export const DayTasksDrawer = ({
  open,
  onOpenChange,
  date,
  tasks,
  onTaskClick,
  onAddTask,
}: DayTasksDrawerProps) => {
  if (!date) return null;

  const overdueCount = tasks.filter(isOverdue).length;
  const isToday = new Date().toDateString() === date.toDateString();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[450px] p-0">
        <SheetHeader className="p-6 pb-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-lg font-semibold">
                {format(date, "EEEE, MMMM d")}
              </SheetTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {tasks.length} {tasks.length === 1 ? "task" : "tasks"} scheduled
              </p>
            </div>
            <div className="flex gap-2">
              {isToday && (
                <Badge className="bg-primary/10 text-primary border-0">
                  Today
                </Badge>
              )}
              {overdueCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  {overdueCount} overdue
                </Badge>
              )}
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-180px)]">
          <div className="p-4 space-y-3">
            {tasks.length > 0 ? (
              tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onClick={() => onTaskClick(task)}
                  variant="full"
                />
              ))
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                  <Plus className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h3 className="font-medium text-foreground mb-1">
                  No tasks scheduled
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add your first task for this day
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background">
          <Button
            className="w-full gap-2"
            onClick={() => {
              onAddTask(date);
              onOpenChange(false);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Event
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
