import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, AlertTriangle, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface DeletionRequest {
  id: string;
  status: string;
  reason: string | null;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
}

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  pending:   { label: "Pending Review", className: "border-yellow-500/30 bg-yellow-500/10 text-yellow-700" },
  approved:  { label: "Approved",       className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700" },
  rejected:  { label: "Rejected",       className: "border-red-500/30 bg-red-500/10 text-red-700" },
  executing: { label: "In Progress",    className: "border-blue-500/30 bg-blue-500/10 text-blue-700" },
  completed: { label: "Completed",      className: "border-muted bg-muted/50 text-muted-foreground" },
};

export const DataDeletionRequestCard = () => {
  const [existingRequest, setExistingRequest] = useState<DeletionRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [reason, setReason] = useState("");

  const fetchRequest = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("deletion_requests" as any)
        .select("id, status, reason, admin_notes, created_at, reviewed_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      setExistingRequest((data as any)?.[0] ?? null);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRequest(); }, [fetchRequest]);

  const submitRequest = async () => {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("deletion_requests" as any).insert({
        user_id: user.id,
        user_email: user.email,
        reason: reason || null,
      } as any);

      if (error) throw error;

      toast.success("Deletion request submitted", {
        description: "An administrator will review your request.",
      });
      setShowConfirm(false);
      setReason("");
      fetchRequest();
    } catch (err: any) {
      toast.error("Failed to submit request", { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return null;

  const activeRequest = existingRequest && !["rejected", "completed"].includes(existingRequest.status);
  const style = existingRequest ? STATUS_STYLE[existingRequest.status] ?? STATUS_STYLE.pending : null;

  return (
    <>
      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2 text-destructive">
            <Trash2 className="h-4 w-4" />
            Workspace Data Deletion
          </CardTitle>
          <CardDescription className="text-xs">
            Request permanent deletion of all your workspace data in compliance with privacy regulations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {existingRequest && (
            <div className={cn("p-3 rounded-lg border", style?.className)}>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn("text-[10px]", style?.className)}>
                      {style?.label}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      Submitted {formatDistanceToNow(new Date(existingRequest.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {existingRequest.reason && (
                    <p className="text-xs text-muted-foreground">Reason: {existingRequest.reason}</p>
                  )}
                  {existingRequest.admin_notes && (
                    <p className="text-xs mt-1">
                      <span className="font-medium">Admin response:</span> {existingRequest.admin_notes}
                    </p>
                  )}
                </div>
                {existingRequest.status === "pending" && <Clock className="h-4 w-4 text-yellow-600" />}
                {existingRequest.status === "approved" && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                {existingRequest.status === "rejected" && <XCircle className="h-4 w-4 text-red-600" />}
                {existingRequest.status === "executing" && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
              </div>
            </div>
          )}

          <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/5 space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">This action is irreversible</p>
                <p>Once approved, deletion permanently removes all operational data including assets, containers, team members, tasks, pallets, credentials, and all associated records.</p>
                <p>Requests are reviewed before they run, so deletion is not immediate. We aim to action approved requests within 30 days. Billing, tax, and security records may be retained where required by law, and encrypted backups may hold copies until the normal backup cycle expires.</p>
                <p>Export anything you still need first — your account remains active, but your workspace will be empty after deletion completes.</p>

              </div>
            </div>
          </div>

          <Button
            variant="destructive"
            size="sm"
            disabled={!!activeRequest}
            onClick={() => setShowConfirm(true)}
            className="w-full"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            {activeRequest ? "Request Pending" : "Request Workspace Data Deletion"}
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirm Data Deletion Request
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <span className="block">
                You are requesting <strong>permanent deletion</strong> of all workspace data. This includes:
              </span>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>All assets and containers</li>
                <li>Team members and their credentials</li>
                <li>Tasks and calendar events</li>
                <li>Pallets and shipment records</li>
                <li>Audit logs and activity history</li>
                <li>All custom configurations</li>
              </ul>
              <span className="block font-medium text-destructive">
                This cannot be undone. An administrator will review your request before execution.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <label className="text-xs font-medium">Reason (optional)</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you requesting data deletion?"
              className="text-sm h-20 resize-none"
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                submitRequest();
              }}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 mr-1" />}
              Submit Deletion Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
