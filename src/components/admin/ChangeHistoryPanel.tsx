/**
 * Change History Panel
 *
 * Displays an immutable, filterable log of all data and configuration changes
 * across the platform. Super-admin only.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  History,
  RefreshCw,
  Search,
  Lock,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";

/* ── Types ─────────────────────────────────────────────── */

interface ChangeRecord {
  id: string;
  user_id: string | null;
  workspace_id: string | null;
  object_type: string;
  object_id: string;
  action: string;
  field_changed: string | null;
  previous_value: string | null;
  new_value: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/* ── Constants ─────────────────────────────────────────── */

const OBJECT_TYPES = [
  { value: "all", label: "All Types" },
  { value: "workspace_settings", label: "Workspace Settings" },
  { value: "workspace_member", label: "Role / Permission" },
  { value: "employee", label: "Team Member" },
  { value: "asset", label: "Asset / Container" },
  { value: "credential", label: "Credential" },
  { value: "pallet", label: "Pallet" },
  { value: "case", label: "Case" },
  { value: "requirement_definition", label: "Requirement Def" },
  { value: "department", label: "Department" },
  { value: "team_role", label: "Team Role" },
];

const DATE_RANGES = [
  { value: "1", label: "Last 24 hours" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

const ACTION_ICON: Record<string, React.ElementType> = {
  insert: Plus,
  update: Pencil,
  delete: Trash2,
};

const ACTION_STYLE: Record<string, string> = {
  insert: "text-emerald-600 bg-emerald-500/10",
  update: "text-blue-600 bg-blue-500/10",
  delete: "text-red-600 bg-red-500/10",
};

const PAGE_SIZE = 50;

/* ── Component ─────────────────────────────────────────── */

export const ChangeHistoryPanel = () => {
  const [records, setRecords] = useState<ChangeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [objectType, setObjectType] = useState("all");
  const [dateRange, setDateRange] = useState("7");
  const [actionFilter, setActionFilter] = useState("all");

  // Detail drawer
  const [selected, setSelected] = useState<ChangeRecord | null>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("change_history")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (objectType !== "all") {
        query = query.eq("object_type", objectType);
      }

      if (actionFilter !== "all") {
        query = query.eq("action", actionFilter);
      }

      if (dateRange !== "all") {
        const since = subDays(new Date(), parseInt(dateRange)).toISOString();
        query = query.gte("created_at", since);
      }

      if (search.trim()) {
        query = query.or(
          `object_id.eq.${search.trim()},field_changed.ilike.%${search.trim()}%,previous_value.ilike.%${search.trim()}%,new_value.ilike.%${search.trim()}%`
        );
      }

      const { data, error, count } = await query;
      if (error) throw error;

      setRecords((data || []) as unknown as ChangeRecord[]);
      setTotal(count ?? 0);
    } catch (err: any) {
      console.error("Failed to fetch change history:", err);
    } finally {
      setLoading(false);
    }
  }, [page, objectType, actionFilter, dateRange, search]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  // Reset page when filters change
  useEffect(() => { setPage(0); }, [objectType, actionFilter, dateRange, search]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  /* ── Summary stats ── */
  const stats = useMemo(() => {
    const inserts = records.filter(r => r.action === "insert").length;
    const updates = records.filter(r => r.action === "update").length;
    const deletes = records.filter(r => r.action === "delete").length;
    return { inserts, updates, deletes };
  }, [records]);

  /* ── Render ── */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Change History
          </h2>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            Append-only record of all platform changes
            <Lock className="h-3 w-3 text-muted-foreground" />
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs gap-1">
            <Lock className="h-3 w-3" /> IMMUTABLE
          </Badge>
          <Button variant="outline" size="sm" onClick={fetchRecords}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      {/* Stat pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{total.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Changes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-emerald-600">{stats.inserts}</p>
            <p className="text-xs text-muted-foreground">Inserts (page)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.updates}</p>
            <p className="text-xs text-muted-foreground">Updates (page)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.deletes}</p>
            <p className="text-xs text-muted-foreground">Deletes (page)</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by field, value, or object ID…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>

            <Select value={objectType} onValueChange={setObjectType}>
              <SelectTrigger className="w-[170px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OBJECT_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[130px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Actions</SelectItem>
                <SelectItem value="insert" className="text-xs">Insert</SelectItem>
                <SelectItem value="update" className="text-xs">Update</SelectItem>
                <SelectItem value="delete" className="text-xs">Delete</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[150px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGES.map(d => (
                  <SelectItem key={d.value} value={d.value} className="text-xs">{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No changes found</p>
              <p className="text-xs">Adjust your filters or date range</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-[140px]">Timestamp</TableHead>
                    <TableHead className="text-xs w-[80px]">Action</TableHead>
                    <TableHead className="text-xs w-[130px]">Object Type</TableHead>
                    <TableHead className="text-xs">Field</TableHead>
                    <TableHead className="text-xs">Change</TableHead>
                    <TableHead className="text-xs w-[100px]">User</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map(r => {
                    const Icon = ACTION_ICON[r.action] || Pencil;
                    const typeLabel = OBJECT_TYPES.find(t => t.value === r.object_type)?.label || r.object_type;
                    return (
                      <TableRow
                        key={r.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelected(r)}
                      >
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {format(new Date(r.created_at), "MMM d HH:mm:ss")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("text-[10px] gap-1", ACTION_STYLE[r.action])}>
                            <Icon className="h-3 w-3" />
                            {r.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{typeLabel}</TableCell>
                        <TableCell className="text-xs font-mono truncate max-w-[120px]">
                          {r.field_changed || "—"}
                        </TableCell>
                        <TableCell className="text-xs max-w-[200px]">
                          {r.action === "update" && r.field_changed ? (
                            <div className="flex items-center gap-1 truncate">
                              <span className="text-muted-foreground line-through truncate max-w-[80px]">
                                {r.previous_value || "null"}
                              </span>
                              <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                              <span className="truncate max-w-[80px] font-medium">
                                {r.new_value || "null"}
                              </span>
                            </div>
                          ) : r.action === "insert" ? (
                            <span className="text-emerald-600 text-xs">Created</span>
                          ) : (
                            <span className="text-red-600 text-xs">Deleted</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground truncate max-w-[100px]">
                          {r.user_id?.slice(0, 8) || "system"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages} · {total.toLocaleString()} total records
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-sm">
              <History className="h-4 w-4" /> Change Detail
            </SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Action</p>
                  <Badge variant="outline" className={cn("text-xs gap-1", ACTION_STYLE[selected.action])}>
                    {selected.action}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Object Type</p>
                  <p className="text-sm font-medium">
                    {OBJECT_TYPES.find(t => t.value === selected.object_type)?.label || selected.object_type}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Timestamp</p>
                  <p className="text-sm font-mono">{format(new Date(selected.created_at), "yyyy-MM-dd HH:mm:ss")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Field Changed</p>
                  <p className="text-sm font-mono">{selected.field_changed || "—"}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Object ID</p>
                <p className="text-sm font-mono break-all">{selected.object_id}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-0.5">User ID</p>
                <p className="text-sm font-mono break-all">{selected.user_id || "system"}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Workspace ID</p>
                <p className="text-sm font-mono break-all">{selected.workspace_id || "—"}</p>
              </div>

              {selected.previous_value && (
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Previous Value</p>
                  <pre className="text-xs font-mono bg-muted/50 p-3 rounded-md overflow-auto max-h-[150px] whitespace-pre-wrap break-all">
                    {selected.previous_value}
                  </pre>
                </div>
              )}

              {selected.new_value && (
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">New Value</p>
                  <pre className="text-xs font-mono bg-muted/50 p-3 rounded-md overflow-auto max-h-[150px] whitespace-pre-wrap break-all">
                    {selected.new_value}
                  </pre>
                </div>
              )}

              <div className="pt-2 border-t">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  This record is immutable and cannot be modified or deleted.
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};
