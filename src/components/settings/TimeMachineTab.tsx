import { useState, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Clock, Plus, RotateCcw, History, Shield, Info, Camera, Loader2,
  HardDrive, ArrowUpDown, ArrowUp, ArrowDown, Eye, Package, Archive,
  Users, CalendarDays, Layers, Award, MapPin, ChevronRight, X,
  AlertTriangle, CheckCircle,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";

interface Snapshot {
  id: string;
  name: string;
  created_at: string;
  snapshot_type: string;
  snapshot_size: number;
  snapshot_data: any;
  asset_count: number;
  container_count: number;
  employee_count: number;
  task_count: number;
  pallet_count: number;
  credential_count: number;
  storage_area_count: number;
}

interface CurrentCounts {
  assets: number;
  containers: number;
  employees: number;
  tasks: number;
  pallets: number;
  credentials: number;
  storage_areas: number;
}

type SortField = "date" | "size" | "objects";
type SortDir = "asc" | "desc";

const formatBytes = (bytes: number): string => {
  if (!bytes || bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const typeLabel: Record<string, string> = {
  manual: "Manual",
  scheduled: "Auto",
  pre_action: "Pre-action",
};

const typeBadgeVariant = (t: string): "default" | "outline" | "secondary" => {
  if (t === "scheduled") return "outline";
  if (t === "pre_action") return "secondary";
  return "default";
};

const totalObjects = (s: Snapshot) =>
  (s.asset_count || 0) + (s.container_count || 0) + (s.employee_count || 0) +
  (s.task_count || 0) + (s.pallet_count || 0) + (s.credential_count || 0) +
  (s.storage_area_count || 0);

const changesCount = (snap: Snapshot, current: CurrentCounts | null): number | null => {
  if (!current) return null;
  return Math.abs((snap.asset_count || 0) - current.assets)
    + Math.abs((snap.container_count || 0) - current.containers)
    + Math.abs((snap.employee_count || 0) - current.employees)
    + Math.abs((snap.task_count || 0) - current.tasks)
    + Math.abs((snap.pallet_count || 0) - current.pallets)
    + Math.abs((snap.credential_count || 0) - current.credentials)
    + Math.abs((snap.storage_area_count || 0) - current.storage_areas);
};

const DetailRow = ({ icon: Icon, label, snapCount, currentCount }: {
  icon: any; label: string; snapCount: number; currentCount: number | null;
}) => {
  const diff = currentCount !== null ? currentCount - snapCount : null;
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2.5">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium tabular-nums">{snapCount}</span>
        {diff !== null && diff !== 0 && (
          <Badge variant={diff > 0 ? "default" : "secondary"} className="text-[10px] h-4 px-1.5 tabular-nums">
            {diff > 0 ? `+${diff}` : diff}
          </Badge>
        )}
      </div>
    </div>
  );
};

type RestoreMode = "full" | "selective";
type RestoreCategory = "assets" | "containers" | "employees" | "tasks" | "pallets" | "credentials" | "storage_areas";

const RESTORE_CATEGORIES: { key: RestoreCategory; label: string; icon: any }[] = [
  { key: "assets", label: "Assets", icon: Package },
  { key: "containers", label: "Containers", icon: Archive },
  { key: "employees", label: "Team Members", icon: Users },
  { key: "tasks", label: "Calendar Events", icon: CalendarDays },
  { key: "pallets", label: "Pallet Layouts", icon: Layers },
  { key: "credentials", label: "Credentials", icon: Award },
  { key: "storage_areas", label: "Storage Areas", icon: MapPin },
];

export const TimeMachineTab = () => {
  const isMobile = useIsMobile();
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [currentCounts, setCurrentCounts] = useState<CurrentCounts | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showRestore, setShowRestore] = useState<Snapshot | null>(null);
  const [detailSnap, setDetailSnap] = useState<Snapshot | null>(null);
  const [snapshotName, setSnapshotName] = useState("");
  const [creating, setCreating] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [restoreMode, setRestoreMode] = useState<RestoreMode>("full");
  const [selectedCategories, setSelectedCategories] = useState<RestoreCategory[]>(["assets", "containers", "employees", "tasks", "pallets", "credentials", "storage_areas"]);
  const [restoring, setRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<any>(null);

  const loadSnapshots = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch snapshots and current counts in parallel
      const [snapRes, assetRes, containerRes, empRes, taskRes, palletRes, credRes, areaRes] = await Promise.all([
        (supabase as any)
          .from("workspace_snapshots")
          .select("id, name, created_at, snapshot_type, snapshot_size, snapshot_data, asset_count, container_count, employee_count, task_count, pallet_count, credential_count, storage_area_count")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase.from("cache_inventory").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("deleted_at", null).eq("asset_type", "item"),
        supabase.from("cache_inventory").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("deleted_at", null).eq("asset_type", "container"),
        supabase.from("employees").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("deleted_at", null),
        supabase.from("tasks").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("deleted_at", null),
        supabase.from("pallets").select("id", { count: "exact", head: true }).eq("created_by", user.id).is("deleted_at", null),
        supabase.from("certifications").select("id", { count: "exact", head: true }).eq("created_by", user.id).is("deleted_at", null),
        supabase.from("warehouse_sections").select("id", { count: "exact", head: true }).eq("created_by", user.id),
      ]);

      if (snapRes.error) throw snapRes.error;
      setSnapshots((snapRes.data as Snapshot[]) || []);
      setCurrentCounts({
        assets: assetRes.count || 0,
        containers: containerRes.count || 0,
        employees: empRes.count || 0,
        tasks: taskRes.count || 0,
        pallets: palletRes.count || 0,
        credentials: credRes.count || 0,
        storage_areas: areaRes.count || 0,
      });
    } catch (err: any) {
      console.error("Failed to load snapshots:", err);
      toast({ title: "Failed to load restore points", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  const handleViewRestorePoints = async () => {
    setShowPanel(true);
    await loadSnapshots();
  };

  const handleCreateSnapshot = async () => {
    if (!snapshotName.trim()) return;
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.rpc("create_workspace_snapshot" as any, {
        p_user_id: user.id,
        p_name: snapshotName.trim(),
        p_snapshot_type: "manual",
      });
      if (error) throw error;

      toast({ title: "Snapshot created", description: `"${snapshotName.trim()}" saved with full workspace data.` });
      setShowCreate(false);
      setSnapshotName("");
      await loadSnapshots();
    } catch (err: any) {
      toast({ title: "Failed to create snapshot", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async () => {
    if (!showRestore) return;
    setRestoring(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const categories = restoreMode === "selective" ? selectedCategories : ["assets", "containers", "employees", "tasks", "pallets", "credentials", "storage_areas"];
      if (restoreMode === "selective" && categories.length === 0) {
        toast({ title: "No categories selected", description: "Select at least one category to restore.", variant: "destructive" });
        setRestoring(false);
        return;
      }

      const { data, error } = await supabase.rpc("restore_workspace_snapshot" as any, {
        p_user_id: user.id,
        p_snapshot_id: showRestore.id,
        p_restore_mode: restoreMode,
        p_categories: categories,
      });

      if (error) throw error;

      setRestoreResult(data);
      toast({
        title: "Workspace restored",
        description: `Successfully restored from "${showRestore.name}". A pre-restore backup was automatically saved.`,
      });
      setShowRestore(null);
      setRestoreMode("full");
      await loadSnapshots();
    } catch (err: any) {
      toast({ title: "Restore failed", description: err.message, variant: "destructive" });
    } finally {
      setRestoring(false);
    }
  };

  const openRestoreDialog = (snap: Snapshot) => {
    setShowRestore(snap);
    setRestoreMode("full");
    setSelectedCategories(["assets", "containers", "employees", "tasks", "pallets", "credentials", "storage_areas"]);
    setRestoreResult(null);
  };

  const toggleCategory = (cat: RestoreCategory) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === "desc" ? "asc" : "desc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const sortedSnapshots = useMemo(() => {
    const list = [...snapshots];
    const dir = sortDir === "desc" ? -1 : 1;
    list.sort((a, b) => {
      switch (sortField) {
        case "date":
          return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        case "size":
          return dir * ((a.snapshot_size || 0) - (b.snapshot_size || 0));
        case "objects":
          return dir * (totalObjects(a) - totalObjects(b));
        default:
          return 0;
      }
    });
    return list;
  }, [snapshots, sortField, sortDir]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />;
  };

  return (
    <div className="space-y-4">
      {/* Hero Card */}
      <Card className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-foreground">Workspace Time Machine</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Restore your workspace to a previous state if data is accidentally deleted or modified.
              Automatic snapshots are created every 12 hours.
            </p>
          </div>
          <Badge variant="secondary" className="flex-shrink-0 gap-1 hidden sm:flex">
            <Shield className="h-3 w-3" />
            Admin Only
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" onClick={handleViewRestorePoints}>
            <History className="h-4 w-4" />
            View Restore Points
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            Create Snapshot
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            disabled={snapshots.length === 0 && !showPanel}
            onClick={async () => {
              if (!showPanel) await handleViewRestorePoints();
              if (snapshots.length > 0) openRestoreDialog(snapshots[0]);
              else toast({ title: "No restore points", description: "Create a snapshot first." });
            }}
          >
            <RotateCcw className="h-4 w-4" />
            Restore Workspace
          </Button>
        </div>
      </Card>

      {/* Info Box */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border/50">
        <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Snapshots capture Assets, Containers, Storage Areas, Team Members, Credentials, Calendar Tasks, and Pallet Layouts.</p>
          <p><strong>Auto:</strong> Every 12 hours. <strong>Pre-action:</strong> Before bulk deletions. <strong>Manual:</strong> On demand. Up to 20 retained.</p>
        </div>
      </div>

      {/* ── Restore Point Viewer ── */}
      {showPanel && (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between p-4 pb-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              Restore Points
              {snapshots.length > 0 && (
                <Badge variant="secondary" className="text-xs">{snapshots.length}</Badge>
              )}
            </h4>
            <Button variant="ghost" size="sm" onClick={loadSnapshots} disabled={loading} className="gap-1 h-7 text-xs">
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
              Refresh
            </Button>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading restore points…</p>
          ) : snapshots.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <Clock className="h-8 w-8 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground">No restore points yet</p>
              <p className="text-xs text-muted-foreground">Create a snapshot to start tracking workspace state.</p>
            </div>
          ) : isMobile ? (
            /* ── Mobile: Card list ── */
            <div className="px-4 pb-4 space-y-2">
              {sortedSnapshots.map((snap) => {
                const changes = changesCount(snap, currentCounts);
                return (
                  <button
                    key={snap.id}
                    onClick={() => setDetailSnap(snap)}
                    className="w-full text-left p-3 rounded-lg border border-border/50 hover:border-border transition-colors active:scale-[0.99]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground truncate">{snap.name}</span>
                      <Badge variant={typeBadgeVariant(snap.snapshot_type)} className="text-[10px] px-1.5 py-0 h-4 flex-shrink-0">
                        {typeLabel[snap.snapshot_type] || snap.snapshot_type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{format(new Date(snap.created_at), "MMM d, h:mm a")}</span>
                      <span className="flex items-center gap-0.5"><HardDrive className="h-3 w-3" />{formatBytes(snap.snapshot_size)}</span>
                      <span>{totalObjects(snap)} objects</span>
                    </div>
                    {changes !== null && changes > 0 && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5 mt-1.5">{changes} changes since</Badge>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            /* ── Desktop: Sortable table ── */
            <div className="px-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <button onClick={() => toggleSort("date")} className="flex items-center gap-1 hover:text-foreground transition-colors">
                        Snapshot Date <SortIcon field="date" />
                      </button>
                    </TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>
                      <button onClick={() => toggleSort("size")} className="flex items-center gap-1 hover:text-foreground transition-colors">
                        Size <SortIcon field="size" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button onClick={() => toggleSort("objects")} className="flex items-center gap-1 hover:text-foreground transition-colors">
                        Objects <SortIcon field="objects" />
                      </button>
                    </TableHead>
                    <TableHead>Changes Since</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedSnapshots.map((snap) => {
                    const changes = changesCount(snap, currentCounts);
                    return (
                      <TableRow key={snap.id} className="group">
                        <TableCell>
                          <div>
                            <span className="text-sm font-medium text-foreground">{snap.name}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(snap.created_at), "MMM d, yyyy 'at' h:mm a")}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ({formatDistanceToNow(new Date(snap.created_at), { addSuffix: true })})
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={typeBadgeVariant(snap.snapshot_type)} className="text-[10px] px-1.5 py-0 h-4">
                            {typeLabel[snap.snapshot_type] || snap.snapshot_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm tabular-nums flex items-center gap-1">
                            <HardDrive className="h-3 w-3 text-muted-foreground" />
                            {formatBytes(snap.snapshot_size)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium tabular-nums">{totalObjects(snap)}</span>
                        </TableCell>
                        <TableCell>
                          {changes === null ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : changes === 0 ? (
                            <span className="text-xs text-muted-foreground">No changes</span>
                          ) : (
                            <Badge variant="outline" className="text-xs tabular-nums">
                              {changes} {changes === 1 ? "change" : "changes"}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs" onClick={() => setDetailSnap(snap)}>
                              <Eye className="h-3 w-3" /> Inspect
                            </Button>
                            <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs" onClick={() => openRestoreDialog(snap)}>
                              <RotateCcw className="h-3 w-3" /> Restore
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      )}

      {/* ── Snapshot Detail Dialog ── */}
      <Dialog open={!!detailSnap} onOpenChange={(open) => !open && setDetailSnap(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Eye className="h-4 w-4" />
              Snapshot Details
            </DialogTitle>
            <DialogDescription>
              {detailSnap?.name}
              {detailSnap && (
                <span className="block mt-0.5 text-xs">
                  {format(new Date(detailSnap.created_at), "MMMM d, yyyy 'at' h:mm a")} · {formatBytes(detailSnap.snapshot_size)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {detailSnap && (
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-1 py-2">
                {/* Entity breakdown */}
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Stored Objects</h4>
                <DetailRow icon={Package} label="Assets" snapCount={detailSnap.asset_count || 0} currentCount={currentCounts?.assets ?? null} />
                <Separator />
                <DetailRow icon={Archive} label="Containers" snapCount={detailSnap.container_count || 0} currentCount={currentCounts?.containers ?? null} />
                <Separator />
                <DetailRow icon={Users} label="Team Members" snapCount={detailSnap.employee_count || 0} currentCount={currentCounts?.employees ?? null} />
                <Separator />
                <DetailRow icon={CalendarDays} label="Calendar Tasks" snapCount={detailSnap.task_count || 0} currentCount={currentCounts?.tasks ?? null} />
                <Separator />
                <DetailRow icon={Layers} label="Pallet Layouts" snapCount={detailSnap.pallet_count || 0} currentCount={currentCounts?.pallets ?? null} />
                <Separator />
                <DetailRow icon={Award} label="Credentials" snapCount={detailSnap.credential_count || 0} currentCount={currentCounts?.credentials ?? null} />
                <Separator />
                <DetailRow icon={MapPin} label="Storage Areas" snapCount={detailSnap.storage_area_count || 0} currentCount={currentCounts?.storage_areas ?? null} />

                {/* Summary */}
                <div className="pt-3 mt-3 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Total Objects</span>
                    <span className="text-sm font-bold tabular-nums">{totalObjects(detailSnap)}</span>
                  </div>
                  {currentCounts && (() => {
                    const changes = changesCount(detailSnap, currentCounts);
                    if (changes === null) return null;
                    return (
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-muted-foreground">Changes since snapshot</span>
                        <Badge variant={changes === 0 ? "secondary" : "outline"} className="text-xs tabular-nums">
                          {changes === 0 ? "None" : `${changes} record${changes !== 1 ? "s" : ""} differ`}
                        </Badge>
                      </div>
                    );
                  })()}
                </div>

                {/* Metadata */}
                <div className="pt-3 mt-3 border-t border-border space-y-1.5">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Metadata</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Type</span>
                      <p className="font-medium">{typeLabel[detailSnap.snapshot_type] || detailSnap.snapshot_type}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Size</span>
                      <p className="font-medium">{formatBytes(detailSnap.snapshot_size)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Created</span>
                      <p className="font-medium">{formatDistanceToNow(new Date(detailSnap.created_at), { addSuffix: true })}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Snapshot ID</span>
                      <p className="font-medium font-mono text-[10px]">{detailSnap.id.slice(0, 8)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDetailSnap(null)}>Close</Button>
            <Button
              variant="default"
              className="gap-2"
              onClick={() => {
                openRestoreDialog(detailSnap!);
                setDetailSnap(null);
              }}
            >
              <RotateCcw className="h-4 w-4" />
              Restore This Snapshot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create Snapshot Dialog ── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Create Snapshot
            </DialogTitle>
            <DialogDescription>
              Save the current state of your entire workspace — assets, containers, team members, tasks, pallets, credentials, and storage areas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="snapshot-name">Snapshot Name</Label>
              <Input
                id="snapshot-name"
                placeholder="e.g. Before quarterly cleanup"
                value={snapshotName}
                onChange={(e) => setSnapshotName(e.target.value)}
                maxLength={100}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreateSnapshot} disabled={!snapshotName.trim() || creating} className="gap-2">
              {creating ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</> : "Create Snapshot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Restore Confirmation Dialog ── */}
      <Dialog open={!!showRestore} onOpenChange={(open) => { if (!open && !restoring) { setShowRestore(null); setRestoreMode("full"); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Restore Workspace
            </DialogTitle>
            <DialogDescription>
              You are about to restore your workspace to a previous state.
              All current changes after that snapshot will be replaced.
            </DialogDescription>
          </DialogHeader>

          {showRestore && (
            <div className="space-y-4">
              {/* Snapshot info */}
              <div className="p-3 rounded-lg bg-muted/50 border border-border/50 text-sm space-y-1">
                <p className="font-medium text-foreground">{showRestore.name}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(showRestore.created_at), "MMMM d, yyyy 'at' h:mm a")} · {formatBytes(showRestore.snapshot_size)}
                </p>
              </div>

              {/* Mode selection */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Restore Mode</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setRestoreMode("full")}
                    disabled={restoring}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      restoreMode === "full"
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border hover:border-border/80"
                    }`}
                  >
                    <span className="text-sm font-medium text-foreground">Full Restore</span>
                    <p className="text-xs text-muted-foreground mt-0.5">Replace all workspace data</p>
                  </button>
                  <button
                    onClick={() => setRestoreMode("selective")}
                    disabled={restoring}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      restoreMode === "selective"
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border hover:border-border/80"
                    }`}
                  >
                    <span className="text-sm font-medium text-foreground">Selective Restore</span>
                    <p className="text-xs text-muted-foreground mt-0.5">Choose specific categories</p>
                  </button>
                </div>
              </div>

              {/* Category selection (selective mode) */}
              {restoreMode === "selective" && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Select categories to restore:</Label>
                  <div className="space-y-1.5">
                    {RESTORE_CATEGORIES.map(({ key, label, icon: CatIcon }) => {
                      const countMap: Record<RestoreCategory, number> = {
                        assets: showRestore.asset_count,
                        containers: showRestore.container_count,
                        employees: showRestore.employee_count,
                        tasks: showRestore.task_count,
                        pallets: showRestore.pallet_count,
                        credentials: showRestore.credential_count,
                        storage_areas: showRestore.storage_area_count,
                      };
                      const count = countMap[key];
                      return (
                        <label
                          key={key}
                          className="flex items-center gap-3 p-2.5 rounded-lg border border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
                        >
                          <Checkbox
                            checked={selectedCategories.includes(key)}
                            onCheckedChange={() => toggleCategory(key)}
                            disabled={restoring}
                          />
                          <CatIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm flex-1">{label}</span>
                          <Badge variant="secondary" className="text-[10px] tabular-nums">{count || 0}</Badge>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Warning */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">This action cannot be easily undone.</p>
                  <p className="text-xs mt-0.5 opacity-80">
                    A pre-restore backup will be automatically created, but current data in the selected categories will be replaced.
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowRestore(null)} disabled={restoring}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleRestore}
              disabled={restoring || (restoreMode === "selective" && selectedCategories.length === 0)}
              className="gap-2"
            >
              {restoring ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Restoring…</>
              ) : (
                <><RotateCcw className="h-4 w-4" /> {restoreMode === "full" ? "Full Restore" : `Restore ${selectedCategories.length} Categories`}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Restore Result Dialog ── */}
      <Dialog open={!!restoreResult} onOpenChange={(open) => !open && setRestoreResult(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <CheckCircle className="h-5 w-5 text-primary" />
              Restore Complete
            </DialogTitle>
            <DialogDescription>Your workspace has been restored successfully.</DialogDescription>
          </DialogHeader>
          {restoreResult?.restored && (
            <div className="space-y-1.5 py-2">
              {[
                { key: "containers", label: "Containers", icon: Archive },
                { key: "assets", label: "Assets", icon: Package },
                { key: "employees", label: "Team Members", icon: Users },
                { key: "tasks", label: "Calendar Events", icon: CalendarDays },
                { key: "pallets", label: "Pallet Layouts", icon: Layers },
                { key: "credentials", label: "Credentials", icon: Award },
                { key: "storage_areas", label: "Storage Areas", icon: MapPin },
              ].filter(({ key }) => restoreResult.restored[key] > 0).map(({ key, label, icon: Icon }) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2"><Icon className="h-4 w-4 text-muted-foreground" /> {label}</span>
                  <span className="font-medium tabular-nums">{restoreResult.restored[key]} restored</span>
                </div>
              ))}
              <Separator className="my-2" />
              <p className="text-xs text-muted-foreground">
                A pre-restore backup was saved automatically. You can find it in your restore points.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setRestoreResult(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
