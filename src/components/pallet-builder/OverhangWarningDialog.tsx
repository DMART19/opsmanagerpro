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
import { AlertTriangle } from "lucide-react";

interface OverhangWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReposition: () => void;
  onAllowAnyway: () => void;
  overhangAmount: { top: number; right: number; bottom: number; left: number };
}

export const OverhangWarningDialog = ({
  open,
  onOpenChange,
  onReposition,
  onAllowAnyway,
  overhangAmount,
}: OverhangWarningDialogProps) => {
  const hasOverhang = Object.values(overhangAmount).some(v => v > 0);
  
  const getOverhangDescription = () => {
    const overhangs: string[] = [];
    if (overhangAmount.top > 0) overhangs.push(`${overhangAmount.top.toFixed(1)}" top`);
    if (overhangAmount.right > 0) overhangs.push(`${overhangAmount.right.toFixed(1)}" right`);
    if (overhangAmount.bottom > 0) overhangs.push(`${overhangAmount.bottom.toFixed(1)}" bottom`);
    if (overhangAmount.left > 0) overhangs.push(`${overhangAmount.left.toFixed(1)}" left`);
    return overhangs.join(", ");
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-destructive/10 rounded-full">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle>Unsafe Overhang Detected</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-4 space-y-2">
            {hasOverhang ? (
              <>
                <p>
                  This case extends beyond the pallet edges, creating an unsafe overhang condition.
                </p>
                <p className="font-semibold text-destructive">
                  Overhang: {getOverhangDescription()}
                </p>
                <p className="text-sm text-muted-foreground">
                  Cases extending beyond the pallet can be damaged during transport and create safety hazards.
                </p>
              </>
            ) : (
              <p>This case placement may not be safe.</p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onReposition}>
            Reposition
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onAllowAnyway}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Allow Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
