import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MobileTeamSearchHeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onOpenFilters: () => void;
  activeFilterCount: number;
  hasMembers: boolean;
}

export const MobileTeamSearchHeader = ({
  searchQuery,
  onSearchChange,
  onOpenFilters,
  activeFilterCount,
  hasMembers,
}: MobileTeamSearchHeaderProps) => {
  // Don't show search/filters if no members
  if (!hasMembers) {
    return null;
  }

  return (
    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b pb-3 -mx-4 px-4 pt-3" data-tour="mobile-team-filters">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search team..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-12 text-base bg-muted/50"
          />
        </div>
        
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "h-12 w-12 min-h-[48px] min-w-[48px] flex-shrink-0 relative",
            activeFilterCount > 0 && "border-primary text-primary"
          )}
          onClick={onOpenFilters}
          aria-label="Open filters"
        >
          <Filter className="h-5 w-5" />
          {activeFilterCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </div>
    </div>
  );
};
