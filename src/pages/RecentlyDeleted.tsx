import { useState } from "react";
import { Trash2, RotateCcw, Clock, Package, Archive, Users, AlertTriangle, Search, CalendarDays, Layers, Award, User } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useRecentlyDeleted, DeletedItem, DeletedItemType } from "@/hooks/use-recently-deleted";
import { formatDistanceToNow, format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const typeConfig: Record<DeletedItemType, { icon: any; label: string; color: string }> = {
  asset: { icon: Package, label: "Asset", color: "bg-primary/10 text-primary" },
  container: { icon: Archive, label: "Container", color: "bg-accent/50 text-accent-foreground" },
  team_member: { icon: Users, label: "Team Member", color: "bg-secondary text-secondary-foreground" },
  task: { icon: CalendarDays, label: "Calendar Task", color: "bg-chart-4/15 text-chart-4" },
  pallet: { icon: Layers, label: "Pallet Layout", color: "bg-chart-2/15 text-chart-2" },
  credential: { icon: Award, label: "Credential", color: "bg-chart-5/15 text-chart-5" },
};

const RecentlyDeleted = () => {
  const { items, isLoading, restoreItem, permanentlyDelete, clearAll } = useRecentlyDeleted();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deleteDialogItem, setDeleteDialogItem] = useState<DeletedItem | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [showClearAllDialog, setShowClearAllDialog] = useState(false);
  const [clearing, setClearing] = useState(false);

  const filteredItems = items.filter((item) => {
    const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || item.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleRestore = async (item: DeletedItem) => {
    setRestoringId(item.id);
    await restoreItem(item);
    setRestoringId(null);
  };

  const countByType = (type: DeletedItemType) => items.filter(i => i.type === type).length;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Trash2 className="h-6 w-6 text-muted-foreground" />
                Recently Deleted
              </h1>
              <p className="text-muted-foreground mt-1">
                Items are kept for 30 days before permanent deletion. Restore them anytime within this window.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {items.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowClearAllDialog(true)}
                  className="gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear All
                </Button>
              )}
              {items.length > 0 && (
                <div className="flex gap-1 border border-border rounded-lg p-0.5">
                  <Button
                    variant={viewMode === "cards" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("cards")}
                    className="h-7 px-2 text-xs"
                  >
                    Cards
                  </Button>
                  <Button
                    variant={viewMode === "table" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("table")}
                    className="h-7 px-2 text-xs"
                  >
                    Table
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Summary badges */}
          {items.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={typeFilter === "all" ? "default" : "outline"}
                className="gap-1 cursor-pointer"
                onClick={() => setTypeFilter("all")}
              >
                All ({items.length})
              </Badge>
              {(Object.entries(typeConfig) as [DeletedItemType, typeof typeConfig["asset"]][]).map(([type, config]) => {
                const count = countByType(type);
                if (count === 0) return null;
                const Icon = config.icon;
                return (
                  <Badge
                    key={type}
                    variant={typeFilter === type ? "default" : "outline"}
                    className="gap-1 cursor-pointer"
                    onClick={() => setTypeFilter(typeFilter === type ? "all" : type)}
                  >
                    <Icon className="h-3 w-3" /> {count} {config.label}{count !== 1 ? "s" : ""}
                  </Badge>
                );
              })}
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search deleted items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="asset">Assets</SelectItem>
                <SelectItem value="container">Containers</SelectItem>
                <SelectItem value="team_member">Team Members</SelectItem>
                <SelectItem value="task">Calendar Tasks</SelectItem>
                <SelectItem value="pallet">Pallet Layouts</SelectItem>
                <SelectItem value="credential">Credentials</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : filteredItems.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Trash2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-1">
                  {items.length === 0 ? "Nothing in the trash" : "No matching items"}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {items.length === 0
                    ? "Deleted items will appear here for 30 days before permanent removal."
                    : "Try adjusting your search or filter."}
                </p>
              </CardContent>
            </Card>
          ) : viewMode === "table" ? (
            /* Table View */
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Deleted By</TableHead>
                      <TableHead>Deleted Date</TableHead>
                      <TableHead>Retention</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => {
                      const config = typeConfig[item.type];
                      const Icon = config.icon;
                      const isRestoring = restoringId === item.id;
                      const isUrgent = item.days_remaining <= 3;

                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={`h-7 w-7 rounded flex items-center justify-center flex-shrink-0 ${config.color}`}>
                                <Icon className="h-3.5 w-3.5" />
                              </div>
                              <div className="min-w-0">
                                <span className="font-medium text-foreground truncate block">{item.name}</span>
                                {item.description && (
                                  <span className="text-xs text-muted-foreground truncate block">{item.description}</span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {config.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {item.deleted_by_email ? (
                              <Tooltip>
                                <TooltipTrigger className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <User className="h-3 w-3" />
                                  {item.deleted_by_email.split("@")[0]}
                                </TooltipTrigger>
                                <TooltipContent>{item.deleted_by_email}</TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(item.deleted_at), "MMM d, yyyy")}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`text-xs font-medium ${isUrgent ? "text-destructive" : "text-muted-foreground"}`}>
                              {item.days_remaining}d left
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRestore(item)}
                                disabled={isRestoring}
                                className="gap-1 h-7 text-xs"
                              >
                                <RotateCcw className="h-3 w-3" />
                                {isRestoring ? "..." : "Restore"}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteDialogItem(item)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          ) : (
            /* Card View */
            <div className="space-y-2">
              {filteredItems.map((item) => {
                const config = typeConfig[item.type];
                const Icon = config.icon;
                const isRestoring = restoringId === item.id;
                const isUrgent = item.days_remaining <= 3;

                return (
                  <Card key={item.id} className="group hover:shadow-sm transition-shadow">
                    <CardContent className="flex items-center gap-4 py-4">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${config.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground truncate">{item.name}</span>
                          <Badge variant="secondary" className="text-xs flex-shrink-0">
                            {config.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          {item.description && (
                            <span className="text-sm text-muted-foreground truncate">{item.description}</span>
                          )}
                          <span className="text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(item.deleted_at), { addSuffix: true })}
                          </span>
                          {item.deleted_by_email && (
                            <Tooltip>
                              <TooltipTrigger className="text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0">
                                <User className="h-3 w-3" />
                                {item.deleted_by_email.split("@")[0]}
                              </TooltipTrigger>
                              <TooltipContent>{item.deleted_by_email}</TooltipContent>
                            </Tooltip>
                          )}
                          {isUrgent && (
                            <span className="text-xs text-destructive flex items-center gap-1 flex-shrink-0">
                              <AlertTriangle className="h-3 w-3" />
                              {item.days_remaining}d left
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestore(item)}
                          disabled={isRestoring}
                          className="gap-1"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          {isRestoring ? "Restoring..." : "Restore"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteDialogItem(item)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Permanent delete confirmation */}
      <ConfirmationDialog
        open={!!deleteDialogItem}
        onOpenChange={(open) => !open && setDeleteDialogItem(null)}
        title="Permanently delete?"
        description={`"${deleteDialogItem?.name}" will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete Forever"
        variant="destructive"
        onConfirm={async () => {
          if (deleteDialogItem) {
            await permanentlyDelete(deleteDialogItem);
            setDeleteDialogItem(null);
          }
        }}
        showWarning
        warningText="This action is irreversible. The item and all related data will be permanently erased."
      />

      {/* Clear all confirmation */}
      <ConfirmationDialog
        open={showClearAllDialog}
        onOpenChange={setShowClearAllDialog}
        title="Clear all deleted items?"
        description={`This will permanently remove ${items.length} item${items.length !== 1 ? "s" : ""} from the trash. This cannot be undone.`}
        confirmLabel={clearing ? "Clearing..." : "Clear All"}
        variant="destructive"
        onConfirm={async () => {
          setClearing(true);
          await clearAll();
          setClearing(false);
          setShowClearAllDialog(false);
        }}
        showWarning
        warningText="All deleted items will be permanently erased and cannot be recovered."
      />
    </div>
  );
};

export default RecentlyDeleted;
