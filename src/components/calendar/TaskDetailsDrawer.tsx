import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Edit, Trash2, CheckCircle2, Calendar, Clock, MapPin, Users, FileText, Flag, Loader2, Repeat } from "lucide-react";
import { CalendarTask, taskTypeColors as baseTypeColors } from "./types";
import { useTasks } from "@/hooks/use-tasks";
import { supabase } from "@/integrations/supabase/client";
import { useFormatters } from "@/hooks/use-formatters";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { RecurrenceSeriesDialog } from "./RecurrenceSeriesDialog";
import { format } from "date-fns";

interface TaskDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: CalendarTask | null;
  onEdit?: (task: CalendarTask) => void;
}

const taskTypeColors = {
  task: { bg: "bg-primary", text: "text-primary", light: "bg-primary/10" },
  event: { bg: "bg-success", text: "text-success", light: "bg-success/10" },
  deadline: { bg: "bg-warning", text: "text-warning", light: "bg-warning/10" },
  reminder: { bg: "bg-purple-500", text: "text-purple-600", light: "bg-purple-500/10" },
};

const statusColors = {
  pending: { bg: "bg-muted", text: "text-muted-foreground" },
  "in-progress": { bg: "bg-primary/10", text: "text-primary" },
  complete: { bg: "bg-success/10", text: "text-success" },
};

const priorityColors = {
  low: { bg: "bg-success/10", text: "text-success" },
  medium: { bg: "bg-warning/10", text: "text-warning" },
  high: { bg: "bg-destructive/10", text: "text-destructive" },
};

export const TaskDetailsDrawer = ({ open, onOpenChange, task, onEdit }: TaskDetailsDrawerProps) => {
  const { updateTask, deleteTask } = useTasks();
  const { formatDate, formatTimeString } = useFormatters();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [seriesDialogOpen, setSeriesDialogOpen] = useState(false);
  const [seriesAction, setSeriesAction] = useState<"edit" | "delete">("edit");
  
  if (!task) return null;

  const isRecurring = task.isRecurring || task.isOccurrence;
  const masterId = task.masterTaskId || task.id;

  const handleMarkComplete = async () => {
    try {
      await updateTask.mutateAsync({
        id: task.id,
        status: "completed",
      });
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleEditClick = () => {
    if (isRecurring) {
      setSeriesAction("edit");
      setSeriesDialogOpen(true);
    } else {
      handleEditSingle();
    }
  };

  const handleEditSingle = () => {
    setSeriesDialogOpen(false);
    if (onEdit) {
      onEdit(task);
      onOpenChange(false);
    }
  };

  const handleEditSeries = () => {
    setSeriesDialogOpen(false);
    if (onEdit) {
      // For series edit, pass the task (CalendarView's handleEditTask resolves to master)
      onEdit(task);
      onOpenChange(false);
    }
  };

  const handleDeleteClick = () => {
    if (isRecurring) {
      setSeriesAction("delete");
      setSeriesDialogOpen(true);
    } else {
      setDeleteDialogOpen(true);
    }
  };

  const handleDeleteSingle = async () => {
    setSeriesDialogOpen(false);
    if (task.isOccurrence && masterId) {
      // Fetch current exceptions and append
      const { data: masterTask } = await supabase
        .from("tasks")
        .select("recurrence_exceptions")
        .eq("id", masterId)
        .single();
      
      const currentExceptions = (masterTask?.recurrence_exceptions as string[]) || [];
      const dateStr = format(task.date, "yyyy-MM-dd");
      await updateTask.mutateAsync({
        id: masterId,
        recurrence_exceptions: [...currentExceptions, dateStr],
      });
    } else {
      await deleteTask.mutateAsync(task.id);
    }
    onOpenChange(false);
  };

  const handleDeleteSeries = async () => {
    setSeriesDialogOpen(false);
    await deleteTask.mutateAsync(masterId);
    onOpenChange(false);
  };

  const handleDelete = async () => {
    await deleteTask.mutateAsync(task.id);
    onOpenChange(false);
  };

  const typeColor = taskTypeColors[task.type as keyof typeof taskTypeColors];
  const statusColor = statusColors[task.status as keyof typeof statusColors];
  const priorityColor = priorityColors[task.priority as keyof typeof priorityColors];

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-2">
                <Badge 
                  className={`${typeColor?.light || 'bg-primary/10'} ${typeColor?.text || 'text-primary'} border-0`}
                >
                  {task.type.charAt(0).toUpperCase() + task.type.slice(1)}
                </Badge>
                {isRecurring && (
                  <Badge variant="outline" className="border-0 bg-accent text-accent-foreground gap-1 text-[10px]">
                    <Repeat className="h-3 w-3" />
                    {task.recurrenceType === 'daily' ? 'Daily' : task.recurrenceType === 'weekly' ? 'Weekly' : task.recurrenceType === 'monthly' ? 'Monthly' : 'Recurring'}
                  </Badge>
                )}
              </div>
              <SheetTitle className="text-xl font-semibold leading-tight">
                {task.title}
              </SheetTitle>
            </div>
            <div className="flex items-center gap-1 shrink-0 pt-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleEditClick}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={handleDeleteClick}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        <Separator className="my-4" />

        {/* Task Details */}
        <div className="space-y-4">
          {/* Date & Time */}
          <div className="flex items-start gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">
                {formatDate(new Date(task.date))}
              </p>
              {task.startTime && (
                <p className="text-sm text-muted-foreground">
                  {formatTimeString(task.startTime)}
                  {task.endTime && ` - ${formatTimeString(task.endTime)}`}
                </p>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center gap-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <Badge className={`${statusColor?.bg || 'bg-muted'} ${statusColor?.text || 'text-muted-foreground'} border-0`}>
              {task.status.charAt(0).toUpperCase() + task.status.slice(1).replace('-', ' ')}
            </Badge>
          </div>

          {/* Priority */}
          <div className="flex items-center gap-3">
            <Flag className="h-4 w-4 text-muted-foreground" />
            <Badge className={`${priorityColor?.bg || 'bg-muted'} ${priorityColor?.text || 'text-muted-foreground'} border-0`}>
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
            </Badge>
          </div>

          {/* Location */}
          {task.section && (
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <p className="text-sm">{task.warehouse}{task.section ? ` - ${task.section}` : ''}</p>
            </div>
          )}

          {/* Assigned To */}
          {task.assignees && task.assignees.length > 0 && (
            <div className="flex items-start gap-3">
              <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex flex-wrap gap-2">
                {task.assignees.map((person, index) => (
                  <div key={index} className="flex items-center gap-1.5">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[10px]">
                        {person.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{person}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {task.notes && (
            <div className="flex items-start gap-3">
              <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                {task.notes}
              </p>
            </div>
          )}
        </div>

        <Separator className="my-6" />

        {/* Actions */}
        <div className="space-y-3">
          {task.status !== "complete" && (
            <Button
              variant="default"
              className="w-full gap-2"
              onClick={handleMarkComplete}
              disabled={updateTask.isPending}
            >
              {updateTask.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Mark Complete
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>

    <ConfirmationDialog
      open={deleteDialogOpen}
      onOpenChange={setDeleteDialogOpen}
      title="Delete Event"
      description="Are you sure you want to delete this event?"
      confirmLabel="Delete"
      variant="destructive"
      onConfirm={handleDelete}
      showWarning
      warningText="This action cannot be undone."
    />

    <RecurrenceSeriesDialog
      open={seriesDialogOpen}
      onOpenChange={setSeriesDialogOpen}
      action={seriesAction}
      onSingle={seriesAction === "edit" ? handleEditSingle : handleDeleteSingle}
      onSeries={seriesAction === "edit" ? handleEditSeries : handleDeleteSeries}
    />
    </>
  );
};
