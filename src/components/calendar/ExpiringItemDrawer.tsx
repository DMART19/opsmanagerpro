/**
 * Drawer to display expiring item details from calendar
 * Read-only view - directs users to inventory for editing
 */

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  AlertTriangle, 
  Calendar, 
  Package,
  MapPin,
  ExternalLink,
  Clock
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useDemoPath } from "@/hooks/use-demo-path";
import { ExpiringCalendarItem } from "@/hooks/use-expiring-items";

interface ExpiringItemDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expiringItem: ExpiringCalendarItem | null;
}

export const ExpiringItemDrawer = ({
  open,
  onOpenChange,
  expiringItem,
}: ExpiringItemDrawerProps) => {
  const navigate = useNavigate();
  const { getPath } = useDemoPath();

  if (!expiringItem) return null;

  const { item, type, daysUntil } = expiringItem;
  const itemName = item.description || item.subcategory || "Unnamed Item";
  const isExpired = type === "expired";
  const isCritical = type === "expiring-critical";

  const handleViewInInventory = () => {
    onOpenChange(false);
    navigate(getPath(`/inventory?highlight=${item.id}`));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader className="text-left pb-4">
          <div className="flex items-start gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              isExpired ? "bg-destructive/10" : isCritical ? "bg-amber-500/10" : "bg-amber-500/10"
            )}>
              <AlertTriangle className={cn(
                "h-5 w-5",
                isExpired ? "text-destructive" : "text-amber-600"
              )} />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg font-semibold leading-tight mb-2">
                {isExpired ? "Expired Item" : "Expiring Soon"}
              </SheetTitle>
              <Badge 
                variant={isExpired ? "destructive" : "outline"}
                className={cn(
                  "text-xs",
                  !isExpired && "bg-amber-100 text-amber-700 border-amber-200"
                )}
              >
                {isExpired 
                  ? `Expired ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''} ago`
                  : `Expires in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`
                }
              </Badge>
            </div>
          </div>
        </SheetHeader>

        <Separator className="my-4" />

        {/* Item Info */}
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Item Details
            </h4>
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div>
                <p className="text-base font-semibold">{itemName}</p>
                {item.subcategory && item.subcategory !== itemName && (
                  <p className="text-sm text-muted-foreground">{item.subcategory}</p>
                )}
              </div>
              
              {item.barcode && (
                <p className="text-xs font-mono text-muted-foreground">{item.barcode}</p>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="text-center p-2 rounded bg-background">
                  <p className="font-semibold text-lg">{item.quantity_available ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Available</p>
                </div>
                <div className="text-center p-2 rounded bg-background">
                  <p className="font-semibold text-lg">{item.quantity_out ?? 0}</p>
                  <p className="text-xs text-muted-foreground">In Use</p>
                </div>
              </div>
            </div>
          </div>

          {/* Expiration Details */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Expiration Date
            </h4>
            <div className="pl-6 space-y-2">
              <p className={cn(
                "text-base font-medium",
                isExpired ? "text-destructive" : "text-amber-600"
              )}>
                {item.date_expire && format(new Date(item.date_expire), "PPPP")}
              </p>
              <p className="text-sm text-muted-foreground">
                {isExpired 
                  ? "This item has passed its expiration date and should be reviewed or removed from inventory."
                  : "Review this item before expiration to determine if it needs replacement or disposal."
                }
              </p>
            </div>
          </div>

          {/* Location */}
          {item.section && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </h4>
              <div className="pl-6">
                <p className="text-sm">{item.section}</p>
              </div>
            </div>
          )}
        </div>

        <Separator className="my-6" />

        {/* Action */}
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground text-center">
            Manage this item in the inventory to update expiration date or adjust quantities.
          </p>
          <Button onClick={handleViewInInventory} className="w-full gap-2">
            <ExternalLink className="h-4 w-4" />
            View in Inventory
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
