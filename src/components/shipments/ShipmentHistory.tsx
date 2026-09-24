import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { 
  Clock, 
  Edit3, 
  Plus, 
  Trash2, 
  User, 
  Package,
  CheckCircle,
  AlertCircle,
  Info
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ShipmentHistoryProps {
  shipmentId: string | null;
  open: boolean;
  onClose: () => void;
}

interface AuditLog {
  id: string;
  action: string;
  changed_at: string;
  changed_by: string;
  old_data: any;
  new_data: any;
  table_name: string;
  user_profile?: {
    display_name: string;
    email: string;
  };
}

export const ShipmentHistory = ({ shipmentId, open, onClose }: ShipmentHistoryProps) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && shipmentId) {
      loadHistory();
    }
  }, [open, shipmentId]);

  const loadHistory = async () => {
    if (!shipmentId) return;

    setLoading(true);
    try {
      // Get audit logs for this shipment
      const { data: auditData, error: auditError } = await supabase
        .from("audit_logs")
        .select(`
          id,
          action,
          changed_at,
          changed_by,
          old_data,
          new_data,
          table_name
        `)
        .eq("table_name", "shipments")
        .eq("record_id", shipmentId)
        .order("changed_at", { ascending: false });

      if (auditError) throw auditError;

      // Get profile information for users who made changes
      if (auditData && auditData.length > 0) {
        const userIds = [...new Set(auditData.map(log => log.changed_by).filter(Boolean))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name, email")
          .in("id", userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        const enrichedLogs = auditData.map(log => ({
          ...log,
          user_profile: log.changed_by ? profileMap.get(log.changed_by) : null
        }));

        setLogs(enrichedLogs);
      } else {
        setLogs([]);
      }
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "INSERT": return <Plus className="h-4 w-4 text-green-600" />;
      case "UPDATE": return <Edit3 className="h-4 w-4 text-blue-600" />;
      case "DELETE": return <Trash2 className="h-4 w-4 text-red-600" />;
      default: return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "INSERT": return "bg-green-100 text-green-800 border-green-300";
      case "UPDATE": return "bg-blue-100 text-blue-800 border-blue-300";
      case "DELETE": return "bg-red-100 text-red-800 border-red-300";
      default: return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "INSERT": return "Created";
      case "UPDATE": return "Updated";
      case "DELETE": return "Deleted";
      default: return action;
    }
  };

  const getChangedFields = (log: AuditLog) => {
    if (log.action === "INSERT") {
      return Object.keys(log.new_data || {}).filter(key => 
        !['id', 'created_at', 'updated_at'].includes(key)
      );
    }
    
    if (log.action === "UPDATE" && log.old_data && log.new_data) {
      const changed: string[] = [];
      Object.keys(log.new_data).forEach(key => {
        if (key !== 'updated_at' && JSON.stringify(log.old_data[key]) !== JSON.stringify(log.new_data[key])) {
          changed.push(key);
        }
      });
      return changed;
    }
    
    if (log.action === "DELETE" && log.old_data) {
      return Object.keys(log.old_data).filter(key => 
        !['id', 'created_at', 'updated_at'].includes(key)
      );
    }
    
    return [];
  };

  const formatFieldName = (field: string) => {
    return field
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatFieldValue = (value: any) => {
    if (value === null || value === undefined) return "—";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "object") return JSON.stringify(value);
    if (typeof value === "string" && value.match(/^\d{4}-\d{2}-\d{2}T/)) {
      return format(new Date(value), "PPp");
    }
    return String(value);
  };

  const getStatusChangeIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "delivered": return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "in-transit": return <Package className="h-4 w-4 text-blue-600" />;
      case "draft": return <AlertCircle className="h-4 w-4 text-gray-600" />;
      default: return null;
    }
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-2xl">
            <Clock className="h-6 w-6 text-[#2F5FFF]" />
            Shipment History
          </SheetTitle>
          <SheetDescription>
            Complete audit trail of all changes and actions
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="py-6">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 bg-muted/20 rounded-lg border border-border/50">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-lg font-medium">No History Yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Changes will appear here once you save the shipment
                </p>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline Line */}
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#2F5FFF] via-gray-300 to-transparent" />

                <div className="space-y-6">
                  {logs.map((log, index) => {
                    const changedFields = getChangedFields(log);
                    const isStatusChange = changedFields.includes('status');
                    
                    return (
                      <div key={log.id} className="relative pl-14">
                        {/* Timeline Dot */}
                        <div className="absolute left-0 top-0 w-10 h-10 rounded-full bg-white border-4 border-[#2F5FFF] shadow-lg flex items-center justify-center">
                          {getActionIcon(log.action)}
                        </div>

                        {/* Content Card */}
                        <div className="bg-white rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow p-4">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={`${getActionColor(log.action)} border font-semibold`}>
                                {getActionLabel(log.action)}
                              </Badge>
                              {isStatusChange && log.new_data?.status && (
                                <div className="flex items-center gap-1.5">
                                  {getStatusChangeIcon(log.new_data.status)}
                                  <span className="text-sm font-semibold text-[#0D1321]">
                                    Status: {log.new_data.status}
                                  </span>
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(log.changed_at), "MMM d, h:mm a")}
                            </span>
                          </div>

                          {/* User Info */}
                          <div className="flex items-center gap-2 mb-3">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-[#0D1321]">
                              {log.user_profile?.display_name || log.user_profile?.email || "System"}
                            </span>
                          </div>

                          {/* Changed Fields */}
                          {changedFields.length > 0 && (
                            <>
                              <Separator className="my-3" />
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                  Changed Fields:
                                </p>
                                <div className="grid gap-2">
                                  {changedFields.map(field => (
                                    <div key={field} className="bg-[#F6F8FB] rounded p-2 text-sm">
                                      <div className="font-semibold text-[#0D1321] mb-1">
                                        {formatFieldName(field)}
                                      </div>
                                      {log.action === "UPDATE" && (
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                          <div>
                                            <span className="text-muted-foreground">From:</span>
                                            <div className="font-mono text-red-600 line-through">
                                              {formatFieldValue(log.old_data?.[field])}
                                            </div>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">To:</span>
                                            <div className="font-mono text-green-600 font-semibold">
                                              {formatFieldValue(log.new_data?.[field])}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                      {log.action === "INSERT" && (
                                        <div className="font-mono text-sm text-green-600">
                                          {formatFieldValue(log.new_data?.[field])}
                                        </div>
                                      )}
                                      {log.action === "DELETE" && (
                                        <div className="font-mono text-sm text-red-600">
                                          {formatFieldValue(log.old_data?.[field])}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
