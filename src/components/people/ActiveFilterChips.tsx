import { X, Bookmark } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTeamFilter, TeamFilterType, FocusModeType } from "@/contexts/TeamFilterContext";

const filterLabels: Record<Exclude<TeamFilterType, null>, string> = {
  all: "All Members",
  compliant: "Credentials Up to Date",
  "expiring-soon": "Expiring Soon",
  incomplete: "Incomplete",
};

const focusModeLabels: Record<FocusModeType, string> = {
  all: "All Members",
  "needs-attention": "Needs Attention",
};

export const ActiveFilterChips = () => {
  const {
    activeFilter,
    setActiveFilter,
    clearFilter,
    focusMode,
    setFocusMode,
    savedViews,
    activeSavedView,
    setActiveSavedView,
  } = useTeamFilter();

  const hasActiveFilters = activeFilter && activeFilter !== "all";
  const hasNeedsAttentionMode = focusMode === "needs-attention";

  const handleSavedViewClick = (view: typeof savedViews[0]) => {
    setActiveSavedView(view.id);
    setActiveFilter(view.filter);
    setFocusMode(view.focusMode);
  };

  if (!hasActiveFilters && !hasNeedsAttentionMode && !activeSavedView) {
    return (
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground hover:text-foreground">
              <Bookmark className="h-3.5 w-3.5" />
              Saved Views
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>Quick Views</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {savedViews.map((view) => (
              <DropdownMenuItem
                key={view.id}
                onClick={() => handleSavedViewClick(view)}
              >
                {view.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap animate-in fade-in-50 duration-200">
      <span className="text-sm text-muted-foreground">Showing:</span>
      
      {activeSavedView && (
        <Badge 
          variant="secondary" 
          className="gap-1.5 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors"
        >
          <Bookmark className="h-3 w-3" />
          {savedViews.find(v => v.id === activeSavedView)?.name}
          <X
            className="h-3 w-3 cursor-pointer hover:text-destructive ml-1"
            onClick={() => {
              clearFilter();
            }}
          />
        </Badge>
      )}
      
      {!activeSavedView && hasActiveFilters && (
        <Badge 
          variant="secondary" 
          className="gap-1.5 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors"
        >
          {filterLabels[activeFilter!]}
          <X
            className="h-3 w-3 cursor-pointer hover:text-destructive ml-1"
            onClick={() => setActiveFilter(null)}
          />
        </Badge>
      )}
      
      {!activeSavedView && hasNeedsAttentionMode && (
        <Badge 
          variant="secondary" 
          className="gap-1.5 bg-warning/10 text-warning border-warning/20 hover:bg-warning/20 transition-colors"
        >
          {focusModeLabels[focusMode]}
          <X
            className="h-3 w-3 cursor-pointer hover:text-destructive ml-1"
            onClick={() => setFocusMode("all")}
          />
        </Badge>
      )}
      
      {(hasActiveFilters || hasNeedsAttentionMode || activeSavedView) && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={clearFilter}
        >
          Clear all
        </Button>
      )}
      
      <div className="flex-1" />
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground">
            <Bookmark className="h-3 w-3" />
            Views
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Quick Views</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {savedViews.map((view) => (
            <DropdownMenuItem
              key={view.id}
              onClick={() => handleSavedViewClick(view)}
              className={activeSavedView === view.id ? "bg-accent" : ""}
            >
              {view.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
