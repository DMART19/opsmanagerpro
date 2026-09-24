import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, Bell } from "lucide-react";
import { toast } from "sonner";

interface ComingSoonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName: string;
  description: string;
  features?: string[];
  icon?: React.ReactNode;
  isPalletBuilder?: boolean;
}

export const ComingSoonModal = ({
  open,
  onOpenChange,
  featureName,
  description,
  features = [],
  icon,
  isPalletBuilder = false,
}: ComingSoonModalProps) => {
  const handleNotifyMe = () => {
    toast.success(`You'll be notified when ${featureName} launches!`);
    onOpenChange(false);
  };

  // Pallet Builder has different copy
  const badgeText = isPalletBuilder ? "Advanced Feature" : "Coming Soon";
  const footerText = isPalletBuilder 
    ? "This optimization tool will be available in a future Pro+ plan."
    : "Advanced trailer load planning will be released in a future plan.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-center">
          {/* Icon with Lock Badge */}
          <div className="mx-auto mb-4 relative">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
              {icon}
            </div>
            <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary flex items-center justify-center shadow-md">
              <Lock className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 mb-1">
            <DialogTitle className="text-xl">{featureName}</DialogTitle>
            <span className="text-xs font-semibold px-2 py-0.5 bg-muted text-muted-foreground rounded-full">
              {badgeText}
            </span>
          </div>
          
          <DialogDescription className="text-center pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        {/* Features Preview */}
        {features.length > 0 && (
          <div className="bg-muted/50 rounded-lg p-4 my-2">
            <p className="text-sm font-medium text-foreground mb-2">What's coming:</p>
            <ul className="text-sm text-muted-foreground space-y-1.5">
              {features.map((feature, idx) => (
                <li key={idx}>• {feature}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-sm text-muted-foreground text-center">
          {footerText}
        </p>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Close
          </Button>
          <Button
            onClick={handleNotifyMe}
            className="w-full sm:w-auto gap-2"
          >
            <Bell className="h-4 w-4" />
            Notify Me
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
