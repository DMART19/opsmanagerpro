import { useState, useRef, useEffect } from "react";
import { Search, Filter, MoreHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MobileContainerSearchHeaderProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onFilterClick: () => void;
  onMoreClick: () => void;
  filterCount: number;
}

export const MobileContainerSearchHeader = ({
  searchValue,
  onSearchChange,
  onFilterClick,
  onMoreClick,
  filterCount,
}: MobileContainerSearchHeaderProps) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div 
      className={cn(
        "sticky top-0 z-40 bg-background transition-all duration-200 lg:hidden",
        isScrolled && "shadow-md border-b"
      )}
    >
      <div className="p-4 space-y-3">
        {/* Title */}
        <div>
          <h1 className="text-xl font-bold">Containers</h1>
          <p className="text-sm text-muted-foreground">Manage boxes and storage</p>
        </div>

        {/* Search Row */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search containers..."
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 pr-10 h-12 text-base rounded-xl bg-muted/50 border-0 focus-visible:ring-2"
            />
            {searchValue && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => onSearchChange('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Action Row */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onFilterClick}
            className="flex-1 h-12 min-h-[48px] rounded-xl justify-center gap-2 text-base"
          >
            <Filter className="h-4 w-4" />
            Filters
            {filterCount > 0 && (
              <Badge variant="secondary" className="h-5 min-w-5 px-1.5">
                {filterCount}
              </Badge>
            )}
          </Button>
          
          <Button
            variant="outline"
            onClick={onMoreClick}
            className="h-12 min-h-[48px] min-w-[48px] px-4 rounded-xl"
            aria-label="More options"
          >
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
