import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface RecurrenceSeriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: "edit" | "delete";
  onSingle: () => void;
  onSeries: () => void;
}

export const RecurrenceSeriesDialog = ({
  open,
  onOpenChange,
  action,
  onSingle,
  onSeries,
}: RecurrenceSeriesDialogProps) => {
  const isDelete = action === "delete";
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isDelete ? "Delete recurring event" : "Edit recurring event"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            This event is part of a recurring series. Would you like to {isDelete ? "delete" : "edit"} just this occurrence or the entire series?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onSingle();
            }}
            className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
          >
            This event only
          </AlertDialogAction>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onSeries();
            }}
          >
            {isDelete ? "All events in series" : "All future events"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
