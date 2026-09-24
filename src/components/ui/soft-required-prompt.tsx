/**
 * SoftRequiredPrompt — "Complete Key Details?" lightweight modal
 * 
 * Triggered on save when soft-required fields are empty.
 * Clean Apple-style UI, fast animation, non-aggressive.
 */

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
import { Info } from "lucide-react";
import type { SoftRequiredField } from "@/hooks/use-soft-required";

interface SoftRequiredPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  missingFields: SoftRequiredField[];
  onAddNow: () => void;
  onSkip: () => void;
}

export const SoftRequiredPrompt = ({
  open,
  onOpenChange,
  missingFields,
  onAddNow,
  onSkip,
}: SoftRequiredPromptProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-base">
            <Info className="h-4.5 w-4.5 text-primary" />
            Complete Key Details?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Adding these details improves filtering, reporting, and system visibility.
              </p>
              <div className="space-y-1.5">
                {missingFields.map((field) => (
                  <div
                    key={field.key}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 text-sm"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-warning shrink-0" />
                    <span className="text-foreground font-medium">{field.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel
            onClick={onSkip}
            className="flex-1"
          >
            Skip for Now
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onAddNow}
            className="flex-1"
          >
            Add Now
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
