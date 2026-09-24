import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, ExternalLink, RotateCcw, Clock } from "lucide-react";
import { useRecentlyDeleted } from "@/hooks/use-recently-deleted";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

export const RecentlyDeletedSettingsTab = () => {
  const { items, isLoading, clearAll } = useRecentlyDeleted();
  const navigate = useNavigate();
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [clearing, setClearing] = useState(false);

  const typeLabels: Record<string, string> = {
    asset: "Assets",
    container: "Containers",
    team_member: "Team Members",
    task: "Tasks",
    pallet: "Pallets",
    credential: "Credentials",
  };

  const typeCounts = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {});

  const handleClearAll = async () => {
    setClearing(true);
    await clearAll();
    setClearing(false);
    setShowClearDialog(false);
  };

  return (
    <div className="space-y-4">
      <Card className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
            <Trash2 className="h-5 w-5 text-destructive" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-foreground">Recently Deleted</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              View and restore items deleted within the last 30 days.
            </p>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : items.length === 0 ? (
          <div className="text-center py-4 space-y-1">
            <Trash2 className="h-8 w-8 text-muted-foreground/20 mx-auto" />
            <p className="text-sm text-muted-foreground">No deleted items</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Summary */}
            <div className="flex flex-wrap gap-2">
              {Object.entries(typeCounts).map(([type, count]) => (
                <Badge key={type} variant="outline" className="gap-1">
                  {count} {typeLabels[type] || type}
                </Badge>
              ))}
            </div>

            {/* Recent 3 items */}
            <div className="space-y-1.5">
              {items.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/30">
                  <RotateCcw className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-foreground truncate flex-1">{item.name}</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(item.deleted_at), { addSuffix: true })}
                  </span>
                </div>
              ))}
              {items.length > 3 && (
                <p className="text-xs text-muted-foreground pl-2">
                  +{items.length - 3} more items
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2 flex-1 sm:flex-none"
            onClick={() => navigate("/recently-deleted")}
          >
            <ExternalLink className="h-4 w-4" />
            Open Recently Deleted
          </Button>
          {items.length > 0 && (
            <Button
              variant="destructive"
              className="gap-2 flex-1 sm:flex-none"
              onClick={() => setShowClearDialog(true)}
            >
              <Trash2 className="h-4 w-4" />
              Clear All ({items.length})
            </Button>
          )}
        </div>
      </Card>

      <ConfirmationDialog
        open={showClearDialog}
        onOpenChange={setShowClearDialog}
        title="Clear all deleted items?"
        description={`This will permanently remove ${items.length} item${items.length !== 1 ? "s" : ""} from the trash. This cannot be undone.`}
        confirmLabel={clearing ? "Clearing..." : "Clear All"}
        variant="destructive"
        onConfirm={handleClearAll}
        showWarning
        warningText="All deleted items will be permanently erased and cannot be recovered."
      />
    </div>
  );
};
