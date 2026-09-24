import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, Package, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSuperAdmin } from "@/hooks/use-super-admin";

interface FeatureLockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName: string;
  description: string;
  icon?: React.ReactNode;
  requiredPlan?: string;
}

export const FeatureLockModal = ({
  open,
  onOpenChange,
  featureName,
  description,
  icon,
  requiredPlan,
}: FeatureLockModalProps) => {
  const navigate = useNavigate();
  const { isSuperAdmin } = useSuperAdmin();

  // Super admins bypass all feature locks — never show upgrade prompts.
  if (isSuperAdmin) return null;

  const handleViewPlans = () => {
    onOpenChange(false);
    navigate("/billing");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-4 relative">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              {icon || <Package className="h-8 w-8 text-primary" />}
            </div>
            <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-amber-500 flex items-center justify-center shadow-md">
              <Lock className="h-3.5 w-3.5 text-white" />
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 mb-1">
            <DialogTitle className="text-xl">{featureName}</DialogTitle>
            <span className="text-xs font-semibold px-2 py-0.5 bg-primary/10 text-primary rounded-full">
              {requiredPlan || "Higher Plan"}
            </span>
          </div>
          
          <DialogDescription className="text-center pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/50 rounded-lg p-4 my-2">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Available on {requiredPlan || "higher"} plan
          </div>
          <p className="text-sm text-muted-foreground">
            Upgrade your plan to unlock {featureName} and other advanced features.
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Close
          </Button>
          <Button
            onClick={handleViewPlans}
            className="w-full sm:w-auto gap-2"
          >
            Upgrade Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
