import { useNavigate } from "react-router-dom";
import { Plus, Package, Users, AlertCircle, FileWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
interface MobileContextualActionsProps {
  className?: string;
  expiredCount?: number;
  expiringCount?: number;
}
export const MobileContextualActions = ({
  className,
  expiredCount = 0,
  expiringCount = 0
}: MobileContextualActionsProps) => {
  const navigate = useNavigate();

  // Determine primary action based on context
  const hasCriticalIssues = expiredCount > 0;
  const hasWarningIssues = expiringCount > 5;
  return <div className={cn("fixed bottom-0 left-0 right-0 z-50 lg:hidden", "bg-background/80 backdrop-blur-xl border-t border-border/50", "px-4 py-2", className)} style={{
    paddingBottom: "max(10px, env(safe-area-inset-bottom))",
    boxShadow: "0 -4px 20px -4px hsl(var(--foreground) / 0.05)"
  }}>
      <div className="flex gap-2 max-w-lg mx-auto">
        {/* Context-aware primary action */}
        {hasCriticalIssues ?
      // Critical: Direct to expired credentials
      <Button className={cn("flex-[1.3] h-11 min-h-[44px] gap-2 text-sm font-semibold", "shadow-lg hover:shadow-xl active:scale-[0.98] transition-all duration-200", "bg-destructive hover:bg-destructive/90")} onClick={() => navigate("/people?tab=certifications&status=expired")}>
            <AlertCircle className="h-4 w-4" />
            Fix {expiredCount} Expired
          </Button> : hasWarningIssues ?
      // Warning: Direct to expiring credentials
      <Button className={cn("flex-[1.3] h-11 min-h-[44px] gap-2 text-sm font-semibold", "shadow-lg hover:shadow-xl active:scale-[0.98] transition-all duration-200", "bg-warning hover:bg-warning/90 text-warning-foreground")} onClick={() => navigate("/people?tab=certifications&status=expiring")}>
            <FileWarning className="h-4 w-4" />
            Review Expiring
          </Button> :
      // Default: Add Asset
      <Button className={cn("flex-[1.2] h-11 min-h-[44px] gap-2 text-sm font-semibold", "shadow-lg hover:shadow-xl active:scale-[0.98] transition-all duration-200", "bg-primary hover:bg-primary/90")} onClick={() => navigate("/inventory")}>
            <Plus className="h-4 w-4" />
            <Package className="h-4 w-4" />
            Add Asset
          </Button>}
        
        {/* Secondary Action - Always available */}
        <Button variant="ghost" className={cn("flex-1 h-11 min-h-[44px] gap-2 text-sm font-medium", "active:scale-[0.98] transition-all duration-200", "text-muted-foreground hover:text-foreground hover:bg-muted/50")} onClick={() => navigate("/people")}>
          <Users className="h-4 w-4" />
          Team
        </Button>
      </div>
    </div>;
};