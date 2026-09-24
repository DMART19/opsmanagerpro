import { useNavigate } from "react-router-dom";
import { useDemoPath } from "@/hooks/use-demo-path";
import { Plus, Package, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUnifiedStats } from "@/hooks/use-unified-stats";

interface MobileStickyActionsProps {
  className?: string;
  onAddAsset?: () => void;
}

export const MobileStickyActions = ({ className, onAddAsset }: MobileStickyActionsProps) => {
  const navigate = useNavigate();
  const { getPath } = useDemoPath();
  const { assets, loading } = useUnifiedStats();
  
  // Priority: Show only "Add Asset" when user has 0 assets (reduce decision paralysis)
  const hasAssets = !loading && assets.total > 0;

  return (
    <div 
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 lg:hidden",
        "bg-background/80 backdrop-blur-xl border-t border-border/50",
        "px-4 py-2.5",
        className
      )}
      style={{ 
        paddingBottom: "max(12px, env(safe-area-inset-bottom))",
        boxShadow: "0 -4px 20px -4px hsl(var(--foreground) / 0.05)",
      }}
    >
      <div className="flex gap-2.5 max-w-lg mx-auto">
        {/* Primary Action - Add Asset (always visible) */}
        <Button
          className={cn(
            "h-11 min-h-[44px] gap-2 text-sm font-semibold",
            "shadow-lg hover:shadow-xl active:scale-[0.98] transition-all duration-200",
            "bg-primary hover:bg-primary/90",
            hasAssets ? "flex-[1.2]" : "flex-1" // Full width when no assets
          )}
          onClick={() => onAddAsset ? onAddAsset() : navigate(getPath("/inventory"))}
        >
          <Plus className="h-4 w-4" />
          <Package className="h-4 w-4" />
          Add Asset
        </Button>
        
        {/* Secondary Action - Add Member (only show once assets exist) */}
        {hasAssets && (
          <Button
            variant="ghost"
            className={cn(
              "flex-1 h-11 min-h-[44px] gap-2 text-sm font-medium",
              "active:scale-[0.98] transition-all duration-200",
              "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
            onClick={() => navigate(getPath("/people"))}
          >
            <Users className="h-4 w-4" />
            Add Member
          </Button>
        )}
      </div>
    </div>
  );
};
