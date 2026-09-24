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
import { SupportLevel } from "@/lib/pallet-stability";

interface StabilityWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supportLevel: SupportLevel;
  onContinue: () => void;
  onCancel: () => void;
}

export const StabilityWarningDialog = ({
  open,
  onOpenChange,
  supportLevel,
  onContinue,
  onCancel,
}: StabilityWarningDialogProps) => {
  const getMessage = () => {
    if (supportLevel.level === "unsupported") {
      return {
        title: "Unstable Placement Warning",
        description: `This placement has ${supportLevel.percentage.toFixed(
          0
        )}% support from the layer below and may cause pallet instability. The container could shift or collapse during transport.`,
        severity: "high",
      };
    } else {
      return {
        title: "Partial Support Warning",
        description: `This placement has ${supportLevel.percentage.toFixed(
          0
        )}% support from the layer below. While not critical, this may reduce pallet stability during transport.`,
        severity: "moderate",
      };
    }
  };

  const message = getMessage();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-full ${
                message.severity === "high"
                  ? "bg-red-100 text-red-600"
                  : "bg-yellow-100 text-yellow-600"
              }`}
            >
              <AlertTriangle className="h-6 w-6" />
            </div>
            <AlertDialogTitle>{message.title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base pt-2">
            {message.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            Fix Placement
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onContinue}
            className={
              message.severity === "high"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-yellow-600 hover:bg-yellow-700"
            }
          >
            Continue Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
