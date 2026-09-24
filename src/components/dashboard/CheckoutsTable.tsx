import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Package, ArrowRight, ChevronRight, MapPin } from "lucide-react";
import { useInUseAssets } from "@/hooks/use-unified-stats";
import { DataFreshness } from "@/components/ui/data-freshness";
import { cn } from "@/lib/utils";
import { useDemoPath } from "@/hooks/use-demo-path";

// Column visibility - auto-detect which optional columns have data
interface ColumnConfig {
  id: string;
  label: string;
  accessor: (item: any) => any;
  required?: boolean;
}

const getStatusBadge = (status: string | null) => {
  const normalizedStatus = (status || "").toLowerCase().trim();
  
  if (normalizedStatus === "out" || normalizedStatus === "checked out" || normalizedStatus === "checked_out") {
    return { label: "Checked Out", color: "bg-warning/10 text-warning border-warning/30" };
  }
  if (normalizedStatus === "in use") {
    return { label: "In Use", color: "bg-primary/10 text-primary border-primary/30" };
  }
  if (normalizedStatus === "assigned") {
    return { label: "Assigned", color: "bg-blue-500/10 text-blue-600 border-blue-500/30" };
  }
  return { label: "Active", color: "bg-success/10 text-success border-success/30" };
};

export const CheckoutsTable = () => {
  const navigate = useNavigate();
  const { getPath } = useDemoPath();
  const { inUseItems, loading } = useInUseAssets();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Always use real data from database
  const displayItems = inUseItems;

  // Detect which optional columns have data
  const columnsWithData = useMemo(() => {
    const hasCategory = displayItems.some(item => 
      item.subcategory !== null && item.subcategory !== undefined && item.subcategory !== ""
    );
    const hasLocation = displayItems.some(item => 
      item.section !== null && item.section !== undefined && item.section !== ""
    );
    
    return { category: hasCategory, location: hasLocation };
  }, [displayItems]);

  useEffect(() => {
    if (!loading) {
      setLastUpdated(new Date());
    }
  }, [loading, inUseItems]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Small delay to show refresh animation
    setTimeout(() => {
      setLastUpdated(new Date());
      setIsRefreshing(false);
    }, 500);
  };

  const handleViewAsset = (itemId: string, itemName: string) => {
    navigate(getPath(`/inventory?highlight=${encodeURIComponent(itemId)}`));
  };

  if (loading) {
    return (
      <Card className="p-4 sm:p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5 sm:p-6 animate-fade-in" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-foreground">Currently In Use</h3>
          <div className="flex items-center gap-2.5 mt-1.5">
            <p className="text-[13px] text-muted-foreground/70 font-medium">
              <span className="tabular-nums">{displayItems.length}</span> item{displayItems.length !== 1 ? 's' : ''} assigned
            </p>
          </div>
        </div>
        <DataFreshness 
          lastUpdated={lastUpdated} 
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />
      </div>
      {displayItems.length === 0 ? (
        <div className="text-center py-14">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-success/8 flex items-center justify-center">
            <Package className="h-7 w-7 text-success/60" strokeWidth={1.5} />
          </div>
          <p className="font-semibold text-foreground/80 text-[15px]">All assets available</p>
          <p className="text-[13px] mt-1.5 mb-6 max-w-[260px] mx-auto text-muted-foreground/60">
            No items are currently checked out or assigned
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate(getPath('/inventory'))} className="gap-2 h-9 px-4 rounded-xl">
            <Package className="h-4 w-4" />
            View Assets
          </Button>
        </div>
      ) : (
        <div className="space-y-1">
          {displayItems.slice(0, 5).map((item) => {
            const statusBadge = getStatusBadge(item.status_item);
            
            return (
              <button
                key={item.id}
                onClick={() => handleViewAsset(item.id, item.description || "")}
                className={cn(
                  "w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left",
                  "transition-all duration-150 group",
                  "hover:bg-accent/60 active:scale-[0.99]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                )}
              >
                {/* Item info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground truncate">
                      {item.description || "Unnamed Item"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {item.subcategory && (
                      <span className="text-xs text-muted-foreground">
                        {item.subcategory}
                      </span>
                    )}
                    {item.subcategory && item.section && (
                      <span className="text-muted-foreground/40 text-xs">·</span>
                    )}
                    {item.section && (
                      <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                        <MapPin className="h-3 w-3" />
                        {item.section}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status badge */}
                <Badge 
                  variant="outline"
                  className={cn("font-medium text-xs shrink-0", statusBadge.color)}
                >
                  {statusBadge.label}
                </Badge>

                {/* Chevron */}
                <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors shrink-0" />
              </button>
            );
          })}
          
          {/* View All link */}
          {displayItems.length > 5 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full gap-2 text-muted-foreground hover:text-foreground mt-1 rounded-xl"
              onClick={() => navigate(getPath('/inventory?status=in-use'))}
            >
              View all {displayItems.length} items
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </Card>
  );
};
