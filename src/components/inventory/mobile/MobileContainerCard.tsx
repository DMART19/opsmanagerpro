import { memo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Box, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileContainerCardProps {
  box: {
    id: string;
    box_number: string;
    box_number_alt?: string | null;
    cache_box_type: string;
    box_description?: string | null;
    status_cache_box: string;
    x_group_display?: string | null;
    barcode?: string | null;
  };
  onView: (box: any) => void;
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "available":
      return "bg-green-500/10 text-green-600 border-green-500/20";
    case "checked out":
      return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    case "maintenance":
      return "bg-orange-500/10 text-orange-600 border-orange-500/20";
    case "internal":
      return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export const MobileContainerCard = memo(({ box, onView }: MobileContainerCardProps) => {
  const handleClick = useCallback(() => onView(box), [onView, box]);

  return (
    <Card
      className="p-4 active:bg-muted/50 transition-colors cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Box className="h-5 w-5 text-primary" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium truncate">{box.box_number}</p>
              <p className="text-sm text-muted-foreground">{box.cache_box_type}</p>
            </div>
            <Badge
              variant="outline"
              className={cn("flex-shrink-0 text-xs", getStatusColor(box.status_cache_box))}
            >
              {box.status_cache_box}
            </Badge>
          </div>

          {/* Meta info */}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            {box.box_description && (
              <span className="truncate max-w-[150px]">{box.box_description}</span>
            )}
            {box.x_group_display && (
              <span className="flex-shrink-0">{box.x_group_display}</span>
            )}
          </div>
        </div>

        {/* Arrow */}
        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-2" />
      </div>
    </Card>
  );
});

MobileContainerCard.displayName = "MobileContainerCard";
