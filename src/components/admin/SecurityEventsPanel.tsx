import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
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
  ShieldAlert,
  Search,
  RefreshCw,
  AlertTriangle,
  XCircle,
  AlertCircle,
  Info,
  Shield,
  UserX,
  KeyRound,
  Trash2,
  Lock,
  Activity,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SecurityEvent {
  id: string;
  user_id: string | null;
  workspace_id: string | null;
  event_type: string;
  severity: string;
  ip_address: string | null;
  user_agent: string | null;
  page_route: string | null;
  details: Record<string, any> | null;
  created_at: string;
}

const SEVERITY_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  critical: { label: "Critical", color: "bg-red-500/10 text-red-600 border-red-500/30", icon: XCircle },
  high: { label: "High", color: "bg-orange-500/10 text-orange-600 border-orange-500/30", icon: AlertTriangle },
  medium: { label: "Medium", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30", icon: AlertCircle },
  low: { label: "Low", color: "bg-blue-500/10 text-blue-600 border-blue-500/30", icon: Info },
};

const EVENT_TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType }> = {
  failed_login: { label: "Failed Login", icon: UserX },
  failed_authorization: { label: "Failed Authorization", icon: Lock },
  role_change: { label: "Role Change", icon: KeyRound },
  rapid_permission_changes: { label: "Rapid Permission Changes", icon: ShieldAlert },
  unusual_bulk_deletion: { label: "Bulk Deletion", icon: Trash2 },
  suspicious_api_usage: { label: "Suspicious API Usage", icon: Activity },
  admin_role_change: { label: "Admin Role Change", icon: Shield },
  workspace_settings_change: { label: "Settings Change", icon: Shield },
};

const PAGE_SIZE = 30;

export const SecurityEventsPanel = () => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [page, setPage] = useState(0);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("security_events" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      setEvents((data as any[]) || []);
    } catch (err) {
      console.error("Failed to load security events:", err);
      toast.error("Failed to load security events");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const eventTypes = useMemo(() => {
    const types = new Set(events.map((e) => e.event_type));
    return Array.from(types).sort();
  }, [events]);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (severityFilter !== "all" && e.severity !== severityFilter) return false;
      if (eventTypeFilter !== "all" && e.event_type !== eventTypeFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          e.event_type.toLowerCase().includes(q) ||
          e.user_id?.toLowerCase().includes(q) ||
          e.workspace_id?.toLowerCase().includes(q) ||
          e.page_route?.toLowerCase().includes(q) ||
          JSON.stringify(e.details || {}).toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [events, severityFilter, eventTypeFilter, searchQuery]);

  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  // Summary stats
  const stats = useMemo(() => {
    const last24h = events.filter(
      (e) => new Date(e.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );
    return {
      total: events.length,
      last24h: last24h.length,
      critical: last24h.filter((e) => e.severity === "critical").length,
      high: last24h.filter((e) => e.severity === "high").length,
      failedAuth: last24h.filter((e) => e.event_type === "failed_authorization").length,
    };
  }, [events]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Events", value: stats.total, icon: Shield, color: "text-primary" },
          { label: "Last 24h", value: stats.last24h, icon: Activity, color: "text-blue-600" },
          { label: "Critical (24h)", value: stats.critical, icon: XCircle, color: "text-red-600" },
          { label: "High (24h)", value: stats.high, icon: AlertTriangle, color: "text-orange-600" },
          { label: "Auth Failures (24h)", value: stats.failedAuth, icon: Lock, color: "text-yellow-600" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className={cn("h-4 w-4", s.color)} />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <p className="text-2xl font-bold tabular-nums">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />
              Security Events
            </CardTitle>
            <Button variant="outline" size="sm" onClick={loadEvents} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                className="pl-9 h-9"
              />
            </div>
            <Select value={severityFilter} onValueChange={(v) => { setSeverityFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={eventTypeFilter} onValueChange={(v) => { setEventTypeFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[200px] h-9">
                <SelectValue placeholder="Event Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {eventTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {EVENT_TYPE_CONFIG[t]?.label || t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No security events found</p>
              <p className="text-sm">Adjust your filters or check back later.</p>
            </div>
          ) : (
            <>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[160px]">Time</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Workspace</TableHead>
                      <TableHead className="w-[60px]">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paged.map((evt) => {
                      const sev = SEVERITY_CONFIG[evt.severity] || SEVERITY_CONFIG.medium;
                      const evtConfig = EVENT_TYPE_CONFIG[evt.event_type];
                      const EvtIcon = evtConfig?.icon || Shield;
                      return (
                        <TableRow
                          key={evt.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => { setSelectedEvent(evt); setDrawerOpen(true); }}
                        >
                          <TableCell>
                            <div className="text-xs">
                              <p className="font-mono">{format(new Date(evt.created_at), "MMM d, HH:mm:ss")}</p>
                              <p className="text-muted-foreground">{formatDistanceToNow(new Date(evt.created_at), { addSuffix: true })}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <EvtIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="text-sm font-medium">{evtConfig?.label || evt.event_type}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("text-xs", sev.color)}>
                              {sev.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs font-mono text-muted-foreground truncate block max-w-[120px]">
                              {evt.user_id?.slice(0, 8) || "—"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs font-mono text-muted-foreground truncate block max-w-[120px]">
                              {evt.workspace_id?.slice(0, 8) || "—"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedEvent(evt); setDrawerOpen(true); }}>
                              <Info className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-xs text-muted-foreground">
                    {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
                  </p>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                      Previous
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="sm:max-w-lg w-full overflow-y-auto">
          {selectedEvent && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5" />
                  Security Event Detail
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-5 mt-6">
                {/* Severity + Type */}
                <div className="flex gap-2">
                  <Badge variant="outline" className={cn("text-xs", SEVERITY_CONFIG[selectedEvent.severity]?.color)}>
                    {SEVERITY_CONFIG[selectedEvent.severity]?.label || selectedEvent.severity}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {EVENT_TYPE_CONFIG[selectedEvent.event_type]?.label || selectedEvent.event_type}
                  </Badge>
                </div>

                {/* Meta */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Timestamp</p>
                    <p className="font-mono text-xs">{format(new Date(selectedEvent.created_at), "MMM d, yyyy 'at' HH:mm:ss")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">User ID</p>
                    <p className="font-mono text-xs truncate">{selectedEvent.user_id || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Workspace ID</p>
                    <p className="font-mono text-xs truncate">{selectedEvent.workspace_id || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs mb-0.5">Page Route</p>
                    <p className="font-mono text-xs truncate">{selectedEvent.page_route || "—"}</p>
                  </div>
                  {selectedEvent.ip_address && (
                    <div>
                      <p className="text-muted-foreground text-xs mb-0.5">IP Address</p>
                      <p className="font-mono text-xs">{selectedEvent.ip_address}</p>
                    </div>
                  )}
                </div>

                {/* User Agent */}
                {selectedEvent.user_agent && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">User Agent</p>
                    <p className="text-xs font-mono bg-muted/50 rounded p-2 break-all">{selectedEvent.user_agent}</p>
                  </div>
                )}

                {/* Details */}
                {selectedEvent.details && Object.keys(selectedEvent.details).length > 0 && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">Event Details</p>
                    <div className="bg-muted/30 rounded-lg border p-3 space-y-1.5">
                      {Object.entries(selectedEvent.details).map(([key, val]) => (
                        <div key={key} className="flex gap-2 text-xs">
                          <span className="text-muted-foreground font-medium shrink-0 min-w-[100px]">{key}:</span>
                          <span className="font-mono break-all">{typeof val === "object" ? JSON.stringify(val) : String(val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};
