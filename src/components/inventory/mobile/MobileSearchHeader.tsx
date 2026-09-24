import { useState, useRef, useEffect, useCallback } from "react";
import { Filter, MoreHorizontal, RefreshCw, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MobileSearchHeaderProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onFilterClick: () => void;
  onMoreClick: () => void;
  filterCount: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onScanClick?: () => void;
  hideFilterButton?: boolean;
}

export const MobileSearchHeader = ({
  onFilterClick,
  onMoreClick,
  filterCount,
  onRefresh,
  isRefreshing = false,
  onScanClick,
  hideFilterButton = false,
}: MobileSearchHeaderProps) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div 
      ref={headerRef}
      className={cn(
        "sticky top-0 z-40 bg-background transition-all duration-200 lg:hidden",
        isScrolled && "shadow-md border-b"
      )}
      data-tour="mobile-search"
    >
      <div className="p-4">
        {/* Action Row — filter (optional), scan, refresh, more */}
        <div className="flex gap-2">
          {!hideFilterButton && (
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
          )}

          {/* Scan Button */}
          {onScanClick && (
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-xl flex-shrink-0 border-primary/20 bg-primary/5 hover:bg-primary/10 active:scale-[0.96] transition-all duration-150"
              onClick={onScanClick}
              aria-label="Scan barcode"
            >
              <ScanLine className="h-5 w-5 text-primary" />
            </Button>
          )}
          
          {/* Refresh Button */}
          {onRefresh && (
            <Button 
              variant="outline" 
              size="icon" 
              className="h-12 w-12 rounded-xl flex-shrink-0"
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </Button>
          )}
          
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
