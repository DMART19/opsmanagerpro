import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { EnhancedDatePicker } from "@/components/ui/enhanced-date-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  CalendarIcon, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Shield,
  RefreshCw,
  Info,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addMonths } from "date-fns";
import { cn } from "@/lib/utils";

interface ResolveCredentialDialogProps {
  assignment: {
    id: string;
    employee_id: string;
    status: string;
    issue_date: string | null;
    expire_date: string | null;
    notes: string | null;
    employee: {
      first_name: string;
      last_name: string;
      email?: string | null;
      position?: string | null;
    };
  } | null;
  credential: {
    id: string;
    title: string;
    has_expiration?: boolean;
    renewal_cycle_months?: number | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const ResolveCredentialDialog = ({
  assignment,
  credential,
  open,
  onOpenChange,
  onSuccess,
}: ResolveCredentialDialogProps) => {
  const [issueDate, setIssueDate] = useState<Date | undefined>();
  const [expireDate, setExpireDate] = useState<Date | undefined>();
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const hasExpiration = credential?.has_expiration ?? false;
  const renewalMonths = credential?.renewal_cycle_months;

  // Calculate expiration date automatically when issue date changes
  const autoCalculatedExpireDate = useMemo(() => {
    if (issueDate && renewalMonths) {
      return addMonths(issueDate, renewalMonths);
    }
    return undefined;
  }, [issueDate, renewalMonths]);

  // Use auto-calculated date if available, otherwise use manually set date
  const effectiveExpireDate = hasExpiration 
    ? (autoCalculatedExpireDate || expireDate) 
    : undefined;

  useEffect(() => {
    if (assignment && open) {
      setIssueDate(assignment.issue_date ? new Date(assignment.issue_date) : undefined);
      setExpireDate(assignment.expire_date ? new Date(assignment.expire_date) : undefined);
      setNotes(assignment.notes || "");
    }
  }, [assignment, open]);

  const handleSaveAndMarkValid = async () => {
    if (!assignment) return;

    // Require issue date for credentials that expire
    if (hasExpiration && !issueDate) {
      toast.error("Issue date is required to mark this credential as valid");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("employee_requirements")
        .update({
          status: "Compliant",
          issue_date: issueDate ? format(issueDate, "yyyy-MM-dd") : null,
          expire_date: effectiveExpireDate ? format(effectiveExpireDate, "yyyy-MM-dd") : null,
          notes: notes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", assignment.id);

      if (error) throw error;

      toast.success("Credential marked as valid", {
        description: `${credential?.title} for ${assignment.employee?.first_name} is now compliant.`,
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error resolving credential:", error);
      toast.error(error.message || "Failed to resolve credential");
    } finally {
      setSaving(false);
    }
  };

  const handleMarkCompleted = async () => {
    if (!assignment) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("employee_requirements")
        .update({
          status: "Compliant",
          issue_date: issueDate ? format(issueDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
          expire_date: null,
          notes: notes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", assignment.id);

      if (error) throw error;

      toast.success("Credential marked as completed", {
        description: `${credential?.title} for ${assignment.employee?.first_name} is now compliant.`,
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error completing credential:", error);
      toast.error(error.message || "Failed to complete credential");
    } finally {
      setSaving(false);
    }
  };

  if (!assignment || !credential) return null;

  const fullName = `${assignment.employee?.first_name || ""} ${assignment.employee?.last_name || ""}`.trim();
  const initials = `${assignment.employee?.first_name?.[0] || ""}${assignment.employee?.last_name?.[0] || ""}`;
  const isMissing = assignment.status === "Missing" || assignment.status === "Assigned";
  const isExpired = assignment.status === "Expired";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            Resolve Credential
          </DialogTitle>
          <DialogDescription>
            {isMissing 
              ? "Complete this credential assignment to mark it as valid."
              : isExpired
              ? "Update this expired credential with new dates."
              : "Update the credential details below."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Section 1: Who & What (Read-only) */}
          <div className="p-4 rounded-xl bg-muted/50 border border-border/50 space-y-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-11 w-11">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">{fullName}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {assignment.employee?.position || assignment.employee?.email || "Team Member"}
                </p>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{credential.title}</span>
              </div>
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs",
                  isMissing && "border-muted-foreground/30 bg-muted/50 text-muted-foreground",
                  isExpired && "border-destructive/50 bg-destructive/10 text-destructive"
                )}
              >
                <AlertCircle className="h-3 w-3 mr-1" />
                {isMissing ? "Assigned" : isExpired ? "Expired" : assignment.status}
              </Badge>
            </div>
          </div>

          {/* Section 2: Resolution Action */}
          {hasExpiration ? (
            <div className="space-y-4">
              {/* Helpful context */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Add the issue date to mark this credential as valid.
                  {renewalMonths && (
                    <span className="block mt-1 text-foreground font-medium">
                      <RefreshCw className="h-3 w-3 inline mr-1" />
                      This credential expires every {renewalMonths} month{renewalMonths !== 1 ? "s" : ""}.
                    </span>
                  )}
                </p>
              </div>

              {/* Issue Date */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Issue Date <span className="text-destructive">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-11",
                        !issueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {issueDate ? format(issueDate, "PPP") : "Select issue date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={issueDate}
                      onSelect={setIssueDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Expiration Date (auto-calculated or manual) */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Expiration Date</Label>
                {renewalMonths && issueDate ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {format(autoCalculatedExpireDate!, "PPP")}
                    </span>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      Auto-calculated
                    </Badge>
                  </div>
                ) : (
                  <EnhancedDatePicker
                    date={expireDate}
                    onDateChange={setExpireDate}
                    placeholder="Select expiration date (optional)"
                    minDate={issueDate}
                  />
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Notes (optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this credential..."
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* No expiration - simple completion */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-success/5 border border-success/10">
                <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">
                  This credential does not expire. Click below to mark it as completed.
                </p>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Notes (optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this credential..."
                  rows={2}
                  className="resize-none"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          {hasExpiration ? (
            <Button 
              onClick={handleSaveAndMarkValid} 
              disabled={saving || !issueDate}
              className="gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Save & Mark Valid
                </>
              )}
            </Button>
          ) : (
            <Button 
              onClick={handleMarkCompleted} 
              disabled={saving}
              className="gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Mark as Completed
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
