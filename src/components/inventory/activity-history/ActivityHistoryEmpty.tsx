import { History, Filter } from "lucide-react";

interface ActivityHistoryEmptyProps {
  hasFilters: boolean;
}

export const ActivityHistoryEmpty = ({ hasFilters }: ActivityHistoryEmptyProps) => {
  if (hasFilters) {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
          <Filter className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">No matches found</p>
        <p className="text-xs text-muted-foreground mt-1">
          No activity matches the selected filters.
        </p>
      </div>
    );
  }

  return (
    <div className="text-center py-8">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
        <History className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">No activity yet</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-[200px] mx-auto">
        Checkouts and returns will appear here automatically.
      </p>
    </div>
  );
};
