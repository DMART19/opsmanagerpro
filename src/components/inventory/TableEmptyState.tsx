import { Package, SearchX, Archive, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TableEmptyStateProps {
  hasFilters: boolean;
  onClearFilters: () => void;
  onAddItem: () => void;
  onAddContainer?: () => void;
  searchQuery?: string;
  /** Total number of items before any filters are applied */
  totalItemCount?: number;
}

export const TableEmptyState = ({
  hasFilters,
  onClearFilters,
  onAddItem,
  onAddContainer,
  searchQuery,
  totalItemCount = 0,
}: TableEmptyStateProps) => {
  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="p-4 rounded-full bg-muted/60 mb-4">
          <SearchX className="h-8 w-8 text-muted-foreground/60" />
        </div>
        <h3 className="text-lg font-bold mb-2 text-foreground/85">No assets match your filters</h3>
        <p className="text-sm text-muted-foreground text-center max-w-sm mb-1">
          {searchQuery ? (
            <>
              No results for "<span className="font-medium">{searchQuery}</span>" in this category.
            </>
          ) : (
            "No assets match the current filter combination."
          )}
        </p>
        {totalItemCount > 0 && (
          <p className="text-sm text-muted-foreground mb-4">
            <span className="font-medium text-foreground/70">{totalItemCount}</span> asset{totalItemCount !== 1 ? 's' : ''} available outside current filters.
          </p>
        )}
        {totalItemCount === 0 && <div className="mb-4" />}
        <Button variant="outline" onClick={onClearFilters}>
          {searchQuery ? "Search All Categories" : "Clear All Filters"}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      {/* Minimal illustration */}
      <div className="relative mb-8">
        {/* Background decorative circles */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-32 h-32 rounded-full bg-primary/[0.04]" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-24 h-24 rounded-full bg-primary/[0.07]" />
        </div>
        {/* Stacked box illustration */}
        <div className="relative flex items-end justify-center gap-2 pt-4">
          <div className="w-12 h-14 rounded-lg bg-muted border border-border/60 flex items-center justify-center -rotate-6 translate-y-1">
            <Package className="h-5 w-5 text-muted-foreground/40" />
          </div>
          <div className="w-14 h-16 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center z-10 shadow-sm">
            <Package className="h-6 w-6 text-primary/60" />
          </div>
          <div className="w-12 h-14 rounded-lg bg-muted border border-border/60 flex items-center justify-center rotate-6 translate-y-1">
            <Archive className="h-5 w-5 text-muted-foreground/40" />
          </div>
        </div>
      </div>

      <h3 className="text-xl font-semibold text-foreground mb-2">
        No assets yet
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-8 leading-relaxed">
        Add your first item to start tracking inventory.
      </p>

      <div className="flex items-center gap-3">
        <Button onClick={onAddItem} size="lg" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Item
        </Button>
        {onAddContainer && (
          <Button variant="outline" onClick={onAddContainer} size="lg" className="gap-2">
            <Archive className="h-4 w-4" />
            Add Container
          </Button>
        )}
      </div>
    </div>
  );
};
