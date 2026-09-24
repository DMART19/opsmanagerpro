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
import { AlertTriangle, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SaveWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  warnings: string[];
}

export const SaveWarningDialog = ({
  open,
  onOpenChange,
  onConfirm,
  warnings,
}: SaveWarningDialogProps) => {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Save with Warnings
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                This pallet configuration has the following issues:
              </p>
              
              <div className="space-y-2">
                {warnings.map((warning, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800"
                  >
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{warning}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <span className="text-sm text-muted-foreground">This pallet will be saved as:</span>
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                  Draft
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground">
                You can still use this layout, but consider addressing the issues for safer transport.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} className="gap-2 bg-amber-600 hover:bg-amber-700">
            <Save className="h-4 w-4" />
            Save Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
