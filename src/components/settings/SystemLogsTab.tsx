import { useState, useEffect, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Search, Download, Filter, Loader2, RefreshCw, FileText, FileJson,
  CalendarIcon, X, ChevronDown,
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useUserRole } from "@/hooks/use-user-role";
import { toast } from "@/hooks/use-toast";

interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  old_data: any;
  new_data: any;
  changed_by: string | null;
  changed_at: string;
  user_agent: string | null;
  workspace_id: string | null;
}

const levelColors: Record<string, string> = {
  INSERT: "bg-success/10 text-success border-success/20",
  UPDATE: "bg-primary/10 text-primary border-primary/20",
  DELETE: "bg-destructive/10 text-destructive border-destructive/20",
  soft_delete: "bg-warning/10 text-warning border-warning/20",
};

const MAX_EXPORT_ROWS = 5000;

export const SystemLogsTab = () => {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [filterUser, setFilterUser] = useState("");
  const [filterWorkspace, setFilterWorkspace] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (isAdmin) loadLogs();
  }, [isAdmin]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("changed_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      console.error("Error loading logs:", error);
      toast({ title: "Error loading logs", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getActionDescription = (log: AuditLog): string => {
    const tableName = log.table_name.replace(/_/g, " ");
    switch (log.action) {
      case "INSERT": return `Created new ${tableName}`;
      case "UPDATE": return `Updated ${tableName}`;
      case "DELETE": return `Deleted ${tableName}`;
      case "soft_delete": return `Soft deleted ${tableName}`;
      default: return `${log.action} on ${tableName}`;
    }
  };

  const getDetails = (log: AuditLog): string => {
    if (log.action === "INSERT" && log.new_data) {
      const name = log.new_data.name || log.new_data.first_name || log.new_data.description || "";
      return name ? `"${name}"` : `Record ${log.record_id.slice(0, 8)}…`;
    }
    if (log.action === "UPDATE" && log.new_data) {
      const keys = Object.keys(log.new_data).filter(k => k !== "updated_at").slice(0, 3);
      return `Modified: ${keys.join(", ")}`;
    }
    if ((log.action === "DELETE" || log.action === "soft_delete") && log.old_data) {
      const name = log.old_data.name || log.old_data.first_name || log.old_data.description || "";
      return name ? `"${name}"` : `Record ${log.record_id.slice(0, 8)}…`;
    }
    return `Record ${log.record_id.slice(0, 8)}…`;
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch = !searchQuery ||
        log.table_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getDetails(log).toLowerCase().includes(searchQuery.toLowerCase());

      const matchesAction = filterAction === "all" || log.action === filterAction;

      const logDate = new Date(log.changed_at);
      const matchesFrom = !dateFrom || logDate >= startOfDay(dateFrom);
      const matchesTo = !dateTo || logDate <= endOfDay(dateTo);

      const matchesUser = !filterUser ||
        (log.changed_by && log.changed_by.toLowerCase().includes(filterUser.toLowerCase()));

      const matchesWorkspace = !filterWorkspace ||
        (log.workspace_id && log.workspace_id.toLowerCase().includes(filterWorkspace.toLowerCase()));

      return matchesSearch && matchesAction && matchesFrom && matchesTo && matchesUser && matchesWorkspace;
    });
  }, [logs, searchQuery, filterAction, dateFrom, dateTo, filterUser, filterWorkspace]);

  /** Fetch up to MAX_EXPORT_ROWS with server-side filters for export */
  const fetchExportData = useCallback(async (): Promise<AuditLog[]> => {
    let query = supabase
      .from("audit_logs")
      .select("*")
      .order("changed_at", { ascending: false })
      .limit(MAX_EXPORT_ROWS);

    if (dateFrom) query = query.gte("changed_at", startOfDay(dateFrom).toISOString());
    if (dateTo) query = query.lte("changed_at", endOfDay(dateTo).toISOString());
    if (filterAction !== "all") query = query.eq("action", filterAction);
    if (filterWorkspace) query = query.eq("workspace_id", filterWorkspace);
    if (filterUser) query = query.eq("changed_by", filterUser);

    const { data, error } = await query;
    if (error) throw error;

    // Apply text search client-side (can't do ILIKE across multiple cols easily)
    if (!searchQuery) return data || [];
    const q = searchQuery.toLowerCase();
    return (data || []).filter(log =>
      log.table_name.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q)
    );
  }, [dateFrom, dateTo, filterAction, filterWorkspace, filterUser, searchQuery]);

  const exportCSV = async () => {
    setExporting(true);
    try {
      const data = await fetchExportData();
      if (data.length === 0) {
        toast({ title: "No records to export", description: "Adjust your filters and try again." });
        return;
      }

      const header = ["Timestamp", "Action", "Table", "Details", "Record ID", "Changed By", "Workspace ID"];
      const rows = data.map(log => [
        format(new Date(log.changed_at), "yyyy-MM-dd HH:mm:ss"),
        log.action,
        log.table_name,
        `"${getDetails(log).replace(/"/g, '""')}"`,
        log.record_id,
        log.changed_by || "",
        log.workspace_id || "",
      ]);

      const csvContent = [header.join(","), ...rows.map(r => r.join(","))].join("\n");
      downloadFile(csvContent, "text/csv", `audit-logs-${format(new Date(), "yyyy-MM-dd")}.csv`);

      toast({ title: "CSV exported", description: `${data.length} records exported successfully.` });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const exportJSON = async () => {
    setExporting(true);
    try {
      const data = await fetchExportData();
      if (data.length === 0) {
        toast({ title: "No records to export", description: "Adjust your filters and try again." });
        return;
      }

      const exportData = data.map(log => ({
        id: log.id,
        timestamp: log.changed_at,
        action: log.action,
        table: log.table_name,
        record_id: log.record_id,
        changed_by: log.changed_by,
        workspace_id: log.workspace_id,
        old_data: log.old_data,
        new_data: log.new_data,
        user_agent: log.user_agent,
      }));

      const json = JSON.stringify({ exported_at: new Date().toISOString(), count: exportData.length, logs: exportData }, null, 2);
      downloadFile(json, "application/json", `audit-logs-${format(new Date(), "yyyy-MM-dd")}.json`);

      toast({ title: "JSON exported", description: `${data.length} records exported successfully.` });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const downloadFile = (content: string, mimeType: string, filename: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeFilterCount = [dateFrom, dateTo, filterUser, filterWorkspace].filter(Boolean).length
    + (filterAction !== "all" ? 1 : 0);

  const clearFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    setFilterUser("");
    setFilterWorkspace("");
    setFilterAction("all");
    setSearchQuery("");
  };

  if (!isAdmin && !roleLoading) {
    return (
      <Alert className="border-warning/50 bg-warning/10">
        <Filter className="h-4 w-4 text-warning" />
        <AlertDescription className="text-warning">
          You need administrator privileges to view system logs.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base sm:text-xl font-semibold text-foreground">System Activity Logs</h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Complete audit trail of all workspace actions. Export before retention expiry.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadLogs} disabled={loading} className="gap-1.5">
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* Search + Filter Toggle + Export */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by table, action, or details…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-1.5"
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="h-4 px-1 text-[10px] ml-0.5">{activeFilterCount}</Badge>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={exporting} className="gap-1.5">
                {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Export
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportCSV} className="gap-2">
                <FileText className="h-4 w-4" /> Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportJSON} className="gap-2">
                <FileJson className="h-4 w-4" /> Export as JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Advanced Filter Panel */}
      {showFilters && (
        <div className="mb-4 p-4 rounded-lg border border-border bg-muted/30 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">Export Filters</h4>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs gap-1">
                <X className="h-3 w-3" /> Clear all
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Date From */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">From Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal h-9", !dateFrom && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {dateFrom ? format(dateFrom, "MMM d, yyyy") : "Start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    disabled={(d) => d > new Date()}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Date To */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">To Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("w-full justify-start text-left font-normal h-9", !dateTo && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {dateTo ? format(dateTo, "MMM d, yyyy") : "End date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    disabled={(d) => d > new Date()}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Event Type */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Event Type</Label>
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="INSERT">Created</SelectItem>
                  <SelectItem value="UPDATE">Updated</SelectItem>
                  <SelectItem value="DELETE">Deleted</SelectItem>
                  <SelectItem value="soft_delete">Soft Deleted</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* User ID filter */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">User ID</Label>
              <Input
                placeholder="Filter by user ID…"
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* Workspace filter (full width) */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Workspace ID</Label>
            <Input
              placeholder="Filter by workspace ID…"
              value={filterWorkspace}
              onChange={(e) => setFilterWorkspace(e.target.value)}
              className="h-9 text-sm max-w-md"
            />
          </div>

          {/* Quick date presets */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-muted-foreground">Quick:</span>
            {[
              { label: "Last 7 days", days: 7 },
              { label: "Last 30 days", days: 30 },
              { label: "Last 90 days", days: 90 },
              { label: "Last year", days: 365 },
            ].map(({ label, days }) => (
              <Button
                key={days}
                variant="ghost"
                size="sm"
                className="h-6 text-xs px-2"
                onClick={() => { setDateFrom(subDays(new Date(), days)); setDateTo(new Date()); }}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Table</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>Record ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filteredLogs.length > 0 ? (
              filteredLogs.slice(0, 200).map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs whitespace-nowrap">
                    {format(new Date(log.changed_at), "MMM dd, yyyy HH:mm:ss")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={levelColors[log.action] || ""}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-sm">
                    {log.table_name.replace(/_/g, " ")}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[300px] truncate text-sm">
                    {getDetails(log)}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {log.record_id.slice(0, 8)}…
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  {logs.length === 0
                    ? "No activity logs recorded yet"
                    : "No logs found matching your filters"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Showing {Math.min(filteredLogs.length, 200)} of {filteredLogs.length} filtered
          {filteredLogs.length !== logs.length && ` (${logs.length} total)`}
        </span>
        <span>Export fetches up to {MAX_EXPORT_ROWS.toLocaleString()} records with server-side filters</span>
      </div>
    </Card>
  );
};
