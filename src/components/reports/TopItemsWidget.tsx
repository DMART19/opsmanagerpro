import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Info, ExternalLink, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useEquipment } from "@/hooks/use-equipment";
import { useCheckouts } from "@/hooks/use-checkouts";

interface ItemUtilization {
  name: string;
  checkouts: number;
  utilization: number;
  category?: string;
}

export const TopItemsWidget = () => {
  const navigate = useNavigate();
  const { equipment, loading: equipmentLoading } = useEquipment();
  const { checkouts, loading: checkoutsLoading } = useCheckouts();
  const [selectedTimeframe, setSelectedTimeframe] = useState<"30" | "90" | "12">("30");

  // Calculate real utilization from database
  const items: ItemUtilization[] = (() => {
    if (equipmentLoading || checkoutsLoading) return [];
    if (!equipment || equipment.length === 0) return [];

    // Group equipment by category and calculate checkout counts
    const categoryStats = new Map<string, { count: number; checkouts: number }>();
    
    equipment.forEach(item => {
      const category = item.category || 'Uncategorized';
      const current = categoryStats.get(category) || { count: 0, checkouts: 0 };
      current.count++;
      
      // Count checkouts for this item
      const itemCheckouts = checkouts.filter(c => c.equipment_id === item.id).length;
      current.checkouts += itemCheckouts;
      
      categoryStats.set(category, current);
    });

    // Convert to array and calculate utilization
    return Array.from(categoryStats.entries())
      .map(([category, stats]) => ({
        name: category,
        checkouts: stats.checkouts,
        utilization: Math.min(100, Math.round((stats.checkouts / Math.max(1, stats.count)) * 100)),
        category
      }))
      .sort((a, b) => b.checkouts - a.checkouts)
      .slice(0, 5);
  })();

  const loading = equipmentLoading || checkoutsLoading;

  const handleItemClick = (itemName: string) => {
    navigate(`/inventory?category=${encodeURIComponent(itemName)}`);
  };

  const handleViewAll = () => {
    navigate('/inventory');
  };

  const timeframes = {
    "30": { label: "30 Days" },
    "90": { label: "90 Days" },
    "12": { label: "12 Months" },
  };

  // Empty state
  if (!loading && items.length === 0) {
    return (
      <Card className="p-6">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-semibold text-foreground">Most Utilized Resources</h3>
              <UITooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[250px]">
                  <p>Top resources ranked by usage frequency. Add assets to see utilization data.</p>
                </TooltipContent>
              </UITooltip>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Ranked by usage frequency</p>
          </div>
        </div>

        <div className="text-center py-12 text-muted-foreground">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
            <Package className="h-8 w-8 text-primary/60" />
          </div>
          <p className="font-medium">No utilization data yet</p>
          <p className="text-sm mt-1 mb-5 max-w-[280px] mx-auto">
            Add assets and track checkouts to see which resources are used most
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate('/inventory')} className="gap-2">
            <Package className="h-4 w-4" />
            Add Your First Asset
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-semibold text-foreground">Most Utilized Resources</h3>
            <UITooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[250px]">
                <p>Top resources ranked by usage frequency. Click any item to view its details and usage history.</p>
              </TooltipContent>
            </UITooltip>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Ranked by usage frequency</p>
        </div>
      </div>

      {/* Timeframe Selector */}
      <div className="flex gap-1 mb-5 p-1 bg-muted/50 rounded-lg w-fit">
        {Object.entries(timeframes).map(([key, { label }]) => (
          <Button
            key={key}
            variant="ghost"
            size="sm"
            onClick={() => setSelectedTimeframe(key as "30" | "90" | "12")}
            className={cn(
              "text-xs px-3 h-7",
              selectedTimeframe === key && "bg-background shadow-sm"
            )}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Horizontal Bar List */}
      <div className="space-y-4">
        {items.map((item, index) => (
          <button
            key={item.name}
            onClick={() => handleItemClick(item.name)}
            className="w-full cursor-pointer hover:bg-accent/50 p-2.5 rounded-lg transition-colors text-left group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3 flex-1">
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-foreground text-sm flex items-center gap-2 group-hover:underline">
                    {item.name}
                    {item.checkouts > 0 && (
                      <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{item.checkouts.toLocaleString()} uses</div>
                </div>
              </div>
              <UITooltip delayDuration={100}>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                    {item.utilization}%
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Utilization rate during selected period</p>
                </TooltipContent>
              </UITooltip>
            </div>
            
            {/* Horizontal Bar */}
            <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="absolute h-full bg-gradient-to-r from-primary/70 to-primary rounded-full transition-all"
                style={{ width: `${item.utilization}%` }}
              />
            </div>
          </button>
        ))}
      </div>

      {/* View All Link */}
      <div className="mt-5 pt-4 border-t">
        <Button variant="ghost" size="sm" onClick={handleViewAll} className="w-full gap-1.5">
          <ExternalLink className="h-3.5 w-3.5" />
          View All Resources
        </Button>
      </div>
    </Card>
  );
};
