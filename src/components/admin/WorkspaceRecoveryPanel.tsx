import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  RotateCcw, Search, RefreshCw, Loader2, HardDrive, Eye,
  Package, Archive, Users, CalendarDays, Camera, AlertTriangle,
  CheckCircle, Shield, FileText, Clock,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface SnapshotRow {
  id: string;
  user_id: string;
  workspace_name: string;
  user_email: string;
  name: string;
  created_at: string;
  snapshot_type: string;
  snapshot_size: number;
  asset_count: number;
  container_count: number;
  employee_count: number;
  task_count: number;
  pallet_count: number;
  credential_count: number;
  storage_area_count: number;
}

interface AuditLogEntry {
  id: string;
  workspace_id: string;
  user_id: string;
  action_type: string;
  snapshot_id: string | null;
  snapshot_name: string | null;
  snapshot_timestamp: string | null;
  restore_timestamp: string | null;
  restore_mode: string | null;
  restored_categories: string[] | null;
  restored_counts: any;
  performed_by: string | null;
  performed_by_role: string | null;
  details: any;
  created_at: string;
}

type RestoreMode = "full" | "selective";
type RestoreCategory = "assets" | "containers" | "employees" | "tasks";

const CATEGORIES: { key: RestoreCategory; label: string; icon: any }[] = [
  { key: "assets", label: "Assets", icon: Package },
  { key: "containers", label: "Containers", icon: Archive },
  { key: "employees", label: "Team Members", icon: Users },
  { key: "tasks", label: "Calendar Events", icon: CalendarDays },
];

const formatBytes = (bytes: number): string => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const typeLabel: Record<string, string> = {
  manual: "Manual",
  scheduled: "Auto",
  pre_action: "Pre-action",
};

const totalObjects = (s: SnapshotRow) =>
  (s.asset_count || 0) + (s.container_count || 0) + (s.employee_count || 0) +
  (s.task_count || 0) + (s.pallet_count || 0) + (s.credential_count || 0) +
  (s.storage_area_count || 0);

export const WorkspaceRecoveryPanel = () => {
  const [snapshots, setSnapshots] = useState<SnapshotRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [wsFilter, setWsFilter] = useState("all");

  // Restore state
  const [restoreSnap, setRestoreSnap] = useState<SnapshotRow | null>(null);
  const [restoreMode, setRestoreMode] = useState<RestoreMode>("full");
  const [selectedCats, setSelectedCats] = useState<RestoreCategory[]>(["assets", "containers", "employees", "tasks"]);
  const [restoring, setRestoring] = useState(false);

  // Create snapshot state
  const [createForUser, setCreateForUser] = useState<{ userId: string; wsName: string; email: string } | null>(null);
  const [createName, setCreateName] = useState("");
  const [creating, setCreating] = useState(false);

  // Detail state
  const [detailSnap, setDetailSnap] = useState<SnapshotRow | null>(null);

  // Audit log state
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("snapshots");

  const loadSnapshots = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.rpc("admin_list_workspace_snapshots" as any, {
        p_admin_id: user.id,
      });
      if (error) throw error;
      setSnapshots((data as SnapshotRow[]) || []);
      setLoaded(true);
    } catch (err: any) {
      toast.error("Failed to load snapshots", { description: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await (supabase as any)
        .from("snapshot_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setAuditLogs((data as AuditLogEntry[]) || []);
    } catch (err: any) {
      toast.error("Failed to load audit logs", { description: err.message });
    } finally {
      setAuditLoading(false);
    }
  }, []);

  const handleRestore = async () => {
    if (!restoreSnap) return;
    setRestoring(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const cats = restoreMode === "selective" ? selectedCats : ["assets", "containers", "employees", "tasks"];

      const { data, error } = await supabase.rpc("admin_restore_workspace_snapshot" as any, {
        p_admin_id: user.id,
        p_snapshot_id: restoreSnap.id,
        p_restore_mode: restoreMode,
        p_categories: cats,
      });
      if (error) throw error;

      toast.success("Workspace restored", {
        description: `Restored "${restoreSnap.workspace_name}" from "${restoreSnap.name}".`,
      });
      setRestoreSnap(null);
      await loadSnapshots();
    } catch (err: any) {
      toast.error("Restore failed", { description: err.message });
    } finally {
      setRestoring(false);
    }
  };

  const handleCreateSnapshot = async () => {
    if (!createForUser || !createName.trim()) return;
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.rpc("admin_create_workspace_snapshot" as any, {
        p_admin_id: user.id,
        p_target_user_id: createForUser.userId,
        p_name: createName.trim(),
      });
      if (error) throw error;

      toast.success("Snapshot created", {
        description: `Snapshot for "${createForUser.wsName}" saved.`,
      });
      setCreateForUser(null);
      setCreateName("");
      await loadSnapshots();
    } catch (err: any) {
      toast.error("Failed to create snapshot", { description: err.message });
    } finally {
      setCreating(false);
    }
  };

  // Unique workspaces for filter
  const workspaces = Array.from(
    new Map(snapshots.map(s => [s.user_id, { id: s.user_id, name: s.workspace_name, email: s.user_email }])).values()
  );

  const filtered = snapshots.filter(s => {
    if (wsFilter !== "all" && s.user_id !== wsFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return s.name.toLowerCase().includes(q)
        || s.workspace_name.toLowerCase().includes(q)
        || s.user_email.toLowerCase().includes(q);
    }
    return true;
  });

  const toggleCat = (cat: RestoreCategory) =>
    setSelectedCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);

  if (!loaded) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            Workspace Recovery
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-10">
          <p className="text-sm text-muted-foreground mb-4">Load workspace snapshots to assist users with data recovery.</p>
          <Button onClick={loadSnapshots} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Load Snapshots
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); if (v === "audit" && auditLogs.length === 0) loadAuditLogs(); }} className="space-y-4">
      <TabsList className="grid w-full grid-cols-2 max-w-xs">
        <TabsTrigger value="snapshots" className="text-xs gap-1.5">
          <Shield className="h-3.5 w-3.5" /> Snapshots
        </TabsTrigger>
        <TabsTrigger value="audit" className="text-xs gap-1.5">
          <FileText className="h-3.5 w-3.5" /> Audit Log
        </TabsTrigger>
      </TabsList>

      <TabsContent value="snapshots" className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4" />
              Workspace Recovery
              <Badge variant="secondary" className="text-xs">{snapshots.length} snapshots</Badge>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={loadSnapshots} disabled={loading} className="gap-1 h-7 text-xs">
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, workspace, or email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={wsFilter} onValueChange={setWsFilter}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="All Workspaces" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Workspaces</SelectItem>
                {workspaces.map(ws => (
                  <SelectItem key={ws.id} value={ws.id}>
                    {ws.name} ({ws.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No snapshots found.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Workspace</TableHead>
                    <TableHead>Snapshot</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Objects</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice(0, 50).map(snap => (
                    <TableRow key={snap.id}>
                      <TableCell>
                        <div>
                          <span className="text-sm font-medium">{snap.workspace_name}</span>
                          <p className="text-xs text-muted-foreground">{snap.user_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="text-sm">{snap.name}</span>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(snap.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
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
                        <span className="text-sm tabular-nums">{totalObjects(snap)}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setDetailSnap(snap)}>
                            <Eye className="h-3 w-3" /> Inspect
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => {
                            setCreateForUser({ userId: snap.user_id, wsName: snap.workspace_name, email: snap.user_email });
                            setCreateName("");
                          }}>
                            <Camera className="h-3 w-3" /> Snapshot
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => {
                            setRestoreSnap(snap);
                            setRestoreMode("full");
                            setSelectedCats(["assets", "containers", "employees", "tasks"]);
                          }}>
                            <RotateCcw className="h-3 w-3" /> Restore
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Detail Dialog ── */}
      <Dialog open={!!detailSnap} onOpenChange={open => !open && setDetailSnap(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4" /> Snapshot Details
            </DialogTitle>
            <DialogDescription>
              {detailSnap?.workspace_name} — {detailSnap?.name}
            </DialogDescription>
          </DialogHeader>
          {detailSnap && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground text-xs">Owner</span><p className="font-medium">{detailSnap.user_email}</p></div>
                <div><span className="text-muted-foreground text-xs">Created</span><p className="font-medium">{format(new Date(detailSnap.created_at), "MMM d, yyyy h:mm a")}</p></div>
                <div><span className="text-muted-foreground text-xs">Type</span><p className="font-medium">{typeLabel[detailSnap.snapshot_type] || detailSnap.snapshot_type}</p></div>
                <div><span className="text-muted-foreground text-xs">Size</span><p className="font-medium">{formatBytes(detailSnap.snapshot_size)}</p></div>
              </div>
              <Separator />
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stored Objects</h4>
                {[
                  { label: "Assets", count: detailSnap.asset_count, icon: Package },
                  { label: "Containers", count: detailSnap.container_count, icon: Archive },
                  { label: "Team Members", count: detailSnap.employee_count, icon: Users },
                  { label: "Calendar Events", count: detailSnap.task_count, icon: CalendarDays },
                ].map(({ label, count, icon: Icon }) => (
                  <div key={label} className="flex items-center justify-between py-1">
                    <span className="flex items-center gap-2"><Icon className="h-3.5 w-3.5 text-muted-foreground" />{label}</span>
                    <span className="font-medium tabular-nums">{count || 0}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailSnap(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Restore Dialog ── */}
      <Dialog open={!!restoreSnap} onOpenChange={open => { if (!open && !restoring) setRestoreSnap(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Restore Workspace
            </DialogTitle>
            <DialogDescription>
              You are about to restore a workspace to a previous state. All current changes after that snapshot will be replaced.
            </DialogDescription>
          </DialogHeader>
          {restoreSnap && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/50 border border-border/50 text-sm">
                <p className="font-medium">{restoreSnap.workspace_name}</p>
                <p className="text-xs text-muted-foreground">{restoreSnap.name} · {format(new Date(restoreSnap.created_at), "MMM d, yyyy h:mm a")}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Restore Mode</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["full", "selective"] as RestoreMode[]).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setRestoreMode(mode)}
                      disabled={restoring}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        restoreMode === mode
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "border-border hover:border-border/80"
                      }`}
                    >
                      <span className="text-sm font-medium">{mode === "full" ? "Full Restore" : "Selective Restore"}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {mode === "full" ? "Replace all workspace data" : "Choose specific categories"}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {restoreMode === "selective" && (
                <div className="space-y-1.5">
                  {CATEGORIES.map(({ key, label, icon: CatIcon }) => (
                    <label key={key} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/50 hover:bg-muted/30 cursor-pointer transition-colors">
                      <Checkbox checked={selectedCats.includes(key)} onCheckedChange={() => toggleCat(key)} disabled={restoring} />
                      <CatIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{label}</span>
                    </label>
                  ))}
                </div>
              )}

              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>A pre-restore backup will be created automatically. This action modifies another user's workspace data.</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreSnap(null)} disabled={restoring}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleRestore}
              disabled={restoring || (restoreMode === "selective" && selectedCats.length === 0)}
              className="gap-2"
            >
              {restoring ? <><Loader2 className="h-4 w-4 animate-spin" /> Restoring…</> : <><RotateCcw className="h-4 w-4" /> Restore</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create Snapshot Dialog ── */}
      <Dialog open={!!createForUser} onOpenChange={open => !open && setCreateForUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" /> Create Snapshot
            </DialogTitle>
            <DialogDescription>
              Create a manual snapshot for {createForUser?.wsName} ({createForUser?.email}).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="admin-snap-name">Snapshot Name</Label>
              <Input
                id="admin-snap-name"
                placeholder="e.g. Support recovery backup"
                value={createName}
                onChange={e => setCreateName(e.target.value)}
                maxLength={100}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateForUser(null)}>Cancel</Button>
            <Button onClick={handleCreateSnapshot} disabled={!createName.trim() || creating} className="gap-2">
              {creating ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</> : "Create Snapshot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </TabsContent>

      <TabsContent value="audit">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                Snapshot & Restore Audit Log
                {auditLogs.length > 0 && <Badge variant="secondary" className="text-xs">{auditLogs.length}</Badge>}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={loadAuditLogs} disabled={auditLoading} className="gap-1 h-7 text-xs">
                {auditLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {auditLoading ? (
              <p className="text-sm text-muted-foreground text-center py-6">Loading audit logs…</p>
            ) : auditLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No audit entries yet.</p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Workspace</TableHead>
                      <TableHead>Snapshot</TableHead>
                      <TableHead>Performed By</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div>
                            <span className="text-sm">{format(new Date(log.created_at), "MMM d, h:mm a")}</span>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={log.action_type === 'snapshot_created' ? 'outline' : 'default'}
                            className="text-[10px]"
                          >
                            {log.action_type === 'snapshot_created' && '📸 Snapshot Created'}
                            {log.action_type === 'workspace_restored' && '🔄 Full Restore'}
                            {log.action_type === 'partial_restore' && '🔧 Partial Restore'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-mono text-xs">{log.workspace_id.slice(0, 8)}…</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{log.snapshot_name || '—'}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Badge variant={log.performed_by_role === 'super_admin' ? 'default' : 'secondary'} className="text-[10px]">
                              {log.performed_by_role === 'super_admin' ? 'Admin' : 'Owner'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.action_type !== 'snapshot_created' && log.restored_counts && (
                            <div className="flex flex-wrap gap-1">
                              {log.restore_mode && (
                                <Badge variant="outline" className="text-[10px]">{log.restore_mode}</Badge>
                              )}
                              {log.restored_categories && (
                                <span className="text-xs text-muted-foreground">
                                  {log.restored_categories.join(', ')}
                                </span>
                              )}
                            </div>
                          )}
                          {log.action_type === 'snapshot_created' && log.details && (
                            <span className="text-xs text-muted-foreground">
                              {log.details.snapshot_type || '—'}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};
