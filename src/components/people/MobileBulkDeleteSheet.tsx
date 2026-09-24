import { useState, useEffect } from "react";
import { AlertTriangle, Loader2, Users, Trash2 } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface MobileBulkDeleteSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberCount: number;
  memberNames: string[];
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

const CONFIRMATION_PHRASE = "DELETE";

export const MobileBulkDeleteSheet = ({
  open,
  onOpenChange,
  memberCount,
  memberNames,
  onConfirm,
  isDeleting,
}: MobileBulkDeleteSheetProps) => {
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
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {step === 1 ? "Delete Team Members?" : "Confirm Deletion"}
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-4 overflow-y-auto">
          {step === 1 ? (
            <div className="space-y-4">
              <DrawerDescription>
                You are about to delete{" "}
                <strong className="text-foreground">
                  {memberCount} team member{memberCount !== 1 ? "s" : ""}
                </strong>
              </DrawerDescription>

              {/* Member list */}
              <div className="p-3 bg-muted rounded-lg max-h-40 overflow-y-auto">
                <ul className="text-sm space-y-2">
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

              {/* Warning */}
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <Trash2 className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold text-destructive">
                      This action is permanent
                    </p>
                    <p className="text-destructive/80 mt-1">
                      All selected members and their credentials will be permanently removed.
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Consider exporting your data first. This cannot be undone.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <DrawerDescription>
                To confirm deletion of {memberCount} member{memberCount !== 1 ? "s" : ""}, 
                type <strong className="font-mono text-foreground bg-muted px-1.5 py-0.5 rounded">
                  {CONFIRMATION_PHRASE}
                </strong> below.
              </DrawerDescription>

              <div className="space-y-2">
                <Label htmlFor="mobile-confirmation-input">
                  Type confirmation phrase
                </Label>
                <Input
                  id="mobile-confirmation-input"
                  value={confirmationInput}
                  onChange={(e) => setConfirmationInput(e.target.value)}
                  placeholder={CONFIRMATION_PHRASE}
                  className="font-mono text-lg h-12"
                  autoComplete="off"
                  autoFocus
                  disabled={isDeleting}
                />
              </div>
            </div>
          )}
        </div>

        <DrawerFooter className="pt-2">
          {step === 1 ? (
            <>
              <Button
                onClick={handleProceedToStep2}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 h-12"
              >
                I Understand, Continue
              </Button>
              <DrawerClose asChild>
                <Button variant="outline" className="h-12">
                  Cancel
                </Button>
              </DrawerClose>
            </>
          ) : (
            <>
              <Button
                onClick={handleConfirm}
                disabled={!isConfirmationValid || isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 h-12 disabled:opacity-50"
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
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setStep(1)} 
                disabled={isDeleting}
                className="h-12"
              >
                Go Back
              </Button>
            </>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
