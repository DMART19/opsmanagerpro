import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Search, RefreshCw, Download, Filter, Loader2, Eye, ChevronLeft, ChevronRight,
  Plus, Pencil, Trash2, ArrowRightLeft,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  old_data: any;
  new_data: any;
  changed_by: string | null;
  changed_at: string;
  ip_address: string | null;
  user_agent: string | null;
  workspace_id: string | null;
}

interface Profile {
  id: string;
  display_name: string | null;
  email: string | null;
}

const ACTION_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  INSERT: { label: "Created", icon: Plus, color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  UPDATE: { label: "Updated", icon: Pencil, color: "bg-primary/10 text-primary border-primary/20" },
  DELETE: { label: "Deleted", icon: Trash2, color: "bg-destructive/10 text-destructive border-destructive/20" },
};

const TABLE_LABELS: Record<string, string> = {
  cache_inventory: "Asset",
  cache_boxes: "Container",
  equipment: "Equipment",
  equipment_checkouts: "Equipment Checkout",
  employees: "Team Member",
  staff: "Staff",
  certifications: "Certification",
  employee_requirements: "Credential",
  workspace_members: "Workspace Member",
  workspace_settings: "Workspace Settings",
  workspace_plans: "Workspace Plan",
  pallets: "Pallet",
  cases: "Case",
  items: "Item",
  saved_trailer_layouts: "Trailer Layout",
  item_checkouts: "Item Checkout",
  tasks: "Task",
  warehouses: "Warehouse",
  warehouse_sections: "Warehouse Section",
};

const PAGE_SIZE = 50;

const getObjectName = (data: any): string => {
  if (!data) return "";
  return data.name || data.first_name
    ? `${data.first_name || ""} ${data.last_name || ""}`.trim()
    : data.description || data.item_name || data.pallet_id || data.case_id || data.box_number || "";
};

const getChangedFields = (oldData: any, newData: any): string[] => {
  if (!oldData || !newData) return [];
  const changed: string[] = [];
  for (const key of Object.keys(newData)) {
    if (key === "updated_at" || key === "created_at") continue;
    if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
      changed.push(key);
    }
  }
  return changed;
};

export const AuditLogsPanel = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [filterTable, setFilterTable] = useState("all");
  const [filterUser, setFilterUser] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("audit_logs")
        .select("*", { count: "exact" })
        .order("changed_at", { ascending: false });

      if (filterAction !== "all") query = query.eq("action", filterAction);
      if (filterTable !== "all") query = query.eq("table_name", filterTable);
      if (filterUser !== "all") query = query.eq("changed_by", filterUser);
      if (dateFrom) query = query.gte("changed_at", new Date(dateFrom).toISOString());
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        query = query.lte("changed_at", end.toISOString());
      }

      const from = page * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1);

      const { data, error, count } = await query;
      if (error) throw error;
      setLogs((data || []).map((d: any) => ({ ...d, ip_address: d.ip_address ? String(d.ip_address) : null })));
      setTotalCount(count || 0);

      // Fetch profiles for changed_by users
      const userIds = [...new Set((data || []).map(d => d.changed_by).filter(Boolean))] as string[];
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, display_name, email")
          .in("id", userIds);
        setProfiles(new Map((profileData || []).map(p => [p.id, p])));
      }
    } catch (err: any) {
      toast.error("Failed to load audit logs", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [filterAction, filterTable, filterUser, dateFrom, dateTo, page]);

  const uniqueUsers = useMemo(() => {
    return Array.from(profiles.entries()).map(([id, p]) => ({
      id,
      label: p.display_name || p.email || id.slice(0, 8),
    }));
  }, [profiles]);

  const uniqueTables = useMemo(() => {
    const tables = [...new Set(logs.map(l => l.table_name))];
    return tables.sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    if (!searchQuery) return logs;
    const q = searchQuery.toLowerCase();
    return logs.filter(l =>
      l.table_name.toLowerCase().includes(q) ||
      l.record_id.toLowerCase().includes(q) ||
      getObjectName(l.new_data || l.old_data).toLowerCase().includes(q)
    );
  }, [logs, searchQuery]);

  const userName = (userId: string | null) => {
    if (!userId) return "System";
    const p = profiles.get(userId);
    return p?.display_name || p?.email || userId.slice(0, 8) + "…";
  };

  const handleExport = () => {
    const rows = [
      ["Timestamp", "User", "Action", "Object Type", "Object Name", "Record ID", "Changed Fields"].join(","),
      ...filteredLogs.map(l => [
        format(new Date(l.changed_at), "yyyy-MM-dd HH:mm:ss"),
        `"${userName(l.changed_by)}"`,
        l.action,
        TABLE_LABELS[l.table_name] || l.table_name,
        `"${getObjectName(l.new_data || l.old_data)}"`,
        l.record_id,
        `"${l.action === "UPDATE" ? getChangedFields(l.old_data, l.new_data).join(", ") : ""}"`,
      ].join(","))
    ].join("\n");

    const blob = new Blob([rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredLogs.length} audit records`);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Audit Logs
                <Badge variant="outline" className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  APPEND-ONLY
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Tamper-resistant activity trail — records cannot be modified or deleted · {totalCount.toLocaleString()} total
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadLogs} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport} disabled={filteredLogs.length === 0}>
                <Download className="h-4 w-4 mr-1.5" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, table, or record ID…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterAction} onValueChange={v => { setFilterAction(v); setPage(0); }}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="INSERT">Created</SelectItem>
                <SelectItem value="UPDATE">Updated</SelectItem>
                <SelectItem value="DELETE">Deleted</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterTable} onValueChange={v => { setFilterTable(v); setPage(0); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Tables" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Object Types</SelectItem>
                {Object.entries(TABLE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPage(0); }}
              className="w-[150px]"
              placeholder="From"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPage(0); }}
              className="w-[150px]"
              placeholder="To"
            />
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Object Type</TableHead>
                  <TableHead>Object</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      No audit records found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map(log => {
                    const actionCfg = ACTION_CONFIG[log.action] || ACTION_CONFIG.UPDATE;
                    const ActionIcon = actionCfg.icon;
                    const changedFields = log.action === "UPDATE"
                      ? getChangedFields(log.old_data, log.new_data)
                      : [];
                    const objName = getObjectName(log.new_data || log.old_data);

                    return (
                      <TableRow key={log.id} className="cursor-pointer" onClick={() => { setSelectedLog(log); setDetailOpen(true); }}>
                        <TableCell className="font-mono text-xs whitespace-nowrap">
                          {format(new Date(log.changed_at), "MMM dd, yyyy HH:mm:ss")}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {userName(log.changed_by)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={actionCfg.color}>
                            <ActionIcon className="h-3 w-3 mr-1" />
                            {actionCfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {TABLE_LABELS[log.table_name] || log.table_name}
                        </TableCell>
                        <TableCell className="text-sm font-medium max-w-[200px] truncate">
                          {objName || log.record_id.slice(0, 8) + "…"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {changedFields.length > 0
                            ? `Modified: ${changedFields.slice(0, 3).join(", ")}${changedFields.length > 3 ? ` +${changedFields.length - 3}` : ""}`
                            : log.action === "INSERT" ? "New record" : log.action === "DELETE" ? "Record removed" : ""}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages} · {totalCount.toLocaleString()} records
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Drawer */}
      <AuditDetailDrawer
        log={selectedLog}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        userName={userName}
      />
    </div>
  );
};

// ─── Detail Drawer ───
const AuditDetailDrawer = ({
  log,
  open,
  onOpenChange,
  userName,
}: {
  log: AuditLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: (id: string | null) => string;
}) => {
  if (!log) return null;

  const actionCfg = ACTION_CONFIG[log.action] || ACTION_CONFIG.UPDATE;
  const changedFields = log.action === "UPDATE" ? getChangedFields(log.old_data, log.new_data) : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Badge variant="outline" className={actionCfg.color}>{actionCfg.label}</Badge>
            {TABLE_LABELS[log.table_name] || log.table_name}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Performed By</p>
              <p className="font-medium">{userName(log.changed_by)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Timestamp</p>
              <p className="font-mono text-xs">{format(new Date(log.changed_at), "MMM dd, yyyy HH:mm:ss")}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Record ID</p>
              <p className="font-mono text-xs break-all">{log.record_id}</p>
            </div>
             <div>
               <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Table</p>
               <p>{log.table_name}</p>
             </div>
             {log.ip_address && (
               <div>
                 <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Source IP</p>
                 <p className="font-mono text-xs">{log.ip_address}</p>
               </div>
             )}
             {log.workspace_id && (
               <div>
                 <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Workspace</p>
                 <p className="font-mono text-xs truncate">{log.workspace_id}</p>
               </div>
             )}
             {log.user_agent && (
               <div className="col-span-2">
                 <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">User Agent</p>
                 <p className="font-mono text-[10px] bg-muted/50 rounded p-1.5 break-all">{log.user_agent}</p>
               </div>
             )}
          </div>

          {/* Changed Fields (UPDATE only) */}
          {log.action === "UPDATE" && changedFields.length > 0 && (
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wide mb-2">Changes</p>
              <div className="space-y-2">
                {changedFields.map(field => (
                  <div key={field} className="rounded-md border p-3 text-sm">
                    <p className="font-medium text-xs text-muted-foreground mb-1">{field.replace(/_/g, " ")}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-destructive/80 line-through text-xs break-all">
                        {JSON.stringify(log.old_data?.[field]) ?? "null"}
                      </span>
                      <ArrowRightLeft className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-emerald-600 text-xs break-all">
                        {JSON.stringify(log.new_data?.[field]) ?? "null"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full Data (INSERT / DELETE) */}
          {(log.action === "INSERT" || log.action === "DELETE") && (
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wide mb-2">
                {log.action === "INSERT" ? "Created Data" : "Deleted Data"}
              </p>
              <ScrollArea className="h-[300px] rounded-md border p-3">
                <pre className="text-xs whitespace-pre-wrap break-all font-mono">
                  {JSON.stringify(log.action === "INSERT" ? log.new_data : log.old_data, null, 2)}
                </pre>
              </ScrollArea>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
