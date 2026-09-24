import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MobilePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

export const MobilePagination = ({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
}: MobilePaginationProps) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-background/95 backdrop-blur-sm">
      <Button
        variant="ghost"
        size="sm"
        className="h-9 gap-1 text-sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        <ChevronLeft className="h-4 w-4" />
        Prev
      </Button>

      <span className="text-xs text-muted-foreground">
        Page <span className="font-medium text-foreground">{currentPage}</span> of{" "}
        <span className="font-medium text-foreground">{totalPages}</span>
        <span className="hidden xs:inline"> · {totalItems} items</span>
      </span>

      <Button
        variant="ghost"
        size="sm"
        className="h-9 gap-1 text-sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};
