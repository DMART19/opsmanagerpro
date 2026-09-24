import { useState, useEffect } from "react";
import { AlertTriangle, Loader2, Users, Trash2 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BulkDeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberCount: number;
  memberNames: string[];
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

const CONFIRMATION_PHRASE = "DELETE";

export const BulkDeleteConfirmationDialog = ({
  open,
  onOpenChange,
  memberCount,
  memberNames,
  onConfirm,
  isDeleting,
}: BulkDeleteConfirmationDialogProps) => {
  const [confirmationInput, setConfirmationInput] = useState("");
  const [step, setStep] = useState<1 | 2>(1);

  const isConfirmationValid = confirmationInput.toUpperCase() === CONFIRMATION_PHRASE;

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setConfirmationInput("");
      setStep(1);
    }
  }, [open]);

  const handleProceedToStep2 = () => {
    setStep(2);
  };

  const handleConfirm = async () => {
    if (isConfirmationValid) {
      await onConfirm();
    }
  };

  // Show up to 5 names with "and X more" for longer lists
  const displayNames = memberNames.slice(0, 5);
  const remainingCount = memberNames.length - displayNames.length;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {step === 1 ? "Delete Team Members?" : "Final Confirmation Required"}
          </AlertDialogTitle>
          
          {step === 1 ? (
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  You are about to delete <strong className="text-foreground">{memberCount} team member{memberCount !== 1 ? "s" : ""}</strong>:
                </p>
                
                <div className="p-3 bg-muted rounded-lg max-h-32 overflow-y-auto">
                  <ul className="text-sm space-y-1">
                    {displayNames.map((name, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Users className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-foreground">{name}</span>
                      </li>
                    ))}
                    {remainingCount > 0 && (
                      <li className="text-muted-foreground italic">
                        ...and {remainingCount} more
                      </li>
                    )}
                  </ul>
                </div>
                
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg space-y-2">
                  <div className="flex items-start gap-2">
                    <Trash2 className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-destructive">
                      <p className="font-semibold">This action is permanent</p>
                      <p className="text-destructive/80">
                        All selected members, their credentials, and checkout history will be permanently removed from your database.
                      </p>
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  You cannot undo this action. Consider exporting your data first.
                </p>
              </div>
            </AlertDialogDescription>
          ) : (
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  To confirm deletion of {memberCount} team member{memberCount !== 1 ? "s" : ""}, type{" "}
                  <strong className="font-mono text-foreground bg-muted px-1.5 py-0.5 rounded">
                    {CONFIRMATION_PHRASE}
                  </strong>{" "}
                  below.
                </p>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmation-input" className="text-foreground">
                    Type confirmation phrase
                  </Label>
                  <Input
                    id="confirmation-input"
                    value={confirmationInput}
                    onChange={(e) => setConfirmationInput(e.target.value)}
                    placeholder={CONFIRMATION_PHRASE}
                    className="font-mono"
                    autoComplete="off"
                    autoFocus
                    disabled={isDeleting}
                  />
                </div>
              </div>
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          
          {step === 1 ? (
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleProceedToStep2();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              I Understand, Continue
            </AlertDialogAction>
          ) : (
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirm();
              }}
              disabled={!isConfirmationValid || isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete {memberCount} Member{memberCount !== 1 ? "s" : ""}
                </>
              )}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
