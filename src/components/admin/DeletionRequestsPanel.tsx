import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Trash2, CheckCircle2, XCircle, Clock, Eye, RefreshCw, AlertTriangle, Loader2 } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DeletionRequest {
  id: string;
  user_id: string;
  user_email: string | null;
  reason: string | null;
  status: string;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  executed_at: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: typeof Clock }> = {
  pending:   { label: "Pending",     className: "border-yellow-500/30 bg-yellow-500/10 text-yellow-700", icon: Clock },
  approved:  { label: "Approved",    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700", icon: CheckCircle2 },
  rejected:  { label: "Rejected",    className: "border-red-500/30 bg-red-500/10 text-red-700", icon: XCircle },
  executing: { label: "Executing",   className: "border-blue-500/30 bg-blue-500/10 text-blue-700", icon: Loader2 },
  completed: { label: "Completed",   className: "border-muted bg-muted/50 text-muted-foreground", icon: CheckCircle2 },
};

export const DeletionRequestsPanel = () => {
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DeletionRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [confirmAction, setConfirmAction] = useState<{ request: DeletionRequest; action: "approve" | "reject" } | null>(null);
  const [processing, setProcessing] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("deletion_requests" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRequests((data as any) ?? []);
    } catch {
      toast.error("Failed to load deletion requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("deletion-requests-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "deletion_requests" }, () => {
        fetchRequests();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchRequests]);

  const handleAction = async (request: DeletionRequest, action: "approve" | "reject") => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const updates: Record<string, unknown> = {
        status: action === "approve" ? "approved" : "rejected",
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        admin_notes: adminNotes || null,
      };

      const { error } = await supabase
        .from("deletion_requests" as any)
        .update(updates as any)
        .eq("id", request.id);

      if (error) throw error;

      toast.success(`Request ${action === "approve" ? "approved" : "rejected"}`);
      setConfirmAction(null);
      setAdminNotes("");
      setSelected(null);
      fetchRequests();
    } catch (err: any) {
      toast.error(`Failed to ${action} request`, { description: err.message });
    } finally {
      setProcessing(false);
    }
  };

  const pendingCount = requests.filter(r => r.status === "pending").length;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-destructive" />
                Data Deletion Requests
                {pendingCount > 0 && (
                  <Badge variant="destructive" className="text-[10px] ml-1">{pendingCount} pending</Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Review and manage workspace data deletion requests from users.
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchRequests}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {requests.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No deletion requests found.
            </div>
          ) : (
            <ScrollArea className="h-[350px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">User</TableHead>
                    <TableHead className="text-xs w-[90px]">Status</TableHead>
                    <TableHead className="text-xs w-[120px]">Requested</TableHead>
                    <TableHead className="text-xs w-[60px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map(req => {
                    const cfg = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.pending;
                    return (
                      <TableRow key={req.id} className={req.status === "pending" ? "bg-yellow-500/5" : ""}>
                        <TableCell>
                          <p className="text-xs font-medium">{req.user_email || "Unknown"}</p>
                          {req.reason && <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{req.reason}</p>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("text-[10px]", cfg.className)}>{cfg.label}</Badge>
                        </TableCell>
                        <TableCell className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setSelected(req); setAdminNotes(req.admin_notes || ""); }}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
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

      {/* Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={() => setSelected(null)}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-sm">
              <Trash2 className="h-4 w-4 text-destructive" />
              Deletion Request Details
            </SheetTitle>
            <SheetDescription className="text-xs">Review and act on this data deletion request.</SheetDescription>
          </SheetHeader>

          {selected && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">User</p>
                  <p className="text-sm font-medium">{selected.user_email || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Status</p>
                  <Badge variant="outline" className={cn("text-[10px] mt-0.5", STATUS_CONFIG[selected.status]?.className)}>
                    {STATUS_CONFIG[selected.status]?.label}
                  </Badge>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Requested</p>
                  <p className="text-xs">{format(new Date(selected.created_at), "PPp")}</p>
                </div>
                {selected.reviewed_at && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Reviewed</p>
                    <p className="text-xs">{format(new Date(selected.reviewed_at), "PPp")}</p>
                  </div>
                )}
              </div>

              {selected.reason && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">User's Reason</p>
                  <div className="p-3 rounded-lg border bg-muted/30 text-sm">{selected.reason}</div>
                </div>
              )}

              <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    Approving this request will permanently remove all workspace data for this user including assets,
                    team members, tasks, credentials, and all associated records.
                  </p>
                </div>
              </div>

              {selected.status === "pending" && (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Admin Notes</label>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add notes about this decision..."
                      className="text-sm h-20 resize-none"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                      onClick={() => setConfirmAction({ request: selected, action: "approve" })}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve Deletion
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setConfirmAction({ request: selected, action: "reject" })}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                    </Button>
                  </div>
                </>
              )}

              {selected.admin_notes && selected.status !== "pending" && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Admin Notes</p>
                  <div className="p-3 rounded-lg border bg-muted/30 text-sm">{selected.admin_notes}</div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Confirm Action Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.action === "approve" ? "Approve Data Deletion?" : "Reject Deletion Request?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.action === "approve"
                ? "This will mark the request as approved. The workspace data will be scheduled for permanent deletion. This cannot be undone."
                : "The user will be notified that their deletion request was rejected."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={confirmAction?.action === "approve" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
              onClick={(e) => {
                e.preventDefault();
                if (confirmAction) handleAction(confirmAction.request, confirmAction.action);
              }}
              disabled={processing}
            >
              {processing && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              {confirmAction?.action === "approve" ? "Approve" : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
