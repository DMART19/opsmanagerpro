import { useState, useEffect } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
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

interface DeleteAllConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemCount: number;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

const CONFIRMATION_PHRASE = "DELETE ALL";

export const DeleteAllConfirmationDialog = ({
  open,
  onOpenChange,
  itemCount,
  onConfirm,
  isDeleting,
}: DeleteAllConfirmationDialogProps) => {
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

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {step === 1 ? "Delete All Items?" : "Final Confirmation Required"}
          </AlertDialogTitle>
          
          {step === 1 ? (
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  You are about to delete <strong className="text-foreground">{itemCount.toLocaleString()} items</strong> from your inventory.
                </p>
                
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg space-y-2">
                  <div className="flex items-start gap-2">
                    <Trash2 className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-destructive">
                      <p className="font-semibold">This action is permanent</p>
                      <p className="text-destructive/80">
                        All inventory records, including custom attributes and stock data, will be permanently removed from your database.
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
                  To confirm deletion of all {itemCount.toLocaleString()} items, type{" "}
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
                  Deleting All Items...
                </>
              ) : (
                "Permanently Delete All"
              )}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
